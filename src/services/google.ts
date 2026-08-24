/**
 * GUD ERP - Google Workspace Integration Services
 * 
 * This service implements real HTTP REST API endpoints using the user's
 * Google OAuth Access Token (obtained during Firebase Google Sign-In).
 * 
 * API Endpoints:
 * - Google Sheets: https://sheets.googleapis.com/v4/spreadsheets/
 * - Google Drive: https://www.googleapis.com/drive/v3/
 * - Google Docs: https://docs.googleapis.com/v1/documents/
 * - Google Calendar: https://www.googleapis.com/calendar/v3/
 * - Gmail: https://gmail.googleapis.com/gmail/v1/users/
 */

// Helper to make authorized Google API fetch requests
async function googleFetch(url: string, token: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr;
    try {
      parsedErr = JSON.parse(errText);
    } catch {
      parsedErr = { error: { message: errText } };
    }
    console.error(`Google API Error [${response.status}] for URL: ${url}`, parsedErr);
    throw new Error(parsedErr?.error?.message || `Google API error: ${response.statusText}`);
  }

  // Some endpoints return 204 No Content
  if (response.status === 204) return null;
  return response.json();
}

/**
 * 1. GOOGLE SHEETS SERVICE
 */
// Simple RFC-compliant CSV parser helper for public Sheets fallbacks
function parseCSV(text: string): any[][] {
  const lines: any[][] = [];
  const row: any[] = [];
  let inQuotes = false;
  let entry = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        entry += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(entry.trim());
      entry = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      row.push(entry.trim());
      entry = '';
      if (row.length > 0 && row.some(cell => cell !== '')) {
        lines.push([...row]);
      }
      row.length = 0;
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      entry += char;
    }
  }
  
  if (entry || row.length > 0) {
    row.push(entry.trim());
    if (row.length > 0 && row.some(cell => cell !== '')) {
      lines.push([...row]);
    }
  }

  return lines;
}

export class GoogleSheetsService {
  /**
   * Fetches data from a Google Spreadsheet range, falling back to public CSV if token is missing/unauthorized
   */
  static async getSpreadsheetValues(
    token: string | null,
    spreadsheetId: string,
    range: string
  ): Promise<{ values: any[][] }> {
    if (token) {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
        console.log(`[Google Sheets API] Fetching sheet: ${spreadsheetId}, range: ${range}`);
        return await googleFetch(url, token);
      } catch (err) {
        console.warn(`[Google Sheets API] Fetch failed for range ${range}, trying public CSV fallback...`, err);
      }
    }

    try {
      let sheetName = '';
      const singleQuoteMatch = range.match(/'([^']+)'/);
      if (singleQuoteMatch) {
        sheetName = singleQuoteMatch[1];
      } else {
        const parts = range.split('!');
        if (parts.length > 1) {
          sheetName = parts[0];
        }
      }

      const sheetQuery = sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : '';
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv${sheetQuery}`;
      console.log(`[Google Sheets CSV Fallback] Fetching from: ${url}`);
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      
      const csvText = await res.text();
      const parsedValues = parseCSV(csvText);

      let values = parsedValues;
      const isDataRange = range.includes('2') || range.includes('A2');
      if (isDataRange && values.length > 1) {
        values = values.slice(1);
      } else if (range.includes('A1:Z1') || range.includes('1:1')) {
        values = values.slice(0, 1);
      }

      return { values };
    } catch (fallbackErr) {
      console.error(`[Google Sheets Fallback] Public CSV load failed:`, fallbackErr);
      throw new Error(`Google Sheets fetch failed (no active token & public fallback failed).`);
    }
  }

  /**
   * Updates data in a Google Spreadsheet range
   */
  static async updateSpreadsheetValues(
    token: string,
    spreadsheetId: string,
    range: string,
    values: any[][],
    valueInputOption: 'RAW' | 'USER_ENTERED' = 'USER_ENTERED'
  ): Promise<any> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=${valueInputOption}`;
    console.log(`[Google Sheets] Updating sheet: ${spreadsheetId}, range: ${range}`);
    return googleFetch(url, token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    });
  }

  /**
   * Appends values to a spreadsheet
   */
  static async appendSpreadsheetValues(
    token: string,
    spreadsheetId: string,
    range: string,
    values: any[][],
    valueInputOption: 'RAW' | 'USER_ENTERED' = 'USER_ENTERED'
  ): Promise<any> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=${valueInputOption}`;
    console.log(`[Google Sheets] Appending sheet: ${spreadsheetId}, range: ${range}`);
    return googleFetch(url, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    });
  }

  /**
   * Bulk Populates all 16 tabs of the 6 v2 Spreadsheets from seedDataV2
   */
  static async populateAllSheetsFromSeed(token: string, seedData: Record<string, any[]>): Promise<{ totalRows: number; countMap: Record<string, number> }> {
    const env = import.meta.env;
    const sheetsMap: { id: string; tabs: string[] }[] = [
      {
        id: env.VITE_GOOGLE_SHEET_ORDERS || '1uUfxL_k6k4ebzHPWL4pwwtdIaxzZ-6mW4mqB_6iJnXo',
        tabs: ['Customer_Master', 'Orders_Log', 'Payments_Tracker']
      },
      {
        id: env.VITE_GOOGLE_SHEET_VENDORS || '1JDUQjgETO7xF0M2GaFsejkF3CWJGpPkz3zD9Qse9Zv8',
        tabs: ['Vendor_Master', 'Purchase_Orders', 'Goods_Received', 'Live_Stock']
      },
      {
        id: env.VITE_GOOGLE_SHEET_MARKETING || '1UI7o2XDjfea2QPDQ3kGE97p_0bIJhv5eK2XSNnrzT4M',
        tabs: ['Campaigns', 'Content_Planner', 'Events_Log']
      },
      {
        id: env.VITE_GOOGLE_SHEET_FINANCE || '1WuaX5JZLQ1IGNUBaVhK0dcqzrEbYX2fPz0qzR0Eit84',
        tabs: ['Income_Expenses', 'Cash_Flow']
      },
      {
        id: env.VITE_GOOGLE_SHEET_LEGAL || '1zvRLFrAeCs5siW4UdijmF_JNSJLOS8opDirQY5lEZAI',
        tabs: ['Legal_Master', 'Renewal_Tracker']
      },
      {
        id: env.VITE_GOOGLE_SHEET_TASKS || '1PIw-enBWLfu_LGwWDh6u1tdfjGCPO4P-Q5t2R0Eit84',
        tabs: ['Action_Items', 'Decision_Register']
      }
    ];

    let totalRows = 0;
    const countMap: Record<string, number> = {};

    for (const sheetConfig of sheetsMap) {
      for (const tabName of sheetConfig.tabs) {
        const rows = seedData[tabName] || [];
        if (rows.length === 0) continue;

        const headers = Object.keys(rows[0]);
        const gridValues = [
          headers,
          ...rows.map(r => headers.map(h => r[h] !== undefined ? String(r[h]) : ''))
        ];

        try {
          await this.updateSpreadsheetValues(
            token,
            sheetConfig.id,
            `'${tabName}'!A1`,
            gridValues
          );
          totalRows += rows.length;
          countMap[tabName] = rows.length;
          console.log(`[Seed Sync] Successfully populated '${tabName}' (${rows.length} rows)`);
        } catch (err) {
          console.warn(`[Seed Sync] Tab '${tabName}' update warning:`, err);
        }
      }
    }

    return { totalRows, countMap };
  }

  /**
   * Fetches metadata (including list of sheets/tabs) for a Spreadsheet
   */
  static async getSpreadsheetMetadata(
    token: string,
    spreadsheetId: string
  ): Promise<{ sheets: { properties: { title: string; sheetId: number } }[] }> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
    console.log(`[Google Sheets] Fetching metadata for spreadsheet: ${spreadsheetId}`);
    return googleFetch(url, token);
  }
}

/**
 * 2. GOOGLE DRIVE SERVICE
 */
export class GoogleDriveService {
  /**
   * Lists files in a given Drive folder (or root)
   */
  static async listFiles(
    token: string,
    options: { folderId?: string; maxResults?: number; query?: string } = {}
  ): Promise<{ files: any[] }> {
    let q = "trashed = false";
    if (options.folderId) {
      q += ` and '${options.folderId}' in parents`;
    }
    if (options.query) {
      q += ` and name contains '${options.query}'`;
    }

    const url = `https://www.googleapis.com/drive/v3/files?pageSize=${options.maxResults || 50}&fields=files(id,name,mimeType,webViewLink,iconLink,modifiedTime,size,owners)&q=${encodeURIComponent(q)}`;
    console.log(`[Google Drive] Listing files. Query: ${q}`);
    return googleFetch(url, token);
  }

  /**
   * Uploads a file to Google Drive
   */
  static async uploadFile(
    token: string,
    file: File,
    parentFolderId?: string
  ): Promise<any> {
    console.log(`[Google Drive] Uploading file: ${file.name} (${file.type})`);
    
    // Using multipart upload metadata + media
    const boundary = '-------GUD_ERP_BOUNDARY';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: file.name,
      mimeType: file.type,
      parents: parentFolderId ? [parentFolderId] : undefined,
    };

    const reader = new FileReader();
    const fileDataPromise = new Promise<string>((resolve) => {
      reader.onload = () => {
        const binary = reader.result as string;
        resolve(btoa(binary)); // base64 encode
      };
      reader.readAsBinaryString(file);
    });

    const base64Data = await fileDataPromise;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + file.type + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data +
      closeDelimiter;

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    
    return googleFetch(url, token, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });
  }

  /**
   * Generates web preview URLs or details for a file ID
   */
  static async getFileMetadata(token: string, fileId: string): Promise<any> {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink,iconLink,modifiedTime,size,version`;
    return googleFetch(url, token);
  }
}

/**
 * 3. GOOGLE DOCS SERVICE
 */
export class GoogleDocsService {
  /**
   * Reads a Google Doc document structure
   */
  static async getDocument(token: string, documentId: string): Promise<any> {
    const url = `https://docs.googleapis.com/v1/documents/${documentId}`;
    console.log(`[Google Docs] Retrieving document: ${documentId}`);
    return googleFetch(url, token);
  }

  /**
   * Appends text to a Google Doc
   */
  static async appendText(token: string, documentId: string, text: string): Promise<any> {
    const url = `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`;
    console.log(`[Google Docs] Appending text to document: ${documentId}`);
    
    const requests = [
      {
        insertText: {
          endOfSegmentLocation: {},
          text: text,
        },
      },
    ];

    return googleFetch(url, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });
  }
}

/**
 * 4. GOOGLE CALENDAR SERVICE
 */
export class GoogleCalendarService {
  /**
   * Lists events on a calendar
   */
  static async listEvents(
    token: string,
    calendarId: string = 'primary',
    options: { timeMin?: string; maxResults?: number } = {}
  ): Promise<{ items: any[] }> {
    const timeMinQuery = options.timeMin ? `&timeMin=${encodeURIComponent(options.timeMin)}` : '';
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?maxResults=${options.maxResults || 250}&orderBy=startTime&singleEvents=true${timeMinQuery}`;
    console.log(`[Google Calendar] Listing events for calendar: ${calendarId}`);
    return googleFetch(url, token);
  }

  /**
   * Creates an event in Google Calendar
   */
  static async createEvent(
    token: string,
    calendarId: string = 'primary',
    event: {
      summary: string;
      description?: string;
      start: { dateTime: string; timeZone?: string };
      end: { dateTime: string; timeZone?: string };
      colorId?: string;
    }
  ): Promise<any> {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
    console.log(`[Google Calendar] Creating event: "${event.summary}" on: ${calendarId}`);
    return googleFetch(url, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  }
}

/**
 * 5. GMAIL SERVICE
 */
export class GoogleGmailService {
  /**
   * Sends an email via Gmail API
   */
  static async sendEmail(
    token: string,
    email: {
      to: string;
      subject: string;
      body: string;
    }
  ): Promise<any> {
    console.log(`[Gmail API] Preparing to send email to: ${email.to}`);
    
    // Construct MIME message (RFC 822 format)
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(email.subject)))}?=`;
    const emailLines = [
      `To: ${email.to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      email.body,
    ];
    
    const message = emailLines.join('\r\n');
    // Base64Url encode
    const base64UrlMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
    return googleFetch(url, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: base64UrlMessage }),
    });
  }

  /**
   * Lists messages from user inbox
   */
  static async listMessages(token: string, maxResults: number = 10, q?: string): Promise<{ messages: any[] }> {
    const queryParam = q ? `&q=${encodeURIComponent(q)}` : '';
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${queryParam}`;
    return googleFetch(url, token);
  }
}
