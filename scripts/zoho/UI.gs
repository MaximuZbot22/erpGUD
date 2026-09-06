/**
 * Gudoria Zoho Books Invoice Automation - Custom UI Menu
 * 
 * Sets up custom menus and alerts directly inside the Google Sheets interface.
 */

/**
 * 1. Add Custom Menu when Spreadsheet Opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Gudoria Zoho Sync')
    .addItem('Sync Selected Row(s)', 'syncSelectedInvoices')
    .addItem('Sync All Pending Invoices', 'syncAllPendingInvoices')
    .addSeparator()
    .addItem('Authorize Zoho Books API', 'showAuthLink')
    .addItem('Check Integration Status', 'showAuthStatus')
    .addItem('Clear Stored Credentials', 'promptClearAuth')
    .addToUi();
}

/**
 * 2. Display OAuth Authorization Dialog Box
 */
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
                   '<b>Action Required:</b> Web App URL is not set in Config.gs. ' +
                   'Please deploy this script as a Web App (Deploy -> New Deployment -> Web App), ' +
                   'copy the URL, and paste it into the <code>WEB_APP_URL</code> variable in Config.gs before authorizing.' +
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

/**
 * 3. Display Integration Status Modal
 */
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
    msg += '1. Deploy script as a Web App.\n';
    msg += '2. Copy Web App URL into Config.gs.\n';
    msg += '3. Register URL in Zoho Developer Console.\n';
    msg += '4. Run "Authorize Zoho Books API" from this menu.';
  } else {
    msg += '🟢 All systems ready. You can now sync invoices.';
  }
  
  ui.alert('Integration Status', msg, ui.ButtonSet.OK);
}

/**
 * 4. Display Clear Authentication Confirmation Modal
 */
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
