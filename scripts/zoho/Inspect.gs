/**
 * Gudoria Zoho Books Invoice Automation - Inspector Utility
 * 
 * Run this script to audit your sheet's column structure and verify compatibility.
 */

function checkSheetStructure() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastCol = sheet.getLastColumn();
  
  Logger.log('========================================================================');
  Logger.log('GUDORIA INVOICE SHEET COMPATIBILITY AUDIT');
  Logger.log('========================================================================');
  Logger.log('Current Tab Name: ' + sheet.getName());
  
  if (lastCol === 0) {
    Logger.log('🔴 ERROR: The current sheet is empty. Please add a header row to Row 1.');
    Logger.log('========================================================================');
    return;
  }
  
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  Logger.log('Found ' + headers.length + ' columns in Row 1:');
  for (let i = 0; i < headers.length; i++) {
    Logger.log(`  Column ${String.fromCharCode(65 + i)}: "${headers[i]}"`);
  }
  Logger.log('------------------------------------------------------------------------');
  Logger.log('Checking Mapping Status against Config.gs:');
  
  const mandatory = {
    CUSTOMER_NAME: false,
    PRODUCT_NAME: false,
    QUANTITY: false,
    RATE: false
  };
  
  const optional = {
    GST_TREATMENT: false,
    GST_NUMBER: false,
    PHONE: false,
    EMAIL: false,
    ADDRESS: false,
    STATE: false,
    INVOICE_DATE: false,
    GST_MODE: false,
    DISCOUNT: false,
    COURIER: false,
    REMARKS: false
  };
  
  const writeback = {
    ZOHO_INVOICE_NUM: false,
    ZOHO_INVOICE_ID: false,
    ZOHO_PDF_URL: false,
    SYNC_STATUS: false
  };

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
  Logger.log('\n[MANDATORY COLUMNS (Required to build invoice)]');
  for (const key in mandatory) {
    const label = HEADERS_MAP[key];
    if (mandatory[key]) {
      Logger.log(`  🟢 OK: "${label}" matched to Column ${matched[key]}`);
    } else {
      Logger.log(`  🔴 MISSING: "${label}" is not matched. Sync will fail.`);
      hasErrors = true;
    }
  }
  
  Logger.log('\n[OPTIONAL COLUMNS (If missing, default settings are applied)]');
  for (const key in optional) {
    const label = HEADERS_MAP[key];
    if (optional[key]) {
      Logger.log(`  🟢 OK: "${label}" matched to Column ${matched[key]}`);
    } else {
      Logger.log(`  🟡 OMITTED: "${label}" not found. (Will use empty or default values)`);
    }
  }
  
  Logger.log('\n[WRITE-BACK COLUMNS (Where Zoho metadata will be recorded)]');
  for (const key in writeback) {
    const label = HEADERS_MAP[key];
    if (writeback[key]) {
      Logger.log(`  🟢 OK: "${label}" matched to Column ${matched[key]}`);
    } else {
      Logger.log(`  🟡 OMITTED: "${label}" not found. (Metadata won't write back to this column)`);
    }
  }
  
  Logger.log('\n========================================================================');
  if (hasErrors) {
    Logger.log('🔴 STATUS: INCOMPATIBLE. Please add the missing mandatory columns.');
    Logger.log('Tip: You can change the expected names in Config.gs to match your sheet.');
  } else {
    Logger.log('🟢 STATUS: COMPATIBLE! Your column headers match configuration settings.');
  }
  Logger.log('========================================================================');
}
