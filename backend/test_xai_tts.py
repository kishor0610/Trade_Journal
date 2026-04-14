"""
Test script for xAI TTS API endpoints
Run with: python test_xai_tts.py
"""
import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

XAI_API_KEY = os.getenv('XAI_API_KEY', '')

async def test_rest_tts():
    """Test xAI REST TTS endpoint (OpenAI-compatible)"""
    print("\n=== Testing REST TTS API ===")
    
    test_endpoints = [
        "https://api.x.ai/v1/audio/speech",
        "https://api.x.ai/v1/tts",
    ]
    
    test_text = "Hello, this is a test of the text to speech API."
    
    for url in test_endpoints:
        print(f"\nTrying endpoint: {url}")
        
        headers = {
            "Authorization": f"Bearer {XAI_API_KEY}",
            "Content-Type": "application/json",
        }
        
        # Try different payload formats
        payloads = [
            {
                "model": "tts-1",
                "input": test_text,
                "voice": "shimmer"
            },
            {
                "text": test_text,
                "voice": "shimmer",
                "language": "en"
            },
            {
                "text": test_text,
                "voice_id": "Chloe",
                "language": "en"
            },
            {
                "text": test_text,
                "voice_id": "Chloe",
                "language": "en",
                "output_format": {
                    "codec": "mp3",
                    "sample_rate": 44100,
                    "bit_rate": 128000
                }
            }
        ]
        
        for i, payload in enumerate(payloads):
            print(f"  Trying payload format {i+1}: {list(payload.keys())}")
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    res = await client.post(url, headers=headers, json=payload)
                
                print(f"  Status: {res.status_code}")
                if res.status_code == 200:
                    print(f"  ✓ SUCCESS! Audio size: {len(res.content)} bytes")
                    # Save to file
                    filename = f"test_tts_{url.split('/')[-1]}_format{i+1}.mp3"
                    with open(filename, 'wb') as f:
                        f.write(res.content)
                    print(f"  ✓ Saved to: {filename}")
                    return True
                else:
                    print(f"  ✗ Error: {res.text[:200]}")
            except Exception as e:
                print(f"  ✗ Exception: {str(e)}")
    
    return False

async def test_websocket_tts():
    """Test xAI WebSocket realtime API for TTS"""
    print("\n=== Testing WebSocket Realtime API ===")
    
    try:
        import websockets
        import json
        
        uri = "wss://api.x.ai/v1/realtime"
        headers = {"Authorization": f"Bearer {XAI_API_KEY}"}
        
        print(f"Connecting to: {uri}")
        
        async with websockets.connect(uri, extra_headers=headers) as ws:
            print("✓ WebSocket connected")
            
            # Configure session
            await ws.send(json.dumps({
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "voice": "shimmer"
                }
            }))
            print("✓ Sent session config")
            
            # Send text
            await ws.send(json.dumps({
                "type": "conversation.item.create",
                "item": {
                    "type": "message",
                    "role": "user",
                    "content": [{"type": "input_text", "text": "Hello, test."}]
                }
            }))
            print("✓ Sent text message")
            
            # Request response
            await ws.send(json.dumps({
                "type": "response.create",
                "response": {"modalities": ["audio"]}
            }))
            print("✓ Requested audio response")
            
            # Collect events
            print("\nReceiving events:")
            event_count = 0
            audio_chunks = []
            
            async for message in ws:
                try:
                    event = json.loads(message)
                    event_type = event.get("type", "unknown")
                    event_count += 1
                    
                    print(f"  Event {event_count}: {event_type}")
                    
                    # Check for audio
                    if "audio" in event_type.lower() or "delta" in event_type.lower():
                        print(f"    Full event: {json.dumps(event, indent=2)[:500]}")
                    
                    if event_type == "response.done":
                        print(f"\n✓ Response complete. Total events: {event_count}")
                        print(f"  Audio chunks collected: {len(audio_chunks)}")
                        break
                    
                    if event_type == "error":
                        print(f"✗ Error event: {event.get('error')}")
                        break
                    
                    if event_count > 50:  # Safety limit
                        print("Stopping after 50 events")
                        break
                        
                except json.JSONDecodeError:
                    continue
                    
    except ImportError:
        print("✗ websockets library not installed")
        return False
    except Exception as e:
        print(f"✗ WebSocket exception: {str(e)}")
        return False
    
    return True

async def main():
    if not XAI_API_KEY:
        print("ERROR: XAI_API_KEY not found in environment")
        print("Please set it in backend/.env file")
        return
    
    print(f"Using API key: {XAI_API_KEY[:20]}...")
    
    # Test REST endpoints first
    rest_success = await test_rest_tts()
    
    # Test WebSocket if REST failed
    if not rest_success:
        ws_success = await test_websocket_tts()
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    asyncio.run(main())
