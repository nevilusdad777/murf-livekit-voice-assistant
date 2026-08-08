import sys
import io
import os

if sys.platform == 'win32':
    # Force Windows console to use UTF-8 code page (65001)
    os.system("chcp 65001 >nul 2>&1")

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

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
    inference,
    tokenize,
    room_io,
)
from livekit.plugins import murf, silero, google, deepgram, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

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

LANGUAGE:
- Mirror the user's language and register.
- If the user speaks in English, reply in English.
- If the user speaks in Hindi, Hinglish, or code-mixed Hindi/English, reply in polite conversational Hindi written in the Devanagari script (e.g., "नमस्ते, मैं आपकी क्या सहायता कर सकती हूँ?"). Do not mix scripts or write Hindi in Latin script.

GUARDRAILS (CRITICAL):
- Never ask for or accept OTP, PIN, password, or CVV. If the user mentions or starts to provide any of these, immediately stop them and say: "कृपया अपना ओटीपी, पिन या पासवर्ड कभी भी किसी के साथ साझा न करें। सुरक्षा कारणों से मैं इस कॉल को समाप्त कर रही हूँ।" (or in English if they spoke English: "Please never share your OTP, PIN, or password with anyone. For security reasons, I cannot continue this call.")
- Never promise loan approval, credit limit increases, or cashback schemes.
- Never perform money transfers.
- Escalation Script: If the user insists on actions you cannot perform (like money transfers, live balance checks, or resetting passwords), say: "सुरक्षा कारणों से, मुझे आपको एक सीनियर अधिकारी के पास ट्रांसफर करना होगा। कृपया लाइन पर बने रहें।" (or in English: "For security reasons, I must transfer you to a human supervisor. Please hold.")

STYLE:
- Use short, spoken sentences. Avoid bullet points, lists, brackets, and complex terms. Keep replies under 20 words.
- Maintain a warm, calm, and reassuring tone.
"""


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)

    # To add tools, use the @function_tool decorator.
    # Here's an example that adds a simple weather tool.
    # You also have to add `from livekit.agents import function_tool, RunContext` to the top of this file
    # @function_tool
    # async def lookup_weather(self, context: RunContext, location: str):
    #     """Use this tool to look up current weather information in the given location.
    #
    #     If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.
    #
    #     Args:
    #         location: The location to look up weather information for (e.g. city name)
    #     """
    #
    #     logger.info(f"Looking up weather for {location}")
    #
    #     return "sunny with a temperature of 70 degrees."


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):
    # Logging setup
    # Add any other context you want in all log entries here
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Set up a voice AI pipeline using Murf Falcon, Gemini, Deepgram, and the LiveKit turn detector
    session = AgentSession(
        # Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
        # See all available models at https://docs.livekit.io/agents/models/stt/
        stt=deepgram.STT(model="nova-3", language="multi"),
        # A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
        # See all available models at https://docs.livekit.io/agents/models/llm/
        llm=google.LLM(
                model="gemini-3.5-flash-lite",
            ),
        # Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
        # See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
        tts=murf.TTS(
                voice="Anisha", 
                style="Conversation",
                tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
                text_pacing=True
            ),
        # VAD and turn detection are used to determine when the user is speaking and when the agent should respond
        # See more at https://docs.livekit.io/agents/build/turns
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        # allow the LLM to generate a response while waiting for the end of turn
        # See more at https://docs.livekit.io/agents/build/audio/#preemptive-generation
        preemptive_generation=True,
    )

    # To use a realtime model instead of a voice pipeline, use the following session setup instead.
    # (Note: This is for the OpenAI Realtime API. For other providers, see https://docs.livekit.io/agents/models/realtime/))
    # 1. Install livekit-agents[openai]
    # 2. Set OPENAI_API_KEY in .env.local
    # 3. Add `from livekit.plugins import openai` to the top of this file
    # 4. Use the following session setup instead of the version above
    # session = AgentSession(
    #     llm=openai.realtime.RealtimeModel(voice="marin")
    # )

    # # Add a virtual avatar to the session, if desired
    # # For other providers, see https://docs.livekit.io/agents/models/avatar/
    # avatar = hedra.AvatarSession(
    #   avatar_id="...",  # See https://docs.livekit.io/agents/models/avatar/plugins/hedra
    # )
    # # Start the avatar and wait for it to join
    # await avatar.start(session, room=ctx.room)

    # Join the room and connect to the user
    await ctx.connect()

    # Start the session, which initializes the voice pipeline and warms up the models
    await session.start(
        agent=Assistant(),
        room=ctx.room,
    )

    # Wait a moment for audio streams to settle before greeting
    import asyncio
    await asyncio.sleep(1)

    # Make the agent speak a greeting first as soon as they connect
    await session.say("Hello! I am Anisha from Bharat Pay support. I can help you check transaction charges or block a lost card. How can I help you today?", allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(server)
