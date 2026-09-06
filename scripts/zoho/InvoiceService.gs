/**
 * Gudoria Zoho Books Invoice Automation - Invoice Service
 * 
 * Handles tax resolution (CGST/SGST vs IGST), discount parsing, payload formatting,
 * and calling the Zoho Books API to create the invoice and return metadata.
 */

/**
 * Creates an invoice in Zoho Books.
 * 
 * @param {Object} data Struct containing validated sheet values.
 * @param {String} contactId Zoho Books Contact ID.
 * @param {Object} itemDetails Zoho Books Item details.
 * @return {Object} Metadata of the created invoice (number, id, pdf link).
 */
function createInvoice(data, contactId, itemDetails) {
  // 1. Determine Inter-state vs Intra-state for GST calculation
  const customerState = (data.state || '').trim();
  const isInterState = customerState && (customerState.toLowerCase() !== ORGANIZATION_HOME_STATE.toLowerCase());
  
  // 2. Resolve GST Tax ID dynamically based on rate and location
  let gstMode = (data.gst_mode || 'Tax Exclusive').trim().toLowerCase();
  let taxId = '';
  
  const isExempt = gstMode.indexOf('exempt') !== -1;
  const isInclusive = gstMode.indexOf('inclusive') !== -1;
  
  if (!isExempt) {
    taxId = getTaxIdByPercentAndType(DEFAULT_GST_PERCENT, isInterState);
  }
  
  // 3. Parse Discount
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

  // 4. Build line item payload
  const lineItem = {
    item_id: itemDetails.item_id,
    name: itemDetails.name,
    rate: parseFloat(data.rate), // Override rate from Google Sheets
    quantity: parseFloat(data.quantity),
    hsn_or_sac: itemDetails.hsn_or_sac || ''
  };
  
  if (taxId) {
    lineItem.tax_id = taxId;
  }

  // 5. Construct full invoice payload
  const invoicePayload = {
    customer_id: contactId,
    date: data.invoice_date || new Date().toISOString().split('T')[0], // YYYY-MM-DD
    is_inclusive_tax: isInclusive,
    line_items: [lineItem]
  };

  // Add discount if applicable
  if (discountValue > 0) {
    invoicePayload.discount = isDiscountPercent ? (discountValue + '%') : discountValue;
    invoicePayload.discount_type = discountType;
    invoicePayload.is_discount_before_tax = true; // Standard India GST practice
  }

  // Add courier/shipping charge if present
  const shipping = parseFloat(data.courier || 0);
  if (shipping > 0) {
    invoicePayload.shipping_charge = shipping;
  }

  // Add customer remarks/notes
  if (data.remarks) {
    invoicePayload.notes = data.remarks;
  }

  // 6. Submit Invoice to Zoho Books
  Logger.log(`Submitting Invoice to Zoho Books... (Inclusive Tax: ${isInclusive}, Inter-state: ${isInterState})`);
  const response = callZohoAPI('/invoices', 'post', invoicePayload);
  
  if (response.invoice && response.invoice.invoice_id) {
    const inv = response.invoice;
    
    // Resolve Zoho web view domain based on Config
    let domain = 'zoho.in';
    if (ZOHO_BASE_URL.indexOf('.com') !== -1) {
      domain = 'zoho.com';
    }
    const viewUrl = `https://books.${domain}/app#/invoices/${inv.invoice_id}`;
    
    Logger.log(`Successfully created Invoice: ${inv.invoice_number} (ID: ${inv.invoice_id})`);
    
    return {
      invoiceNumber: inv.invoice_number,
      invoiceId: inv.invoice_id,
      pdfUrl: viewUrl, // User-accessible link to print/PDF the invoice in their browser
      status: 'Success'
    };
  }
  
  throw new Error('API_ERROR: Zoho Books invoice creation failed.');
}

/**
 * Dynamically resolves the Zoho Tax ID for a given percent and location.
 */
function getTaxIdByPercentAndType(percent, isInterState) {
  Logger.log(`Resolving tax ID for GST ${percent}% (${isInterState ? 'IGST' : 'CGST+SGST'})...`);
  
  const response = callZohoAPI('/settings/taxes', 'get');
  if (!response.taxes || response.taxes.length === 0) {
    throw new Error('TAX_RESOLUTION_FAILED: No taxes configured in your Zoho Books account.');
  }
  
  const targetPercent = parseFloat(percent);
  
  // Look for tax matching the percentage and inter-state flag
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
  
  // Fallback: return the first tax matching the percentage
  for (const tax of response.taxes) {
    if (parseFloat(tax.tax_percentage) === targetPercent) {
      Logger.log(`WARNING: Exact tax matching type not found. Falling back to tax: "${tax.tax_name}"`);
      return tax.tax_id;
    }
  }
  
  throw new Error(`TAX_RESOLUTION_FAILED: Could not find any tax with percentage ${percent}% in Zoho Books settings.`);
}
