import httpx
import asyncio

async def test():
    # Test the LIVE Cloud Run endpoint
    url = "https://trade-journal-backend-702893411415.asia-south1.run.app"
    async with httpx.AsyncClient() as client:
        # Check if the health endpoint or any endpoint responds
        try:
            r = await client.get(f"{url}/")
            print(f"Cloud Run is responding: {r.status_code}")
        except Exception as e:
            print(f"Error: {e}")
        
        # Try to get the server version or any info
        try:
            r = await client.get(f"{url}/api/health", timeout=10)
            print(f"Health check: {r.status_code}, {r.text[:200]}")
        except:
            print("No health endpoint")

asyncio.run(test())
