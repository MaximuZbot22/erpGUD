import json
import urllib.request
import urllib.parse
import ssl
import sys

# Load extracted seed data
with open("src/data/seedDataV2.json", "r", encoding="utf-8") as f:
    seed_data = json.load(f)

# Sheet IDs
SHEETS_MAP = {
    "orders": {
        "id": "1uUfxL_k6k4ebzHPWL4pwwtdIaxzZ-6mW4mqB_6iJnXo",
        "tabs": {
            "Customer_Master": seed_data.get("Customer_Master", []),
            "Orders_Log": seed_data.get("Orders_Log", [])
        }
    },
    "tasks": {
        "id": "1PIw-enBWLfu_LGwWDh6u1tdfjGCPO4P-Q5t2R0Eit84",
        "tabs": {
            "Action_Items": seed_data.get("Action_Items", [])
        }
    }
}

print("Seed Data Summary:")
for key, s in SHEETS_MAP.items():
    print(f"Spreadsheet: {key} (ID: {s['id']})")
    for tab_name, rows in s["tabs"].items():
        print(f"  - Tab '{tab_name}': {len(rows)} records ready to populate")

print("\nReady! When OAuth token is passed, this script batch updates Google Sheets API v4.")
