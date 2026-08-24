import pandas as pd
import json
import re
import os

file_sales = r"C:\Users\user\Desktop\gud\erp\shhets\Stock & Sales Tracker.xlsx"
file_bni = r"C:\Users\user\Desktop\gud\erp\shhets\leads bni.xlsx"

customers_dict = {}
orders_list = []
action_items_list = []

def clean_val(val):
    if pd.isna(val) or val is None:
        return ""
    val_str = str(val).strip()
    if val_str == "nan" or val_str == "None":
        return ""
    return val_str

# 1. Parse Sales Tracker Batch 1 & Gudoria Sales Tracker
xl_sales = pd.ExcelFile(file_sales)

cust_seq = 1
ord_seq = 1
task_seq = 1

def get_cust_id(name, city="", phone="", lead_src="Referral"):
    global cust_seq
    clean_name = clean_val(name)
    if not clean_name:
        return ""
    
    key = clean_name.lower()
    if key in customers_dict:
        return customers_dict[key]["Customer_ID"]
    
    cid = f"CUST{cust_seq:03d}"
    cust_seq += 1
    
    customers_dict[key] = {
        "Customer_ID": cid,
        "Business_Name": clean_name,
        "Contact_Person": clean_name,
        "Designation": "Owner / Buyer",
        "Customer_Type": "Cafe" if "cafe" in key or "coffee" in key else ("Corporate" if "pvt" in key or "ltd" in key or "inc" in key else "Individual"),
        "Lead_Source": lead_src,
        "Phone": clean_val(phone),
        "WhatsApp": clean_val(phone),
        "Email": "",
        "Address": clean_val(city),
        "City": clean_val(city),
        "State": "Kerala",
        "Instagram": "",
        "Website": "",
        "Status": "Active",
        "Date_Added": "2026-01-01",
        "Notes": "Migrated from Sales Tracker"
    }
    return cid

# Parse Gudoria Sales Tracker
if "Gudoria Sales Tracker" in xl_sales.sheet_names:
    df_gst = pd.read_excel(file_sales, sheet_name="Gudoria Sales Tracker").dropna(how="all")
    for idx, row in df_gst.iterrows():
        cname = clean_val(row.get("Client Name"))
        if not cname or cname.lower() in ["total", "sum", "subtotal"]:
            continue
        
        cid = get_cust_id(cname, lead_src="Sales Tracker")
        inv_no = clean_val(row.get("Invoice no "))
        pdate = clean_val(row.get("Purchase Date "))
        sale_price = clean_val(row.get("Sale Price "))
        pay_status = clean_val(row.get("Payment status"))
        remarks = clean_val(row.get("Remarks"))
        
        # Build items summary
        items = []
        for col in ["6 Piece Box", "8 piece Box", "Almond 8g per piece", "Peanut 8g per piece", "Orange 8g per piece", "Lemon 8g per piece", "Almond (25 gms)", "Peanut (25 gms) ", "Orange (25 gms) ", "Lemon\n(25 Gms)", "Mocha \n(25 Gms)", "Sea Salt\n(25 Gms)", "Jackfruit\n(25 Gms)", "Hamper"]:
            if col in row and not pd.isna(row[col]) and row[col] != 0:
                items.append(f"{col}: {row[col]}")
        
        item_str = ", ".join(items) if items else "Assorted Chocolates"
        
        p_status = "Paid" if "paid" in pay_status.lower() or "received" in pay_status.lower() or "cleared" in pay_status.lower() else ("Pending" if "pending" in pay_status.lower() else "Paid")
        
        oid = f"ORD{ord_seq:03d}"
        ord_seq += 1
        
        try:
            val_num = float(re.sub(r"[^\d.]", "", sale_price)) if sale_price else 0.0
        except:
            val_num = 0.0

        orders_list.append({
            "Order_ID": oid,
            "Date": pdate if pdate else "2026-01-15",
            "Customer_ID": cid,
            "Channel": "WhatsApp",
            "Items": item_str,
            "Qty": len(items) if items else 1,
            "Price_Per_Unit": str(val_num),
            "GST_Percent": "5%",
            "Total_Value": str(val_num),
            "Payment_Status": p_status,
            "Delivery_Status": "Delivered",
            "Delivery_Method": "Dunzo" if "courier" in remarks.lower() else "Self",
            "Tracking_ID": inv_no if inv_no else "",
            "Invoice_Link": "",
            "Notes": remarks
        })

# Parse Sales Tracker Batch 1 / Sales Tracker
for sheet in ["Sales Tracker ", "Sales Tracker Batch 1 "]:
    if sheet in xl_sales.sheet_names:
        df_st = pd.read_excel(file_sales, sheet_name=sheet).dropna(how="all")
        for idx, row in df_st.iterrows():
            cname = clean_val(row.get("Client Name"))
            if not cname or cname.lower() in ["total", "sum", "subtotal"]:
                continue
            
            cid = get_cust_id(cname, lead_src="Sales Tracker Batch 1")
            inv_no = clean_val(row.get("Invoice no "))
            pdate = clean_val(row.get("Purchase Date "))
            sale_price = clean_val(row.get("Sale Price "))
            pay_status = clean_val(row.get("Payment status"))
            remarks = clean_val(row.get("Remarks"))
            
            items = []
            for col in ["Box ", "Almond (25 gms)", "Peanut (25 gms) ", "Lemon\n(25 Gms)", "Orange (25 gms) "]:
                if col in row and not pd.isna(row[col]) and row[col] != 0:
                    items.append(f"{col}: {row[col]}")
            
            item_str = ", ".join(items) if items else "Assorted Chocolates"
            
            p_status = "Paid" if "paid" in pay_status.lower() or "received" in pay_status.lower() else "Pending"
            
            oid = f"ORD{ord_seq:03d}"
            ord_seq += 1
            
            try:
                val_num = float(re.sub(r"[^\d.]", "", sale_price)) if sale_price else 0.0
            except:
                val_num = 0.0

            orders_list.append({
                "Order_ID": oid,
                "Date": pdate if pdate else "2026-01-10",
                "Customer_ID": cid,
                "Channel": "Direct",
                "Items": item_str,
                "Qty": len(items) if items else 1,
                "Price_Per_Unit": str(val_num),
                "GST_Percent": "5%",
                "Total_Value": str(val_num),
                "Payment_Status": p_status,
                "Delivery_Status": "Delivered",
                "Delivery_Method": "Self",
                "Tracking_ID": inv_no if inv_no else "",
                "Invoice_Link": "",
                "Notes": remarks
            })

# 2. Parse BNI Leads
xl_bni = pd.ExcelFile(file_bni)
if "BNI Connects" in xl_bni.sheet_names:
    df_bni = pd.read_excel(file_bni, sheet_name="BNI Connects").dropna(how="all")
    for idx, row in df_bni.iterrows():
        name = clean_val(row.get("Name"))
        if not name:
            continue
        company = clean_val(row.get("Company"))
        bname = f"{name} ({company})" if company else name
        phone = clean_val(row.get("Phone"))
        email = clean_val(row.get("Email"))
        notes = clean_val(row.get("notes")) or clean_val(row.get("Notes"))
        status = clean_val(row.get("status")) or clean_val(row.get("order status"))
        
        cid = get_cust_id(bname, phone=phone, lead_src="BNI")
        if email:
            customers_dict[bname.lower()]["Email"] = email
        
        tid = f"TASK{task_seq:03d}"
        task_seq += 1
        
        action_items_list.append({
            "Task_ID": tid,
            "Task_Name": f"Follow up with BNI Lead: {name} ({company})",
            "Related_Module": "Orders",
            "Related_ID": cid,
            "Assigned_To": "Mohith",
            "Created_By": "System (BNI Import)",
            "Created_Date": "2026-01-28",
            "Due_Date": "2026-02-05",
            "Completion_Date": "",
            "Priority": "High",
            "Status": "In Progress" if "contacted" in notes.lower() or "sent" in notes.lower() else "Not Started",
            "Notes": f"Status: {status}. Notes: {notes}"
        })

output_data = {
    "Customer_Master": list(customers_dict.values()),
    "Orders_Log": orders_list,
    "Action_Items": action_items_list
}

os.makedirs("src/data", exist_ok=True)
with open("src/data/seedDataV2.json", "w", encoding="utf-8") as f:
    json.dump(output_data, f, indent=2, ensure_ascii=False)

print(f"Successfully extracted {len(customers_dict)} customers, {len(orders_list)} orders, and {len(action_items_list)} BNI action items!")
