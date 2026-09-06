/**
 * Gudoria Zoho Books Invoice Automation - Zoho API Wrapper
 * 
 * Handles generic HTTP calls to the Zoho Books REST API, injecting authentication
 * headers, handling auto-discovery of Organization ID, and centralizing error handling.
 */

/**
 * 1. Fetch Organization ID with Auto-Discovery
 * Checks script properties first; if missing, fetches from Zoho account dynamically.
 */
function getOrganizationId() {
  const props = PropertiesService.getScriptProperties();
  let orgId = props.getProperty('ZOHO_ORG_ID');
  if (orgId) return orgId;
  
  if (DEFAULT_ZOHO_ORG_ID) {
    props.setProperty('ZOHO_ORG_ID', DEFAULT_ZOHO_ORG_ID);
    return DEFAULT_ZOHO_ORG_ID;
  }
  
  Logger.log('Organization ID not configured. Fetching dynamically from Zoho Books...');
  const accessToken = getAccessToken();
  const headers = {
    'Authorization': 'Zoho-oauthtoken ' + accessToken
  };
  
  const response = UrlFetchApp.fetch(ZOHO_BASE_URL + '/organizations', {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  });
  
  const responseCode = response.getResponseCode();
  const resText = response.getContentText();
  
  if (responseCode !== 200) {
    throw new Error('ORG_FETCH_FAILED: Zoho server returned status ' + responseCode + '. Response: ' + resText);
  }
  
  let result;
  try {
    result = JSON.parse(resText);
  } catch (e) {
    throw new Error('ORG_PARSE_FAILED: Failed to parse organization list: ' + resText);
  }
  
  if (result.code !== 0 || !result.organizations || result.organizations.length === 0) {
    throw new Error('AUTO_ORG_DISCOVERY_FAILED: Could not find any Zoho Books organizations. Please verify your Zoho account. Error: ' + resText);
  }
  
  // Grab the first organization associated with the account
  orgId = result.organizations[0].organization_id;
  props.setProperty('ZOHO_ORG_ID', orgId);
  Logger.log('Auto-discovered Zoho Books Organization ID: ' + orgId + ' (' + result.organizations[0].name + ')');
  return orgId;
}

/**
 * 2. Generic Zoho Books API Call Wrapper
 * Automatically resolves token and org ID, appends headers, and returns JSON.
 */
function callZohoAPI(endpoint, method, payload, queryParams) {
  const accessToken = getAccessToken();
  const orgId = getOrganizationId();
  
  // Clean endpoint path
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  let url = ZOHO_BASE_URL + cleanEndpoint;
  
  // Assemble query parameters (organization_id is always required)
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
  
  Logger.log('[Zoho API Call] ' + options.method.toUpperCase() + ' ' + cleanEndpoint);
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const resText = response.getContentText();
  
  let result;
  try {
    result = JSON.parse(resText);
  } catch (e) {
    throw new Error('API_RESPONSE_PARSE_ERROR: Zoho returned non-JSON response (Status ' + responseCode + '): ' + resText.substring(0, 500));
  }
  
  // Zoho returns code: 0 for successful operations
  if (result.code !== 0) {
    throw new Error('ZOHO_API_ERROR [' + result.code + ']: ' + result.message);
  }
  
  return result;
}
