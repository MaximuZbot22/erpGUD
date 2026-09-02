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

export interface CreditNote {
  id: string; // e.g. 'CN-001'
  creditNoteNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  originalInvoiceId: string;
  reason: string;
  items: { sku: string; qty: number; unitPrice: number; total: number }[];
  taxableAmount: number;
  gstAdjustment: number;
  totalCredit: number;
  approvalStatus: 'Pending' | 'Approved';
  notes?: string;
}

export interface DebitNote {
  id: string; // e.g. 'DN-001'
  debitNoteNumber: string;
  date: string;
  partyType: 'Customer' | 'Supplier';
  partyId: string;
  partyName: string;
  originalDocumentId: string;
  reason: string;
  amount: number;
  taxAdjustment: number;
  totalAmount: number;
  approvalStatus: 'Pending' | 'Approved';
  notes?: string;
}
