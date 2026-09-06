/**
 * Gudoria Zoho Books Invoice Automation - Customer Service
 * 
 * Handles searching for existing contacts and automatically creating them if missing.
 */

/**
 * Main Entry Point: Find customer or create them if they do not exist.
 * @param {Object} data Customer details extracted from the Google Sheet row.
 * @return {String} Zoho Contact ID.
 */
function findOrCreateCustomer(data) {
  if (!data.name) {
    throw new Error('VALIDATION_ERROR: Customer name is required.');
  }

  // Clean names and values
  const name = data.name.trim();
  const gstNo = data.gst_no ? data.gst_no.trim() : '';
  const email = data.email ? data.email.trim() : '';
  
  Logger.log(`Searching for customer: "${name}"` + (gstNo ? ` (GSTIN: ${gstNo})` : ''));
  
  let contact = findCustomer(name, gstNo, email);
  
  if (contact) {
    Logger.log(`Customer found: "${contact.contact_name}" (ID: ${contact.contact_id})`);
    return contact.contact_id;
  }
  
  // If not found, create a new customer
  Logger.log(`Customer "${name}" not found. Creating a new contact...`);
  return createCustomer(data);
}

/**
 * Look up contact in Zoho Books using name, GSTIN, or email
 */
function findCustomer(name, gstNo, email) {
  // 1. Search by Contact Name (exact match check)
  try {
    const response = callZohoAPI('/contacts', 'get', null, { contact_name: name });
    if (response.contacts && response.contacts.length > 0) {
      for (const contact of response.contacts) {
        if (contact.contact_name.toLowerCase() === name.toLowerCase()) {
          return contact;
        }
      }
    }
  } catch (err) {
    Logger.log(`Search by name failed: ${err.message}`);
  }

  // 2. Search by GSTIN (using search_text query)
  if (gstNo) {
    try {
      const response = callZohoAPI('/contacts', 'get', null, { search_text: gstNo });
      if (response.contacts && response.contacts.length > 0) {
        // Return first match that matches GSTIN
        return response.contacts[0];
      }
    } catch (err) {
      Logger.log(`Search by GSTIN failed: ${err.message}`);
    }
  }

  // 3. Search by Email
  if (email) {
    try {
      const response = callZohoAPI('/contacts', 'get', null, { email: email });
      if (response.contacts && response.contacts.length > 0) {
        return response.contacts[0];
      }
    } catch (err) {
      Logger.log(`Search by Email failed: ${err.message}`);
    }
  }

  return null;
}

/**
 * Creates a new contact inside Zoho Books
 */
function createCustomer(data) {
  // Map GST Treatment to Zoho Books standards
  let gstTreatment = (data.gst_treatment || '').toLowerCase().trim();
  const gstNo = data.gst_no ? data.gst_no.trim() : '';
  
  // Auto-resolve treatment if not explicit
  if (!gstTreatment) {
    if (gstNo) {
      gstTreatment = 'business_gst';
    } else {
      gstTreatment = DEFAULT_GST_TREATMENT;
    }
  } else {
    // Map sheet friendly terms to Zoho treatment values
    if (gstTreatment.indexOf('register') !== -1 && gstTreatment.indexOf('un') === -1) {
      gstTreatment = 'business_gst';
    } else if (gstTreatment.indexOf('unregistered') !== -1) {
      gstTreatment = 'unregistered_business';
    } else if (gstTreatment.indexOf('consumer') !== -1) {
      gstTreatment = 'consumer';
    } else if (gstTreatment.indexOf('exempt') !== -1) {
      gstTreatment = 'business_no_gst';
    }
  }

  // Split contact person name into First and Last
  let firstName = data.contact_person || data.name;
  let lastName = '';
  if (data.contact_person) {
    const parts = data.contact_person.trim().split(/\s+/);
    if (parts.length > 1) {
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }
  }

  // Prepare billing state (defaults to Kerala or org state)
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

  // Only append GST number if it's registered business
  if (gstTreatment === 'business_gst' && gstNo) {
    contactPayload.gst_no = gstNo;
  }

  const result = callZohoAPI('/contacts', 'post', contactPayload);
  
  if (result.contact && result.contact.contact_id) {
    Logger.log(`Successfully created customer: "${result.contact.contact_name}" (ID: ${result.contact.contact_id})`);
    return result.contact.contact_id;
  }
  
  throw new Error('API_ERROR: Zoho Books contact creation failed.');
}
