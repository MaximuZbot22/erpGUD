/**
 * Gudoria Zoho Books Invoice Automation - OAuth 2.0 Handler
 * 
 * Manages Zoho Books API access token retrieval, caching, and refresh flows.
 */

/**
 * 1. Log the Authorization URL
 * Run this function in the Apps Script editor to get your Auth URL.
 * Ensure you have deployed the script as a Web App first and set WEB_APP_URL in Config.gs.
 */
function logAuthUrl() {
  const redirectUri = WEB_APP_URL || ScriptApp.getService().getUrl();
  
  if (!redirectUri || redirectUri.indexOf('https://script.google.com') !== 0) {
    Logger.log('WARNING: Web App URL is not set. Please deploy the script as a Web App (Deploy -> New Deployment -> Web App) and update WEB_APP_URL in Config.gs.');
  }
  
  const authUrl = ZOHO_AUTH_URL + 
    '?scope=' + encodeURIComponent(ZOHO_SCOPE) + 
    '&client_id=' + ZOHO_CLIENT_ID + 
    '&response_type=code' + 
    '&redirect_uri=' + encodeURIComponent(redirectUri) + 
    '&access_type=offline' + 
    '&prompt=consent';
  
  Logger.log('\n========================================================================\n' +
             'ZOHO AUTHENTICATION URL:\n' +
             '========================================================================\n' +
             '1. Copy the URL below and paste it in your browser:\n\n' + 
             authUrl + '\n\n' +
             '2. After granting permission, you will be redirected to a page saying "Authorized Successfully".\n' +
             '========================================================================\n');
  
  return authUrl;
}

/**
 * 2. Web App Callback Handler
 * Receives the authorization code from Zoho and exchanges it for a refresh token.
 */
function doGet(e) {
  const code = e.parameter.code;
  if (!code) {
    return HtmlService.createHtmlOutput(
      '<h3>Authorization Failed</h3>' +
      '<p>Error: Authorization code not found in URL parameters.</p>'
    );
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
      return HtmlService.createHtmlOutput(
        '<h3>Failed to Exchange Grant Code</h3>' +
        '<p>Error: ' + result.error + '</p>' +
        '<p>Details: ' + resText + '</p>'
      );
    }
    
    const props = PropertiesService.getScriptProperties();
    
    // Store tokens in ScriptProperties (Shared across all users of this spreadsheet)
    if (result.refresh_token) {
      props.setProperty('ZOHO_REFRESH_TOKEN', result.refresh_token);
    }
    props.setProperty('ZOHO_ACCESS_TOKEN', result.access_token);
    props.setProperty('ZOHO_TOKEN_EXPIRY', (Date.now() + (result.expires_in * 1000)).toString());
    
    let html = '<div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; line-height: 1.6;">' +
               '<h2 style="color: #4CAF50;">Gudoria Zoho Integration Authorized Successfully!</h2>' +
               '<p>The <b>Refresh Token</b> has been securely stored in your Google Sheets script properties.</p>' +
               '<p>The automation is now ready to run. You can close this tab and return to your Google Sheet.</p>';
    
    if (!result.refresh_token) {
      html += '<div style="background-color: #FFF3CD; border: 1px solid #FFEBAA; padding: 10px; border-radius: 4px; color: #856404; margin-top: 15px;">' +
              '<b>Notice:</b> Zoho did not return a refresh token during this authorization. ' +
              'If you had authorized previously, Zoho assumes you already have the refresh token. ' +
              'If the sync fails, please revoke the "Google Apps Script Invoice Automation" access in your ' +
              '<a href="https://accounts.zoho.in" target="_blank">Zoho Accounts console</a> and run the Auth URL again.' +
              '</div>';
    }
    html += '</div>';
    
    return HtmlService.createHtmlOutput(html);
  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<h3>Internal Server Error During Token Exchange</h3>' +
      '<p>Exception: ' + err.toString() + '</p>'
    );
  }
}

/**
 * 3. Retrieve Access Token (with Automatic Refresh)
 * Checks cache first; makes token refresh call if expired or close to expiry (5 mins buffer).
 */
function getAccessToken() {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('ZOHO_ACCESS_TOKEN');
  const expiryStr = props.getProperty('ZOHO_TOKEN_EXPIRY');
  const refreshToken = props.getProperty('ZOHO_REFRESH_TOKEN');
  
  if (accessToken && expiryStr) {
    const expiry = parseInt(expiryStr, 10);
    // If token is still valid for more than 5 minutes, reuse it
    if (Date.now() < expiry - 300000) {
      return accessToken;
    }
  }
  
  if (!refreshToken) {
    throw new Error('NO_REFRESH_TOKEN: Zoho Books integration has not been authorized. ' +
                    'Please run the logAuthUrl() function in the Apps Script editor to authorize.');
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
      throw new Error('ZOHO_REFRESH_ERROR: ' + result.error + ' - ' + resText);
    }
    
    props.setProperty('ZOHO_ACCESS_TOKEN', result.access_token);
    props.setProperty('ZOHO_TOKEN_EXPIRY', (Date.now() + (result.expires_in * 1000)).toString());
    
    return result.access_token;
  } catch (err) {
    throw new Error('OAuth Refresh failed: ' + err.toString());
  }
}

/**
 * 4. Helper function to check stored auth credentials status
 */
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

/**
 * 5. Clear stored credentials
 * Run this function if you want to force a completely fresh authorization flow.
 */
function clearAuth() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('ZOHO_REFRESH_TOKEN');
  props.deleteProperty('ZOHO_ACCESS_TOKEN');
  props.deleteProperty('ZOHO_TOKEN_EXPIRY');
  Logger.log('OAuth credentials cleared successfully.');
}

/**
 * 6. Authorize using Self Client Grant Code
 * If you generated a grant code inside the Zoho Developer Console using "Self Client",
 * paste the grant code here and run this function. It will exchange it for a Refresh Token.
 * Note: Zoho Grant Codes expire in 3 minutes, so run this immediately after generating the code.
 * 
 * @param {String} grantCode Optional. If not provided, paste code in the placeholder below.
 */
function authorizeWithSelfClientCode(grantCode) {
  // If running from the editor, paste your fresh grant code here:
  const code = grantCode || 'PASTE_YOUR_GRANT_CODE_HERE';
  
  if (code === 'PASTE_YOUR_GRANT_CODE_HERE' || !code) {
    Logger.log('ERROR: Please provide a valid Zoho Grant Code. Paste it in the function call or replace the placeholder.');
    return;
  }
  
  Logger.log('Exchanging Self Client Grant Code for Zoho API Tokens...');
  
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
      Logger.log('Details: ' + resText);
      return 'Failed: ' + result.error;
    }
    
    const props = PropertiesService.getScriptProperties();
    if (result.refresh_token) {
      props.setProperty('ZOHO_REFRESH_TOKEN', result.refresh_token);
    }
    props.setProperty('ZOHO_ACCESS_TOKEN', result.access_token);
    props.setProperty('ZOHO_TOKEN_EXPIRY', (Date.now() + (result.expires_in * 1000)).toString());
    
    Logger.log('========================================================================');
    Logger.log('🟢 SUCCESS! Zoho Books authorization was successful.');
    Logger.log('The Refresh Token and Access Token have been securely stored.');
    Logger.log('========================================================================');
    
    if (!result.refresh_token) {
      Logger.log('⚠️ WARNING: No refresh token returned. If you are re-authorizing, please revoke the access in your Zoho account settings first, then generate a new grant code.');
    }
    
    return 'Success';
  } catch (err) {
    Logger.log('❌ EXCEPTION: ' + err.toString());
    return 'Error: ' + err.toString();
  }
}

/**
 * 7. Initialize Saved Refresh Token
 * Run this function once in the Apps Script editor to automatically initialize
 * the securely exchanged Refresh Token into your project settings.
 */
function saveStoredRefreshToken() {
  const refreshToken = '1000.edc26a2423e747273b9c7588b59a1b59.c8270ac98ff1319c3c30adec0241c655';
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ZOHO_REFRESH_TOKEN', refreshToken);
  
  Logger.log('========================================================================');
  Logger.log('🟢 SUCCESS! Refresh Token has been saved to Script Properties.');
  Logger.log('Stored Token: ' + refreshToken.substring(0, 15) + '...');
  Logger.log('========================================================================');
}

