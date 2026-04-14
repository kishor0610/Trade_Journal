import requests
import json

# Get OpenAPI spec
response = requests.get("http://127.0.0.1:8000/openapi.json")
spec = response.json()

# Find all paths with "ai" in them
ai_paths = [path for path in spec["paths"].keys() if "ai" in path.lower()]

print("AI-related endpoints found:")
if ai_paths:
    for path in ai_paths:
        print(f"  - {path}")
else:
    print("  None!")

print(f"\nTotal endpoints: {len(spec['paths'])}")
print("\nAll endpoints:")
for path in list(spec["paths"].keys())[:10]:
    print(f"  - {path}")
