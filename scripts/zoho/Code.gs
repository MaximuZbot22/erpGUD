/**
 * Gudoria Zoho Books Invoice Automation - Unified Code File
 * 
 * Instructions:
 * 1. Open your Google Sheet, click Extensions -> Apps Script.
 * 2. Delete everything in the default "Code.gs" file.
 * 3. Copy and paste the entire contents of this file into the editor.
 * 4. Save and run the "saveStoredRefreshToken" function once to authorize.
 */

// =========================================================================
// SECTION 1: CONFIGURATION (Config)
// =========================================================================
const ZOHO_CLIENT_ID = '1000.RPU3EEI4IWS1272MLOG2X3UAFJYT3O';
const ZOHO_CLIENT_SECRET = '7d6f814382edbc4a347f578b4d98327193ea18e122';

const ZOHO_BASE_URL = 'https://www.zohoapis.in/books/v3';
const ZOHO_AUTH_URL = 'https://accounts.zoho.in/oauth/v2/auth';
const ZOHO_TOKEN_URL = 'https://accounts.zoho.in/oauth/v2/token';

const DEFAULT_ZOHO_ORG_ID = ''; 
const ZOHO_SCOPE = 'ZohoBooks.fullaccess.ALL';
const WEB_APP_URL = ''; // Leave blank unless using Web App Redirect flow

const HEADERS_MAP = {
  ZOHO_INVOICE_NUM: 'Zoho Invoice Number',
  ZOHO_INVOICE_ID: 'Zoho Invoice ID',
  ZOHO_PDF_URL: 'Zoho PDF URL',
  SYNC_STATUS: 'Sync Status'
};

/**
 * 0-based column indices for Gudoria Sales Tracker tab.
 * Adjust these values if columns are ever added, removed or re-arranged in the sheet!
 */
const COLUMNS_CONFIG = {
  SNO: 0,           // Column A (Tallied)
  REMARKS: 1,       // Column B (Sno) - Remarks column
  INVOICE_NUM: 2,   // Column C (Invoice no) - fallback/direct
  CUSTOMER_NAME: 4, // Column E (salesperson/contact name)
  DATE: 8,          // Column I (Client Type - holds the date)
  
  // Product Column Indexes & Zoho Books item mappings
  PRODUCTS: {
    10: { name: 'Six Piece Assorted Box', type: '6pc' },     // Column K (6 Piece Box)
    11: { name: 'Eight Piece Assorted Box', type: '8pc' },    // Column L (8 piece Box)
    12: { name: 'Almond Noir 8g', type: '8g' },               // Column M (Almond 8g per piece)
    13: { name: 'Peanut Royale 8g', type: '8g' },             // Column N (Peanut 8g per piece)
    14: { name: 'Orange Sunset', type: '8g' },                // Column O (Orange 8g per piece)
    15: { name: 'Orange Sunset 25g', type: 'bars' },         // Column P (Box - Orange 25g)
    16: { name: 'Almond Noir 25g', type: 'bars' },           // Column Q (Almond 25g)
    17: { name: 'Sun-kissed Lemon 25g', type: 'bars' },      // Column R (Lemon 25g)
    18: { name: 'Peanut Royale 25g', type: 'bars' },         // Column S (Peanut 25g)
    19: { name: 'Sun-kissed Lemon 8g', type: '8g' },          // Column T (Lemon 8g per piece)
    20: { name: 'Mocha 25g', type: 'bars' },                 // Column U (Mocha 25g)
    21: { name: 'Sea Salt 25g', type: 'bars' },              // Column V (Sea Salt 25g)
    22: { name: 'Jackfruit 25g', type: 'bars' }              // Column W (Jackfruit 25g)
  },
  
  // Unit Price Column Indexes
  PRICE_6_BOX: 23,     // Column X (Unit Price 6 piece Box)
  PRICE_8_BOX: 24,     // Column Y (Unit Price Box)
  PRICE_BARS: 25,      // Column Z (Unit Price 8 piece Box)
  PRICE_8G_BARS: 27,   // Column AB (Unit Price 25 gms)
  
  CLIENT_TYPE: 35,     // Column AJ (Courier)
  SALESPERSON: 36      // Column AK (Payment status)
};

const DEFAULT_GST_PERCENT = 5;
const DEFAULT_GST_TREATMENT = 'business_none'; 
const ORGANIZATION_HOME_STATE = 'Kerala';

// =========================================================================
// SECTION 2: CUSTOM UI MENU (UI)
// =========================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Gudoria Zoho Sync')
    .addItem('Sync Selected Row(s)', 'syncSelectedInvoices')
    .addItem('Sync All Pending Invoices', 'syncAllPendingInvoices')
    .addSeparator()
    .addItem('Authorize Zoho Books API (Manual)', 'showAuthLink')
    .addItem('Check Integration Status', 'showAuthStatus')
    .addItem('Clear Stored Credentials', 'promptClearAuth')
    .addToUi();
}

function showAuthLink() {
  let authUrl = '';
  try {
    authUrl = logAuthUrl();
  } catch (err) {
    SpreadsheetApp.getUi().alert('Error generating authorization URL: ' + err.toString());
    return;
  }
  
  const redirectUri = WEB_APP_URL || ScriptApp.getService().getUrl();
  const hasWebhookUrl = !!WEB_APP_URL;

  let htmlContent = '<div style="font-family: sans-serif; padding: 10px; font-size: 14px; line-height: 1.5; color: #333;">';
  
  if (!hasWebhookUrl) {
    htmlContent += '<div style="background-color: #F8D7DA; color: #721C24; border: 1px solid #F5C6CB; padding: 10px; border-radius: 4px; margin-bottom: 15px;">' +
                   '<b>Action Required:</b> Web App URL is not set in Config.gs section. ' +
                   'Please deploy this script as a Web App (Deploy -> New Deployment -> Web App), ' +
                   'copy the URL, and paste it into the <code>WEB_APP_URL</code> variable before authorizing.' +
                   '</div>';
  } else {
    htmlContent += '<p>Click the button below to log into Zoho and link your Zoho Books account to this spreadsheet:</p>' +
                   '<div style="text-align: center; margin: 20px 0;">' +
                   '<a href="' + authUrl + '" target="_blank" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">Authorize Zoho Books</a>' +
                   '</div>' +
                   '<p>Make sure this Redirect URL matches the one configured in your Zoho Developer Console:</p>' +
                   '<input type="text" style="width: 100%; padding: 6px; border: 1px solid #CCC; border-radius: 3px; font-family: monospace; background-color: #F9F9F9;" value="' + redirectUri + '" readonly onclick="this.select();">';
  }
  
  htmlContent += '<p style="margin-top: 15px; font-size: 12px; color: #666;"><b>Auth URL Link Reference:</b></p>' +
                 '<textarea style="width: 100%; height: 60px; border: 1px solid #DDD; padding: 5px; font-family: monospace; font-size: 11px; background-color: #FAFAFA;" readonly>' + authUrl + '</textarea>' +
                 '</div>';

  const html = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(480)
    .setHeight(320)
    .setTitle('Zoho Books Authorization');
    
  SpreadsheetApp.getUi().showModalDialog(html, 'Zoho Books Authorization');
}

function showAuthStatus() {
  const ui = SpreadsheetApp.getUi();
  let status;
  try {
    status = getAuthStatus();
  } catch (err) {
    ui.alert('Error reading status: ' + err.toString());
    return;
  }
  
  let msg = '=== Gudoria Zoho Integration Status ===\n\n';
  msg += 'OAuth Status: ' + (status.authorized ? '🟢 Authorized' : '🔴 Not Authorized') + '\n';
  msg += 'Organization ID: ' + status.orgId + '\n\n';
  
  if (!status.authorized) {
    msg += 'Instructions:\n';
    msg += '1. Run "saveStoredRefreshToken" function once inside Apps Script.\n';
    msg += 'OR\n';
    msg += '2. Perform manual Web App configuration.';
  } else {
    msg += '🟢 All systems ready. You can now sync invoices.';
  }
  
  ui.alert('Integration Status', msg, ui.ButtonSet.OK);
}

function promptClearAuth() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Clear Credentials',
    'Are you sure you want to delete stored Zoho Books access/refresh tokens? You will need to re-authorize the integration.',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    clearAuth();
    ui.alert('Success', 'Stored credentials have been cleared.', ui.ButtonSet.OK);
  }
}

// =========================================================================
// SECTION 3: SHEET BRIDGE / ORCHESTRATOR (SheetBridge)
// =========================================================================
function syncSelectedInvoices() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const activeRange = sheet.getActiveRange();
  
  if (!activeRange) {
    SpreadsheetApp.getUi().alert('Please select the row(s) you want to sync.');
    return;
  }
  
  const startRow = activeRange.getRow();
  const numRows = activeRange.getNumRows();
  
  const firstDataRow = Math.max(2, startRow);
  const lastDataRow = startRow + numRows - 1;
  
  if (lastDataRow < 2) {
    SpreadsheetApp.getUi().alert('Please select a data row (Row 2 or below) to sync.');
    return;
  }
  
  let mapping;
  try {
    mapping = getHeaderMapping(sheet);
  } catch (err) {
    SpreadsheetApp.getUi().alert(err.message);
    return;
  }
  
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Confirm Sync',
    `Are you sure you want to sync rows ${firstDataRow} to ${lastDataRow} to Zoho Books?`,
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  let successCount = 0;
  let errorCount = 0;
  
  sheet.getParent().toast(`Syncing ${lastDataRow - firstDataRow + 1} row(s) to Zoho Books...`, 'Zoho Sync', -1);
  
  for (let row = firstDataRow; row <= lastDataRow; row++) {
    try {
      processRow(sheet, row, mapping);
      successCount++;
    } catch (err) {
      errorCount++;
      const errorMsg = err.message || err.toString();
      Logger.log(`Row ${row} Failed: ${errorMsg}`);
      
      const colIdx = mapping['SYNC_STATUS'];
      if (colIdx && colIdx > 0) {
        sheet.getRange(row, colIdx).setValue('Error: ' + errorMsg);
      }
    }
  }
  
  sheet.getParent().toast('Sync Completed!', 'Zoho Sync');
  ui.alert('Sync Completed!', `Successfully Synced: ${successCount}\nFailed: ${errorCount}`, ui.ButtonSet.OK);
}

function syncAllPendingInvoices() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('No data rows found in sheet to sync.');
    return;
  }
  
  let mapping;
  try {
    mapping = getHeaderMapping(sheet);
  } catch (err) {
    SpreadsheetApp.getUi().alert(err.message);
    return;
  }
  
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Confirm Sync All',
    'Are you sure you want to scan the sheet and sync all pending invoices?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  let pendingRows = [];
  
  for (let row = 2; row <= lastRow; row++) {
    const statusCol = mapping['SYNC_STATUS'];
    const status = statusCol ? sheet.getRange(row, statusCol).getValue() : '';
    const invIdCol = mapping['ZOHO_INVOICE_ID'];
    const invId = invIdCol ? sheet.getRange(row, invIdCol).getValue() : '';
    
    if (status !== 'Success' && !invId) {
      pendingRows.push(row);
    }
  }
  
  if (pendingRows.length === 0) {
    ui.alert('No pending invoices found to sync.');
    return;
  }
  
  sheet.getParent().toast(`Syncing ${pendingRows.length} pending invoice(s)...`, 'Zoho Sync', -1);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < pendingRows.length; i++) {
    const row = pendingRows[i];
    try {
      processRow(sheet, row, mapping);
      successCount++;
    } catch (err) {
      errorCount++;
      const errorMsg = err.message || err.toString();
      Logger.log(`Row ${row} Failed: ${errorMsg}`);
      
      const colIdx = mapping['SYNC_STATUS'];
      if (colIdx && colIdx > 0) {
        sheet.getRange(row, colIdx).setValue('Error: ' + errorMsg);
      }
    }
  }
  
  sheet.getParent().toast('Sync Completed!', 'Zoho Sync');
  ui.alert('Sync Completed!', `Successfully Synced: ${successCount}\nFailed: ${errorCount}`, ui.ButtonSet.OK);
}

function getContactDetailsFromRow(sheet, rowValues) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, Math.min(lastCol, 40)).getValues()[0];
  
  const details = {
    email: '',
    phone: '',
    address: '',
    gst_no: '',
    gst_treatment: 'business_none',
    state: ORGANIZATION_HOME_STATE
  };
  
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || '').toString().trim().toLowerCase();
    if (!h) continue;
    
    const val = (rowValues[i] || '').toString().trim();
    
    if (h === 'email' || h === 'e-mail' || h === 'email address') {
      details.email = val;
    } else if (h === 'phone' || h === 'mobile' || h === 'contact' || h === 'phone number') {
      details.phone = val;
    } else if (h === 'address' || h === 'billing address' || h === 'location') {
      details.address = val;
    } else if (h === 'gst number' || h === 'gstin' || h === 'gst no' || h === 'gst') {
      details.gst_no = val;
    } else if (h === 'gst treatment' || h === 'tax treatment') {
      details.gst_treatment = val;
    } else if (h === 'state' || h === 'billing state') {
      details.state = val || ORGANIZATION_HOME_STATE;
    }
  }
  
  return details;
}

function mapSalespersonToCustomerName(shortName) {
  if (!shortName) return 'Retail';
  
  const name = shortName.toString().trim().toLowerCase();
  
  // Mapping short names from the sheet to full Zoho contact names
  const mapping = {
    'elvin': 'Mr. Elvin Cornel',
    'rochas': 'Mr. Rochas',
    'nihara': 'Nihara',
    'vinod': 'Mr. Vinod',
    'jayagopan': 'Mr. Jayagopan',
    'ws': 'Mr. WS',
    'sunitha': 'Ms. Sunitha',
    'naveen': 'Mr. Naveen',
    'prevalent': 'PREVALENT AI INDIA PRIVATE LIMITED',
    'kannan': 'Mr. Ramaswami', // Kannan orders are billed to Ramaswami
    'sam': 'Sam',
    'sabine': 'Mr. Sabine',
    'sarala': 'Ms. Sarala Vijayakumar',
    'valsa': 'Ms. Valsa Das'
  };
  
  // Find match
  for (const key in mapping) {
    if (name.indexOf(key) !== -1) {
      return mapping[key];
    }
  }
  
  // Fallback to capitalizing the short name if not found in mapping
  return shortName.charAt(0).toUpperCase() + shortName.slice(1);
}

function processRow(sheet, rowNumber, mapping) {
  const lastCol = sheet.getLastColumn();
  // Read all cells up to column 40 to make sure we don't miss anything
  const rowValues = sheet.getRange(rowNumber, 1, 1, Math.max(lastCol, 40)).getValues()[0];
  
  // Helper to get raw float value or 0
  const getFloatVal = (val) => {
    if (!val) return 0;
    if (typeof val === 'string' && val.indexOf('Invoice-') !== -1) return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };
  
  // 1. Customer Name (Column E, Index 4 - Salesperson, with Column D fallback)
  let rawCustomerName = (rowValues[COLUMNS_CONFIG.CUSTOMER_NAME] || '').toString().trim();
  if (!rawCustomerName) {
    rawCustomerName = (rowValues[3] || '').toString().trim();
  }
  let customerName = mapSalespersonToCustomerName(rawCustomerName);
  
  // 2. Remarks (Column B, Index 1)
  let remarks = (rowValues[COLUMNS_CONFIG.REMARKS] || '').toString().trim();
  
  // 3. Invoice Number (Search entire row for "Invoice-")
  let invoiceNumber = '';
  for (let i = 0; i < rowValues.length; i++) {
    const cellVal = (rowValues[i] || '').toString().trim();
    if (cellVal.indexOf('Invoice-') !== -1) {
      const match = cellVal.match(/Invoice-\d{4}-GUD-\d{4}-\w+/);
      if (match) {
        invoiceNumber = match[0];
        break;
      }
      invoiceNumber = cellVal;
      break;
    }
  }
  
  // If still empty, check Column C (Index 2)
  if (!invoiceNumber) {
    invoiceNumber = (rowValues[COLUMNS_CONFIG.INVOICE_NUM] || '').toString().trim();
  }
  
  // If invoice number is found but customerName is empty or looks like a reference,
  // extract customer name from invoice number!
  if (!customerName || customerName.indexOf('GD-20') !== -1 || customerName.match(/^\d+$/)) {
    if (invoiceNumber) {
      const parts = invoiceNumber.split('-');
      if (parts.length > 0) {
        customerName = parts[parts.length - 1].trim();
      }
    }
  }
  
  // If we still have no customer and no invoice, skip empty row
  if (!customerName && !invoiceNumber) {
    return;
  }
  
  if (!customerName) {
    throw new Error('VALIDATION_ERROR: Customer name could not be resolved for this row.');
  }
  
  // 4. Date (Column E, Index 4)
  let invoiceDateVal = rowValues[COLUMNS_CONFIG.DATE];
  let formattedDate = '';
  if (invoiceDateVal instanceof Date) {
    formattedDate = Utilities.formatDate(invoiceDateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  } else if (invoiceDateVal) {
    const strVal = invoiceDateVal.toString().trim();
    const num = parseFloat(strVal);
    if (!isNaN(num) && num > 20000 && num < 60000) {
      const jsDate = new Date((num - 25569) * 86400 * 1000);
      formattedDate = Utilities.formatDate(jsDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      // Check if it matches a date format (yyyy-mm-dd or dd-mm-yyyy or similar)
      const dateMatch = strVal.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (dateMatch) {
        const y = parseInt(dateMatch[1]);
        const m = parseInt(dateMatch[2]) - 1;
        const d = parseInt(dateMatch[3]);
        const parsedDate = new Date(y, m, d);
        if (!isNaN(parsedDate.getTime())) {
          formattedDate = Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
      }
    }
  }
  if (!formattedDate) {
    formattedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  
  // 5. Prices
  const price6 = getFloatVal(rowValues[COLUMNS_CONFIG.PRICE_6_BOX]);
  const price8 = getFloatVal(rowValues[COLUMNS_CONFIG.PRICE_8_BOX]);
  const priceBars = getFloatVal(rowValues[COLUMNS_CONFIG.PRICE_BARS]);
  const price8g = getFloatVal(rowValues[COLUMNS_CONFIG.PRICE_8G_BARS]);
  
  // 6. Line Items
  const lineItemsPayload = [];
  for (const idxStr in COLUMNS_CONFIG.PRODUCTS) {
    const colIdx = parseInt(idxStr);
    const qtyVal = rowValues[colIdx];
    const qty = getFloatVal(qtyVal);
    
    if (qty > 0) {
      const prodConfig = COLUMNS_CONFIG.PRODUCTS[colIdx];
      let rate = 0;
      if (prodConfig.type === '6pc') {
        rate = price6;
      } else if (prodConfig.type === '8pc') {
        rate = price8;
      } else if (prodConfig.type === '8g') {
        rate = price8g;
      } else if (prodConfig.type === 'bars') {
        rate = priceBars;
      }
      
      lineItemsPayload.push({
        label: prodConfig.name,
        quantity: qty,
        rate: rate
      });
    }
  }
  
  if (lineItemsPayload.length === 0) {
    throw new Error('VALIDATION_ERROR: No product quantities found to sync for this row.');
  }
  
  // 7. Customer Data lookup / create
  const contactDetails = getContactDetailsFromRow(sheet, rowValues);
  const customerData = {
    name: customerName,
    gst_treatment: contactDetails.gst_treatment,
    gst_no: contactDetails.gst_no,
    phone: contactDetails.phone,
    email: contactDetails.email,
    address: contactDetails.address,
    state: contactDetails.state || ORGANIZATION_HOME_STATE
  };
  
  const contactId = findOrCreateCustomer(customerData);
  
  // 8. Resolve Zoho Item IDs for each line item
  const resolvedLineItems = [];
  for (const item of lineItemsPayload) {
    const itemDetails = findItemByName(item.label);
    
    // Use price from sheet if > 0, otherwise use default Zoho Books price
    const finalRate = item.rate > 0 ? item.rate : (itemDetails.rate || 0);
    
    resolvedLineItems.push({
      item_id: itemDetails.item_id,
      name: itemDetails.name,
      rate: finalRate,
      quantity: item.quantity,
      hsn_or_sac: itemDetails.hsn_or_sac || ''
    });
  }
  
  // Clean up remarks (remove invoice number if it matches remarks)
  let cleanRemarks = remarks;
  if (remarks.indexOf('Invoice-') !== -1) {
    cleanRemarks = '';
  }
  
  const invoiceData = {
    invoice_date: formattedDate,
    gst_mode: 'Tax Exclusive',
    discount: '0',
    courier: '0',
    remarks: cleanRemarks,
    state: ORGANIZATION_HOME_STATE,
    invoice_number: invoiceNumber
  };
  
  const invoiceResult = createInvoice(invoiceData, contactId, resolvedLineItems);
  
  const writeVal = (key, val) => {
    const colIdx = mapping[key];
    if (colIdx && colIdx > 0) {
      sheet.getRange(rowNumber, colIdx).setValue(val);
    }
  };
  
  writeVal('ZOHO_INVOICE_NUM', invoiceResult.invoiceNumber);
  writeVal('ZOHO_INVOICE_ID', invoiceResult.invoiceId);
  writeVal('ZOHO_PDF_URL', invoiceResult.pdfUrl);
  writeVal('SYNC_STATUS', invoiceResult.status);
}

function getHeaderMapping(sheet) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, Math.max(lastColumn, 45)).getValues()[0];
  const mapping = {
    ZOHO_INVOICE_NUM: 0,
    ZOHO_INVOICE_ID: 0,
    ZOHO_PDF_URL: 0,
    SYNC_STATUS: 0
  };
  
  // Look for existing writeback headers
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || '').toString().trim().toLowerCase();
    if (h === 'zoho invoice number') mapping.ZOHO_INVOICE_NUM = i + 1;
    if (h === 'zoho invoice id') mapping.ZOHO_INVOICE_ID = i + 1;
    if (h === 'zoho pdf url') mapping.ZOHO_PDF_URL = i + 1;
    if (h === 'sync status') mapping.SYNC_STATUS = i + 1;
  }
  
  // If not found, append them starting from the first empty column after Column AH (Index 33)
  let startCol = Math.max(lastColumn, 34); 
  
  const writeBackKeys = ['ZOHO_INVOICE_NUM', 'ZOHO_INVOICE_ID', 'ZOHO_PDF_URL', 'SYNC_STATUS'];
  const labels = ['Zoho Invoice Number', 'Zoho Invoice ID', 'Zoho PDF URL', 'Sync Status'];
  
  for (let idx = 0; idx < writeBackKeys.length; idx++) {
    const key = writeBackKeys[idx];
    if (mapping[key] === 0) {
      while (sheet.getRange(1, startCol + 1).getValue().toString().trim() !== '') {
        startCol++;
      }
      sheet.getRange(1, startCol + 1).setValue(labels[idx]);
      mapping[key] = startCol + 1;
      startCol++;
    }
  }
  
  return mapping;
}

// =========================================================================
// SECTION 4: OAUTH 2.0 HANDLER (OAuth)
// =========================================================================
function logAuthUrl() {
  const redirectUri = WEB_APP_URL || ScriptApp.getService().getUrl();
  
  if (!redirectUri || redirectUri.indexOf('https://script.google.com') !== 0) {
    Logger.log('WARNING: Web App URL is not set. Please deploy the script as a Web App (Deploy -> New Deployment -> Web App) and update WEB_APP_URL in Config.');
  }
  
  const authUrl = ZOHO_AUTH_URL + 
    '?scope=' + encodeURIComponent(ZOHO_SCOPE) + 
    '&client_id=' + ZOHO_CLIENT_ID + 
    '&response_type=code' + 
    '&redirect_uri=' + encodeURIComponent(redirectUri) + 
    '&access_type=offline' + 
    '&prompt=consent';
  
  return authUrl;
}

function doGet(e) {
  const code = e.parameter.code;
  if (!code) {
    return HtmlService.createHtmlOutput('<h3>Authorization Failed</h3><p>Error: Authorization code not found.</p>');
  }
  
  const redirectUri = WEB_APP_URL || ScriptApp.getService().getUrl();
  const payload = {
    grant_type: 'authorization_code',
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    code: code,
    redirect_uri: redirectUri
  };
  
  try {
    const response = UrlFetchApp.fetch(ZOHO_TOKEN_URL, {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    });
    
    const resText = response.getContentText();
    const result = JSON.parse(resText);
    
    if (result.error) {
      return HtmlService.createHtmlOutput('<h3>Failed to Exchange Grant Code</h3><p>Error: ' + result.error + '</p>');
    }
    
    const props = PropertiesService.getScriptProperties();
    if (result.refresh_token) {
      props.setProperty('ZOHO_REFRESH_TOKEN', result.refresh_token);
    }
    props.setProperty('ZOHO_ACCESS_TOKEN', result.access_token);
    props.setProperty('ZOHO_TOKEN_EXPIRY', (Date.now() + (result.expires_in * 1000)).toString());
    
    return HtmlService.createHtmlOutput(
      '<div style="font-family: sans-serif; padding: 20px;">' +
      '<h2 style="color: #4CAF50;">Authorized Successfully!</h2>' +
      '<p>OAuth refresh tokens have been saved. You can close this tab and return to your sheet.</p>' +
      '</div>'
    );
  } catch (err) {
    return HtmlService.createHtmlOutput('<h3>Internal Error During Exchange</h3><p>' + err.toString() + '</p>');
  }
}

function getAccessToken() {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('ZOHO_ACCESS_TOKEN');
  const expiryStr = props.getProperty('ZOHO_TOKEN_EXPIRY');
  const refreshToken = props.getProperty('ZOHO_REFRESH_TOKEN');
  
  if (accessToken && expiryStr) {
    const expiry = parseInt(expiryStr, 10);
    if (Date.now() < expiry - 300000) {
      return accessToken;
    }
  }
  
  if (!refreshToken) {
    throw new Error('NO_REFRESH_TOKEN: Zoho Books integration has not been authorized. ' +
                    'Please run "saveStoredRefreshToken" once in Apps Script editor to authorize.');
  }
  
  const payload = {
    grant_type: 'refresh_token',
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    refresh_token: refreshToken
  };
  
  try {
    const response = UrlFetchApp.fetch(ZOHO_TOKEN_URL, {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    });
    
    const resText = response.getContentText();
    const result = JSON.parse(resText);
    
    if (result.error) {
      throw new Error('ZOHO_REFRESH_ERROR: ' + result.error);
    }
    
    props.setProperty('ZOHO_ACCESS_TOKEN', result.access_token);
    props.setProperty('ZOHO_TOKEN_EXPIRY', (Date.now() + (result.expires_in * 1000)).toString());
    
    return result.access_token;
  } catch (err) {
    throw new Error('OAuth Refresh failed: ' + err.toString());
  }
}

function getAuthStatus() {
  const props = PropertiesService.getScriptProperties();
  const refreshToken = props.getProperty('ZOHO_REFRESH_TOKEN');
  const orgId = props.getProperty('ZOHO_ORG_ID') || DEFAULT_ZOHO_ORG_ID;
  
  return {
    authorized: !!refreshToken,
    organizationSet: !!orgId,
    orgId: orgId || 'Not Configured'
  };
}

function clearAuth() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('ZOHO_REFRESH_TOKEN');
  props.deleteProperty('ZOHO_ACCESS_TOKEN');
  props.deleteProperty('ZOHO_TOKEN_EXPIRY');
}

function saveStoredRefreshToken() {
  const refreshToken = '1000.edc26a2423e747273b9c7588b59a1b59.c8270ac98ff1319c3c30adec0241c655';
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ZOHO_REFRESH_TOKEN', refreshToken);
  
  Logger.log('========================================================================');
  Logger.log('🟢 SUCCESS! Refresh Token has been saved to Script Properties.');
  Logger.log('Stored Token: ' + refreshToken.substring(0, 15) + '...');
  Logger.log('========================================================================');
}

function authorizeWithSelfClientCode(grantCode) {
  const code = grantCode || 'PASTE_YOUR_GRANT_CODE_HERE';
  if (code === 'PASTE_YOUR_GRANT_CODE_HERE' || !code) {
    Logger.log('ERROR: Please provide a valid Zoho Grant Code.');
    return;
  }
  
  const payload = {
    grant_type: 'authorization_code',
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    code: code
  };
  
  try {
    const response = UrlFetchApp.fetch(ZOHO_TOKEN_URL, {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    });
    
    const resText = response.getContentText();
    const result = JSON.parse(resText);
    
    if (result.error) {
      Logger.log('❌ OAUTH EXCHANGE FAILED: ' + result.error);
      return 'Failed';
    }
    
    const props = PropertiesService.getScriptProperties();
    if (result.refresh_token) {
      props.setProperty('ZOHO_REFRESH_TOKEN', result.refresh_token);
    }
    props.setProperty('ZOHO_ACCESS_TOKEN', result.access_token);
    props.setProperty('ZOHO_TOKEN_EXPIRY', (Date.now() + (result.expires_in * 1000)).toString());
    
    Logger.log('🟢 SUCCESS! Zoho Books authorization was successful.');
    return 'Success';
  } catch (err) {
    Logger.log('❌ EXCEPTION: ' + err.toString());
    return 'Error';
  }
}

// =========================================================================
// SECTION 5: ZOHO API WRAPPER (ZohoAPI)
// =========================================================================
function getOrganizationId() {
  const props = PropertiesService.getScriptProperties();
  let orgId = props.getProperty('ZOHO_ORG_ID');
  if (orgId) return orgId;
  
  if (DEFAULT_ZOHO_ORG_ID) {
    props.setProperty('ZOHO_ORG_ID', DEFAULT_ZOHO_ORG_ID);
    return DEFAULT_ZOHO_ORG_ID;
  }
  
  const accessToken = getAccessToken();
  const headers = { 'Authorization': 'Zoho-oauthtoken ' + accessToken };
  
  const response = UrlFetchApp.fetch(ZOHO_BASE_URL + '/organizations', {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  });
  
  const resText = response.getContentText();
  let result = JSON.parse(resText);
  
  if (result.code !== 0 || !result.organizations || result.organizations.length === 0) {
    throw new Error('AUTO_ORG_DISCOVERY_FAILED: Could not find any Zoho Books organizations.');
  }
  
  orgId = result.organizations[0].organization_id;
  props.setProperty('ZOHO_ORG_ID', orgId);
  return orgId;
}

function callZohoAPI(endpoint, method, payload, queryParams) {
  const accessToken = getAccessToken();
  const orgId = getOrganizationId();
  
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  let url = ZOHO_BASE_URL + cleanEndpoint;
  
  const queries = [];
  queries.push('organization_id=' + orgId);
  
  if (queryParams) {
    for (const key in queryParams) {
      if (queryParams[key] !== undefined && queryParams[key] !== null) {
        queries.push(encodeURIComponent(key) + '=' + encodeURIComponent(queryParams[key]));
      }
    }
  }
  url += '?' + queries.join('&');
  
  const headers = {
    'Authorization': 'Zoho-oauthtoken ' + accessToken,
    'Content-Type': 'application/json;charset=UTF-8',
    'Accept': 'application/json'
  };
  
  const options = {
    method: method ? method.toLowerCase() : 'get',
    headers: headers,
    muteHttpExceptions: true
  };
  
  if (payload && (options.method === 'post' || options.method === 'put')) {
    options.payload = JSON.stringify(payload);
  }
  
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const resText = response.getContentText();
  
  let result = JSON.parse(resText);
  if (result.code !== 0) {
    throw new Error('ZOHO_API_ERROR [' + result.code + ']: ' + result.message);
  }
  
  return result;
}

// =========================================================================
// SECTION 6: CUSTOMER SERVICE (CustomerService)
// =========================================================================
function findOrCreateCustomer(data) {
  if (!data.name) {
    throw new Error('VALIDATION_ERROR: Customer name is required.');
  }

  const name = data.name.trim();
  const gstNo = data.gst_no ? data.gst_no.trim() : '';
  const email = data.email ? data.email.trim() : '';
  
  let contact = findCustomer(name, gstNo, email);
  if (contact) {
    return contact.contact_id;
  }
  
  return createCustomer(data);
}

function findCustomer(name, gstNo, email) {
  try {
    const response = callZohoAPI('/contacts', 'get', null, { contact_name: name });
    if (response.contacts && response.contacts.length > 0) {
      for (const contact of response.contacts) {
        if (contact.contact_name.toLowerCase() === name.toLowerCase()) {
          return contact;
        }
      }
    }
  } catch (err) {}

  if (gstNo) {
    try {
      const response = callZohoAPI('/contacts', 'get', null, { search_text: gstNo });
      if (response.contacts && response.contacts.length > 0) {
        return response.contacts[0];
      }
    } catch (err) {}
  }

  if (email) {
    try {
      const response = callZohoAPI('/contacts', 'get', null, { email: email });
      if (response.contacts && response.contacts.length > 0) {
        return response.contacts[0];
      }
    } catch (err) {}
  }

  return null;
}

function createCustomer(data) {
  let gstTreatment = (data.gst_treatment || '').toLowerCase().trim();
  const gstNo = data.gst_no ? data.gst_no.trim() : '';
  
  if (!gstTreatment) {
    gstTreatment = gstNo ? 'business_gst' : DEFAULT_GST_TREATMENT;
  } else {
    if (gstTreatment.indexOf('register') !== -1 && gstTreatment.indexOf('un') === -1) {
      gstTreatment = 'business_gst';
    } else if (gstTreatment.indexOf('unregistered') !== -1) {
      gstTreatment = 'business_none';
    } else if (gstTreatment.indexOf('consumer') !== -1) {
      gstTreatment = 'consumer';
    } else if (gstTreatment.indexOf('exempt') !== -1) {
      gstTreatment = 'business_no_gst';
    }
  }

  let firstName = data.contact_person || data.name;
  let lastName = '';
  if (data.contact_person) {
    const parts = data.contact_person.trim().split(/\s+/);
    if (parts.length > 1) {
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }
  }

  const billingState = data.state || ORGANIZATION_HOME_STATE;
  const contactPayload = {
    contact_name: data.name.trim(),
    company_name: data.name.trim(),
    contact_persons: [
      {
        first_name: firstName,
        last_name: lastName,
        email: data.email || '',
        phone: data.phone || '',
        mobile: data.whatsapp || data.phone || ''
      }
    ],
    billing_address: {
      address: data.address || '',
      city: data.city || '',
      state: billingState,
      country: 'India'
    },
    shipping_address: {
      address: data.address || '',
      city: data.city || '',
      state: billingState,
      country: 'India'
    },
    gst_treatment: gstTreatment,
    place_of_supply: billingState
  };

  if (gstTreatment === 'business_gst' && gstNo) {
    contactPayload.gst_no = gstNo;
  }

  const result = callZohoAPI('/contacts', 'post', contactPayload);
  if (result.contact && result.contact.contact_id) {
    return result.contact.contact_id;
  }
  throw new Error('API_ERROR: Zoho Books contact creation failed.');
}

// =========================================================================
// SECTION 7: ITEM SERVICE (ItemService)
// =========================================================================
function findItemByName(name) {
  if (!name) {
    throw new Error('VALIDATION_ERROR: Product name is required.');
  }
  
  const cleanName = name.trim();
  
  try {
    const response = callZohoAPI('/items', 'get', null, { name: cleanName });
    if (response.items && response.items.length > 0) {
      for (const item of response.items) {
        if (item.name.toLowerCase() === cleanName.toLowerCase()) {
          return item;
        }
      }
    }
  } catch (err) {}

  try {
    const response = callZohoAPI('/items', 'get', null, { search_text: cleanName });
    if (response.items && response.items.length > 0) {
      for (const item of response.items) {
        if (item.name.toLowerCase() === cleanName.toLowerCase()) {
          return item;
        }
      }
    }
  } catch (err) {}

  return createItem(cleanName);
}

function createItem(name) {
  const itemPayload = {
    name: name,
    rate: 150.0, // Default selling price
    description: name,
    item_type: 'sales',
    product_type: 'goods',
    hsn_or_sac: '18069010' // Default HSN code for chocolates
  };
  
  try {
    const taxId = getTaxIdByPercentAndType(DEFAULT_GST_PERCENT, false);
    if (taxId) {
      itemPayload.tax_id = taxId;
    }
  } catch (e) {
    Logger.log('⚠️ Could not resolve default tax ID for item creation: ' + e.toString());
  }

  const result = callZohoAPI('/items', 'post', itemPayload);
  if (result.item && result.item.item_id) {
    return result.item;
  }
  throw new Error('API_ERROR: Zoho Books item creation failed for "' + name + '".');
}

function sanitizeInvoiceNumber(invNum) {
  if (!invNum) return '';
  let clean = invNum.trim();
  
  if (clean.length <= 16) return clean;
  
  // Try to match the standard pattern: Invoice-<Number>-GUD-<Year>-<Name>
  const match = clean.match(/Invoice-(\d+)-GUD/i);
  if (match && match[1]) {
    return 'GUD-' + match[1];
  }
  
  // Fallback: truncate to 16 characters
  return clean.substring(0, 16);
}

// =========================================================================
// SECTION 8: INVOICE SERVICE (InvoiceService)
// =========================================================================
function createInvoice(data, contactId, lineItems) {
  const customerState = (data.state || '').trim();
  const isInterState = customerState && (customerState.toLowerCase() !== ORGANIZATION_HOME_STATE.toLowerCase());
  
  let gstMode = (data.gst_mode || 'Tax Exclusive').trim().toLowerCase();
  let taxId = '';
  
  const isExempt = gstMode.indexOf('exempt') !== -1;
  const isInclusive = gstMode.indexOf('inclusive') !== -1;
  
  if (!isExempt) {
    taxId = getTaxIdByPercentAndType(DEFAULT_GST_PERCENT, isInterState);
  }
  
  let discountValue = 0;
  let discountType = 'entity_level';
  let isDiscountPercent = false;
  
  const discountStr = (data.discount || '').toString().trim();
  if (discountStr && discountStr !== '0' && discountStr.toLowerCase() !== 'no discount') {
    if (discountStr.indexOf('%') !== -1) {
      discountValue = parseFloat(discountStr.replace('%', ''));
      isDiscountPercent = true;
    } else {
      discountValue = parseFloat(discountStr);
    }
  }

  const formattedLineItems = lineItems.map(item => {
    const li = {
      item_id: item.item_id,
      name: item.name,
      rate: parseFloat(item.rate),
      quantity: parseFloat(item.quantity),
      hsn_or_sac: item.hsn_or_sac || ''
    };
    if (taxId) {
      li.tax_id = taxId;
    }
    return li;
  });

  const invoicePayload = {
    customer_id: contactId,
    date: data.invoice_date || new Date().toISOString().split('T')[0],
    is_inclusive_tax: isInclusive,
    line_items: formattedLineItems
  };

  if (data.invoice_number) {
    const cleanInvNum = sanitizeInvoiceNumber(data.invoice_number);
    if (cleanInvNum) {
      invoicePayload.invoice_number = cleanInvNum;
    }
  }

  if (discountValue > 0) {
    invoicePayload.discount = isDiscountPercent ? (discountValue + '%') : discountValue;
    invoicePayload.discount_type = discountType;
    invoicePayload.is_discount_before_tax = true;
  }

  const shipping = parseFloat(data.courier || 0);
  if (shipping > 0) {
    invoicePayload.shipping_charge = shipping;
  }

  if (data.remarks) {
    invoicePayload.notes = data.remarks;
  }

  const response = callZohoAPI('/invoices', 'post', invoicePayload);
  
  if (response.invoice && response.invoice.invoice_id) {
    const inv = response.invoice;
    let domain = 'zoho.in';
    if (ZOHO_BASE_URL.indexOf('.com') !== -1) {
      domain = 'zoho.com';
    }
    const viewUrl = `https://books.${domain}/app#/invoices/${inv.invoice_id}`;
    
    return {
      invoiceNumber: inv.invoice_number,
      invoiceId: inv.invoice_id,
      pdfUrl: viewUrl,
      status: 'Success'
    };
  }
  
  throw new Error('API_ERROR: Zoho Books invoice creation failed.');
}

function getTaxIdByPercentAndType(percent, isInterState) {
  const response = callZohoAPI('/settings/taxes', 'get');
  if (!response.taxes || response.taxes.length === 0) {
    throw new Error('TAX_RESOLUTION_FAILED: No taxes configured in your Zoho Books account.');
  }
  
  const targetPercent = parseFloat(percent);
  
  for (const tax of response.taxes) {
    const name = (tax.tax_name || '').toLowerCase();
    const pct = parseFloat(tax.tax_percentage);
    
    if (pct === targetPercent) {
      const isTaxIGST = name.indexOf('igst') !== -1 || name.indexOf('integrated') !== -1;
      if (isInterState && isTaxIGST) {
        return tax.tax_id;
      } else if (!isInterState && !isTaxIGST) {
        return tax.tax_id;
      }
    }
  }
  
  for (const tax of response.taxes) {
    if (parseFloat(tax.tax_percentage) === targetPercent) {
      return tax.tax_id;
    }
  }
  
  throw new Error(`TAX_RESOLUTION_FAILED: Could not find any tax with percentage ${percent}% in Zoho Books.`);
}

// =========================================================================
// SECTION 9: INSPECTOR UTILITY (Inspect)
// =========================================================================
function checkSheetStructure() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastCol = sheet.getLastColumn();
  
  Logger.log('========================================================================');
  Logger.log('GUDORIA INVOICE SHEET COMPATIBILITY AUDIT');
  Logger.log('========================================================================');
  Logger.log('Current Tab Name: ' + sheet.getName());
  
  if (lastCol === 0) {
    Logger.log('🔴 ERROR: The current sheet is empty. Please add a header row to Row 1.');
    return;
  }
  
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  Logger.log('Found ' + headers.length + ' columns in Row 1:');
  for (let i = 0; i < headers.length; i++) {
    Logger.log(`  Column ${String.fromCharCode(65 + i)}: "${headers[i]}"`);
  }
  Logger.log('------------------------------------------------------------------------');
  Logger.log('Checking Mapping Status against Configuration:');
  
  const mandatory = { CUSTOMER_NAME: false, PRODUCT_NAME: false, QUANTITY: false, RATE: false };
  const optional = { GST_TREATMENT: false, GST_NUMBER: false, PHONE: false, EMAIL: false, ADDRESS: false, STATE: false, INVOICE_DATE: false, GST_MODE: false, DISCOUNT: false, COURIER: false, REMARKS: false };
  const writeback = { ZOHO_INVOICE_NUM: false, ZOHO_INVOICE_ID: false, ZOHO_PDF_URL: false, SYNC_STATUS: false };
  const matched = {};
  
  for (let i = 0; i < headers.length; i++) {
    const colName = (headers[i] || '').toString().trim().toLowerCase();
    if (!colName) continue;
    
    for (const key in HEADERS_MAP) {
      const configName = HEADERS_MAP[key].trim().toLowerCase();
      if (colName === configName) {
        matched[key] = String.fromCharCode(65 + i);
        if (key in mandatory) mandatory[key] = true;
        if (key in optional) optional[key] = true;
        if (key in writeback) writeback[key] = true;
      }
    }
  }
  
  let hasErrors = false;
  Logger.log('\n[MANDATORY COLUMNS (Required)]');
  for (const key in mandatory) {
    const label = HEADERS_MAP[key];
    if (mandatory[key]) {
      Logger.log(`  🟢 OK: "${label}" matched to Column ${matched[key]}`);
    } else {
      Logger.log(`  🔴 MISSING: "${label}" is not matched. Sync will fail.`);
      hasErrors = true;
    }
  }
  
  Logger.log('\n[OPTIONAL COLUMNS]');
  for (const key in optional) {
    const label = HEADERS_MAP[key];
    if (optional[key]) {
      Logger.log(`  🟢 OK: "${label}" matched to Column ${matched[key]}`);
    } else {
      Logger.log(`  🟡 OMITTED: "${label}" not found. (Using default settings)`);
    }
  }
  
  Logger.log('\n[WRITE-BACK COLUMNS]');
  for (const key in writeback) {
    const label = HEADERS_MAP[key];
    if (writeback[key]) {
      Logger.log(`  🟢 OK: "${label}" matched to Column ${matched[key]}`);
    } else {
      Logger.log(`  🟡 OMITTED: "${label}" not found. (Metadata won't write back)`);
    }
  }
  
  Logger.log('\n========================================================================');
  if (hasErrors) {
    Logger.log('🔴 STATUS: INCOMPATIBLE. Please add the missing mandatory columns.');
  } else {
    Logger.log('🟢 STATUS: COMPATIBLE! Columns match configuration.');
  }
  Logger.log('========================================================================');
}

/**
 * Temp Inspector Function
 * Run this function in Apps Script to output the sheet headers and first 3 rows of data.
 * Paste the log output back in the chat so I can adapt the sync code for your sheet layout!
 */
function inspectActiveSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const lastCol = sheet.getLastColumn();
  const lastRow = Math.min(sheet.getLastRow(), 5);
  
  Logger.log('=========================================');
  Logger.log('SHEET DEBUG INSPECTION');
  Logger.log('=========================================');
  Logger.log('Active Tab Name: ' + sheet.getName());
  Logger.log('Total Columns: ' + lastCol);
  Logger.log('Total Rows to Inspect: ' + lastRow);
  
  if (lastCol > 0 && lastRow > 0) {
    const dataRange = sheet.getRange(1, 1, lastRow, lastCol);
    const values = dataRange.getValues();
    
    // Log Row 1 Headers
    Logger.log('HEADERS (ROW 1):');
    const headers = values[0];
    for (let c = 0; c < headers.length; c++) {
      Logger.log(`  Col ${c+1} (${String.fromCharCode(65 + c)}): "${headers[c]}"`);
    }
    
    // Log Sample Data rows (Rows 2 to 5)
    for (let r = 1; r < values.length; r++) {
      Logger.log(`\nROW ${r+1} DATA:`);
      for (let c = 0; c < lastCol; c++) {
        const val = values[r][c];
        if (val !== '' && val !== null) {
          Logger.log(`  Col ${String.fromCharCode(65 + c)} ("${headers[c]}"): "${val}"`);
        }
      }
    }
  }
  Logger.log('=========================================');
}

