/**
 * Gudoria Zoho Books Invoice Automation - Sheet Bridge
 * 
 * Orchestrates scanning rows, parsing details, invoking services, and writing results back.
 */

/**
 * 1. Sync Selected Invoice Row(s)
 * Triggered by the user selecting row(s) and clicking the custom menu button.
 */
function syncSelectedInvoices() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const activeRange = sheet.getActiveRange();
  
  if (!activeRange) {
    SpreadsheetApp.getUi().alert('Please select the row(s) you want to sync.');
    return;
  }
  
  const startRow = activeRange.getRow();
  const numRows = activeRange.getNumRows();
  
  // Row 1 is headers, ignore it if selected
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

/**
 * 2. Sync All Pending Invoices
 * Syncs all rows where Zoho Invoice ID is blank and status is not 'Success'.
 */
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
  
  // Pre-scan to find pending rows
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

/**
 * 3. Process a single sheet row
 */
function processRow(sheet, rowNumber, mapping) {
  const lastCol = sheet.getLastColumn();
  const rowValues = sheet.getRange(rowNumber, 1, 1, lastCol).getValues()[0];
  
  const getVal = (key) => {
    const colIdx = mapping[key];
    if (!colIdx || colIdx === 0 || colIdx > lastCol) return '';
    return rowValues[colIdx - 1];
  };
  
  // Read fields
  const customerName = getVal('CUSTOMER_NAME');
  const productName = getVal('PRODUCT_NAME');
  const qtyRaw = getVal('QUANTITY');
  const rateRaw = getVal('RATE');
  
  // Skip row silently if completely blank
  if (!customerName && !productName && !qtyRaw && !rateRaw) {
    return;
  }
  
  // Validate mandatory fields
  if (!customerName) {
    throw new Error('VALIDATION_ERROR: Customer/Business Name is required.');
  }
  if (!productName) {
    throw new Error('VALIDATION_ERROR: Product Name is required.');
  }
  
  const quantity = parseFloat(qtyRaw);
  const rate = parseFloat(rateRaw);
  
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error(`VALIDATION_ERROR: Quantity must be a number greater than 0. Found "${qtyRaw}"`);
  }
  if (isNaN(rate) || rate < 0) {
    throw new Error(`VALIDATION_ERROR: Rate must be a number greater than or equal to 0. Found "${rateRaw}"`);
  }
  
  // Structure customer details
  const customerData = {
    name: customerName,
    gst_treatment: getVal('GST_TREATMENT'),
    gst_no: getVal('GST_NUMBER'),
    phone: getVal('PHONE'),
    email: getVal('EMAIL'),
    address: getVal('ADDRESS'),
    state: getVal('STATE')
  };
  
  // Structure invoice details
  let invoiceDateVal = getVal('INVOICE_DATE');
  let formattedDate = '';
  if (invoiceDateVal instanceof Date) {
    formattedDate = invoiceDateVal.toISOString().split('T')[0];
  } else if (invoiceDateVal) {
    formattedDate = invoiceDateVal.toString().trim();
  }
  
  const invoiceData = {
    invoice_date: formattedDate,
    gst_mode: getVal('GST_MODE'),
    discount: getVal('DISCOUNT'),
    courier: getVal('COURIER'),
    remarks: getVal('REMARKS'),
    rate: rate,
    quantity: quantity,
    state: getVal('STATE')
  };
  
  // Execute Workflow
  // A. Find or automatically create Customer
  const contactId = findOrCreateCustomer(customerData);
  
  // B. Find Item and get properties (HSN code, etc.)
  const itemDetails = findItemByName(productName);
  
  // C. Create Invoice in Zoho Books
  const invoiceResult = createInvoice(invoiceData, contactId, itemDetails);
  
  // D. Write results back to Sheet
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

/**
 * 4. Scan the first row of active sheet and build column mappings
 */
function getHeaderMapping(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    throw new Error('Spreadsheet headers not found. Ensure row 1 contains headers.');
  }
  
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const mapping = {};
  
  // Initialize all mapping keys to 0 (meaning column not found)
  for (const key in HEADERS_MAP) {
    mapping[key] = 0;
  }
  
  // Match headers (case-insensitive & trimmed)
  for (let i = 0; i < headers.length; i++) {
    const headerVal = (headers[i] || '').toString().trim().toLowerCase();
    if (!headerVal) continue;
    
    for (const key in HEADERS_MAP) {
      const configName = HEADERS_MAP[key].trim().toLowerCase();
      if (headerVal === configName) {
        mapping[key] = i + 1; // Apps Script ranges are 1-based index
      }
    }
  }
  
  // Check mandatory headers
  const mandatoryKeys = ['CUSTOMER_NAME', 'PRODUCT_NAME', 'QUANTITY', 'RATE'];
  const missingHeaders = [];
  
  for (const key of mandatoryKeys) {
    if (mapping[key] === 0) {
      missingHeaders.push(`"${HEADERS_MAP[key]}"`);
    }
  }
  
  if (missingHeaders.length > 0) {
    throw new Error('MISSING_HEADERS_ERROR: Could not locate columns: ' + missingHeaders.join(', ') + 
                    '. Please make sure these columns exist in Row 1 or update mapping in Config.gs.');
  }
  
  return mapping;
}
