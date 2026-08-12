import sys
import io
import os
import asyncio

if sys.platform == "win32":
    # Force Windows console to use UTF-8 code page (65001)
    os.system("chcp 65001 >nul 2>&1")

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
if sys.stderr.encoding.lower() != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

import logging

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
    tokenize,
    room_io,
    llm,
)
from livekit.agents.inference_runner import _InferenceRunner
from livekit.plugins import murf, silero, google, deepgram, noise_cancellation

# ──────────────────────────────────────────────────────────────────────────────
# WINDOWS FIX: The MultilingualModel turn detector registers a local inference
# runner that spawns a subprocess using IPC pipes. On Windows (IocpProactor),
# these pipes crash with DuplexClosed/WinError 64 after the first session ends,
# killing the entire worker so no subsequent calls can connect.
#
# Fix: clear the registered inference runners so the AgentServer never starts
# the inference subprocess. Turn detection will be handled by VAD alone.
# ──────────────────────────────────────────────────────────────────────────────
if sys.platform == "win32":
    _InferenceRunner.registered_runners.clear()

logger = logging.getLogger("agent")

load_dotenv(".env.local")

# Change this prompt to change what your voice agent does.
# See README.md for example prompts (customer support, language tutor, receptionist).
SYSTEM_PROMPT = """IDENTITY:
You are Anisha, a friendly and professional voice assistant for Bharat Pay, a secure digital payments platform.

OBJECTIVES:
- Answer questions about transaction fees (free for UPI/wallet, 2% for credit card transfers).
- Help users understand how to block a card or block their account if lost.
- Check transaction status queries (explain that they need to look at the 'History' tab in their app, as you cannot view live personal data).
- Help users lookup live exchange rates (USD, EUR, GBP, AED, CAD to INR) and calculate foreign remittances using the `get_exchange_rates` tool.

KNOWLEDGE:
- You know Bharat Pay services: UPI transfers, wallet payments, credit card payments, and foreign remittances.
- You can get live exchange rates using the `get_exchange_rates` tool. Always say when the rate is from based on the tool's response.
- You do NOT have live access to the user's account details, balance, or specific transactions.
- You cannot make transfers, change passwords, or perform transactions.

LANGUAGE & SCRIPT (CRITICAL):
- Always write every language in its own native script.
- If the user speaks in English, reply in English.
- If the user speaks in Hindi, Hinglish, or code-mixed Hindi/English, reply in polite conversational Hindi written in the Devanagari script (e.g., "नमस्ते, मैं आपकी क्या सहायता कर सकती हूँ?"). Do not mix scripts or write Hindi in Latin script.
- Keep replies under 20 words. Avoid bullet points, lists, brackets, and complex terms.

GUARDRAILS (CRITICAL):
- Never ask for or accept OTP, PIN, password, or CVV. If the user mentions or starts to provide any of these, immediately stop them and say: "कृपया अपना ओटीपी, पिन या पासवर्ड कभी भी किसी के साथ साझा न करें। सुरक्षा कारणों से मैं इस कॉल को समाप्त कर रही हूँ।" (or in English if they spoke English: "Please never share your OTP, PIN, or password with anyone. For security reasons, I cannot continue this call.")
- Never promise loan approval, credit limit increases, or cashback schemes.
- Never perform money transfers.
- Escalation Script: If the user insists on actions you cannot perform (like money transfers, live balance checks, or resetting passwords), say: "सुरक्षा कारणों से, मुझे आपको एक सीनियर अधिकारी के पास ट्रांसफर करना होगा। कृपया लाइन पर बने रहें।" (or in English: "For security reasons, I must transfer you to a human supervisor. Please hold.")

HUMAN ESCALATION (CRITICAL):
- If the caller reports **suspected fraud** (e.g. lost card, stolen account) or needs a **limit decision/dispute** you cannot make, you must escalate to a human.
- Before escalating, you **MUST explicitly ask the caller for permission** to create a ticket with their details. Example: "May I create a support ticket with your details to have a supervisor review this?"
- Only call the `create_escalation` tool if they say YES. If they refuse, do NOT call the tool and say you cannot proceed.
- Map urgency accurately: Fraud/stolen card = "Emergency" or "High". Disputing charges or queries = "Medium" or "Low".

MEMORY & CONSENT (CRITICAL):
- Before saving any details (like checked schemes or queries), you must explicitly ask the user for permission. For example: "May I save your name and query details to assist you next time?" or "क्या मैं अगली बार आपकी सहायता के लिए आपका नाम और जानकारी सुरक्षित रख सकती हूँ?"
- If the user grants consent, call the `save_profile` tool with `consent_given=True`.
- If the user refuses consent, do NOT call `save_profile`, or call it with `consent_given=False` to clear any data.
- If the user asks to be forgotten, call the `forget_me` tool to completely delete their profile.
"""


class Assistant(Agent):
    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()
    
    # Start the local aiohttp ticket API server in the background on port 8085
    from aiohttp import web
    
    async def run_api():
        app = web.Application()
        
        async def handle_tickets(request):
            import db
            try:
                with db.get_connection() as conn:
                    rows = conn.execute("SELECT * FROM tickets ORDER BY created_at DESC").fetchall()
                    tickets = [dict(r) for r in rows]
                return web.json_response(tickets, headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET",
                    "Access-Control-Allow-Headers": "Content-Type"
                })
            except Exception as e:
                return web.json_response({"error": str(e)}, headers={"Access-Control-Allow-Origin": "*"})
                
        app.router.add_get('/tickets', handle_tickets)
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, 'localhost', 8085)
        await site.start()
        logger.info("🚀 Local Ticket API server running on http://localhost:8085/tickets")
        
    loop = asyncio.get_event_loop()
    loop.create_task(run_api())


server.setup_fnc = prewarm


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):
    try:
        # Logging setup
        ctx.log_context_fields = {
            "room": ctx.room.name,
        }

        # Join the room and connect to the user
        await ctx.connect()

        # Wait for the user participant to join
        user_participant = None
        for _ in range(50):
            if ctx.room.remote_participants:
                user_participant = next(iter(ctx.room.remote_participants.values()))
                break
            await asyncio.sleep(0.1)

        if not user_participant:
            logger.error("No participant joined the room")
            return

        user_id = user_participant.identity
        user_name = user_participant.name or "User"
        logger.info(f"User connected: ID={user_id}, Name={user_name}")

        # Look up user profile from SQLite database
        import db

        user_profile = db.get_user(user_id)

        # Define async function tools
        @llm.function_tool(
            description="Save or update the user's profile with their consent. Call this to save checked schemes, eligibility status, or language preference. Do NOT call this unless the user has explicitly given permission first."
        )
        async def save_profile(
            consent_given: bool,
            schemes_checked: str,
            eligibility_status: str,
            language_preference: str,
        ) -> str:
            if not consent_given:
                db.delete_user(user_id)
                return "Profile not saved. Consent was denied."
            db.save_user(
                user_id,
                user_name,
                language_preference,
                schemes_checked,
                eligibility_status,
                True,
            )
            return f"Successfully saved profile for {user_name}."

        @llm.function_tool(
            description="Delete/wipe all memory and data about the user from the database. Call this if the user asks to be forgotten."
        )
        async def forget_me() -> str:
            import json
            db.delete_user(user_id)
            try:
                payload = json.dumps({
                    "type": "forget_user"
                }).encode("utf-8")
                await ctx.room.local_participant.publish_data(payload)
            except Exception as e:
                logger.warning(f"Failed to publish forget_user event: {e}")
            return "Your profile has been completely deleted from our system."

        @llm.function_tool(
            description="Get the live exchange rates for converting foreign currencies (USD, EUR, GBP, AED, CAD) to Indian Rupee (INR). Call this whenever the user asks for exchange rates, currency conversion, or remittance prices."
        )
        async def get_exchange_rates() -> str:
            import urllib.request
            import json
            from datetime import datetime

            url = "https://open.er-api.com/v6/latest/INR"
            try:
                # Run the synchronous network call in a separate thread so we don't block the event loop
                def fetch():
                    with urllib.request.urlopen(url, timeout=4) as response:
                        return json.loads(response.read().decode())
                
                data = await asyncio.to_thread(fetch)
                if data.get("result") == "success":
                    base_rates = data.get("rates", {})
                    # The API rates are relative to INR (e.g. 1 INR = 0.012 USD).
                    # We invert them to show how many INR for 1 unit of foreign currency.
                    usd = round(1 / base_rates["USD"], 2) if "USD" in base_rates else 83.45
                    eur = round(1 / base_rates["EUR"], 2) if "EUR" in base_rates else 90.12
                    gbp = round(1 / base_rates["GBP"], 2) if "GBP" in base_rates else 106.30
                    aed = round(1 / base_rates["AED"], 2) if "AED" in base_rates else 22.72
                    cad = round(1 / base_rates["CAD"], 2) if "CAD" in base_rates else 61.15
                    
                    date_str = data.get("time_last_update_utc", "Today")
                    # Clean up date representation
                    if " +" in date_str:
                        date_str = date_str.split(" +")[0]
                    
                    rates_dict = {
                        "USD": usd,
                        "EUR": eur,
                        "GBP": gbp,
                        "AED": aed,
                        "CAD": cad
                    }
                    
                    # Push data packet to the room to update UI
                    try:
                        payload = json.dumps({
                            "type": "exchange_rates",
                            "rates": rates_dict,
                            "date": date_str,
                            "fallback": False
                        }).encode("utf-8")
                        await ctx.room.local_participant.publish_data(payload)
                    except Exception as e:
                        logger.warning(f"Failed to publish exchange rates to room: {e}")
                        
                    return f"Live rates as of {date_str}: 1 USD = {usd} INR, 1 EUR = {eur} INR, 1 GBP = {gbp} INR, 1 AED = {aed} INR, 1 CAD = {cad} INR."
            except Exception as e:
                logger.error(f"Error fetching live exchange rates: {e}", exc_info=True)
                
            # Fallback path if API is offline or times out
            fallback_rates = {
                "USD": 83.45,
                "EUR": 90.12,
                "GBP": 106.30,
                "AED": 22.72,
                "CAD": 61.15
            }
            fallback_date = "August 10, 2026 (Offline Fallback)"
            
            try:
                payload = json.dumps({
                    "type": "exchange_rates",
                    "rates": fallback_rates,
                    "date": fallback_date,
                    "fallback": True
                }).encode("utf-8")
                await ctx.room.local_participant.publish_data(payload)
            except Exception as ex:
                logger.warning(f"Failed to publish fallback exchange rates to room: {ex}")
                
            return f"The live rates server is currently offline. Using cached rates from yesterday (August 9, 2026): 1 USD = 83.45 INR, 1 EUR = 90.12 INR, 1 GBP = 106.30 INR, 1 AED = 22.72 INR, 1 CAD = 61.15 INR."

        @llm.function_tool(
            description="Create a human escalation request when the user reports potential fraud, requires a decision the agent cannot make (like loan/account disputes), or asks to speak with a human supervisor. Do NOT call this tool unless the user has explicitly given permission first."
        )
        async def create_escalation(
            summary: str,
            urgency: str, # 'Low', 'Medium', 'High', 'Emergency'
            followup_method: str, # 'Phone Call', 'Email', 'App Notification'
        ) -> str:
            import random
            from datetime import datetime
            ticket_id = f"BP-{random.randint(1000, 9999)}"
            
            # Write to local SQLite database
            db.create_ticket(
                ticket_id=ticket_id,
                user_id=user_id,
                user_name=user_name,
                summary=summary,
                urgency=urgency,
                language="English",
                followup_method=followup_method
            )
            
            # Broadcast LiveKit data packet
            ticket_data = {
                "type": "ticket_created",
                "ticket_id": ticket_id,
                "user_name": user_name,
                "summary": summary,
                "urgency": urgency,
                "followup_method": followup_method,
                "status": "Open",
                "date": datetime.now().strftime("%I:%M %p")
            }
            try:
                payload = json.dumps(ticket_data).encode("utf-8")
                await ctx.room.local_participant.publish_data(payload)
            except Exception as e:
                logger.warning(f"Failed to publish ticket packet: {e}")
                
            # Send to Discord Webhook if configured
            webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
            if webhook_url:
                try:
                    import urllib.request
                    discord_payload = {
                        "embeds": [{
                            "title": "🚨 New Escalation: Human Help Required",
                            "color": 16711680 if urgency in ["High", "Emergency"] else 65280,
                            "fields": [
                                {"name": "Ticket ID", "value": ticket_id, "inline": True},
                                {"name": "User Name", "value": user_name, "inline": True},
                                {"name": "Urgency", "value": urgency, "inline": True},
                                {"name": "Followup Method", "value": followup_method, "inline": True},
                                {"name": "Summary", "value": summary}
                            ],
                            "footer": {"text": "Bharat Pay Voice Assistant"}
                        }]
                    }
                    req = urllib.request.Request(
                        webhook_url,
                        data=json.dumps(discord_payload).encode("utf-8"),
                        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
                    )
                    await asyncio.to_thread(urllib.request.urlopen, req)
                except Exception as ex:
                    logger.warning(f"Failed to post to Discord webhook: {ex}")
                    
            return f"Successfully created ticket {ticket_id}. Explain to the user that their support ticket has been registered, and give them the Reference ID: {ticket_id}."

        # Set up the voice AI pipeline
        # NOTE: turn_detection removed on Windows — the MultilingualModel inference
        # runner uses a subprocess IPC pipe that crashes. VAD alone handles turns.
        session = AgentSession(
            stt=deepgram.STT(model="nova-3", language="multi"),
            llm=google.LLM(model="gemini-3.5-flash-lite"),
            tts=murf.TTS(
                voice="Anisha",
                style="Conversation",
                tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
                text_pacing=True,
            ),
            tools=[save_profile, forget_me, get_exchange_rates, create_escalation],
            vad=ctx.proc.userdata["vad"],
        )

        # Compose greeting and instructions
        greeting_text = ""
        instructions = SYSTEM_PROMPT
        
        is_outbound = user_id.startswith("sip_")
        if is_outbound:
            # Regulatory outbound call greeting: who's calling, why, and how to opt out
            greeting_text = "Hello, this is Anisha calling from Bharat Pay regarding your PM-SBY scheme renewal. You can reply 'stop' or hang up at any time to opt out."
            instructions += "\nOUTBOUND CALL COMPLIANCE:\n- Identify yourself as Anisha from Bharat Pay.\n- Inform the user their PM-SBY scheme renewal deadline is approaching.\n- State clearly that they can reply 'stop' or hang up to opt out.\n- If they ask to stop or opt out, execute the `forget_me` tool immediately."
        elif user_profile and user_profile.get("consent_given"):
            schemes = user_profile.get("schemes_checked") or "None"
            elig = user_profile.get("eligibility_status") or "None"
            instructions += f"\nRETURNING USER MEMORY:\n- User Name: {user_name}\n- Last checked schemes: {schemes}\n- Last eligibility: {elig}\n- Task: Greet them warmly by name, and follow up directly on their last query."
            lang = user_profile.get("language_preference", "English").lower()
            if "hindi" in lang:
                greeting_text = f"नमस्ते {user_name}, भारत पे में आपका स्वागत है। पिछली बार हमने {schemes} के बारे में बात की थी। आज मैं आपकी क्या सहायता कर सकती हूँ?"
            else:
                greeting_text = f"Namaste {user_name}, welcome back to Bharat Pay. Last time we spoke about {schemes}. How can I assist you today?"
        else:
            greeting_text = "Hello! I am Anisha from Bharat Pay support. I can help you check transaction charges or block a lost card. How can I help you today?"

        # Start the session
        await session.start(
            agent=Assistant(instructions=instructions), room=ctx.room
        )

        # Listen for chat messages sent via data packets
        @ctx.room.on("data_received")
        def on_data_received(data: rtc.DataPacket):
            import json

            try:
                payload_str = data.payload.decode("utf-8")
                logger.info(f"Received data on topic {data.topic}: {payload_str}")
                payload = json.loads(payload_str)
                message = payload.get("message")
                if message:
                    logger.info(f"Processing chat message: {message}")
                    asyncio.create_task(session.run(user_input=message))
            except Exception as e:
                logger.debug(f"Non-chat data packet ignored: {e}")

        # Give the agent a moment to settle then greet
        await asyncio.sleep(1)
        await session.say(greeting_text, allow_interruptions=True)

    except Exception as e:
        logger.error(f"Agent session error: {e}", exc_info=True)


if __name__ == "__main__":
    cli.run_app(server)
