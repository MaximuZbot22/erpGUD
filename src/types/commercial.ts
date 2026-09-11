export type QuotationStatus = 'Draft' | 'Sent' | 'Negotiation' | 'Accepted' | 'Rejected' | 'Expired' | 'Converted';
export type SalesOrderStatus = 'Draft' | 'Confirmed' | 'Partially Fulfilled' | 'Fulfilled' | 'Cancelled';
export type DeliveryProvider = 'Porter' | 'Dunzo' | 'BlueDart' | 'Delhivery' | 'Self' | 'Scaria';
export type DeliveryStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Returned' | 'Failed';
export type ReturnDisposition = 'Restock' | 'Damaged' | 'Sample' | 'Disposal';

export interface CommercialLineItem {
  id: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
  taxableValue: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

export interface Quotation {
  id: string; // e.g. 'QT-001'
  quotationNumber: string;
  date: string;
  validUntil: string;
  customerId: string;
  customerName: string;
  items: CommercialLineItem[];
  subtotal: number;
  discountTotal: number;
  gstTotal: number;
  deliveryCharge: number;
  customizationCharge: number;
  grandTotal: number;
  version: number;
  status: QuotationStatus;
  notes?: string;
  convertedSalesOrderId?: string;
}

export interface CustomerPO {
  id: string;
  poNumber: string;
  poDate: string;
  customerId: string;
  linkedQuotationId?: string;
  amount: number;
  attachmentUrl?: string;
  notes?: string;
}

export interface SalesOrder {
  id: string; // e.g. 'SO-001'
  orderNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPoNumber?: string;
  items: CommercialLineItem[];
  subtotal: number;
  gstTotal: number;
  deliveryCharge: number;
  grandTotal: number;
  requestedDeliveryDate?: string;
  deliveryAddress: string;
  status: SalesOrderStatus;
  notes?: string;
  reservedStockBatchId?: string;
  invoiceId?: string;
}

export interface DeliveryRecord {
  id: string; // e.g. 'DEL-001'
  deliveryNumber: string;
  salesOrderId: string;
  customerId: string;
  customerName: string;
  deliveryDate: string;
  deliveryAddress: string;
  provider: DeliveryProvider;
  trackingId?: string;
  deliveryCharge: number;
  status: DeliveryStatus;
  proofOfDeliveryUrl?: string;
  notes?: string;
}

export interface CustomerReturnRecord {
  id: string; // e.g. 'RET-CUST-001'
  date: string;
  customerId: string;
  originalInvoiceId?: string;
  items: { sku: string; name: string; qty: number; unitPrice: number }[];
  disposition: ReturnDisposition;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  creditNoteId?: string;
  notes?: string;
}

export type NoteStatus = 'Draft' | 'Issued' | 'Applied' | 'Cancelled';

export type CreditNoteReason = 
  | 'Customer return'
  | 'Damaged/incorrect goods accepted for credit'
  | 'Overbilling'
  | 'Incorrect quantity billed'
  | 'Pricing correction'
  | 'Tax correction'
  | 'Commercial adjustment'
  | 'Order cancellation adjustment'
  | 'Other';

export type DebitNoteReason =
  | 'Short quantity received'
  | 'Damaged goods'
  | 'Wrong product received'
  | 'Quality issue'
  | 'Pricing discrepancy'
  | 'Tax discrepancy'
  | 'Supplier invoice discrepancy'
  | 'Return to supplier'
  | 'Other adjustment';

export interface CreditNoteLineItem {
  id: string;
  sku?: string;
  description: string;
  hsnSac?: string;
  originalQty?: number;
  creditQty: number;
  rate: number;
  discount?: number;
  taxableAmount: number;
  gstRate: number; // e.g. 0, 5, 12, 18, 28
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export interface DebitNoteLineItem {
  id: string;
  sku?: string;
  description: string;
  hsnSac?: string;
  quantity: number;
  rate: number;
  discount?: number;
  taxableAmount: number;
  gstRate: number; // e.g. 0, 5, 12, 18, 28
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export interface CreditNote {
  id: string; // e.g. 'CN-001' or 'CN-2026-001'
  creditNoteNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerGstin?: string;
  billingAddress?: string;
  deliveryAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
  originalInvoiceId: string;
  originalInvoiceNumber?: string;
  originalInvoiceDate?: string;
  salesOrderId?: string;
  salesOrderNumber?: string;
  returnId?: string;
  deliveryNoteNumber?: string;
  reason: CreditNoteReason | string;
  customReason?: string;
  items: Array<{
    id?: string;
    sku?: string;
    description?: string;
    hsnSac?: string;
    originalQty?: number;
    creditQty?: number;
    qty?: number;
    unitPrice?: number;
    rate?: number;
    discount?: number;
    taxableAmount?: number;
    gstRate?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    lineTotal?: number;
    total?: number;
  }>;
  taxableAmount: number;
  discountTotal?: number;
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
  gstAdjustment?: number;
  otherAdjustment?: number;
  totalCredit: number;
  grandTotal?: number;
  amountInWords?: string;
  status: NoteStatus;
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
  cancellationReason?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  issuedAt?: string;
  driveFileId?: string;
  driveUrl?: string;
  notes?: string;
}

export interface DebitNote {
  id: string; // e.g. 'DN-001' or 'DN-2026-001'
  debitNoteNumber: string;
  date: string;
  partyType?: 'Customer' | 'Supplier';
  supplierId: string;
  supplierName: string;
  supplierGstin?: string;
  supplierAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  grnId?: string;
  grnNumber?: string;
  supplierInvoiceNumber?: string;
  supplierInvoiceDate?: string;
  supplierIssueId?: string;
  originalDocumentId?: string;
  partyId?: string;
  partyName?: string;
  reason: DebitNoteReason | string;
  customReason?: string;
  items: Array<{
    id?: string;
    sku?: string;
    description?: string;
    hsnSac?: string;
    quantity?: number;
    qty?: number;
    unitPrice?: number;
    rate?: number;
    discount?: number;
    taxableAmount?: number;
    gstRate?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    lineTotal?: number;
    total?: number;
  }>;
  taxableAmount?: number;
  discountTotal?: number;
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
  amount?: number;
  taxAdjustment?: number;
  otherAdjustment?: number;
  totalAmount?: number;
  totalDebit?: number;
  grandTotal?: number;
  amountInWords?: string;
  status: NoteStatus;
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
  cancellationReason?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  issuedAt?: string;
  driveFileId?: string;
  driveUrl?: string;
  notes?: string;
}
