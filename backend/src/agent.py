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

KNOWLEDGE:
- You know Bharat Pay services: UPI transfers, wallet payments, and credit card payments.
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
            db.delete_user(user_id)
            return "Your profile has been completely deleted from our system."

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
            tools=[save_profile, forget_me],
            vad=ctx.proc.userdata["vad"],
        )

        # Compose greeting and instructions
        greeting_text = ""
        instructions = SYSTEM_PROMPT
        if user_profile and user_profile.get("consent_given"):
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
