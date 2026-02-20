import requests

API_KEY = "4e775ec5-8394-4100-b2b2-63370d3cf921"

resp = requests.get(
    "https://cloud.leonardo.ai/api/rest/v1/platformModels",
    headers={
        "accept": "application/json",
        "authorization": f"Bearer {API_KEY}",
    },
)
print(resp.status_code)
for m in resp.json().get("custom_models", [])[:20]:
    print(f"  {m['id']}  →  {m['name']}")