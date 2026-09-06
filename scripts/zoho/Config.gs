/**
 * Gudoria Zoho Books Invoice Automation - Configuration File
 * 
 * Update these settings to match your Zoho developer account and Google Sheet headers.
 */

// =========================================================================
// 1. ZOHO API & OAUTH CREDENTIALS
// =========================================================================
// Replace these with values from self_client.json or Zoho Developer Console
const ZOHO_CLIENT_ID = '1000.RPU3EEI4IWS1272MLOG2X3UAFJYT3O';
const ZOHO_CLIENT_SECRET = '7d6f814382edbc4a347f578b4d98327193ea18e122';

// Zoho Region endpoints (use .in for India, .com for US, .eu for Europe)
const ZOHO_BASE_URL = 'https://www.zohoapis.in/books/v3';
const ZOHO_AUTH_URL = 'https://accounts.zoho.in/oauth/v2/auth';
const ZOHO_TOKEN_URL = 'https://accounts.zoho.in/oauth/v2/token';

// Stored in ScriptProperties as 'ZOHO_ORG_ID' (highly recommended) or configured here:
const DEFAULT_ZOHO_ORG_ID = ''; 

// The scope required for Books automation
const ZOHO_SCOPE = 'ZohoBooks.fullaccess.ALL';

// Web App URL - Paste your deployed Web App URL here after deploying as Web App
// This is needed as the OAuth Redirect URI.
const WEB_APP_URL = '';

// =========================================================================
// 2. DYNAMIC COLUMN HEADERS MAPPING
// =========================================================================
// The script scans Row 1 of your sheet and looks for these header names.
// You can change the values below to match whatever is written in your sheet.
const HEADERS_MAP = {
  // Customer Lookup Fields
  CUSTOMER_NAME: 'Customer Name',     // Business Name (exact match or search)
  GST_TREATMENT: 'GST Treatment',     // e.g., business_gst, consumer, unregistered_business
  GST_NUMBER: 'GST Number',           // Client GSTIN
  PHONE: 'Phone',                     // Client Phone
  EMAIL: 'Email',                     // Client Email
  ADDRESS: 'Address',                 // Billing Address
  STATE: 'State',                     // Place of Supply / Billing State
  
  // Item/Product Fields
  PRODUCT_NAME: 'Product Name',       // Must match item name in Zoho Books
  QUANTITY: 'Quantity',               // Number of items sold
  RATE: 'Rate',                       // Overridden selling price per item
  
  // Invoice Details
  INVOICE_DATE: 'Invoice Date',       // Invoice Date (optional, defaults to today)
  GST_MODE: 'GST Mode',               // 'Tax Inclusive', 'Tax Exclusive', 'GST Exempt'
  DISCOUNT: 'Discount',               // Percentage (e.g. '10%') or flat value (e.g. '500')
  COURIER: 'Courier',                 // Courier/Shipping charges (added to invoice)
  REMARKS: 'Remarks',                 // Internal remarks/notes for customer
  
  // Metadata Write-Back Columns (Columns where results are written)
  ZOHO_INVOICE_NUM: 'Zoho Invoice Number',
  ZOHO_INVOICE_ID: 'Zoho Invoice ID',
  ZOHO_PDF_URL: 'Zoho PDF URL',
  SYNC_STATUS: 'Sync Status'
};

// =========================================================================
// 3. TAXATION DEFAULTS
// =========================================================================
// Default GST percentage for chocolate/food items
const DEFAULT_GST_PERCENT = 5;

// Fallback GST Treatment if not provided in sheet (usually unregistered_business or consumer)
const DEFAULT_GST_TREATMENT = 'unregistered_business'; 

// Organization's Home State (used to determine CGST+SGST vs IGST automatically)
// Change this to the state where Gudoria is registered (e.g., 'Kerala', 'Karnataka')
const ORGANIZATION_HOME_STATE = 'Kerala';
