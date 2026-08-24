import glob
import os
import csv
import json

folder = r"C:\Users\user\Desktop\gud\erp\help\actual help ig"
csv_files = glob.glob(os.path.join(folder, "*.csv"))

seed_data = {}

for filepath in csv_files:
    filename = os.path.basename(filepath)
    tab_name = os.path.splitext(filename)[0]
    
    with open(filepath, "r", encoding="utf-8-sig", errors="ignore") as f:
        reader = csv.reader(f)
        rows = list(reader)
        if not rows:
            seed_data[tab_name] = []
            continue
            
        headers = rows[0]
        data_list = []
        for r in rows[1:]:
            row_dict = {}
            for idx, h in enumerate(headers):
                row_dict[h] = r[idx] if idx < len(r) else ""
            data_list.append(row_dict)
            
        seed_data[tab_name] = data_list
        print(f"Tab '{tab_name}': loaded {len(data_list)} records")

os.makedirs("src/data", exist_ok=True)
with open("src/data/seedDataV2.json", "w", encoding="utf-8") as f:
    json.dump(seed_data, f, indent=2, ensure_ascii=False)

print(f"\nSuccessfully compiled ALL {len(seed_data)} tabs into src/data/seedDataV2.json!")
