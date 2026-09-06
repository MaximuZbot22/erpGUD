/**
 * Gudoria Zoho Books Invoice Automation - Item Service
 * 
 * Handles looking up existing product details (such as item IDs, default taxes, and HSN codes).
 */

/**
 * Searches for an item in Zoho Books by its exact name.
 * If the item is missing, returns an error since products are pre-configured.
 * 
 * @param {String} name Product name from the sheet.
 * @return {Object} Zoho Item details including item_id, rate, and HSN.
 */
function findItemByName(name) {
  if (!name) {
    throw new Error('VALIDATION_ERROR: Product name is required.');
  }
  
  const cleanName = name.trim();
  Logger.log(`Searching Zoho Books for product: "${cleanName}"`);
  
  // 1. Search using exact name parameter
  try {
    const response = callZohoAPI('/items', 'get', null, { name: cleanName });
    if (response.items && response.items.length > 0) {
      for (const item of response.items) {
        if (item.name.toLowerCase() === cleanName.toLowerCase()) {
          Logger.log(`Product found: "${item.name}" (ID: ${item.item_id}, Base Rate: ₹${item.rate})`);
          return item;
        }
      }
    }
  } catch (err) {
    Logger.log(`Product lookup by name parameter failed: ${err.message}`);
  }

  // 2. Search using search_text query parameter as fallback
  try {
    const response = callZohoAPI('/items', 'get', null, { search_text: cleanName });
    if (response.items && response.items.length > 0) {
      for (const item of response.items) {
        if (item.name.toLowerCase() === cleanName.toLowerCase()) {
          Logger.log(`Product found via fallback: "${item.name}" (ID: ${item.item_id}, Base Rate: ₹${item.rate})`);
          return item;
        }
      }
    }
  } catch (err) {
    Logger.log(`Product lookup by search_text failed: ${err.message}`);
  }

  // If we reach here, the product does not exist in Zoho Books.
  throw new Error(`ITEM_NOT_FOUND: The product "${cleanName}" was not found in Zoho Books. ` + 
                  `Please check spelling or create the product inside Zoho Books with this exact name.`);
}
