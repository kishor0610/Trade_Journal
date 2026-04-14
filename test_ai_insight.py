import requests
import json

url = "http://127.0.0.1:8000/api/ai/insight"
data = {
    "symbol": "USDINR",
    "pnl": 1200,
    "win_rate": 65,
    "trades": 10
}

resp = requests.post(url, json=data)
print("Status:", resp.status_code)
try:
    print(json.dumps(resp.json(), indent=2) if resp.content else resp.text)
except Exception as e:
    print(resp.text)
