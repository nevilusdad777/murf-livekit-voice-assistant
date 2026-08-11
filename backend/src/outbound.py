import asyncio
import os
import argparse
import sys
from dotenv import load_dotenv
from livekit import api

# Load env variables from backend/.env.local
load_dotenv(".env.local")

async def make_call(phone: str, trunk_id: str, room: str):
    url = os.getenv("LIVEKIT_URL")
    if not url:
        print("Error: LIVEKIT_URL is not set.")
        sys.exit(1)
        
    # Translate WebSocket URL to HTTP URL for the LiveKit API
    if url.startswith("wss://"):
        url = url.replace("wss://", "https://")
    elif url.startswith("ws://"):
        url = url.replace("ws://", "http://")
        
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    if not api_key or not api_secret:
        print("Error: LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not set.")
        sys.exit(1)
        
    lkapi = api.LiveKitAPI(url, api_key, api_secret)
    
    print(f"Dialing {phone} to join room '{room}' using Trunk '{trunk_id}'...")
    
    max_retries = 3
    retry_delay = 30
    
    for attempt in range(1, max_retries + 1):
        try:
            req = api.CreateSIPParticipantRequest(
                sip_trunk_id=trunk_id,
                sip_call_to=phone,
                room_name=room,
                participant_identity=f"sip_{phone}",
                participant_name="Outbound Call Participant",
                wait_until_answered=True
            )
            
            # Initiate the SIP Call
            participant = await lkapi.sip.create_sip_participant(req)
            print(f"Call answered successfully! Participant: {participant.participant.identity}")
            break
        except Exception as e:
            print(f"Attempt {attempt}/{max_retries} failed: {e}")
            if attempt < max_retries:
                print(f"Retrying in {retry_delay} seconds...")
                await asyncio.sleep(retry_delay)
            else:
                print("All dial attempts failed. Handled outcome: busy, no answer, or rejected.")
                
    await lkapi.aclose()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LiveKit Outbound SIP Call CLI")
    parser.add_argument("--phone", required=True, help="Destination phone number to dial (e.g. +91XXXXXXXXXX)")
    parser.add_argument("--trunk", help="SIP Trunk ID (from LiveKit dashboard)")
    parser.add_argument("--room", default="outbound_room", help="LiveKit room for the call")
    
    args = parser.parse_args()
    
    trunk_id = args.trunk or os.getenv("SIP_TRUNK_ID")
    if not trunk_id:
        print("Error: SIP Trunk ID must be provided via --trunk parameter or SIP_TRUNK_ID env variable.")
        sys.exit(1)
        
    asyncio.run(make_call(args.phone, trunk_id, args.room))
