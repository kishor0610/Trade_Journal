import requests

# Test Hinglish debug endpoint
print("Testing Hinglish debug endpoint...")
try:
    response = requests.get("http://127.0.0.1:8000/api/ai/insights/hinglish-debug")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {response.json()}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")

print("\n" + "="*50 + "\n")

# Test TTS endpoint
print("Testing TTS endpoint...")
try:
    response = requests.post(
        "http://127.0.0.1:8000/api/ai/insights/tts",
        headers={
            "Authorization": "Bearer test",
            "Content-Type": "application/json",
        },
        json={
            "text": "Bhai, market mein aaj kaafi action tha!",
            "voice_id": "Eve",
            "output_format": {"codec": "mp3", "sample_rate": 44100, "bit_rate": 128000},
            "language": "en",
        }
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        with open("test_tts.mp3", "wb") as f:
            f.write(response.content)
        print(f"TTS audio saved to test_tts.mp3 ({len(response.content)} bytes)")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")
