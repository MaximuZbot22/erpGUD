# Gudoria Zoho Books Invoice Automation

This folder contains the complete Google Apps Script code to automate creating Zoho Books invoices directly from your Google Sheets Invoice Tracker.

---

## 🚀 Features

* **Dynamic Column Mapping**: Adapts to your existing Google Sheet layout. Matches headers by name (Row 1) instead of using hardcoded column letters.
* **Auto-Customer Lookup & Creation**: Searches for customers in Zoho Books by GSTIN, Name, or Email. If missing, automatically creates them with their billing address, phone, email, and GST treatment.
* **Default Price Override**: Uses the exact sales price entered in your spreadsheet instead of pulling the catalog price from Zoho Books, preserving historical or negotiated rates.
* **GST & Discount Integration**: Handles tax-inclusive rates, tax-exclusive rates, and tax exemptions, and applies percentage or fixed flat discounts.
* **Dynamic Tax Resolution**: Automatically resolves configured Zoho `tax_id`s for inter-state (IGST) vs intra-state (CGST+SGST) sales.
* **Interactive UI**: Adds a custom menu (`Gudoria Zoho Sync`) inside Google Sheets to sync selected rows or all pending rows.
* **Easy Authentication**: Supports both **Self Client** (paste a grant code in the editor) and **Web App Redirect** authorization flows.

---

## 🛠️ Step-by-Step Installation

### Step 1: Copy Code to Google Apps Script
1. Open your Google Sheet invoice tracker.
2. In the top menu, click **Extensions** → **Apps Script**.
3. Create new files in your Apps Script project corresponding to the `.gs` files in this folder:
   * `Config.gs`
   * `OAuth.gs`
   * `ZohoAPI.gs`
   * `CustomerService.gs`
   * `ItemService.gs`
   * `InvoiceService.gs`
   * `SheetBridge.gs`
   * `UI.gs`
   * `Inspect.gs`
4. Copy and paste the contents of each file from this folder into the respective file in the Apps Script editor.
5. Click the **Save** icon (disk icon) or press `Ctrl + S`.

---

### Step 2: Configure Settings
Open `Config.gs` and check the settings:
1. Verify `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET` match your Zoho API Developer console credentials.
2. Verify `ORGANIZATION_HOME_STATE` is set to the state where Gudoria is registered (e.g. `'Kerala'`). This determines if IGST or CGST/SGST is applied.
3. Review `HEADERS_MAP` to ensure the names in the sheet match the names mapped in the script. You do not need to change your sheet; you can simply edit the column names in `Config.gs` to match whatever is already in your sheet.

---

### Step 3: Authorize Zoho Books API (Choose ONE Method)

We have already exchanged your Self Client grant code and successfully retrieved a permanent **Refresh Token**! You can now use **Method A** to authorize the script in 1 click:

#### Method A: Quick Initialize (Recommended & Easiest)
1. In your Google Apps Script editor, open `OAuth.gs`.
2. Select `saveStoredRefreshToken` from the dropdown list of functions at the top of the editor.
3. Click **Run**.
4. Check the logs below the editor. You will see:
   `🟢 SUCCESS! Refresh Token has been saved to Script Properties.`
5. That's it! Your Google Apps Script is now fully authorized to talk to Zoho Books.

---

#### Method B: Manual Re-Authorization (If you ever need to generate a new token in the future)
1. Go to the [Zoho API Console](https://api-console.zoho.in) and locate your Client ID.
2. Generate a **Self Client Code** for scope `ZohoBooks.fullaccess.ALL`.
3. Copy the **Grant Code** immediately (expires in 3 minutes).
4. In your Apps Script editor, open `OAuth.gs`. Select `authorizeWithSelfClientCode` from the dropdown list of functions.
5. Replace `'PASTE_YOUR_GRANT_CODE_HERE'` with your copied Grant Code and click **Run**.

---

#### Method B: Web App Redirect Flow
If you want to be able to re-authorize directly from the Google Sheet menu in the future:
1. In the Apps Script editor, click **Deploy** (top right) → **New Deployment**.
2. Select **Web App** as the type.
3. Set **Execute as** to `Me` and **Who has access** to `Anyone` (necessary for Zoho to send the callback).
4. Click **Deploy**. Copy the **Web App URL**.
5. Paste this URL into `WEB_APP_URL` inside `Config.gs`.
6. Open your Zoho API Console, edit your client registration, and add this Web App URL to the **Redirect URIs** list.
7. Open your Google Sheet, refresh the page, and select **Gudoria Zoho Sync** → **Authorize Zoho Books API** from the menu.
8. Click **Authorize Zoho Books** in the popup, log in, and grant permission.

---

## 🏃 How to Run the Sync

Once authorized, the script will add a new menu to your spreadsheet called `Gudoria Zoho Sync`.

### Option 1: Sync Specific Rows (Selected Row Sync)
1. Highlight/Select any cell(s) in the row(s) you want to sync.
2. Click **Gudoria Zoho Sync** → **Sync Selected Row(s)**.
3. Confirm the row numbers in the popup.
4. The status of each row will update in the sheet columns:
   * **Zoho Invoice Number**, **Zoho Invoice ID**, and a clickable **Zoho PDF URL** will populate upon success.
   * If any error occurs (e.g., product name misspelled, address missing), a descriptive error will write to the **Sync Status** column.

### Option 2: Batch Sync Pending Rows
1. Click **Gudoria Zoho Sync** → **Sync All Pending Invoices**.
2. The script scans the sheet and automatically processes every row that doesn't have an Invoice ID.

---

## 🔍 Column Reference Guide

Run **Gudoria Zoho Sync** → **Check Integration Status** or run the `checkSheetStructure()` function in `Inspect.gs` to audit your sheet's column structure and verify that everything is aligned properly.

* **Mandatory Columns**:
  * `Customer Name`: Must match the business name in Zoho Books (used to find the contact).
  * `Product Name`: Must match the exact spelling in Zoho Books (e.g., `"Chocolate Hamper"`).
  * `Quantity`: Must be a positive number.
  * `Rate`: Price per item. Overrides default rates.
* **Optional Columns**:
  * `GST Treatment`: e.g. `business_gst` (registered), `unregistered_business`, or `consumer`.
  * `GST Number`: 15-digit GSTIN (if registered business).
  * `Phone` / `Email` / `Address` / `State`: Used to create a new customer if they do not exist.
  * `GST Mode`: Set to `Tax Inclusive` or `Tax Exclusive`.
  * `Discount`: Set as percentage like `10%` or flat discount like `250`.
  * `Courier`: Shipping charges.
  * `Remarks`: Customer notes.
