/**
 * GUD ERP - CA & GST Sales Reconciliation & Export Utility
 * Standardized for Indian GST compliance (GSTR-1, GSTR-3B) and CA Audits
 */

export interface GstReconciliationRow {
  orderId: string;
  invoiceNo: string;
  invoiceDate: string; // DD-MM-YYYY
  customerName: string;
  customerId: string;
  customerGstin: string;
  placeOfSupply: string; // e.g. "32-Kerala"
  supplyType: 'B2B' | 'B2C';
  reverseCharge: 'N' | 'Y';
  itemsDescription: string;
  hsnCode: string;
  quantity: number;
  grossAmount: number;
  discount: number;
  taxableValue: number;
  gstRate: number; // e.g. 5, 12, 18
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalInvoiceValue: number;
  paymentStatus: string;
  entityName: string;
  notes?: string;
}

export interface GstSummaryKpis {
  totalInvoices: number;
  totalGrossAmount: number;
  totalDiscount: number;
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  totalInvoiceValue: number;
  b2bCount: number;
  b2cCount: number;
}

// Company State Code: Kerala is 32
export const COMPANY_HOME_STATE = 'Kerala';
export const COMPANY_HOME_STATE_CODE = '32';

/**
 * Normalizes date to DD-MM-YYYY format
 */
export function formatDateDMY(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.trim().split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY
        return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch {
    // Return original if parsing fails
  }
  return dateStr;
}

/**
 * Extracts Year-Month (YYYY-MM) from date string for filtering
 */
export function getYearMonthKey(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.trim().split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${d.getFullYear()}-${month}`;
    }
  } catch {}
  return '';
}

/**
 * Formats YYYY-MM into friendly string like "August 2026"
 */
export function formatMonthName(yearMonth: string): string {
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Checks whether customer is within Kerala (Intra-state) or Outside (Inter-state)
 */
export function isIntraState(stateStr: string = ''): boolean {
  if (!stateStr) return true; // Default to Kerala for local sales
  const s = stateStr.toLowerCase();
  return s.includes('kerala') || s.includes('ernakulam') || s.includes('kochi') || s.includes('calicut') || s.includes('trivandrum');
}

/**
 * Formats currency in standard Indian format (e.g. ₹ 1,23,456.78)
 */
export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(val || 0);
}

/**
 * Transforms raw order and customer records into CA-ready reconciliation row
 */
export function transformOrderToGstRow(
  order: any, 
  customerMap: Map<string, any>,
  defaultEntity: string = 'Goodoria Food Innovations'
): GstReconciliationRow {
  const customer = customerMap.get(order.Customer_ID) || {};
  const customerName = customer.Business_Name || customer.Contact_Person || order.Customer_ID || 'Retail Customer';
  
  // Detect GSTIN
  const gstin = customer.GST_Number || customer.GSTIN || (order.Notes && order.Notes.match(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/)?.[0]) || '';
  const supplyType: 'B2B' | 'B2C' = gstin ? 'B2B' : 'B2C';
  
  // Place of supply
  const rawState = customer.State || 'Kerala';
  const isLocal = isIntraState(rawState);
  const placeOfSupply = isLocal ? '32-Kerala' : rawState;

  // Numerical values
  const totalValue = parseFloat(String(order.Total_Value || order.Total_Amount || 0)) || 0;
  const rawGstPercent = parseFloat(String(order.GST_Percent || 0));
  // In FMCG chocolates/food, standard rate is 18% or 12%, default to 18% if unspecified or 0 with totalValue > 0
  const gstRate = rawGstPercent > 0 ? rawGstPercent : 18;
  
  // Taxable Value calculation: Total Value is generally inclusive in order logs, or derived from qty * price
  let taxableValue = 0;
  let totalTax = 0;
  
  if (totalValue > 0) {
    taxableValue = Math.round((totalValue / (1 + gstRate / 100)) * 100) / 100;
    totalTax = Math.round((totalValue - taxableValue) * 100) / 100;
  }

  // Tax splits
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isLocal) {
    cgstAmount = Math.round((totalTax / 2) * 100) / 100;
    sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;
  } else {
    igstAmount = totalTax;
  }

  const qty = parseInt(String(order.Qty || 1), 10) || 1;
  const invoiceNo = order.Invoice_Link || order.Invoice_Ref || `INV-${order.Order_ID || '000'}`;

  // Default HSN: 1806 for Chocolates / Confectionery
  const hsnCode = '180690';

  return {
    orderId: order.Order_ID || '',
    invoiceNo: invoiceNo,
    invoiceDate: formatDateDMY(order.Date || ''),
    customerName,
    customerId: order.Customer_ID || '',
    customerGstin: gstin || 'Unregistered',
    placeOfSupply,
    supplyType,
    reverseCharge: 'N',
    itemsDescription: order.Items || 'Artisanal Chocolates Assortment',
    hsnCode,
    quantity: qty,
    grossAmount: totalValue,
    discount: 0,
    taxableValue,
    gstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    totalInvoiceValue: totalValue,
    paymentStatus: order.Payment_Status || 'Pending',
    entityName: defaultEntity,
    notes: order.Notes || ''
  };
}

/**
 * Calculates aggregate KPIs across all rows
 */
export function calculateGstSummaryKpis(rows: GstReconciliationRow[]): GstSummaryKpis {
  return rows.reduce(
    (acc, row) => {
      acc.totalInvoices += 1;
      acc.totalGrossAmount += row.grossAmount;
      acc.totalDiscount += row.discount;
      acc.totalTaxableValue += row.taxableValue;
      acc.totalCgst += row.cgstAmount;
      acc.totalSgst += row.sgstAmount;
      acc.totalIgst += row.igstAmount;
      acc.totalTax += row.totalTax;
      acc.totalInvoiceValue += row.totalInvoiceValue;
      if (row.supplyType === 'B2B') acc.b2bCount += 1;
      else acc.b2cCount += 1;
      return acc;
    },
    {
      totalInvoices: 0,
      totalGrossAmount: 0,
      totalDiscount: 0,
      totalTaxableValue: 0,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      totalTax: 0,
      totalInvoiceValue: 0,
      b2bCount: 0,
      b2cCount: 0
    }
  );
}

/**
 * Generates an RFC-compliant CSV with UTF-8 BOM for immediate opening in Microsoft Excel & Tally
 */
export function exportGstReconciliationToCsv(
  rows: GstReconciliationRow[],
  kpis: GstSummaryKpis,
  selectedMonth: string,
  entityName: string
): void {
  const headers = [
    'Sl No',
    'Invoice Number',
    'Invoice Date (DD-MM-YYYY)',
    'Customer / Party Name',
    'Customer GSTIN',
    'Place of Supply (POS)',
    'Supply Type (B2B/B2C)',
    'Reverse Charge (RCM)',
    'Item Description',
    'HSN Code',
    'Quantity',
    'Taxable Value (INR)',
    'GST Rate (%)',
    'CGST Amount (INR)',
    'SGST Amount (INR)',
    'IGST Amount (INR)',
    'Total Tax (INR)',
    'Total Invoice Value (INR)',
    'Payment Status',
    'Company Entity',
    'Order Ref'
  ];

  const escapeCsv = (str: any): string => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvRows: string[] = [];

  // Title Meta Block
  csvRows.push(escapeCsv(`MONTHLY SALES & GST RECONCILIATION REGISTER - GUD ERP`));
  csvRows.push(`${escapeCsv('Company Entity:')},${escapeCsv(entityName)},${escapeCsv('Tax Period:')},${escapeCsv(selectedMonth || 'All Records')}`);
  csvRows.push(`${escapeCsv('Total Invoices:')},${kpis.totalInvoices},${escapeCsv('Total Taxable Value:')},${kpis.totalTaxableValue.toFixed(2)},${escapeCsv('Total GST Collected:')},${kpis.totalTax.toFixed(2)}`);
  csvRows.push(''); // Blank row separator

  // Main Headers
  csvRows.push(headers.map(escapeCsv).join(','));

  // Data Rows
  rows.forEach((row, index) => {
    const data = [
      index + 1,
      row.invoiceNo,
      row.invoiceDate,
      row.customerName,
      row.customerGstin,
      row.placeOfSupply,
      row.supplyType,
      row.reverseCharge,
      row.itemsDescription,
      row.hsnCode,
      row.quantity,
      row.taxableValue.toFixed(2),
      row.gstRate,
      row.cgstAmount.toFixed(2),
      row.sgstAmount.toFixed(2),
      row.igstAmount.toFixed(2),
      row.totalTax.toFixed(2),
      row.totalInvoiceValue.toFixed(2),
      row.paymentStatus,
      row.entityName,
      row.orderId
    ];
    csvRows.push(data.map(escapeCsv).join(','));
  });

  // Summary Totals Row
  csvRows.push('');
  const totalRow = [
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    rows.reduce((sum, r) => sum + r.quantity, 0),
    kpis.totalTaxableValue.toFixed(2),
    '',
    kpis.totalCgst.toFixed(2),
    kpis.totalSgst.toFixed(2),
    kpis.totalIgst.toFixed(2),
    kpis.totalTax.toFixed(2),
    kpis.totalInvoiceValue.toFixed(2),
    '',
    '',
    ''
  ];
  csvRows.push(totalRow.map(escapeCsv).join(','));

  const csvContent = csvRows.join('\r\n');
  // UTF-8 Byte Order Mark (\uFEFF) ensures Excel opens without character corruption
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const safeMonth = selectedMonth ? selectedMonth.replace(/[^a-zA-Z0-9]/g, '_') : 'All';
  const safeEntity = entityName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `CA_Sales_GST_Register_${safeEntity}_${safeMonth}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
