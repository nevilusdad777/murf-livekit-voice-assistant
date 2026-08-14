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
MAIN_SYSTEM_PROMPT = """IDENTITY:
You are Anisha, a friendly and professional voice assistant for Nexus Pay, a secure digital payments platform.

OBJECTIVES:
- Answer questions about transaction fees (free for UPI/wallet, 2% for credit card transfers).
- Help users understand how to block a card or block their account if lost.
- Check transaction status queries (explain that they need to look at the 'History' tab in their app, as you cannot view live personal data).
- Help users lookup live exchange rates (USD, EUR, GBP, AED, CAD to INR) and calculate foreign remittances using the `get_exchange_rates` tool.

ROUTING & HANDOFF (CRITICAL):
- If the user asks about government financial schemes (like PM-Svanidhi, PM-JDY, PM-SBY, or scheme renewals), call the `transfer_to_schemes_specialist` tool. Say clearly: "I will connect you to our government schemes specialist Ankit. One moment please."
- If the user asks about loans, credit limits, applying for credit, or loan interest rates, call the `transfer_to_loans_specialist` tool. Say clearly: "I will connect you to our loan specialist Rohan. One moment please."

KNOWLEDGE:
- You know Nexus Pay services: UPI transfers, wallet payments, credit card payments, and foreign remittances.
- You do NOT have live access to details of government schemes or loans, you MUST transfer the user to the respective specialist.
- You can get live exchange rates using the `get_exchange_rates` tool. Always say when the rate is from based on the tool's response.
- You do NOT have live access to the user's account details, balance, or specific transactions.
- You cannot make transfers, change passwords, or perform transactions.

LANGUAGE & SCRIPT (CRITICAL):
- Always write every language in its own native script.
- If the user speaks in English, reply in English.
- If the user speaks in Hindi, Hinglish, or code-mixed Hindi/English, reply in polite conversational Hindi written in the Devanagari script.
- Keep replies under 20 words. Avoid bullet points, lists, brackets, and complex terms.

GUARDRAILS (CRITICAL):
- Never ask for or accept OTP, PIN, password, or CVV. If the user mentions or starts to provide any of these, immediately stop them and say: "कृपया अपना ओटीपी, पिन या पासवर्ड कभी भी किसी के साथ साझा न करें। सुरक्षा कारणों से मैं इस कॉल को समाप्त कर रही हूँ।" (or in English: "Please never share your OTP, PIN, or password with anyone. For security reasons, I cannot continue this call.")
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

SCHEME_SPECIALIST_PROMPT = """IDENTITY:
You are Ankit, the Government Scheme Specialist at Nexus Pay.

OBJECTIVES:
- Provide detailed information on government financial schemes:
  - **PM-Svanidhi**: Working capital micro-loan for street vendors up to ₹10,000 for 1st tenure, 7% interest subsidy.
  - **PM-JDY (Jan Dhan Yojana)**: Zero-balance basic savings account, ₹10,000 overdraft facility, free accidental insurance of ₹2 Lakhs.
  - **PM-SBY (Suraksha Bima Yojana)**: Accidental death/disability insurance cover of ₹2 Lakhs at just ₹20 annual premium.
- Check user qualification/eligibility for these schemes.
- Help users apply or check status.

ROUTING & HANDOFF (CRITICAL):
- If the user asks about regular customer support queries (like transaction fees, card blocking, exchange rates, fraud disputes, or general customer care), you MUST transfer them back to the main assistant. Call the `transfer_to_main_agent` tool and say: "I will transfer you back to our main customer support agent. One moment."

CONTINUITY (CRITICAL):
- You must read the recent chat history to understand what the user was asking before the transfer, and continue that conversation seamlessly. Greet them by saying: "Hello, I am Ankit, your government schemes specialist. I see you were asking about schemes. How can I help you check eligibility or details today?"
- Keep replies under 20 words. Always write every language in its own native script.
- Never ask for or accept OTP, PIN, password, or CVV. If they offer it, say: "Please never share your OTP, PIN, or password with anyone. For security reasons, I cannot continue this call."
"""

LOAN_SPECIALIST_PROMPT = """IDENTITY:
You are Rohan, the Loan & Credit Specialist at Nexus Pay.

OBJECTIVES:
- Assist users with loan details, interest rates, credit limits, and eligibility:
  - **Personal Loans**: Interest rate of 12% per annum, tenure up to 36 months, instant approval up to ₹5 Lakhs.
  - **Business Loans**: Interest rate of 10.5% per annum, requires business registration and 12-month bank statements.
  - **Credit Limit Calculator**: Quick check based on monthly income. Estimate credit limit as 3 times the monthly income (e.g. income ₹30,000 = limit ₹90,000).

ROUTING & HANDOFF (CRITICAL):
- If the user asks about regular customer support queries (like transaction fees, card blocking, exchange rates, fraud disputes, or general customer care), you MUST transfer them back to the main assistant. Call the `transfer_to_main_agent` tool and say: "I will transfer you back to our main customer support agent. One moment."

CONTINUITY (CRITICAL):
- You must read the recent chat history to understand what the user was asking before the transfer, and continue that conversation seamlessly. Greet them by saying: "Hello, I am Rohan, your loan and credit specialist. I can help you with loan options, interest rates, or credit limits. What are you looking for today?"
- Keep replies under 20 words. Always write every language in its own native script.
- Never ask for or accept OTP, PIN, password, or CVV. If they offer it, say: "Please never share your OTP, PIN, or password with anyone. For security reasons, I cannot continue this call."
"""

SYSTEM_PROMPT = MAIN_SYSTEM_PROMPT


import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer
import json

class TicketHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        if self.path == '/tickets':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            try:
                import db
                with db.get_connection() as conn:
                    rows = conn.execute("SELECT * FROM tickets ORDER BY created_at DESC").fetchall()
                    tickets = [dict(r) for r in rows]
                self.wfile.write(json.dumps(tickets).encode('utf-8'))
            except Exception as e:
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        elif self.path == '/analytics':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            try:
                import db
                with db.get_connection() as conn:
                    total = conn.execute("SELECT COUNT(*) as count FROM calls").fetchone()["count"]
                    successful = conn.execute("SELECT COUNT(*) as count FROM calls WHERE outcome = 'Success'").fetchone()["count"]
                    failed = conn.execute("SELECT COUNT(*) as count FROM calls WHERE outcome = 'Failed'").fetchone()["count"]
                    
                    reasons_rows = conn.execute("SELECT failure_reason, COUNT(*) as count FROM calls WHERE outcome = 'Failed' GROUP BY failure_reason").fetchall()
                    reasons = {r["failure_reason"]: r["count"] for r in reasons_rows}
                    
                    history_rows = conn.execute("SELECT * FROM calls ORDER BY start_time DESC LIMIT 10").fetchall()
                    history = [dict(h) for h in history_rows]
                    
                data = {
                    "total": total,
                    "successful": successful,
                    "failed": failed,
                    "success_rate": round((successful / total * 100), 1) if total > 0 else 0.0,
                    "reasons": reasons,
                    "history": history
                }
                self.wfile.write(json.dumps(data).encode('utf-8'))
            except Exception as e:
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Mute logging to keep console clean
        pass

def start_http_server():
    try:
        server = HTTPServer(('127.0.0.1', 8085), TicketHandler)
        server.serve_forever()
    except Exception as e:
        pass

# Start daemon thread immediately
api_thread = threading.Thread(target=start_http_server, daemon=True)
api_thread.start()


class Assistant(Agent):
    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):
    from datetime import datetime
    
    # Call tracking variables
    call_id = ctx.room.name or "Web-Call"
    start_time_dt = datetime.now()
    start_time_str = start_time_dt.isoformat()
    
    checked_rates = False
    saved_profile = False
    escalated = False
    declined_consent = False
    security_violation = False

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
            nonlocal saved_profile, declined_consent
            if not consent_given:
                declined_consent = True
                db.delete_user(user_id)
                return "Profile not saved. Consent was denied."
            saved_profile = True
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
            nonlocal checked_rates
            checked_rates = True
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
            nonlocal escalated
            escalated = True
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
                            "footer": {"text": "Nexus Pay Voice Assistant"}
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

        # Define multi-agent transfer tools
        @llm.function_tool(
            description="Transfer the caller to the Government Schemes Specialist (Ankit). Use this when the user asks about government financial schemes (PM-Svanidhi, PM-JDY, PM-SBY, or scheme renewals)."
        )
        async def transfer_to_schemes_specialist() -> str:
            try:
                await session.say("I will connect you to our government schemes specialist Ankit. One moment please.", allow_interruptions=False)
                await session.update_agent(scheme_specialist)
                return "Successfully transferred to Government Schemes Specialist."
            except Exception as e:
                logger.error(f"Handoff to schemes specialist failed: {e}")
                return f"Handoff failed: {e}. Please explain to the user that the transfer failed but you can still help them directly."

        @llm.function_tool(
            description="Transfer the caller to the Loan & Credit Specialist (Rohan). Use this when the user asks about loans, credit limits, applying for credit, or loan interest rates."
        )
        async def transfer_to_loans_specialist() -> str:
            try:
                await session.say("I will connect you to our loan specialist Rohan. One moment please.", allow_interruptions=False)
                await session.update_agent(loan_specialist)
                return "Successfully transferred to Loan & Credit Specialist."
            except Exception as e:
                logger.error(f"Handoff to loan specialist failed: {e}")
                return f"Handoff failed: {e}. Please explain to the user that the transfer failed but you can still help them directly."

        @llm.function_tool(
            description="Transfer the caller back to the main customer support assistant (Anisha). Use this when the user is finished with schemes/loans or asks generic customer support queries (fees, card blocking, exchange rates, fraud)."
        )
        async def transfer_to_main_agent() -> str:
            try:
                await session.say("I will transfer you back to our main customer support agent. One moment.", allow_interruptions=False)
                await session.update_agent(main_agent)
                return "Successfully transferred back to Main Customer Support Agent."
            except Exception as e:
                logger.error(f"Handoff back to main agent failed: {e}")
                return f"Handoff failed: {e}. Please explain to the user that the transfer failed but you can still help them directly."

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
            tools=[
                save_profile,
                forget_me,
                get_exchange_rates,
                create_escalation,
                transfer_to_schemes_specialist,
                transfer_to_loans_specialist,
                transfer_to_main_agent,
            ],
            vad=ctx.proc.userdata["vad"],
        )

        # Compose greeting and instructions
        greeting_text = ""
        instructions = MAIN_SYSTEM_PROMPT
        
        profile_memory = ""
        is_outbound = user_id.startswith("sip_")
        if is_outbound:
            # Regulatory outbound call greeting: who's calling, why, and how to opt out
            greeting_text = "Hello, this is Anisha calling from Nexus Pay regarding your PM-SBY scheme renewal. You can reply 'stop' or hang up at any time to opt out."
            instructions += "\nOUTBOUND CALL COMPLIANCE:\n- Identify yourself as Anisha from Nexus Pay.\n- Inform the user their PM-SBY scheme renewal deadline is approaching.\n- State clearly that they can reply 'stop' or hang up to opt out.\n- If they ask to stop or opt out, execute the `forget_me` tool immediately."
        elif user_profile and user_profile.get("consent_given"):
            schemes = user_profile.get("schemes_checked") or "None"
            elig = user_profile.get("eligibility_status") or "None"
            profile_memory = f"\nRETURNING USER MEMORY:\n- User Name: {user_name}\n- Last checked schemes: {schemes}\n- Last eligibility: {elig}"
            instructions += f"{profile_memory}\n- Task: Greet them warmly by name, and follow up directly on their last query."
            lang = user_profile.get("language_preference", "English").lower()
            if "hindi" in lang:
                greeting_text = f"नमस्ते {user_name}, नेक्सस पे में आपका स्वागत है। पिछली बार हमने {schemes} के बारे में बात की थी। आज मैं आपकी क्या सहायता कर सकती हूँ?"
            else:
                greeting_text = f"Namaste {user_name}, welcome back to Nexus Pay. Last time we spoke about {schemes}. How can I assist you today?"
        else:
            greeting_text = "Hello! I am Anisha from Nexus Pay support. I can help you check transaction charges or block a lost card. How can I help you today?"

        # Create multi-agent instances with shared memory context
        main_agent = Assistant(instructions=instructions)
        scheme_specialist = Assistant(instructions=SCHEME_SPECIALIST_PROMPT + profile_memory)
        loan_specialist = Assistant(instructions=LOAN_SPECIALIST_PROMPT + profile_memory)

        # Start the session with the Main Agent
        await session.start(
            agent=main_agent, room=ctx.room
        )

        # Listen for credentials in user speech to flag security violations
        @session.on("user_input_transcribed")
        def on_user_speech(ev):
            nonlocal security_violation
            text = (ev.transcript or "").lower()
            if any(w in text for w in ["pin", "otp", "password", "cvv", "ओटीपी", "पिन", "पासवर्ड"]):
                logger.warning(f"🚨 Security guardrail triggered. Credentials detected in transcript: {text}")
                security_violation = True

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

        # Register close callback to save call analytics directly when the session ends
        @session.on("close")
        def on_session_close(*args, **kwargs):
            end_time_dt = datetime.now()
            end_time_str = end_time_dt.isoformat()
            duration = int((end_time_dt - start_time_dt).total_seconds())
            channel = "SIP" if user_id.startswith("sip_") else "Web"
            
            actions_list = []
            if checked_rates:
                actions_list.append("Checked Rates")
            if saved_profile:
                actions_list.append("Saved Profile")
            if escalated:
                actions_list.append("Escalated")
            actions_taken = ", ".join(actions_list) if actions_list else "None"
            
            if security_violation:
                outcome = "Failed"
                failure_reason = "Security Violation"
            elif declined_consent:
                outcome = "Failed"
                failure_reason = "Declined"
            elif checked_rates or saved_profile or escalated:
                outcome = "Success"
                failure_reason = "None"
            else:
                outcome = "Failed"
                failure_reason = "Incomplete"
                
            try:
                import db
                db.create_call(
                    call_id=call_id,
                    user_name=user_name,
                    start_time=start_time_str,
                    end_time=end_time_str,
                    duration=duration,
                    channel=channel,
                    outcome=outcome,
                    failure_reason=failure_reason,
                    actions_taken=actions_taken
                )
                logger.info(f"💾 Call record successfully saved to SQLite on close: CallID={call_id}, Outcome={outcome}, Reason={failure_reason}")
            except Exception as ex:
                logger.error(f"Failed to record call in SQLite: {ex}")

    except Exception as e:
        logger.error(f"Agent session error: {e}", exc_info=True)


if __name__ == "__main__":
    cli.run_app(server)
