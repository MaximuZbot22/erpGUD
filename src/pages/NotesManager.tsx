import React, { useState, useMemo } from 'react';
import { 
  CreditCard, Plus, FileText, Search, Filter, Calendar, 
  CheckCircle, AlertCircle, ArrowUpRight, ArrowDownLeft, Eye, 
  Edit3, Trash2, Printer, Download, CloudUpload, XCircle, 
  HelpCircle, ShieldCheck, ChevronRight, CornerDownRight, RotateCcw,
  Building2, User, Hash, Tag, FileSpreadsheet, Sparkles, ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { 
  CreditNote, 
  DebitNote, 
  CreditNoteLineItem, 
  DebitNoteLineItem, 
  CreditNoteReason, 
  DebitNoteReason, 
  NoteStatus 
} from '../types/commercial';
import { StorageEngine } from '../services/storageEngine';
import { auditLogService } from '../services/audit';
import { CreditNoteDocument } from '../components/documents/CreditNoteDocument';
import { DebitNoteDocument } from '../components/documents/DebitNoteDocument';
import { numberToWordsINR } from '../utils/numberToWords';
import { useNotifications } from '../context/NotificationContext';
import seedData from '../data/seedDataV2.json';

const STORAGE_CN_KEY = 'gud_credit_notes_v1';
const STORAGE_DN_KEY = 'gud_debit_notes_v1';

const CREDIT_NOTE_REASONS: CreditNoteReason[] = [
  'Customer return',
  'Damaged/incorrect goods accepted for credit',
  'Overbilling',
  'Incorrect quantity billed',
  'Pricing correction',
  'Tax correction',
  'Commercial adjustment',
  'Order cancellation adjustment',
  'Other'
];

const DEBIT_NOTE_REASONS: DebitNoteReason[] = [
  'Short quantity received',
  'Damaged goods',
  'Wrong product received',
  'Quality issue',
  'Pricing discrepancy',
  'Tax discrepancy',
  'Supplier invoice discrepancy',
  'Return to supplier',
  'Other adjustment'
];

const SEED_CREDIT_NOTES: CreditNote[] = [
  {
    id: 'CN-5101',
    creditNoteNumber: 'CN-5101',
    date: '2026-08-15',
    customerId: 'CUST-0074',
    customerName: 'Moby',
    customerGstin: '32AABCM1234F1Z9',
    billingAddress: 'Kaniyapilly Rd, near Holiday Inn Hotel, Ernakulam, Kerala 682028',
    deliveryAddress: 'Kaniyapilly Rd, near Holiday Inn Hotel, Ernakulam, Kerala 682028',
    contactPhone: '+91 98470 11223',
    contactEmail: 'moby.cafe@gmail.com',
    originalInvoiceId: 'INV-1153',
    originalInvoiceNumber: 'INV-1153',
    originalInvoiceDate: '2026-08-01',
    salesOrderId: 'SO-0212',
    salesOrderNumber: 'ORD-0212',
    returnId: 'RET-0042',
    reason: 'Damaged/incorrect goods accepted for credit',
    customReason: '2 units of Almond Noir 25g received crushed in transit during monsoon delivery.',
    items: [
      {
        id: 'CN-ITEM-1',
        sku: 'SKU-ALMOND-25G',
        description: 'Almond Noir (25g)',
        hsnSac: '1806',
        originalQty: 6,
        creditQty: 2,
        rate: 117.91,
        discount: 0,
        taxableAmount: 235.82,
        gstRate: 5,
        cgst: 5.90,
        sgst: 5.90,
        igst: 0,
        lineTotal: 247.62
      }
    ],
    taxableAmount: 235.82,
    discountTotal: 0,
    cgstTotal: 5.90,
    sgstTotal: 5.90,
    igstTotal: 0,
    gstAdjustment: 11.80,
    totalCredit: 247.62,
    grandTotal: 247.62,
    amountInWords: 'Rupees Two Hundred and Forty-Eight Only/-',
    status: 'Issued',
    approvalStatus: 'Approved',
    createdBy: 'MaximuZ (Finance)',
    createdAt: '2026-08-15T10:30:00Z',
    issuedAt: '2026-08-15T11:00:00Z',
    notes: 'Credit issued to client account balance for next PO settlement.'
  }
];

const SEED_DEBIT_NOTES: DebitNote[] = [
  {
    id: 'DN-6101',
    debitNoteNumber: 'DN-6101',
    date: '2026-08-18',
    supplierId: 'VEND-001',
    supplierName: 'Cocoa Horizons South India',
    supplierGstin: '33AABCC5544R1ZA',
    supplierAddress: 'Industrial Estate, Pollachi Road, Coimbatore, Tamil Nadu 641021',
    contactPhone: '+91 94433 88771',
    contactEmail: 'sales@cocoahorizons.in',
    purchaseOrderId: 'PO-2026-003',
    purchaseOrderNumber: 'PO-2026-003',
    grnId: 'GRN-0089',
    grnNumber: 'GRN-0089',
    supplierInvoiceNumber: 'CH-INV-8821',
    supplierInvoiceDate: '2026-08-10',
    supplierIssueId: 'ISSUE-QC-0012',
    reason: 'Short quantity received',
    customReason: 'Shipped 100kg organic cocoa nibs batch, physical weighment at GUD maradu received 95kg (5kg shortage).',
    items: [
      {
        id: 'DN-ITEM-1',
        sku: 'RM-COCOA-NIBS-ORG',
        description: 'Single Origin Organic Cocoa Nibs (Kg)',
        hsnSac: '1801',
        quantity: 5,
        rate: 650.00,
        discount: 0,
        taxableAmount: 3250.00,
        gstRate: 5,
        cgst: 81.25,
        sgst: 81.25,
        igst: 0,
        lineTotal: 3412.50
      }
    ],
    taxableAmount: 3250.00,
    discountTotal: 0,
    cgstTotal: 81.25,
    sgstTotal: 81.25,
    igstTotal: 0,
    taxAdjustment: 162.50,
    totalDebit: 3412.50,
    totalAmount: 3412.50,
    grandTotal: 3412.50,
    amountInWords: 'Rupees Three Thousand Four Hundred and Thirteen Only/-',
    status: 'Issued',
    approvalStatus: 'Approved',
    createdBy: 'MaximuZ (Procurement)',
    createdAt: '2026-08-18T14:20:00Z',
    issuedAt: '2026-08-18T15:00:00Z',
    notes: 'Deducted from August vendor account payable invoice.'
  }
];

export const NotesManager: React.FC = () => {
  const notificationCtx = useNotifications();

  // Primary State
  const [activeTab, setActiveTab] = useState<'credit_notes' | 'debit_notes' | 'guide'>('credit_notes');
  const [viewingDoc, setViewingDoc] = useState<{ type: 'CN' | 'DN'; data: any } | null>(null);

  // Storage
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(() => {
    const list = StorageEngine.getLocal<CreditNote[]>(STORAGE_CN_KEY, []);
    if (list.length === 0) {
      StorageEngine.setLocal(STORAGE_CN_KEY, SEED_CREDIT_NOTES);
      return SEED_CREDIT_NOTES;
    }
    return list;
  });

  const [debitNotes, setDebitNotes] = useState<DebitNote[]>(() => {
    const list = StorageEngine.getLocal<DebitNote[]>(STORAGE_DN_KEY, []);
    if (list.length === 0) {
      StorageEngine.setLocal(STORAGE_DN_KEY, SEED_DEBIT_NOTES);
      return SEED_DEBIT_NOTES;
    }
    return list;
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modals
  const [isCnModalOpen, setIsCnModalOpen] = useState(false);
  const [isDnModalOpen, setIsDnModalOpen] = useState(false);
  const [editingCn, setEditingCn] = useState<CreditNote | null>(null);
  const [editingDn, setEditingDn] = useState<DebitNote | null>(null);

  // Cancellation Modal
  const [cancelModalData, setCancelModalData] = useState<{ type: 'CN' | 'DN'; id: string; reason: string } | null>(null);

  // Linked Record Inspector Modal
  const [inspectLinkedRecord, setInspectLinkedRecord] = useState<{ title: string; data: any } | null>(null);

  // --- Credit Note Form State ---
  const [cnForm, setCnForm] = useState<{
    creditNoteNumber: string;
    date: string;
    customerId: string;
    customerName: string;
    customerGstin: string;
    billingAddress: string;
    deliveryAddress: string;
    originalInvoiceNumber: string;
    originalInvoiceDate: string;
    salesOrderNumber: string;
    returnId: string;
    reason: CreditNoteReason;
    customReason: string;
    items: CreditNoteLineItem[];
    notes: string;
  }>({
    creditNoteNumber: '',
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    customerName: '',
    customerGstin: '',
    billingAddress: '',
    deliveryAddress: '',
    originalInvoiceNumber: '',
    originalInvoiceDate: '',
    salesOrderNumber: '',
    returnId: '',
    reason: 'Customer return',
    customReason: '',
    items: [
      {
        id: 'ITEM-1',
        sku: 'SKU-CHOCO-25G',
        description: '25g Artisan Chocolate Bar',
        hsnSac: '1806',
        originalQty: 10,
        creditQty: 2,
        rate: 99,
        discount: 0,
        taxableAmount: 198,
        gstRate: 5,
        cgst: 4.95,
        sgst: 4.95,
        igst: 0,
        lineTotal: 207.90
      }
    ],
    notes: ''
  });

  // --- Debit Note Form State ---
  const [dnForm, setDnForm] = useState<{
    debitNoteNumber: string;
    date: string;
    supplierId: string;
    supplierName: string;
    supplierGstin: string;
    supplierAddress: string;
    purchaseOrderNumber: string;
    grnNumber: string;
    supplierInvoiceNumber: string;
    supplierInvoiceDate: string;
    supplierIssueId: string;
    reason: DebitNoteReason;
    customReason: string;
    items: DebitNoteLineItem[];
    notes: string;
  }>({
    debitNoteNumber: '',
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    supplierName: '',
    supplierGstin: '',
    supplierAddress: '',
    purchaseOrderNumber: '',
    grnNumber: '',
    supplierInvoiceNumber: '',
    supplierInvoiceDate: '',
    supplierIssueId: '',
    reason: 'Short quantity received',
    customReason: '',
    items: [
      {
        id: 'ITEM-1',
        sku: 'RM-INGREDIENT-01',
        description: 'Packaging / Raw Material Claim',
        hsnSac: '1806',
        quantity: 5,
        rate: 150,
        discount: 0,
        taxableAmount: 750,
        gstRate: 5,
        cgst: 18.75,
        sgst: 18.75,
        igst: 0,
        lineTotal: 787.50
      }
    ],
    notes: ''
  });

  // Known Invoices from Orders
  const availableInvoices = useMemo(() => {
    return [
      { id: 'INV-1153', orderId: 'ORD-0212', customer: 'Moby', customerId: 'CUST-0074', date: '2026-08-01', items: 'Almond 25g x6', qty: 6, rate: 117.91, gstin: '32AABCM1234F1Z9', address: 'Kaniyapilly Rd, near Holiday Inn Hotel, Ernakulam, Kerala' },
      { id: 'INV-1154', orderId: 'ORD-0213', customer: 'Naveen', customerId: 'CUST-0041', date: '2026-08-03', items: 'Almond 25g x1, Peanut x1, Orange x1, Lemon x1, Mocha x1, Sea Salt x1, Jackfruit x1', qty: 7, rate: 117.91, gstin: '', address: 'Delivery: Self, Kochi, Kerala' },
      { id: 'INV-1155', orderId: 'ORD-0214', customer: 'Nihala Jasmine', customerId: 'CUST-0075', date: '2026-08-03', items: '8 Piece Gift Box x2, 25g Bars x4', qty: 6, rate: 250.00, gstin: '', address: 'Naduvath House No:4, Kanhiyoor, Mookuthala Post, Malapuram' },
      { id: 'INV-1156', orderId: 'ORD-0215', customer: 'Dr. Dental Clinic', customerId: 'CUST-DRDENTAL', date: '2026-08-05', items: 'Executive Kerala Hamper x5', qty: 5, rate: 1200.00, gstin: '32AABFD4455K1ZX', address: 'MG Road, Kochi, Kerala' }
    ];
  }, []);

  // Known POs from Supply Chain
  const availablePOs = useMemo(() => {
    return [
      { poNumber: 'PO-2026-001', vendor: 'Deluxe Box Makers', vendorId: 'VEND-002', gstin: '32AAAFD9988C1ZT', address: 'Plot 14, Cochin Special Economic Zone, Kakkanad, Kochi', item: '10x12 Luxury Hamper Boxes', qty: 100, rate: 169.49, gstRate: 18 },
      { poNumber: 'PO-2026-002', vendor: 'Kerala Delights', vendorId: 'VEND-003', gstin: '32AABBK3344P1Z2', address: 'NH Bypass, Aluva, Ernakulam', item: 'Banana Chips Tins (100g)', qty: 200, rate: 41.00, gstRate: 18 },
      { poNumber: 'PO-2026-003', vendor: 'Cocoa Horizons South India', vendorId: 'VEND-001', gstin: '33AABCC5544R1ZA', address: 'Industrial Estate, Pollachi Road, Coimbatore', item: 'Single Origin Organic Cocoa Nibs (Kg)', qty: 100, rate: 650.00, gstRate: 5 },
      { poNumber: 'PO-2026-004', vendor: 'Fine Prints Studio', vendorId: 'VEND-004', gstin: '32AABFP7766Q1Z9', address: 'Palarivattom, Ernakulam', item: 'Custom Gold Foil Note Cards', qty: 500, rate: 14.80, gstRate: 18 }
    ];
  }, []);

  // Open Create Credit Note Modal
  const handleOpenCreateCn = () => {
    const nextNum = `CN-${5100 + creditNotes.length + 1}`;
    setEditingCn(null);
    setCnForm({
      creditNoteNumber: nextNum,
      date: new Date().toISOString().split('T')[0],
      customerId: 'CUST-0074',
      customerName: 'Moby',
      customerGstin: '32AABCM1234F1Z9',
      billingAddress: 'Kaniyapilly Rd, near Holiday Inn Hotel, Ernakulam, Kerala',
      deliveryAddress: 'Kaniyapilly Rd, near Holiday Inn Hotel, Ernakulam, Kerala',
      originalInvoiceNumber: 'INV-1153',
      originalInvoiceDate: '2026-08-01',
      salesOrderNumber: 'ORD-0212',
      returnId: '',
      reason: 'Customer return',
      customReason: '',
      items: [
        {
          id: `ITEM-${Date.now()}-1`,
          sku: 'SKU-ALMOND-25G',
          description: 'Almond Noir (25g)',
          hsnSac: '1806',
          originalQty: 6,
          creditQty: 1,
          rate: 117.91,
          discount: 0,
          taxableAmount: 117.91,
          gstRate: 5,
          cgst: 2.95,
          sgst: 2.95,
          igst: 0,
          lineTotal: 123.81
        }
      ],
      notes: 'Adjustment to be applied against next invoice billing.'
    });
    setIsCnModalOpen(true);
  };

  // Open Edit Credit Note Modal
  const handleOpenEditCn = (cn: CreditNote) => {
    if (cn.status === 'Cancelled') {
      alert('Cancelled Credit Notes cannot be edited. Please create a new Credit Note if needed.');
      return;
    }
    setEditingCn(cn);
    setCnForm({
      creditNoteNumber: cn.creditNoteNumber,
      date: cn.date,
      customerId: cn.customerId,
      customerName: cn.customerName,
      customerGstin: cn.customerGstin || '',
      billingAddress: cn.billingAddress || '',
      deliveryAddress: cn.deliveryAddress || '',
      originalInvoiceNumber: cn.originalInvoiceNumber || cn.originalInvoiceId || '',
      originalInvoiceDate: cn.originalInvoiceDate || '',
      salesOrderNumber: cn.salesOrderNumber || '',
      returnId: cn.returnId || '',
      reason: cn.reason as CreditNoteReason,
      customReason: cn.customReason || '',
      items: (cn.items || []).map((it, idx) => ({
        id: it.id || `ITEM-${idx}`,
        sku: it.sku || '',
        description: it.description || 'Credited Item',
        hsnSac: it.hsnSac || '1806',
        originalQty: it.originalQty || it.qty || 1,
        creditQty: it.creditQty || it.qty || 1,
        rate: it.rate || it.unitPrice || 0,
        discount: it.discount || 0,
        taxableAmount: it.taxableAmount || 0,
        gstRate: it.gstRate || 5,
        cgst: it.cgst || 0,
        sgst: it.sgst || 0,
        igst: it.igst || 0,
        lineTotal: it.lineTotal || it.total || 0
      })),
      notes: cn.notes || ''
    });
    setIsCnModalOpen(true);
  };

  // Auto-fill from Invoice selection
  const handleSelectInvoiceForCn = (invoiceNo: string) => {
    const inv = availableInvoices.find(i => i.id === invoiceNo);
    if (!inv) return;

    setCnForm(prev => ({
      ...prev,
      originalInvoiceNumber: inv.id,
      originalInvoiceDate: inv.date,
      salesOrderNumber: inv.orderId,
      customerId: inv.customerId,
      customerName: inv.customer,
      customerGstin: inv.gstin,
      billingAddress: inv.address,
      deliveryAddress: inv.address,
      items: [
        {
          id: `ITEM-${Date.now()}-1`,
          sku: 'SKU-INVOICE-ITEM',
          description: inv.items,
          hsnSac: '1806',
          originalQty: inv.qty,
          creditQty: 1,
          rate: inv.rate,
          discount: 0,
          taxableAmount: inv.rate,
          gstRate: 5,
          cgst: Number((inv.rate * 0.025).toFixed(2)),
          sgst: Number((inv.rate * 0.025).toFixed(2)),
          igst: 0,
          lineTotal: Number((inv.rate * 1.05).toFixed(2))
        }
      ]
    }));
  };

  // Update CN line item
  const handleUpdateCnLine = (index: number, field: keyof CreditNoteLineItem, value: any) => {
    const nextItems = [...cnForm.items];
    const item = { ...nextItems[index], [field]: value };

    // Recompute line math
    const creditQty = field === 'creditQty' ? Number(value) : (item.creditQty || 1);
    const rate = field === 'rate' ? Number(value) : (item.rate || 0);
    const discount = field === 'discount' ? Number(value) : (item.discount || 0);
    const gstRate = field === 'gstRate' ? Number(value) : (item.gstRate || 5);

    const taxableAmount = Math.max(0, (creditQty * rate) - discount);
    const totalGst = (taxableAmount * gstRate) / 100;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const lineTotal = taxableAmount + totalGst;

    item.taxableAmount = Number(taxableAmount.toFixed(2));
    item.cgst = Number(cgst.toFixed(2));
    item.sgst = Number(sgst.toFixed(2));
    item.igst = 0;
    item.lineTotal = Number(lineTotal.toFixed(2));

    nextItems[index] = item;
    setCnForm(prev => ({ ...prev, items: nextItems }));
  };

  // Add CN line item
  const handleAddCnLine = () => {
    const newItem: CreditNoteLineItem = {
      id: `ITEM-${Date.now()}-${cnForm.items.length + 1}`,
      sku: 'SKU-CUSTOM',
      description: 'Additional Line Adjustment',
      hsnSac: '1806',
      originalQty: 1,
      creditQty: 1,
      rate: 100,
      discount: 0,
      taxableAmount: 100,
      gstRate: 5,
      cgst: 2.5,
      sgst: 2.5,
      igst: 0,
      lineTotal: 105
    };
    setCnForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  // Remove CN line item
  const handleRemoveCnLine = (index: number) => {
    if (cnForm.items.length <= 1) {
      alert('A Credit Note must have at least one line item.');
      return;
    }
    setCnForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  // Save Credit Note (Draft or Issued)
  const handleSaveCreditNote = (finalStatus: NoteStatus = 'Issued') => {
    if (!cnForm.customerName.trim()) {
      alert('Please enter a Customer Name.');
      return;
    }
    if (!cnForm.originalInvoiceNumber.trim()) {
      alert('Please specify the Original Invoice Number being credited.');
      return;
    }

    const taxableAmount = cnForm.items.reduce((sum, it) => sum + (it.taxableAmount || 0), 0);
    const discountTotal = cnForm.items.reduce((sum, it) => sum + (it.discount || 0), 0);
    const cgstTotal = cnForm.items.reduce((sum, it) => sum + (it.cgst || 0), 0);
    const sgstTotal = cnForm.items.reduce((sum, it) => sum + (it.sgst || 0), 0);
    const igstTotal = cnForm.items.reduce((sum, it) => sum + (it.igst || 0), 0);
    const totalTax = cgstTotal + sgstTotal + igstTotal;
    const totalCredit = taxableAmount + totalTax;
    const amountInWords = numberToWordsINR(totalCredit);

    if (editingCn) {
      // Update existing
      const updated: CreditNote = {
        ...editingCn,
        creditNoteNumber: cnForm.creditNoteNumber || editingCn.creditNoteNumber,
        date: cnForm.date,
        customerId: cnForm.customerId || editingCn.customerId,
        customerName: cnForm.customerName,
        customerGstin: cnForm.customerGstin,
        billingAddress: cnForm.billingAddress,
        deliveryAddress: cnForm.deliveryAddress,
        originalInvoiceNumber: cnForm.originalInvoiceNumber,
        originalInvoiceDate: cnForm.originalInvoiceDate,
        salesOrderNumber: cnForm.salesOrderNumber,
        returnId: cnForm.returnId,
        reason: cnForm.reason,
        customReason: cnForm.customReason,
        items: cnForm.items,
        taxableAmount: Number(taxableAmount.toFixed(2)),
        discountTotal: Number(discountTotal.toFixed(2)),
        cgstTotal: Number(cgstTotal.toFixed(2)),
        sgstTotal: Number(sgstTotal.toFixed(2)),
        igstTotal: Number(igstTotal.toFixed(2)),
        gstAdjustment: Number(totalTax.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        grandTotal: Number(totalCredit.toFixed(2)),
        amountInWords,
        status: finalStatus,
        updatedAt: new Date().toISOString(),
        notes: cnForm.notes
      };

      const updatedList = creditNotes.map(c => c.id === updated.id ? updated : c);
      setCreditNotes(updatedList);
      StorageEngine.setLocal(STORAGE_CN_KEY, updatedList);
      setIsCnModalOpen(false);

      auditLogService.logSystemActivity(
        `Credit Note Updated`,
        `CN ${updated.creditNoteNumber} for ${updated.customerName}. Value: ₹${updated.totalCredit}`
      );
      if (notificationCtx?.sendNotification) {
        notificationCtx.sendNotification({
          title: 'Credit Note Updated',
          message: `Credit Note ${updated.creditNoteNumber} successfully saved (${finalStatus}).`,
          priority: 'low',
          channels: ['in-app']
        }).catch(() => {});
      }
    } else {
      // Create new
      const newCn: CreditNote = {
        id: `CN-${Date.now().toString().slice(-4)}`,
        creditNoteNumber: cnForm.creditNoteNumber || `CN-${5100 + creditNotes.length + 1}`,
        date: cnForm.date,
        customerId: cnForm.customerId || `CUST-${Date.now().toString().slice(-4)}`,
        customerName: cnForm.customerName,
        customerGstin: cnForm.customerGstin,
        billingAddress: cnForm.billingAddress,
        deliveryAddress: cnForm.deliveryAddress,
        originalInvoiceId: cnForm.originalInvoiceNumber,
        originalInvoiceNumber: cnForm.originalInvoiceNumber,
        originalInvoiceDate: cnForm.originalInvoiceDate,
        salesOrderId: cnForm.salesOrderNumber,
        salesOrderNumber: cnForm.salesOrderNumber,
        returnId: cnForm.returnId,
        reason: cnForm.reason,
        customReason: cnForm.customReason,
        items: cnForm.items,
        taxableAmount: Number(taxableAmount.toFixed(2)),
        discountTotal: Number(discountTotal.toFixed(2)),
        cgstTotal: Number(cgstTotal.toFixed(2)),
        sgstTotal: Number(sgstTotal.toFixed(2)),
        igstTotal: Number(igstTotal.toFixed(2)),
        gstAdjustment: Number(totalTax.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        grandTotal: Number(totalCredit.toFixed(2)),
        amountInWords,
        status: finalStatus,
        approvalStatus: 'Approved',
        createdBy: 'MaximuZ (Finance)',
        createdAt: new Date().toISOString(),
        issuedAt: finalStatus === 'Issued' ? new Date().toISOString() : undefined,
        notes: cnForm.notes
      };

      const updatedList = [newCn, ...creditNotes];
      setCreditNotes(updatedList);
      StorageEngine.setLocal(STORAGE_CN_KEY, updatedList);
      setIsCnModalOpen(false);

      auditLogService.logSystemActivity(
        `Credit Note Created`,
        `CN ${newCn.creditNoteNumber} for ${newCn.customerName}. Value: ₹${newCn.totalCredit}`
      );
      if (notificationCtx?.sendNotification) {
        notificationCtx.sendNotification({
          title: 'Credit Note Created',
          message: `Credit Note ${newCn.creditNoteNumber} created (${finalStatus}).`,
          priority: 'low',
          channels: ['in-app']
        }).catch(() => {});
      }
    }
  };

  // --- Open Create Debit Note Modal ---
  const handleOpenCreateDn = () => {
    const nextNum = `DN-${6100 + debitNotes.length + 1}`;
    setEditingDn(null);
    setDnForm({
      debitNoteNumber: nextNum,
      date: new Date().toISOString().split('T')[0],
      supplierId: 'VEND-001',
      supplierName: 'Cocoa Horizons South India',
      supplierGstin: '33AABCC5544R1ZA',
      supplierAddress: 'Industrial Estate, Pollachi Road, Coimbatore, Tamil Nadu',
      purchaseOrderNumber: 'PO-2026-003',
      grnNumber: 'GRN-0089',
      supplierInvoiceNumber: 'CH-INV-8821',
      supplierInvoiceDate: '2026-08-10',
      supplierIssueId: '',
      reason: 'Short quantity received',
      customReason: '',
      items: [
        {
          id: `ITEM-${Date.now()}-1`,
          sku: 'RM-COCOA-NIBS-ORG',
          description: 'Single Origin Organic Cocoa Nibs (Kg)',
          hsnSac: '1801',
          quantity: 5,
          rate: 650,
          discount: 0,
          taxableAmount: 3250,
          gstRate: 5,
          cgst: 81.25,
          sgst: 81.25,
          igst: 0,
          lineTotal: 3412.50
        }
      ],
      notes: 'Claim amount to be adjusted in August vendor payable balance.'
    });
    setIsDnModalOpen(true);
  };

  // Open Edit Debit Note Modal
  const handleOpenEditDn = (dn: DebitNote) => {
    if (dn.status === 'Cancelled') {
      alert('Cancelled Debit Notes cannot be edited. Please create a new Debit Note if needed.');
      return;
    }
    setEditingDn(dn);
    setDnForm({
      debitNoteNumber: dn.debitNoteNumber,
      date: dn.date,
      supplierId: dn.supplierId,
      supplierName: dn.supplierName || dn.partyName || '',
      supplierGstin: dn.supplierGstin || '',
      supplierAddress: dn.supplierAddress || '',
      purchaseOrderNumber: dn.purchaseOrderNumber || '',
      grnNumber: dn.grnNumber || '',
      supplierInvoiceNumber: dn.supplierInvoiceNumber || '',
      supplierInvoiceDate: dn.supplierInvoiceDate || '',
      supplierIssueId: dn.supplierIssueId || '',
      reason: dn.reason as DebitNoteReason,
      customReason: dn.customReason || '',
      items: (dn.items || []).map((it, idx) => ({
        id: it.id || `ITEM-${idx}`,
        sku: it.sku || '',
        description: it.description || 'Claim Item',
        hsnSac: it.hsnSac || '1801',
        quantity: it.quantity || it.qty || 1,
        rate: it.rate || it.unitPrice || 0,
        discount: it.discount || 0,
        taxableAmount: it.taxableAmount || 0,
        gstRate: it.gstRate || 5,
        cgst: it.cgst || 0,
        sgst: it.sgst || 0,
        igst: it.igst || 0,
        lineTotal: it.lineTotal || it.total || 0
      })),
      notes: dn.notes || ''
    });
    setIsDnModalOpen(true);
  };

  // Auto-fill from PO selection
  const handleSelectPOForDn = (poNo: string) => {
    const po = availablePOs.find(p => p.poNumber === poNo);
    if (!po) return;

    setDnForm(prev => ({
      ...prev,
      purchaseOrderNumber: po.poNumber,
      supplierId: po.vendorId,
      supplierName: po.vendor,
      supplierGstin: po.gstin,
      supplierAddress: po.address,
      items: [
        {
          id: `ITEM-${Date.now()}-1`,
          sku: 'PO-ITEM-CLAIM',
          description: po.item,
          hsnSac: '1806',
          quantity: 2,
          rate: po.rate,
          discount: 0,
          taxableAmount: Number((2 * po.rate).toFixed(2)),
          gstRate: po.gstRate,
          cgst: Number(((2 * po.rate * po.gstRate) / 200).toFixed(2)),
          sgst: Number(((2 * po.rate * po.gstRate) / 200).toFixed(2)),
          igst: 0,
          lineTotal: Number(((2 * po.rate) * (1 + po.gstRate / 100)).toFixed(2))
        }
      ]
    }));
  };

  // Update DN line item
  const handleUpdateDnLine = (index: number, field: keyof DebitNoteLineItem, value: any) => {
    const nextItems = [...dnForm.items];
    const item = { ...nextItems[index], [field]: value };

    const quantity = field === 'quantity' ? Number(value) : (item.quantity || 1);
    const rate = field === 'rate' ? Number(value) : (item.rate || 0);
    const discount = field === 'discount' ? Number(value) : (item.discount || 0);
    const gstRate = field === 'gstRate' ? Number(value) : (item.gstRate || 5);

    const taxableAmount = Math.max(0, (quantity * rate) - discount);
    const totalGst = (taxableAmount * gstRate) / 100;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const lineTotal = taxableAmount + totalGst;

    item.taxableAmount = Number(taxableAmount.toFixed(2));
    item.cgst = Number(cgst.toFixed(2));
    item.sgst = Number(sgst.toFixed(2));
    item.igst = 0;
    item.lineTotal = Number(lineTotal.toFixed(2));

    nextItems[index] = item;
    setDnForm(prev => ({ ...prev, items: nextItems }));
  };

  // Add DN line item
  const handleAddDnLine = () => {
    const newItem: DebitNoteLineItem = {
      id: `ITEM-${Date.now()}-${dnForm.items.length + 1}`,
      sku: 'SKU-SUPPLIER-CLAIM',
      description: 'Additional Shortage / Defect Item',
      hsnSac: '1806',
      quantity: 1,
      rate: 100,
      discount: 0,
      taxableAmount: 100,
      gstRate: 5,
      cgst: 2.5,
      sgst: 2.5,
      igst: 0,
      lineTotal: 105
    };
    setDnForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  // Remove DN line item
  const handleRemoveDnLine = (index: number) => {
    if (dnForm.items.length <= 1) {
      alert('A Debit Note must have at least one line item.');
      return;
    }
    setDnForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  // Save Debit Note (Draft or Issued)
  const handleSaveDebitNote = (finalStatus: NoteStatus = 'Issued') => {
    if (!dnForm.supplierName.trim()) {
      alert('Please enter a Supplier / Vendor Name.');
      return;
    }

    const taxableAmount = dnForm.items.reduce((sum, it) => sum + (it.taxableAmount || 0), 0);
    const discountTotal = dnForm.items.reduce((sum, it) => sum + (it.discount || 0), 0);
    const cgstTotal = dnForm.items.reduce((sum, it) => sum + (it.cgst || 0), 0);
    const sgstTotal = dnForm.items.reduce((sum, it) => sum + (it.sgst || 0), 0);
    const igstTotal = dnForm.items.reduce((sum, it) => sum + (it.igst || 0), 0);
    const totalTax = cgstTotal + sgstTotal + igstTotal;
    const totalDebit = taxableAmount + totalTax;
    const amountInWords = numberToWordsINR(totalDebit);

    if (editingDn) {
      const updated: DebitNote = {
        ...editingDn,
        debitNoteNumber: dnForm.debitNoteNumber || editingDn.debitNoteNumber,
        date: dnForm.date,
        supplierId: dnForm.supplierId || editingDn.supplierId,
        supplierName: dnForm.supplierName,
        supplierGstin: dnForm.supplierGstin,
        supplierAddress: dnForm.supplierAddress,
        purchaseOrderNumber: dnForm.purchaseOrderNumber,
        grnNumber: dnForm.grnNumber,
        supplierInvoiceNumber: dnForm.supplierInvoiceNumber,
        supplierInvoiceDate: dnForm.supplierInvoiceDate,
        supplierIssueId: dnForm.supplierIssueId,
        reason: dnForm.reason,
        customReason: dnForm.customReason,
        items: dnForm.items,
        taxableAmount: Number(taxableAmount.toFixed(2)),
        discountTotal: Number(discountTotal.toFixed(2)),
        cgstTotal: Number(cgstTotal.toFixed(2)),
        sgstTotal: Number(sgstTotal.toFixed(2)),
        igstTotal: Number(igstTotal.toFixed(2)),
        taxAdjustment: Number(totalTax.toFixed(2)),
        totalDebit: Number(totalDebit.toFixed(2)),
        totalAmount: Number(totalDebit.toFixed(2)),
        grandTotal: Number(totalDebit.toFixed(2)),
        amountInWords,
        status: finalStatus,
        updatedAt: new Date().toISOString(),
        notes: dnForm.notes
      };

      const updatedList = debitNotes.map(d => d.id === updated.id ? updated : d);
      setDebitNotes(updatedList);
      StorageEngine.setLocal(STORAGE_DN_KEY, updatedList);
      setIsDnModalOpen(false);

      auditLogService.logSystemActivity(
        `Debit Note Updated`,
        `DN ${updated.debitNoteNumber} for ${updated.supplierName}. Value: ₹${updated.totalDebit}`
      );
      if (notificationCtx?.sendNotification) {
        notificationCtx.sendNotification({
          title: 'Debit Note Updated',
          message: `Debit Note ${updated.debitNoteNumber} successfully saved (${finalStatus}).`,
          priority: 'low',
          channels: ['in-app']
        }).catch(() => {});
      }
    } else {
      const newDn: DebitNote = {
        id: `DN-${Date.now().toString().slice(-4)}`,
        debitNoteNumber: dnForm.debitNoteNumber || `DN-${6100 + debitNotes.length + 1}`,
        date: dnForm.date,
        supplierId: dnForm.supplierId || `VEND-${Date.now().toString().slice(-4)}`,
        supplierName: dnForm.supplierName,
        supplierGstin: dnForm.supplierGstin,
        supplierAddress: dnForm.supplierAddress,
        purchaseOrderId: dnForm.purchaseOrderNumber,
        purchaseOrderNumber: dnForm.purchaseOrderNumber,
        grnId: dnForm.grnNumber,
        grnNumber: dnForm.grnNumber,
        supplierInvoiceNumber: dnForm.supplierInvoiceNumber,
        supplierInvoiceDate: dnForm.supplierInvoiceDate,
        supplierIssueId: dnForm.supplierIssueId,
        reason: dnForm.reason,
        customReason: dnForm.customReason,
        items: dnForm.items,
        taxableAmount: Number(taxableAmount.toFixed(2)),
        discountTotal: Number(discountTotal.toFixed(2)),
        cgstTotal: Number(cgstTotal.toFixed(2)),
        sgstTotal: Number(sgstTotal.toFixed(2)),
        igstTotal: Number(igstTotal.toFixed(2)),
        taxAdjustment: Number(totalTax.toFixed(2)),
        totalDebit: Number(totalDebit.toFixed(2)),
        totalAmount: Number(totalDebit.toFixed(2)),
        grandTotal: Number(totalDebit.toFixed(2)),
        amountInWords,
        status: finalStatus,
        approvalStatus: 'Approved',
        createdBy: 'MaximuZ (Procurement)',
        createdAt: new Date().toISOString(),
        issuedAt: finalStatus === 'Issued' ? new Date().toISOString() : undefined,
        notes: dnForm.notes
      };

      const updatedList = [newDn, ...debitNotes];
      setDebitNotes(updatedList);
      StorageEngine.setLocal(STORAGE_DN_KEY, updatedList);
      setIsDnModalOpen(false);

      auditLogService.logSystemActivity(
        `Debit Note Created`,
        `DN ${newDn.debitNoteNumber} for ${newDn.supplierName}. Value: ₹${newDn.totalDebit}`
      );
      if (notificationCtx?.sendNotification) {
        notificationCtx.sendNotification({
          title: 'Debit Note Created',
          message: `Debit Note ${newDn.debitNoteNumber} created (${finalStatus}).`,
          priority: 'low',
          channels: ['in-app']
        }).catch(() => {});
      }
    }
  };

  // Status Lifecycle Transitions
  const handleUpdateStatus = (type: 'CN' | 'DN', id: string, newStatus: NoteStatus) => {
    if (newStatus === 'Cancelled') {
      setCancelModalData({ type, id, reason: '' });
      return;
    }

    if (type === 'CN') {
      const updated = creditNotes.map(c => c.id === id ? { ...c, status: newStatus, issuedAt: newStatus === 'Issued' ? (c.issuedAt || new Date().toISOString()) : c.issuedAt } : c);
      setCreditNotes(updated);
      StorageEngine.setLocal(STORAGE_CN_KEY, updated);
      if (notificationCtx?.sendNotification) {
        notificationCtx.sendNotification({
          title: 'Credit Note Status Updated',
          message: `Status updated to ${newStatus}.`,
          priority: 'low',
          channels: ['in-app']
        }).catch(() => {});
      }
    } else {
      const updated = debitNotes.map(d => d.id === id ? { ...d, status: newStatus, issuedAt: newStatus === 'Issued' ? (d.issuedAt || new Date().toISOString()) : d.issuedAt } : d);
      setDebitNotes(updated);
      StorageEngine.setLocal(STORAGE_DN_KEY, updated);
      if (notificationCtx?.sendNotification) {
        notificationCtx.sendNotification({
          title: 'Debit Note Status Updated',
          message: `Status updated to ${newStatus}.`,
          priority: 'low',
          channels: ['in-app']
        }).catch(() => {});
      }
    }
  };

  // Confirm Cancellation with Reason
  const handleConfirmCancellation = () => {
    if (!cancelModalData || !cancelModalData.reason.trim()) {
      alert('Please provide a valid cancellation reason to preserve the audit trail.');
      return;
    }

    if (cancelModalData.type === 'CN') {
      const updated = creditNotes.map(c => c.id === cancelModalData.id ? { ...c, status: 'Cancelled' as NoteStatus, cancellationReason: cancelModalData.reason.trim() } : c);
      setCreditNotes(updated);
      StorageEngine.setLocal(STORAGE_CN_KEY, updated);
      auditLogService.logSystemActivity('Credit Note Cancelled', `CN ${cancelModalData.id} cancelled. Reason: ${cancelModalData.reason}`);
    } else {
      const updated = debitNotes.map(d => d.id === cancelModalData.id ? { ...d, status: 'Cancelled' as NoteStatus, cancellationReason: cancelModalData.reason.trim() } : d);
      setDebitNotes(updated);
      StorageEngine.setLocal(STORAGE_DN_KEY, updated);
      auditLogService.logSystemActivity('Debit Note Cancelled', `DN ${cancelModalData.id} cancelled. Reason: ${cancelModalData.reason}`);
    }

    setCancelModalData(null);
    if (notificationCtx?.sendNotification) {
      notificationCtx.sendNotification({
        title: 'Document Cancelled',
        message: 'Document preserved as Cancelled with audit reason.',
        priority: 'medium',
        channels: ['in-app']
      }).catch(() => {});
    }
  };

  // Filtered Lists
  const filteredCreditNotes = useMemo(() => {
    return creditNotes.filter(cn => {
      const matchesSearch = 
        cn.creditNoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cn.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cn.originalInvoiceNumber || cn.originalInvoiceId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        cn.reason.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || cn.status === statusFilter;
      const matchesDate = !dateFilter || cn.date === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [creditNotes, searchQuery, statusFilter, dateFilter]);

  const filteredDebitNotes = useMemo(() => {
    return debitNotes.filter(dn => {
      const matchesSearch = 
        dn.debitNoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dn.supplierName || dn.partyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dn.purchaseOrderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dn.supplierInvoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        dn.reason.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || dn.status === statusFilter;
      const matchesDate = !dateFilter || dn.date === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [debitNotes, searchQuery, statusFilter, dateFilter]);

  // Statistics KPI Totals
  const totalCnIssuedAmount = creditNotes
    .filter(c => c.status !== 'Cancelled')
    .reduce((sum, c) => sum + (c.totalCredit || c.grandTotal || 0), 0);

  const totalDnClaimedAmount = debitNotes
    .filter(d => d.status !== 'Cancelled')
    .reduce((sum, d) => sum + (d.totalDebit || d.totalAmount || d.grandTotal || 0), 0);

  const activeDraftsCount = 
    creditNotes.filter(c => c.status === 'Draft').length + 
    debitNotes.filter(d => d.status === 'Draft').length;

  // Render Single Document View
  if (viewingDoc) {
    if (viewingDoc.type === 'CN') {
      return (
        <CreditNoteDocument 
          creditNote={viewingDoc.data} 
          onBack={() => setViewingDoc(null)} 
          onUpdate={(updated) => {
            const list = creditNotes.map(c => c.id === updated.id ? updated : c);
            setCreditNotes(list);
            StorageEngine.setLocal(STORAGE_CN_KEY, list);
          }}
        />
      );
    }
    if (viewingDoc.type === 'DN') {
      return (
        <DebitNoteDocument 
          debitNote={viewingDoc.data} 
          onBack={() => setViewingDoc(null)} 
          onUpdate={(updated) => {
            const list = debitNotes.map(d => d.id === updated.id ? updated : d);
            setDebitNotes(list);
            StorageEngine.setLocal(STORAGE_DN_KEY, list);
          }}
        />
      );
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800/40 text-[10px] font-bold uppercase tracking-wider">
              Commercial Financial Adjustments
            </span>
            <span className="text-neutral-500 text-xs font-mono">GST Section 34 Compliant</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1 flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-neutral-300" />
            Credit Note & Debit Note Atelier
          </h1>
          <p className="text-[#aaaaaa] text-xs sm:text-sm mt-1 max-w-2xl">
            Issue customer credit notes for returns, overbilling, and price adjustments. Record supplier debit notes for shortage, damage, and pricing claims.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={handleOpenCreateCn}
            className="bg-[#c2292e] hover:bg-[#a11f23] text-white font-semibold text-xs h-10 px-4 shadow-sm tactile-press flex items-center gap-1.5"
          >
            <ArrowDownLeft className="w-4 h-4" /> + Create Credit Note
          </Button>

          <Button
            onClick={handleOpenCreateDn}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-xs h-10 px-4 shadow-sm tactile-press flex items-center gap-1.5"
          >
            <ArrowUpRight className="w-4 h-4" /> + Create Debit Note
          </Button>
        </div>
      </div>

      {/* KPI Metrics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#181818] p-4 rounded-2xl border border-[#282828] space-y-1">
          <div className="flex justify-between items-center text-xs text-[#888888] font-medium">
            <span>Customer Credits Issued</span>
            <ArrowDownLeft className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            ₹{totalCnIssuedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-rose-400/90 font-medium">
            {creditNotes.filter(c => c.status !== 'Cancelled').length} Active Credit Notes
          </div>
        </div>

        <div className="bg-[#181818] p-4 rounded-2xl border border-[#282828] space-y-1">
          <div className="flex justify-between items-center text-xs text-[#888888] font-medium">
            <span>Supplier Debits Claimed</span>
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            ₹{totalDnClaimedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-blue-400/90 font-medium">
            {debitNotes.filter(d => d.status !== 'Cancelled').length} Active Debit Notes
          </div>
        </div>

        <div className="bg-[#181818] p-4 rounded-2xl border border-[#282828] space-y-1">
          <div className="flex justify-between items-center text-xs text-[#888888] font-medium">
            <span>Drafts / Pending Review</span>
            <Edit3 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {activeDraftsCount} Documents
          </div>
          <div className="text-[11px] text-[#aaaaaa]">
            Awaiting final commercial sign-off
          </div>
        </div>

        <div className="bg-[#181818] p-4 rounded-2xl border border-[#282828] space-y-1">
          <div className="flex justify-between items-center text-xs text-[#888888] font-medium">
            <span>Inventory Protection Rule</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-white leading-tight">
            Financial Ledger Only
          </div>
          <div className="text-[10px] text-emerald-400">
            Stock unaffected by CN/DN generation
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#282828]">
        <button
          onClick={() => setActiveTab('credit_notes')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'credit_notes'
              ? 'border-rose-500 text-white'
              : 'border-transparent text-[#888888] hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-rose-400" />
          Credit Notes ({creditNotes.length})
        </button>

        <button
          onClick={() => setActiveTab('debit_notes')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'debit_notes'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-[#888888] hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-blue-400" />
          Debit Notes ({debitNotes.length})
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'guide'
              ? 'border-amber-400 text-white'
              : 'border-transparent text-[#888888] hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-amber-400" />
          Credit vs Debit Note Guide
        </button>
      </div>

      {/* Filter & Search Toolbar (for CN and DN tabs) */}
      {activeTab !== 'guide' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#181818] p-3 rounded-2xl border border-[#282828]">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#888888]" />
            <input
              type="text"
              placeholder="Search by Note #, Party, Reference, Reason..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#121212] border border-[#333333] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#121212] border border-[#333333] rounded-xl px-3 py-1.5 text-xs text-neutral-300 font-medium focus:outline-none focus:border-white"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Issued">Issued</option>
              <option value="Applied">Applied</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-[#121212] border border-[#333333] rounded-xl px-3 py-1.5 text-xs text-neutral-300 font-medium focus:outline-none focus:border-white"
            />

            {(searchQuery || statusFilter !== 'All' || dateFilter) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                  setDateFilter('');
                }}
                className="text-xs text-neutral-400 border-[#383838] hover:bg-[#252525] h-8"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: CREDIT NOTES REGISTRY */}
      {activeTab === 'credit_notes' && (
        <div className="space-y-4">
          {filteredCreditNotes.length === 0 ? (
            <div className="bg-[#181818] border border-[#282828] rounded-2xl p-12 text-center text-[#aaaaaa] space-y-3">
              <CreditCard className="w-12 h-12 text-neutral-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Credit Notes Found</h3>
              <p className="text-xs text-[#888888] max-w-sm mx-auto">
                No matching customer credit notes. Click below to create your first Credit Note against an invoice.
              </p>
              <Button onClick={handleOpenCreateCn} className="bg-[#c2292e] hover:bg-[#a11f23] text-white text-xs mt-2">
                + Create Credit Note
              </Button>
            </div>
          ) : (
            <div className="bg-[#181818] rounded-2xl border border-[#282828] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#141414] border-b border-[#282828] text-[#888888] font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5 pl-4">CN Number</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Original Invoice</th>
                      <th className="p-3.5">Reason</th>
                      <th className="p-3.5 text-right">Taxable</th>
                      <th className="p-3.5 text-right">Credit Total</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222222] text-neutral-200">
                    {filteredCreditNotes.map(cn => {
                      const totalAmt = cn.totalCredit || cn.grandTotal || 0;
                      return (
                        <tr key={cn.id} className="hover:bg-[#202020]/60 transition-colors group">
                          <td className="p-3.5 pl-4 font-mono font-bold text-white flex items-center gap-1.5">
                            <span className="text-rose-400">●</span>
                            {cn.creditNoteNumber}
                          </td>
                          <td className="p-3.5 text-neutral-400 font-mono">{cn.date}</td>
                          <td className="p-3.5">
                            <div className="font-semibold text-white">{cn.customerName}</div>
                            {cn.customerGstin && (
                              <div className="text-[10px] text-[#888888] font-mono">{cn.customerGstin}</div>
                            )}
                          </td>
                          <td className="p-3.5 font-mono">
                            <button
                              onClick={() => setInspectLinkedRecord({
                                title: `Invoice ${cn.originalInvoiceNumber || cn.originalInvoiceId}`,
                                data: cn
                              })}
                              className="text-neutral-300 hover:text-white hover:underline flex items-center gap-1"
                            >
                              {cn.originalInvoiceNumber || cn.originalInvoiceId}
                              <ExternalLink className="w-3 h-3 text-[#888888]" />
                            </button>
                            {cn.salesOrderNumber && (
                              <div className="text-[10px] text-[#888888]">SO: {cn.salesOrderNumber}</div>
                            )}
                          </td>
                          <td className="p-3.5 max-w-[200px]">
                            <div className="truncate text-white font-medium" title={cn.reason}>
                              {cn.reason}
                            </div>
                            {cn.customReason && (
                              <div className="truncate text-[10px] text-[#888888]" title={cn.customReason}>
                                {cn.customReason}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-mono text-neutral-400">
                            ₹{(cn.taxableAmount || 0).toFixed(2)}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-rose-400">
                            ₹{totalAmt.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              cn.status === 'Issued' 
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                                : cn.status === 'Draft'
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                                : cn.status === 'Applied'
                                ? 'bg-blue-950/60 text-blue-400 border border-blue-800/50'
                                : 'bg-neutral-800 text-neutral-400 border border-neutral-700 line-through'
                            }`}>
                              {cn.status}
                            </span>
                          </td>
                          <td className="p-3.5 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingDoc({ type: 'CN', data: cn })}
                                className="text-xs h-7 px-2 border-[#383838] bg-[#242424] hover:bg-[#303030] text-white"
                                title="View & Print Document"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" /> View
                              </Button>

                              {cn.status !== 'Cancelled' && (
                                <button
                                  onClick={() => handleOpenEditCn(cn)}
                                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#282828] rounded-lg transition-colors"
                                  title="Edit Credit Note"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {cn.status === 'Draft' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStatus('CN', cn.id, 'Issued')}
                                  className="text-[10px] h-7 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                                >
                                  Issue
                                </Button>
                              )}

                              {cn.status === 'Issued' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStatus('CN', cn.id, 'Applied')}
                                  className="text-[10px] h-7 px-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                                >
                                  Apply
                                </Button>
                              )}

                              {cn.status !== 'Cancelled' && (
                                <button
                                  onClick={() => setCancelModalData({ type: 'CN', id: cn.id, reason: '' })}
                                  className="p-1.5 text-[#888888] hover:text-rose-400 hover:bg-[#282828] rounded-lg transition-colors"
                                  title="Cancel Note (Preserve Audit)"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DEBIT NOTES REGISTRY */}
      {activeTab === 'debit_notes' && (
        <div className="space-y-4">
          {filteredDebitNotes.length === 0 ? (
            <div className="bg-[#181818] border border-[#282828] rounded-2xl p-12 text-center text-[#aaaaaa] space-y-3">
              <CreditCard className="w-12 h-12 text-neutral-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Debit Notes Found</h3>
              <p className="text-xs text-[#888888] max-w-sm mx-auto">
                No matching supplier debit claims. Click below to create your first Debit Note against a PO or vendor invoice.
              </p>
              <Button onClick={handleOpenCreateDn} className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs mt-2">
                + Create Debit Note
              </Button>
            </div>
          ) : (
            <div className="bg-[#181818] rounded-2xl border border-[#282828] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#141414] border-b border-[#282828] text-[#888888] font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5 pl-4">DN Number</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Supplier / Vendor</th>
                      <th className="p-3.5">PO / GRN Link</th>
                      <th className="p-3.5">Reason</th>
                      <th className="p-3.5 text-right">Taxable</th>
                      <th className="p-3.5 text-right">Debit Total</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222222] text-neutral-200">
                    {filteredDebitNotes.map(dn => {
                      const totalAmt = dn.totalDebit || dn.totalAmount || dn.grandTotal || 0;
                      return (
                        <tr key={dn.id} className="hover:bg-[#202020]/60 transition-colors group">
                          <td className="p-3.5 pl-4 font-mono font-bold text-white flex items-center gap-1.5">
                            <span className="text-blue-400">●</span>
                            {dn.debitNoteNumber}
                          </td>
                          <td className="p-3.5 text-neutral-400 font-mono">{dn.date}</td>
                          <td className="p-3.5">
                            <div className="font-semibold text-white">{dn.supplierName || dn.partyName}</div>
                            {dn.supplierGstin && (
                              <div className="text-[10px] text-[#888888] font-mono">{dn.supplierGstin}</div>
                            )}
                          </td>
                          <td className="p-3.5 font-mono">
                            {dn.purchaseOrderNumber ? (
                              <div className="text-neutral-300 font-semibold">{dn.purchaseOrderNumber}</div>
                            ) : (
                              <div className="text-[#888888]">N/A</div>
                            )}
                            {dn.grnNumber && (
                              <div className="text-[10px] text-[#888888]">GRN: {dn.grnNumber}</div>
                            )}
                          </td>
                          <td className="p-3.5 max-w-[200px]">
                            <div className="truncate text-white font-medium" title={dn.reason}>
                              {dn.reason}
                            </div>
                            {dn.customReason && (
                              <div className="truncate text-[10px] text-[#888888]" title={dn.customReason}>
                                {dn.customReason}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-mono text-neutral-400">
                            ₹{(dn.taxableAmount || 0).toFixed(2)}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-blue-400">
                            ₹{totalAmt.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              dn.status === 'Issued' 
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                                : dn.status === 'Draft'
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                                : dn.status === 'Applied'
                                ? 'bg-blue-950/60 text-blue-400 border border-blue-800/50'
                                : 'bg-neutral-800 text-neutral-400 border border-neutral-700 line-through'
                            }`}>
                              {dn.status}
                            </span>
                          </td>
                          <td className="p-3.5 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingDoc({ type: 'DN', data: dn })}
                                className="text-xs h-7 px-2 border-[#383838] bg-[#242424] hover:bg-[#303030] text-white"
                                title="View & Print Document"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" /> View
                              </Button>

                              {dn.status !== 'Cancelled' && (
                                <button
                                  onClick={() => handleOpenEditDn(dn)}
                                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#282828] rounded-lg transition-colors"
                                  title="Edit Debit Note"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {dn.status === 'Draft' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStatus('DN', dn.id, 'Issued')}
                                  className="text-[10px] h-7 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                                >
                                  Issue
                                </Button>
                              )}

                              {dn.status === 'Issued' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStatus('DN', dn.id, 'Applied')}
                                  className="text-[10px] h-7 px-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                                >
                                  Settle
                                </Button>
                              )}

                              {dn.status !== 'Cancelled' && (
                                <button
                                  onClick={() => setCancelModalData({ type: 'DN', id: dn.id, reason: '' })}
                                  className="p-1.5 text-[#888888] hover:text-rose-400 hover:bg-[#282828] rounded-lg transition-colors"
                                  title="Cancel Note (Preserve Audit)"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CREDIT NOTE VS DEBIT NOTE GUIDE */}
      {activeTab === 'guide' && (
        <div className="bg-[#181818] p-6 rounded-2xl border border-[#282828] space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              Credit Note vs Debit Note Architecture Reference
            </h3>
            <p className="text-xs text-[#aaaaaa] mt-1">
              GUD ERP strictly separates physical goods disposition from financial adjustments to guarantee audit consistency.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-[#333333] text-xs">
              <thead>
                <tr className="bg-[#141414] text-neutral-300 font-bold border-b border-[#333333]">
                  <th className="p-3 border-r border-[#333333] w-48">Dimension</th>
                  <th className="p-3 border-r border-[#333333] text-rose-400 font-bold">Credit Note (CN)</th>
                  <th className="p-3 text-blue-400 font-bold">Debit Note (DN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a] text-neutral-300">
                <tr>
                  <td className="p-3 border-r border-[#333333] font-semibold text-white">Primary Party</td>
                  <td className="p-3 border-r border-[#333333]">Customer</td>
                  <td className="p-3">Supplier / Vendor</td>
                </tr>
                <tr>
                  <td className="p-3 border-r border-[#333333] font-semibold text-white">Commercial Purpose</td>
                  <td className="p-3 border-r border-[#333333]">Reduce amount previously billed / owed by customer</td>
                  <td className="p-3">Record financial claim / deduction against supplier invoice</td>
                </tr>
                <tr>
                  <td className="p-3 border-r border-[#333333] font-semibold text-white">Typical Triggers</td>
                  <td className="p-3 border-r border-[#333333]">Product return, damaged delivery, overbilling, sales discount</td>
                  <td className="p-3">Short quantity received in GRN, damaged ingredients, price variance</td>
                </tr>
                <tr>
                  <td className="p-3 border-r border-[#333333] font-semibold text-white">Linked Documents</td>
                  <td className="p-3 border-r border-[#333333] font-mono">Invoice (INV), Sales Order (SO), Return (RET)</td>
                  <td className="p-3 font-mono">Purchase Order (PO), GRN, Vendor Invoice, QC Issue</td>
                </tr>
                <tr>
                  <td className="p-3 border-r border-[#333333] font-semibold text-white">Inventory Impact</td>
                  <td className="p-3 border-r border-[#333333] font-semibold text-amber-400">
                    NO automatic stock changes. (Handled in Customer Return QC disposition)
                  </td>
                  <td className="p-3 font-semibold text-amber-400">
                    NO automatic stock changes. (Handled during GRN Goods Receipt count)
                  </td>
                </tr>
                <tr>
                  <td className="p-3 border-r border-[#333333] font-semibold text-white">Financial Impact</td>
                  <td className="p-3 border-r border-[#333333]">Reduces Accounts Receivable (Customer Outstanding)</td>
                  <td className="p-3">Reduces Accounts Payable (Vendor Liability Claim)</td>
                </tr>
                <tr>
                  <td className="p-3 border-r border-[#333333] font-semibold text-white">GST Calculation</td>
                  <td className="p-3 border-r border-[#333333]">Inherits underlying item GST rate (e.g. 5% on chocolates)</td>
                  <td className="p-3">Inherits vendor item GST rate (e.g. 5% / 18% packaging)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CREDIT NOTE MODAL */}
      <Modal
        isOpen={isCnModalOpen}
        onClose={() => setIsCnModalOpen(false)}
        title={editingCn ? `Edit Credit Note (${editingCn.creditNoteNumber})` : 'Create New Credit Note'}
        size="lg"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs text-neutral-200">
          
          {/* Quick Invoice Selector */}
          <div className="bg-[#1f1f1f] p-3.5 rounded-xl border border-[#333333] space-y-2">
            <label className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" /> Link to Existing Customer Invoice:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={cnForm.originalInvoiceNumber}
                onChange={e => handleSelectInvoiceForCn(e.target.value)}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-medium"
              >
                <option value="">-- Select an Invoice to Auto-Populate --</option>
                {availableInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.id} - {inv.customer} ({inv.date}) - {inv.items}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Or type manual Invoice Number..."
                value={cnForm.originalInvoiceNumber}
                onChange={e => setCnForm(prev => ({ ...prev, originalInvoiceNumber: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
              />
            </div>
          </div>

          {/* Header Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">Credit Note Number *</label>
              <input
                type="text"
                value={cnForm.creditNoteNumber}
                onChange={e => setCnForm(prev => ({ ...prev, creditNoteNumber: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">Credit Note Date *</label>
              <input
                type="date"
                value={cnForm.date}
                onChange={e => setCnForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">Original Invoice Date</label>
              <input
                type="date"
                value={cnForm.originalInvoiceDate}
                onChange={e => setCnForm(prev => ({ ...prev, originalInvoiceDate: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>

          {/* Customer & Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">Customer / Business Name *</label>
              <input
                type="text"
                placeholder="e.g. Moby Cafe, Dr. Dental Clinic..."
                value={cnForm.customerName}
                onChange={e => setCnForm(prev => ({ ...prev, customerName: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">Customer GSTIN</label>
              <input
                type="text"
                placeholder="e.g. 32AALCG1234F1Z5"
                value={cnForm.customerGstin}
                onChange={e => setCnForm(prev => ({ ...prev, customerGstin: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white uppercase"
              />
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">Customer Billing Address</label>
              <textarea
                rows={2}
                placeholder="Street address, City, Kerala, PIN..."
                value={cnForm.billingAddress}
                onChange={e => setCnForm(prev => ({ ...prev, billingAddress: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">Reason for Credit Note *</label>
              <select
                value={cnForm.reason}
                onChange={e => setCnForm(prev => ({ ...prev, reason: e.target.value as CreditNoteReason }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-medium mb-1.5"
              >
                {CREDIT_NOTE_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Specific reason or notes for customer..."
                value={cnForm.customReason}
                onChange={e => setCnForm(prev => ({ ...prev, customReason: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>

          {/* Itemized Line Items Table */}
          <div className="space-y-2 border-t border-[#2e2e2e] pt-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Credited Line Items & Partial Quantities
              </span>
              <Button size="sm" onClick={handleAddCnLine} variant="outline" className="text-xs h-7 border-[#383838] bg-[#222222]">
                + Add Item
              </Button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cnForm.items.map((item, idx) => (
                <div key={item.id || idx} className="bg-[#141414] p-3 rounded-xl border border-[#2a2a2a] space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] text-[#888888]">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => handleUpdateCnLine(idx, 'description', e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-xs text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-[#888888]">Credit Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.creditQty}
                        onChange={e => handleUpdateCnLine(idx, 'creditQty', Math.max(1, Number(e.target.value)))}
                        className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-xs font-mono font-bold text-white text-center"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-[#888888]">Unit Rate (₹)</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={e => handleUpdateCnLine(idx, 'rate', Number(e.target.value))}
                        className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-xs font-mono text-white text-right"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-[#888888]">GST Rate</label>
                      <select
                        value={item.gstRate}
                        onChange={e => handleUpdateCnLine(idx, 'gstRate', Number(e.target.value))}
                        className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-xs font-mono text-white"
                      >
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={0}>0%</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1 text-right pt-3">
                      <button
                        onClick={() => handleRemoveCnLine(idx)}
                        className="text-[#888888] hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-[#888888] border-t border-[#222222] pt-1">
                    <span>Taxable: ₹{(item.taxableAmount || 0).toFixed(2)}</span>
                    <span>CGST: ₹{(item.cgst || 0).toFixed(2)} | SGST: ₹{(item.sgst || 0).toFixed(2)}</span>
                    <span className="font-bold text-rose-400">Total: ₹{(item.lineTotal || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center border-t border-[#2e2e2e] pt-4">
            <Button variant="outline" onClick={() => setIsCnModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => handleSaveCreditNote('Draft')}
                className="text-xs bg-[#2a2a2a] hover:bg-[#333333]"
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSaveCreditNote('Issued')}
                className="text-xs bg-[#c2292e] hover:bg-[#a11f23] text-white font-semibold"
              >
                {editingCn ? 'Update & Issue' : 'Create & Issue Credit Note'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* CREATE / EDIT DEBIT NOTE MODAL */}
      <Modal
        isOpen={isDnModalOpen}
        onClose={() => setIsDnModalOpen(false)}
        title={editingDn ? `Edit Debit Note (${editingDn.debitNoteNumber})` : 'Create New Debit Note'}
        size="lg"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs text-neutral-200">
          
          {/* Quick PO Selector */}
          <div className="bg-[#1f1f1f] p-3.5 rounded-xl border border-[#333333] space-y-2">
            <label className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" /> Link to Existing Purchase Order (PO):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={dnForm.purchaseOrderNumber}
                onChange={e => handleSelectPOForDn(e.target.value)}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-medium"
              >
                <option value="">-- Select a PO to Auto-Populate --</option>
                {availablePOs.map(po => (
                  <option key={po.poNumber} value={po.poNumber}>
                    {po.poNumber} - {po.vendor} ({po.item})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Or type manual PO / Reference..."
                value={dnForm.purchaseOrderNumber}
                onChange={e => setDnForm(prev => ({ ...prev, purchaseOrderNumber: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
              />
            </div>
          </div>

          {/* Header Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">Debit Note Number *</label>
              <input
                type="text"
                value={dnForm.debitNoteNumber}
                onChange={e => setDnForm(prev => ({ ...prev, debitNoteNumber: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">Debit Note Date *</label>
              <input
                type="date"
                value={dnForm.date}
                onChange={e => setDnForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">GRN Reference (if any)</label>
              <input
                type="text"
                placeholder="e.g. GRN-0089"
                value={dnForm.grnNumber}
                onChange={e => setDnForm(prev => ({ ...prev, grnNumber: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white uppercase"
              />
            </div>
          </div>

          {/* Supplier Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">Supplier / Vendor Name *</label>
              <input
                type="text"
                placeholder="e.g. Cocoa Horizons, Deluxe Box Makers..."
                value={dnForm.supplierName}
                onChange={e => setDnForm(prev => ({ ...prev, supplierName: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">Supplier GSTIN</label>
              <input
                type="text"
                placeholder="e.g. 33AABCC5544R1ZA"
                value={dnForm.supplierGstin}
                onChange={e => setDnForm(prev => ({ ...prev, supplierGstin: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white uppercase"
              />
            </div>
          </div>

          {/* Addresses & Discrepancy Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">Supplier Address</label>
              <textarea
                rows={2}
                placeholder="Vendor office / warehouse address..."
                value={dnForm.supplierAddress}
                onChange={e => setDnForm(prev => ({ ...prev, supplierAddress: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">Reason for Debit Claim *</label>
              <select
                value={dnForm.reason}
                onChange={e => setDnForm(prev => ({ ...prev, reason: e.target.value as DebitNoteReason }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-medium mb-1.5"
              >
                {DEBIT_NOTE_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Specific shortage or discrepancy details..."
                value={dnForm.customReason}
                onChange={e => setDnForm(prev => ({ ...prev, customReason: e.target.value }))}
                className="w-full bg-[#121212] border border-[#383838] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>

          {/* Itemized Claim Table */}
          <div className="space-y-2 border-t border-[#2e2e2e] pt-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Claimed Items & Shortage Quantities
              </span>
              <Button size="sm" onClick={handleAddDnLine} variant="outline" className="text-xs h-7 border-[#383838] bg-[#222222]">
                + Add Item
              </Button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {dnForm.items.map((item, idx) => (
                <div key={item.id || idx} className="bg-[#141414] p-3 rounded-xl border border-[#2a2a2a] space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] text-[#888888]">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => handleUpdateDnLine(idx, 'description', e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-xs text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-[#888888]">Claim Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleUpdateDnLine(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                        className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-xs font-mono font-bold text-white text-center"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-[#888888]">Rate (₹)</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={e => handleUpdateDnLine(idx, 'rate', Number(e.target.value))}
                        className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-xs font-mono text-white text-right"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-[#888888]">GST Rate</label>
                      <select
                        value={item.gstRate}
                        onChange={e => handleUpdateDnLine(idx, 'gstRate', Number(e.target.value))}
                        className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-xs font-mono text-white"
                      >
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={0}>0%</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1 text-right pt-3">
                      <button
                        onClick={() => handleRemoveDnLine(idx)}
                        className="text-[#888888] hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-[#888888] border-t border-[#222222] pt-1">
                    <span>Taxable: ₹{(item.taxableAmount || 0).toFixed(2)}</span>
                    <span>CGST: ₹{(item.cgst || 0).toFixed(2)} | SGST: ₹{(item.sgst || 0).toFixed(2)}</span>
                    <span className="font-bold text-blue-400">Claim Total: ₹{(item.lineTotal || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center border-t border-[#2e2e2e] pt-4">
            <Button variant="outline" onClick={() => setIsDnModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => handleSaveDebitNote('Draft')}
                className="text-xs bg-[#2a2a2a] hover:bg-[#333333]"
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSaveDebitNote('Issued')}
                className="text-xs bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold"
              >
                {editingDn ? 'Update & Issue' : 'Create & Issue Debit Note'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* CANCELLATION REASON MODAL */}
      <Modal
        isOpen={!!cancelModalData}
        onClose={() => setCancelModalData(null)}
        title="Cancel Document (Audit Trail Preservation)"
        size="md"
      >
        <div className="space-y-4 text-xs text-neutral-200">
          <div className="bg-amber-950/40 border border-amber-800/60 p-3 rounded-xl flex items-start gap-2.5 text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Permanent Audit Rule:</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Issued commercial documents cannot be deleted. Cancelling this note will mark it as Cancelled, reverse its financial balance effect, and preserve the original record along with your reason.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#aaaaaa] mb-1">
              Cancellation Reason *
            </label>
            <textarea
              rows={3}
              placeholder="Explain why this note is being cancelled (e.g. issued in error, duplicate, commercial terms revised)..."
              value={cancelModalData?.reason || ''}
              onChange={e => setCancelModalData(prev => prev ? { ...prev, reason: e.target.value } : null)}
              className="w-full bg-[#121212] border border-[#383838] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#2e2e2e]">
            <Button variant="outline" onClick={() => setCancelModalData(null)} className="text-xs">
              Go Back
            </Button>
            <Button onClick={handleConfirmCancellation} className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs">
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>

      {/* LINKED RECORD INSPECTOR MODAL */}
      <Modal
        isOpen={!!inspectLinkedRecord}
        onClose={() => setInspectLinkedRecord(null)}
        title={inspectLinkedRecord?.title || 'Linked Document Reference'}
        size="md"
      >
        {inspectLinkedRecord && (
          <div className="space-y-3 text-xs text-neutral-200 font-mono">
            <div className="bg-[#141414] p-4 rounded-xl border border-[#2a2a2a] space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Party Name:</span>
                <strong className="text-white">{inspectLinkedRecord.data.customerName || inspectLinkedRecord.data.supplierName}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Original Document Date:</span>
                <span className="text-neutral-200">{inspectLinkedRecord.data.originalInvoiceDate || inspectLinkedRecord.data.supplierInvoiceDate || inspectLinkedRecord.data.date}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Items Linked:</span>
                <span className="text-white font-bold">{inspectLinkedRecord.data.items?.length || 1} line items</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Financial Impact:</span>
                <span className="text-rose-400 font-bold">₹{(inspectLinkedRecord.data.totalCredit || inspectLinkedRecord.data.totalDebit || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setInspectLinkedRecord(null)} variant="secondary" className="text-xs">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
