import React, { useState, useRef } from 'react';
import { 
  Factory, Plus, FileText, CheckCircle2, ShieldCheck, Download, Printer, 
  Trash2, Copy, Sparkles, Boxes, Truck, RefreshCw, Eye, Building2,
  Calendar, Check, ShieldAlert, Award, FileSpreadsheet, Send, FileCheck, Layers,
  ToggleLeft, ToggleRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { StorageEngine } from '../services/storageEngine';
import { auditLogService } from '../services/audit';
import { GudLogo } from '../components/Sidebar';

// Types
export interface POItem {
  id: string;
  category: '25g Chocolate' | '8g Chocolate' | 'Hamper Item' | 'Packaging' | 'Raw Material' | 'Custom';
  description: string;
  hsnCode: string;
  qty: number;
  unit: string;
  rate: number;
  gstRate: number; // e.g., 5 or 18 or 0
  total: number;
}

export interface SupplierPO {
  id: string;
  poNumber: string;
  date: string;
  expectedDelivery: string;
  supplierName: string;
  supplierAddress: string;
  supplierContact: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierGstin: string;
  paymentTerms: string;
  showPaymentTerms: boolean;
  shippingAddress: string;
  specialInstructions: string;
  showSla: boolean;
  showPricing: boolean;
  items: POItem[];
  subtotal: number;
  gstTotal: number;
  grandTotal: number;
  status: 'Draft' | 'Sent' | 'Confirmed' | 'Partially Received' | 'Fully Received' | 'Cancelled';
  founderSignatureName: string;
  notes?: string;
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  date: string;
  poNumber: string;
  supplierName: string;
  qtyOrdered: number;
  qtyReceivedGood: number;
  qtyDamaged: number;
  qtyShortage: number;
  batchIdAssigned: string;
  mfgDate?: string;
  expiryDate?: string;
  qcResult: 'Pass' | 'Fail';
  receivedBy: string;
}

interface POFormState {
  poNumber: string;
  date: string;
  expectedDelivery: string;
  supplierName: string;
  supplierAddress: string;
  supplierContact: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierGstin: string;
  paymentTerms: string;
  showPaymentTerms: boolean;
  shippingAddress: string;
  specialInstructions: string;
  showSla: boolean;
  showPricing: boolean;
  founderSignatureName: string;
  items: POItem[];
}

const STORAGE_PO_KEY = 'gud_purchase_orders_v1';
const STORAGE_GRN_KEY = 'gud_goods_receipts_v1';

// Preset Master Flavors & Items
export const PRESET_25G_FLAVORS: Omit<POItem, 'id' | 'qty' | 'total'>[] = [
  { category: '25g Chocolate', description: 'Almond Noir 25g', hsnCode: '1806', unit: 'Pcs', rate: 52.5, gstRate: 5 },
  { category: '25g Chocolate', description: 'Peanut Royale 25g', hsnCode: '1806', unit: 'Pcs', rate: 52.5, gstRate: 5 },
  { category: '25g Chocolate', description: 'Orange Sunset 25g', hsnCode: '1806', unit: 'Pcs', rate: 52.5, gstRate: 5 },
  { category: '25g Chocolate', description: 'Sun-Kissed Lemon 25g', hsnCode: '1806', unit: 'Pcs', rate: 52.5, gstRate: 5 },
  { category: '25g Chocolate', description: 'Indian Sea Salt 25g', hsnCode: '1806', unit: 'Pcs', rate: 52.5, gstRate: 5 },
  { category: '25g Chocolate', description: 'Midnight Mocha 25g', hsnCode: '1806', unit: 'Pcs', rate: 52.5, gstRate: 5 },
  { category: '25g Chocolate', description: 'Malabar Jackfruit 25g', hsnCode: '1806', unit: 'Pcs', rate: 52.5, gstRate: 5 }
];

export const PRESET_8G_FLAVORS: Omit<POItem, 'id' | 'qty' | 'total'>[] = [
  { category: '8g Chocolate', description: 'Almond Noir 8g', hsnCode: '1806', unit: 'Pcs', rate: 17.6, gstRate: 5 },
  { category: '8g Chocolate', description: 'Peanut Royale 8g', hsnCode: '1806', unit: 'Pcs', rate: 17.6, gstRate: 5 },
  { category: '8g Chocolate', description: 'Orange Sunset 8g', hsnCode: '1806', unit: 'Pcs', rate: 17.6, gstRate: 5 },
  { category: '8g Chocolate', description: 'Sun-Kissed Lemon 8g', hsnCode: '1806', unit: 'Pcs', rate: 17.6, gstRate: 5 }
];

export const PRESET_HAMPER_PACKAGING: Omit<POItem, 'id' | 'qty' | 'total'>[] = [
  { category: 'Hamper Item', description: 'Taj Luxury Rigid Gift Box (8-Slot)', hsnCode: '4819 10 10', unit: 'Pcs', rate: 145, gstRate: 18 },
  { category: 'Packaging', description: 'Gold Satin Branding Ribbon (25mm Roll)', hsnCode: '5806 32 00', unit: 'Rolls', rate: 180, gstRate: 18 },
  { category: 'Packaging', description: 'Insulated Cold-Pack Outer Box', hsnCode: '3923 90 90', unit: 'Pcs', rate: 85, gstRate: 18 },
  { category: 'Packaging', description: '8g Mini Chocolate 4-Cavity Tray Insert', hsnCode: '3923 10 90', unit: 'Pcs', rate: 12, gstRate: 18 },
  { category: 'Packaging', description: 'Outer Corrugated Shipping Carton (3-Ply)', hsnCode: '4819 10 10', unit: 'Pcs', rate: 35, gstRate: 18 }
];

// Preset Suppliers
export const PRESET_SUPPLIERS = [
  {
    name: 'Cochin Cocoa Products (Scaria)',
    contact: 'Mr. Scaria / Production Head',
    address: 'Bldg.No:14/307, 307A, Vennikulam, Kokkapally, Thiruvaniyoor, Cochin -682 308, Kerala',
    phone: '+91 98470 12345',
    email: 'cochincocoaproducts@gmail.com',
    gstin: '32AAGFC8295H1ZA'
  },
  {
    name: 'Ernakulam Packaging & Printing Co.',
    contact: 'Sales Manager',
    address: 'Plot 44, Kaloor Industrial Estate, Kochi, Kerala 682017',
    phone: '+91 94471 98765',
    email: 'orders@ernakulampack.com',
    gstin: '32AABCE9876G1Z2'
  },
  {
    name: 'Kerala Artisans & Luxury Gifting',
    contact: 'Hamper Goods Desk',
    address: 'Mattancherry, Fort Kochi, Ernakulam, Kerala 682002',
    phone: '+91 97452 34567',
    email: 'procurement@keralagiftart.com',
    gstin: '32AAACK4321H1Z9'
  }
];

// Currency to Words Helper
function numberToWordsINR(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return 'Zero Only/-';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function numToWords(n: number): string {
    if (n < 20) return single[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + single[n % 10] : '');
    if (n < 1000) return single[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + numToWords(n % 10000000) : '');
  }

  return `Rupees ${numToWords(rounded)} Only/-`;
}

export interface ConsolidatedPOItem {
  id: string;
  category: POItem['category'];
  description: string;
  subtext?: string;
  hsnCode: string;
  qty: number;
  unit: string;
  rate: number;
  gstRate: number;
  total: number;
}

export function getConsolidatedPOItems(items: POItem[]): ConsolidatedPOItem[] {
  const map = new Map<string, POItem[]>();

  for (const item of items) {
    const key = `${item.category}__${item.rate}__${item.gstRate}__${item.hsnCode}__${item.unit}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(item);
  }

  const result: ConsolidatedPOItem[] = [];

  map.forEach((groupItems, key) => {
    if (groupItems.length === 1) {
      const single = groupItems[0];
      result.push({
        id: single.id,
        category: single.category,
        description: single.description,
        hsnCode: single.hsnCode,
        qty: single.qty,
        unit: single.unit,
        rate: single.rate,
        gstRate: single.gstRate,
        total: single.total
      });
    } else {
      const first = groupItems[0];
      const totalQty = groupItems.reduce((acc, curr) => acc + curr.qty, 0);
      const grandTotal = groupItems.reduce((acc, curr) => acc + curr.total, 0);

      const firstQty = first.qty;
      const allSameQty = groupItems.every(i => i.qty === firstQty);

      const flavorNames = groupItems.map(i => {
        let cleanName = i.description
          .replace(/25g/gi, '')
          .replace(/8g/gi, '')
          .replace(/Chocolate[s]?/gi, '')
          .trim();
        return allSameQty ? cleanName : `${cleanName} (${i.qty} ${i.unit})`;
      });

      const titleCategory = first.category === '25g Chocolate' 
        ? '25g Premium Dark Chocolates'
        : first.category === '8g Chocolate'
        ? '8g Mini Dark Chocolates'
        : `${first.category} Assortment`;

      const subtext = allSameQty
        ? `${groupItems.length} Flavors: ${flavorNames.join(', ')} (${firstQty} ${first.unit} per flavor)`
        : `Flavor Breakdown: ${flavorNames.join(', ')}`;

      result.push({
        id: `group-${key}`,
        category: first.category,
        description: titleCategory,
        subtext: subtext,
        hsnCode: first.hsnCode,
        qty: totalQty,
        unit: first.unit,
        rate: first.rate,
        gstRate: first.gstRate,
        total: grandTotal
      });
    }
  });

  return result;
}

export const ProcurementManager: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<SupplierPO[]>(() => {
    return StorageEngine.getLocal<SupplierPO[]>(STORAGE_PO_KEY, []);
  });

  const [grns, setGrns] = useState<GoodsReceiptNote[]>(() => {
    return StorageEngine.getLocal<GoodsReceiptNote[]>(STORAGE_GRN_KEY, []);
  });

  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<SupplierPO | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [copySuccess, setCopySuccess] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [isConsolidated, setIsConsolidated] = useState<boolean>(true);

  const poPrintRef = useRef<HTMLDivElement>(null);

  const handleDeletePo = (id: string, poNumber: string) => {
    if (window.confirm(`Are you sure you want to delete Purchase Order ${poNumber}? This action cannot be undone.`)) {
      const updatedPOs = purchaseOrders.filter(p => p.id !== id);
      setPurchaseOrders(updatedPOs);
      StorageEngine.setLocal(STORAGE_PO_KEY, updatedPOs);
      auditLogService.logSystemActivity(
        `Purchase Order Deleted`,
        `Deleted Purchase Order ${poNumber} from local register`
      );
      if (selectedPo?.id === id) {
        setSelectedPo(null);
        setIsPdfModalOpen(false);
      }
    }
  };


  // New PO Form State
  const [poForm, setPoForm] = useState<POFormState>({
    poNumber: `PO-GUD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    supplierName: PRESET_SUPPLIERS[0].name,
    supplierAddress: PRESET_SUPPLIERS[0].address,
    supplierContact: PRESET_SUPPLIERS[0].contact,
    supplierPhone: PRESET_SUPPLIERS[0].phone,
    supplierEmail: PRESET_SUPPLIERS[0].email,
    supplierGstin: PRESET_SUPPLIERS[0].gstin,
    paymentTerms: '50% Advance, 50% on Delivery',
    showPaymentTerms: true,
    shippingAddress: 'Gudoria Food Innovations(P) Ltd, Pranavarn Tower, 50/549C, B-Block Office, B4 First Floor, Petta, Poonithura, Ernakulam-682038',
    specialInstructions: '1. Temperature-controlled transit required (18°C–22°C).\n2. Minimum 6 months remaining shelf life upon receipt.\n3. Defective/damaged packaging will be rejected at GRN inspection.',
    showSla: true,
    showPricing: true,
    founderSignatureName: 'Himabindu / Founder & Managing Director',
    items: [
      {
        id: `item-${Date.now()}-1`,
        category: '25g Chocolate',
        description: 'Almond Noir 25g',
        hsnCode: '1806',
        qty: 100,
        unit: 'Pcs',
        rate: 52.5,
        gstRate: 5,
        total: 5250
      }
    ]
  });

  // GRN Form State
  const [grnForm, setGrnForm] = useState({
    qtyReceivedGood: 100,
    qtyDamaged: 0,
    qtyShortage: 0,
    batchId: `B-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`,
    mfgDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    receivedBy: 'Operations Manager'
  });

  // Select Preset Vendor
  const handleSelectVendor = (vendorName: string) => {
    const found = PRESET_SUPPLIERS.find(s => s.name === vendorName);
    if (found) {
      setPoForm(prev => ({
        ...prev,
        supplierName: found.name,
        supplierContact: found.contact,
        supplierAddress: found.address,
        supplierPhone: found.phone,
        supplierEmail: found.email,
        supplierGstin: found.gstin
      }));
    } else {
      setPoForm(prev => ({ ...prev, supplierName: vendorName }));
    }
  };

  // Cumulative Line Item Adders (Appends to existing items!)
  const handleAdd25gPack = () => {
    const newItems: POItem[] = PRESET_25G_FLAVORS.map((p, idx) => ({
      ...p,
      id: `item-${Date.now()}-25g-${idx}`,
      qty: 100,
      total: 100 * p.rate
    }));
    setPoForm(prev => ({ ...prev, items: [...prev.items, ...newItems] }));
  };

  const handleAdd8gPack = () => {
    const newItems: POItem[] = PRESET_8G_FLAVORS.map((p, idx) => ({
      ...p,
      id: `item-${Date.now()}-8g-${idx}`,
      qty: 250,
      total: 250 * p.rate
    }));
    setPoForm(prev => ({ ...prev, items: [...prev.items, ...newItems] }));
  };

  const handleAddAll11Flavors = () => {
    const items25g: POItem[] = PRESET_25G_FLAVORS.map((p, idx) => ({
      ...p,
      id: `item-${Date.now()}-25g-${idx}`,
      qty: 100,
      total: 100 * p.rate
    }));
    const items8g: POItem[] = PRESET_8G_FLAVORS.map((p, idx) => ({
      ...p,
      id: `item-${Date.now()}-8g-${idx}`,
      qty: 250,
      total: 250 * p.rate
    }));
    setPoForm(prev => ({ ...prev, items: [...prev.items, ...items25g, ...items8g] }));
  };

  const handleAddHamperPack = () => {
    const newItems: POItem[] = PRESET_HAMPER_PACKAGING.map((p, idx) => ({
      ...p,
      id: `item-${Date.now()}-hamper-${idx}`,
      qty: 50,
      total: 50 * p.rate
    }));
    setPoForm(prev => ({ ...prev, items: [...prev.items, ...newItems] }));
  };

  const handleAddCustomRow = () => {
    const newItem: POItem = {
      id: `item-${Date.now()}`,
      category: 'Custom',
      description: 'Custom Item / Service',
      hsnCode: '1806',
      qty: 1,
      unit: 'Pcs',
      rate: 1000,
      gstRate: 5,
      total: 1000
    };
    setPoForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleClearItems = () => {
    if (confirm('Clear all line items from this PO?')) {
      setPoForm(prev => ({ ...prev, items: [] }));
    }
  };

  const handleRemoveItem = (id: string) => {
    setPoForm(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const handleItemChange = (id: string, field: keyof POItem, value: any) => {
    setPoForm(prev => {
      const updated = prev.items.map(item => {
        if (item.id !== id) return item;
        const newItem = { ...item, [field]: value };
        if (field === 'qty' || field === 'rate') {
          newItem.total = Number(newItem.qty) * Number(newItem.rate);
        }
        return newItem;
      });
      return { ...prev, items: updated };
    });
  };

  // Calculations
  const calculatedSubtotal = poForm.items.reduce((acc, item) => acc + (Number(item.qty) * Number(item.rate)), 0);
  const calculatedGstTotal = poForm.items.reduce((acc, item) => {
    const lineSubtotal = Number(item.qty) * Number(item.rate);
    return acc + (lineSubtotal * (Number(item.gstRate) / 100));
  }, 0);
  const calculatedGrandTotal = calculatedSubtotal + calculatedGstTotal;

  // Create & Save PO
  const handleSavePo = () => {
    if (!poForm.supplierName.trim()) {
      alert('Please enter Supplier Name.');
      return;
    }
    if (poForm.items.length === 0) {
      alert('Please add at least one line item.');
      return;
    }

    const newPo: SupplierPO = {
      id: `PO-${Date.now().toString().slice(-6)}`,
      poNumber: poForm.poNumber,
      date: poForm.date,
      expectedDelivery: poForm.expectedDelivery,
      supplierName: poForm.supplierName,
      supplierAddress: poForm.supplierAddress,
      supplierContact: poForm.supplierContact,
      supplierPhone: poForm.supplierPhone,
      supplierEmail: poForm.supplierEmail,
      supplierGstin: poForm.supplierGstin,
      paymentTerms: poForm.paymentTerms,
      showPaymentTerms: poForm.showPaymentTerms,
      shippingAddress: poForm.shippingAddress,
      specialInstructions: poForm.specialInstructions,
      showSla: poForm.showSla,
      showPricing: poForm.showPricing,
      items: poForm.items,
      subtotal: calculatedSubtotal,
      gstTotal: calculatedGstTotal,
      grandTotal: calculatedGrandTotal,
      status: 'Sent',
      founderSignatureName: poForm.founderSignatureName
    };

    const updated = [newPo, ...purchaseOrders];
    setPurchaseOrders(updated);
    StorageEngine.setLocal(STORAGE_PO_KEY, updated);
    setIsPoModalOpen(false);

    auditLogService.logSystemActivity(
      `Purchase Order Issued`,
      `PO ${newPo.poNumber} issued to ${newPo.supplierName}. Value: ₹${newPo.grandTotal.toLocaleString('en-IN')}`
    );

    // Auto-open PDF preview
    setSelectedPo(newPo);
    setIsPdfModalOpen(true);
  };

  // Log GRN & Auto Update Inventory
  const handleCreateGrn = () => {
    if (!selectedPo) return;

    const newGrn: GoodsReceiptNote = {
      id: `GRN-${Date.now().toString().slice(-6)}`,
      grnNumber: `GRN-${Math.floor(2000 + Math.random() * 8000)}`,
      date: new Date().toISOString().split('T')[0],
      poNumber: selectedPo.poNumber,
      supplierName: selectedPo.supplierName,
      qtyOrdered: selectedPo.items.reduce((a, b) => a + b.qty, 0),
      qtyReceivedGood: Number(grnForm.qtyReceivedGood),
      qtyDamaged: Number(grnForm.qtyDamaged),
      qtyShortage: Number(grnForm.qtyShortage),
      batchIdAssigned: grnForm.batchId.toUpperCase().trim(),
      mfgDate: grnForm.mfgDate,
      expiryDate: grnForm.expiryDate,
      qcResult: Number(grnForm.qtyDamaged) > 10 ? 'Fail' : 'Pass',
      receivedBy: grnForm.receivedBy
    };

    const updatedGrns = [newGrn, ...grns];
    setGrns(updatedGrns);
    StorageEngine.setLocal(STORAGE_GRN_KEY, updatedGrns);

    // Update PO Status
    const isFullyReceived = newGrn.qtyReceivedGood + newGrn.qtyDamaged >= newGrn.qtyOrdered;
    const newStatus = isFullyReceived ? 'Fully Received' : 'Partially Received';

    const updatedPos = purchaseOrders.map(p => p.id === selectedPo.id ? { ...p, status: newStatus as any } : p);
    setPurchaseOrders(updatedPos);
    StorageEngine.setLocal(STORAGE_PO_KEY, updatedPos);

    // Update Stock Batches in localStorage for real-time Stock Tracker sync
    try {
      const existingBatchesRaw = localStorage.getItem('gud_stock_batches_v1');
      const existingBatches = existingBatchesRaw ? JSON.parse(existingBatchesRaw) : [];
      
      const newStockBatch = {
        dateReceived: newGrn.date,
        batchId: newGrn.batchIdAssigned,
        mfgDate: newGrn.mfgDate,
        expiryDate: newGrn.expiryDate,
        totalIn: {
          almond: selectedPo.items.find(i => i.description.toLowerCase().includes('almond'))?.qty || 0,
          orange: selectedPo.items.find(i => i.description.toLowerCase().includes('orange'))?.qty || 0,
          jackfruit: selectedPo.items.find(i => i.description.toLowerCase().includes('jackfruit'))?.qty || 0,
          lemon: selectedPo.items.find(i => i.description.toLowerCase().includes('lemon'))?.qty || 0,
          mocha: selectedPo.items.find(i => i.description.toLowerCase().includes('mocha'))?.qty || 0,
          seaSalt: selectedPo.items.find(i => i.description.toLowerCase().includes('sea salt') || i.description.toLowerCase().includes('salt'))?.qty || 0,
          peanuts: selectedPo.items.find(i => i.description.toLowerCase().includes('peanut'))?.qty || 0
        },
        damagedIn: {
          almond: 0, orange: 0, jackfruit: 0, lemon: 0, mocha: 0, seaSalt: 0, peanuts: 0
        }
      };

      const updatedBatches = [newStockBatch, ...existingBatches];
      localStorage.setItem('gud_stock_batches_v1', JSON.stringify(updatedBatches));
    } catch (e) {
      console.warn('Failed to sync stock batch to localStorage:', e);
    }

    setIsGrnModalOpen(false);
    auditLogService.logSystemActivity(
      `Goods Receipt Logged & Inventory Updated`,
      `GRN ${newGrn.grnNumber} for PO ${newGrn.poNumber}. Good: ${newGrn.qtyReceivedGood}, Batch: ${newGrn.batchIdAssigned}`
    );
    alert(`✅ Goods Receipt ${newGrn.grnNumber} registered!\nBatch ${newGrn.batchIdAssigned} has been automatically ingested into Stock Tracker.`);
  };

  // Production-Grade Non-Blocking PDF Export Pipeline
  const handleDownloadPdf = async () => {
    if (!poPrintRef.current || !selectedPo || pdfStatus === 'generating') return;
    setPdfStatus('generating');

    // Yield to browser main thread so React renders loading state on the download button
    await new Promise(resolve => setTimeout(resolve, 50));

    let tempContainer: HTMLDivElement | null = null;
    let blobUrl: string | null = null;

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Clone element into unconstrained off-screen wrapper node (no modal scrollbar bounds!)
      const clone = poPrintRef.current.cloneNode(true) as HTMLDivElement;
      clone.style.width = '794px';
      clone.style.maxWidth = '794px';
      clone.style.margin = '0';
      clone.style.boxSizing = 'border-box';
      clone.style.background = '#ffffff';
      clone.style.color = '#0f172a';
      clone.style.padding = '32px';

      tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0px';
      tempContainer.style.width = '794px';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.color = '#000000';
      tempContainer.style.zIndex = '-99999';
      tempContainer.appendChild(clone);
      document.body.appendChild(tempContainer);

      const fileName = `${selectedPo.poNumber}_${selectedPo.supplierName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const opt = {
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 1.75, useCORS: true, logging: false, windowWidth: 800 },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      // Generate direct binary Blob without base64 allocations
      const worker = html2pdf().set(opt as any).from(clone);
      const pdfBlob: Blob = await worker.output('blob');

      // Trigger single native file download via temporary Object URL
      blobUrl = URL.createObjectURL(pdfBlob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = fileName;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      setPdfStatus('success');
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setPdfStatus('error');
      // Fallback to isolated print preview if html2pdf fails
      handlePrintPo();
    } finally {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      if (tempContainer && document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
      setPdfStatus('idle');
    }
  };

  // Single-PO Isolated Print Handler (Prevents background PO list leakage)
  const handlePrintPo = () => {
    if (!poPrintRef.current || !selectedPo) return;

    let printMount = document.getElementById('po-print-mount');
    if (!printMount) {
      printMount = document.createElement('div');
      printMount.id = 'po-print-mount';
      document.body.appendChild(printMount);
    }

    const clone = poPrintRef.current.cloneNode(true) as HTMLElement;
    clone.style.width = '100%';
    clone.style.maxWidth = '100%';
    clone.style.boxShadow = 'none';

    printMount.innerHTML = '';
    printMount.appendChild(clone);

    document.body.classList.add('printing-po-active');

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-po-active');
        if (printMount && document.body.contains(printMount)) {
          document.body.removeChild(printMount);
        }
      }, 500);
    }, 100);
  };


  // Copy Transmittal
  const handleCopyTransmittal = () => {
    if (!selectedPo) return;
    const priceText = selectedPo.showPricing 
      ? `\n*Subtotal:* ₹${selectedPo.subtotal.toLocaleString('en-IN')}\n*GST:* ₹${selectedPo.gstTotal.toLocaleString('en-IN')}\n*TOTAL PO VALUE:* ₹${selectedPo.grandTotal.toLocaleString('en-IN')}`
      : `\n*(Quantity-Only Purchase Order)*`;

    const text = `📦 *GUDORIA FOOD INNOVATIONS PRIVATE LIMITED*
*PURCHASE ORDER: ${selectedPo.poNumber}*
Date: ${selectedPo.date}
Vendor: ${selectedPo.supplierName}
Expected Delivery: ${selectedPo.expectedDelivery}

*ORDER SUMMARY:*
${selectedPo.items.map((i, idx) => `${idx + 1}. ${i.description} — Qty: ${i.qty} ${i.unit}${selectedPo.showPricing ? ` @ ₹${i.rate}/unit = ₹${i.total.toLocaleString('en-IN')}` : ''}`).join('\n')}
${priceText}

${selectedPo.showPaymentTerms ? `*Payment Terms:* ${selectedPo.paymentTerms}\n` : ''}*Delivery Location:* ${selectedPo.shippingAddress}

Authorized Signatory: Himabindu (Founder & MD)
_Please confirm acceptance and target dispatch date._`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const filteredPOs = purchaseOrders.filter(po => statusFilter === 'All' || po.status === statusFilter);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2E2E2E] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[#272727] text-neutral-300 border border-[#383838]">
              Vendor Management
            </span>
            <span className="text-xs text-neutral-400 font-medium">B2B Purchase Orders & GRN</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2.5">
            <Factory className="w-5 h-5 text-neutral-300" /> Supplier Procurement & Scaria PO Studio
          </h1>
          <p className="text-neutral-400 text-xs mt-1">
            Issue formal Purchase Orders to Scaria (Cochin Cocoa Products), packaging vendors, and hamper suppliers with Founder Signature & PDF export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="primary"
            onClick={() => {
              setPoForm({
                poNumber: `PO-GUD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                date: new Date().toISOString().split('T')[0],
                expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                supplierName: PRESET_SUPPLIERS[0].name,
                supplierAddress: PRESET_SUPPLIERS[0].address,
                supplierContact: PRESET_SUPPLIERS[0].contact,
                supplierPhone: PRESET_SUPPLIERS[0].phone,
                supplierEmail: PRESET_SUPPLIERS[0].email,
                supplierGstin: PRESET_SUPPLIERS[0].gstin,
                paymentTerms: '50% Advance, 50% on Delivery',
                showPaymentTerms: true,
                shippingAddress: 'Gudoria Food Innovations(P) Ltd, Pranavarn Tower, 50/549C, B-Block Office, B4 First Floor, Petta, Poonithura, Ernakulam-682038',
                specialInstructions: '1. Temperature-controlled transit required (18°C–22°C).\n2. Minimum 6 months remaining shelf life upon receipt.\n3. Defective/damaged packaging will be rejected at GRN inspection.',
                showSla: true,
                showPricing: true,
                founderSignatureName: 'Himabindu / Founder & Managing Director',
                items: [
                  ...PRESET_25G_FLAVORS.map((p, idx) => ({ ...p, id: `item-${Date.now()}-25g-${idx}`, qty: 100, total: 100 * p.rate })),
                  ...PRESET_8G_FLAVORS.map((p, idx) => ({ ...p, id: `item-${Date.now()}-8g-${idx}`, qty: 250, total: 250 * p.rate }))
                ]
              });
              setIsPoModalOpen(true);
            }} 
            className="text-xs font-semibold px-3.5 py-2"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Purchase Order
          </Button>
        </div>
      </div>

      {/* Preset Quick Actions Banner */}
      <Card className="bg-[#1F1F1F] border-[#2E2E2E] p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#272727] rounded-lg border border-[#383838] text-neutral-300">
              <Sparkles className="w-5 h-5 text-neutral-300" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Multi-Case PO Engine (Scaria, 25g & 8g Flavors & Hampers)</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Combine 7 x 25g flavors and 4 x 8g mini flavors in a single order, or create quantity-only POs for Scaria.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => {
                setPoForm(prev => ({
                  ...prev,
                  items: [
                    ...PRESET_25G_FLAVORS.map((p, idx) => ({ ...p, id: `item-${Date.now()}-25g-${idx}`, qty: 100, total: 100 * p.rate })),
                    ...PRESET_8G_FLAVORS.map((p, idx) => ({ ...p, id: `item-${Date.now()}-8g-${idx}`, qty: 250, total: 250 * p.rate }))
                  ]
                }));
                setIsPoModalOpen(true);
              }} 
              className="text-xs font-medium"
            >
              Load All 11 Flavors (7 x 25g + 4 x 8g)
            </Button>
          </div>
        </div>
      </Card>

      {/* PO Status Filter & List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-neutral-400" /> Purchase Orders Register ({filteredPOs.length})
          </h3>
          <div className="flex items-center gap-1.5">
            {['All', 'Sent', 'Confirmed', 'Partially Received', 'Fully Received'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === st 
                    ? 'bg-white text-black font-semibold shadow-sm' 
                    : 'bg-[#272727] text-neutral-400 hover:text-white border border-[#383838]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {filteredPOs.length === 0 ? (
          <Card className="bg-[#1F1F1F] border-[#2E2E2E] p-8 text-center text-neutral-400">
            <Factory className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
            <p className="font-semibold text-neutral-200">No Purchase Orders Found</p>
            <p className="text-xs text-neutral-400 mt-1">Create a new PO for Scaria (Cochin Cocoa Products) or packaging suppliers.</p>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setIsPoModalOpen(true)} 
              className="mt-4 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Create Purchase Order
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPOs.map((po) => (
              <Card key={po.id} className="bg-[#1F1F1F] border-[#2E2E2E] hover:border-[#3E3E3E] transition-all">
                <CardHeader className="pb-3 border-b border-[#2E2E2E]">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-neutral-200 font-bold bg-[#272727] px-2 py-0.5 rounded border border-[#383838]">
                          {po.poNumber}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">Date: {po.date}</span>
                      </div>
                      <CardTitle className="text-base text-white mt-1.5 font-bold flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-neutral-400" /> {po.supplierName}
                      </CardTitle>
                    </div>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                      po.status === 'Fully Received' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40' :
                      po.status === 'Partially Received' ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40' :
                      po.status === 'Sent' || po.status === 'Confirmed' ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' :
                      'bg-[#272727] text-neutral-300 border-[#383838]'
                    }`}>
                      {po.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-3 text-xs text-neutral-300">
                  {/* Items Preview */}
                  <div className="bg-[#181818] p-2.5 rounded-lg border border-[#2E2E2E] space-y-1">
                    <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                      Line Items ({po.items.length}):
                    </div>
                    {po.items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-neutral-200">
                        <span className="truncate max-w-[220px]">• {item.description}</span>
                        <span className="font-mono text-neutral-400">{item.qty} {item.unit} {po.showPricing ? `@ ₹${item.rate}` : ''}</span>
                      </div>
                    ))}
                    {po.items.length > 4 && (
                      <div className="text-[10px] text-neutral-400 italic">
                        + {po.items.length - 4} more line items...
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">
                      {po.showPaymentTerms ? <>Payment: <strong className="text-neutral-200">{po.paymentTerms}</strong></> : <span className="italic">Payment Terms Omitted</span>}
                    </span>
                    <div className="text-right">
                      {po.showPricing ? (
                        <>
                          <span className="text-neutral-400 block text-[10px]">Total PO Value (incl. GST)</span>
                          <span className="text-base font-bold font-mono text-white">₹{po.grandTotal.toLocaleString('en-IN')}</span>
                        </>
                      ) : (
                        <span className="text-[11px] font-semibold text-neutral-300 bg-[#272727] px-2 py-0.5 rounded border border-[#383838]">
                          Quantity-Only PO
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-[#2E2E2E] pt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => { setSelectedPo(po); setIsPdfModalOpen(true); }}
                        className="text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-neutral-300" /> View PO PDF
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => { setSelectedPo(po); handleCopyTransmittal(); }}
                        className="text-xs"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1 text-neutral-300" /> Copy WhatsApp
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleDeletePo(po.id, po.poNumber)}
                        className="text-xs text-neutral-400 hover:text-rose-400 hover:border-rose-900/40"
                        title="Delete Purchase Order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {po.status !== 'Fully Received' && (
                      <Button 
                        size="sm" 
                        variant="primary"
                        onClick={() => { 
                          setSelectedPo(po); 
                          setGrnForm(prev => ({
                            ...prev,
                            qtyReceivedGood: po.items.reduce((a, b) => a + b.qty, 0),
                            qtyDamaged: 0,
                            qtyShortage: 0
                          }));
                          setIsGrnModalOpen(true); 
                        }} 
                        className="text-xs font-semibold"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Log GRN & Stock
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* GRN History Log */}
      <div className="space-y-4 pt-4 border-t border-[#2E2E2E]">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Boxes className="w-4 h-4 text-neutral-400" /> Goods Received History (GRN & Batch Intake Log)
        </h3>
        {grns.length === 0 ? (
          <Card className="bg-[#1F1F1F] border-[#2E2E2E] p-6 text-center text-neutral-400 text-xs">
            No Goods Receipts logged yet. Receiving a PO registers a GRN and updates live stock batches.
          </Card>
        ) : (
          <div className="space-y-2">
            {grns.map(grn => (
              <div key={grn.id} className="bg-[#1F1F1F] border border-[#2E2E2E] p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-white font-bold bg-[#272727] px-2 py-0.5 rounded border border-[#383838]">{grn.grnNumber}</span>
                    <span className="text-neutral-400">PO: <strong className="text-neutral-200">{grn.poNumber}</strong></span>
                    <span className="text-neutral-400">• Date: {grn.date}</span>
                  </div>
                  <div className="text-neutral-200 font-semibold mt-1 flex items-center gap-2">
                    <span>{grn.supplierName}</span>
                    <span className="text-neutral-500">|</span>
                    <span className="font-mono text-neutral-300">Batch Registered: {grn.batchIdAssigned}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 font-mono bg-[#181818] px-3 py-1.5 rounded-lg border border-[#2E2E2E]">
                  <div>Ordered: <span className="text-white font-bold">{grn.qtyOrdered}</span></div>
                  <div>Good: <span className="text-white font-bold">{grn.qtyReceivedGood}</span></div>
                  <div>Damaged: <span className="text-rose-400/90 font-bold">{grn.qtyDamaged}</span></div>
                  <div>Shortage: <span className="text-neutral-400 font-bold">{grn.qtyShortage}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NEW PO CREATION MODAL */}
      <Modal 
        isOpen={isPoModalOpen} 
        onClose={() => setIsPoModalOpen(false)} 
        title="Create Supplier Purchase Order (PO Studio)"
        size="xl"
      >
        <div className="space-y-5 text-xs text-neutral-200 max-h-[80vh] overflow-y-auto pr-1">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#181818] p-4 rounded-xl border border-[#2E2E2E]">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">PO Number</label>
              <input 
                type="text" 
                value={poForm.poNumber}
                onChange={e => setPoForm({ ...poForm, poNumber: e.target.value })}
                className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">PO Issue Date</label>
              <input 
                type="date" 
                value={poForm.date}
                onChange={e => setPoForm({ ...poForm, date: e.target.value })}
                className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Expected Delivery Date</label>
              <input 
                type="date" 
                value={poForm.expectedDelivery}
                onChange={e => setPoForm({ ...poForm, expectedDelivery: e.target.value })}
                className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-neutral-400"
              />
            </div>
          </div>

          {/* PO Display & Formatting Controls */}
          <div className="bg-[#181818] p-4 rounded-xl border border-[#2E2E2E] space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              PO Display Options & Toggles
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer bg-[#121212] p-2.5 rounded-lg border border-[#2E2E2E] hover:border-[#3E3E3E]">
                <input 
                  type="checkbox" 
                  checked={poForm.showPricing}
                  onChange={e => setPoForm({ ...poForm, showPricing: e.target.checked })}
                  className="rounded accent-white w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-white block text-xs">Include Rates & Amounts</span>
                  <span className="text-[10px] text-neutral-400 block">Uncheck for Quantity-Only PO</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer bg-[#121212] p-2.5 rounded-lg border border-[#2E2E2E] hover:border-[#3E3E3E]">
                <input 
                  type="checkbox" 
                  checked={poForm.showPaymentTerms}
                  onChange={e => setPoForm({ ...poForm, showPaymentTerms: e.target.checked })}
                  className="rounded accent-white w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-white block text-xs">Show Payment Terms</span>
                  <span className="text-[10px] text-neutral-400 block">Print terms box on PDF</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer bg-[#121212] p-2.5 rounded-lg border border-[#2E2E2E] hover:border-[#3E3E3E]">
                <input 
                  type="checkbox" 
                  checked={poForm.showSla}
                  onChange={e => setPoForm({ ...poForm, showSla: e.target.checked })}
                  className="rounded accent-white w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-white block text-xs">Mandatory Transit SLA</span>
                  <span className="text-[10px] text-neutral-400 block">Cold chain & quality rules</span>
                </div>
              </label>
            </div>
          </div>

          {/* Vendor Details */}
          <div className="space-y-3 bg-[#181818] p-4 rounded-xl border border-[#2E2E2E]">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-neutral-300" /> Supplier / Vendor Profile
              </h4>
              <span className="text-[11px] text-neutral-400">Quick Select Vendor:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESET_SUPPLIERS.map(s => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => handleSelectVendor(s.name)}
                  className={`p-2.5 rounded-lg text-left border text-[11px] transition-all ${
                    poForm.supplierName === s.name 
                      ? 'bg-[#272727] border-neutral-400 text-white font-bold' 
                      : 'bg-[#121212] border-[#2E2E2E] text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="truncate font-semibold">{s.name}</div>
                  <div className="text-[10px] opacity-75 truncate">{s.contact}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-neutral-300 mb-1">Vendor Name</label>
                <input 
                  type="text" 
                  value={poForm.supplierName}
                  onChange={e => setPoForm({ ...poForm, supplierName: e.target.value })}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-1.5 text-white font-semibold focus:outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="block text-neutral-300 mb-1">Contact Person & Phone</label>
                <input 
                  type="text" 
                  value={poForm.supplierContact}
                  onChange={e => setPoForm({ ...poForm, supplierContact: e.target.value })}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-neutral-400"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-neutral-300 mb-1">Vendor Address & GSTIN</label>
                <input 
                  type="text" 
                  value={poForm.supplierAddress}
                  onChange={e => setPoForm({ ...poForm, supplierAddress: e.target.value })}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-neutral-400"
                  placeholder="Address & GSTIN..."
                />
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons for Line Items (Cumulative Adders) */}
          <div className="space-y-2 border-t border-[#2E2E2E] pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-neutral-300" /> Line Items & Quantities ({poForm.items.length})
              </h4>
              <button 
                type="button" 
                onClick={handleClearItems}
                className="text-xs text-neutral-400 hover:text-white underline"
              >
                Clear Table
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleAdd25gPack} className="text-[11px] py-1 px-2.5">
                + Add 7 x 25g Flavors
              </Button>
              <Button size="sm" variant="secondary" onClick={handleAdd8gPack} className="text-[11px] py-1 px-2.5">
                + Add 4 x 8g Minis
              </Button>
              <Button size="sm" variant="secondary" onClick={handleAddAll11Flavors} className="text-[11px] py-1 px-2.5 font-semibold text-white">
                + Add All 11 Flavors
              </Button>
              <Button size="sm" variant="secondary" onClick={handleAddHamperPack} className="text-[11px] py-1 px-2.5">
                + Add Hamper Items
              </Button>
              <Button size="sm" variant="secondary" onClick={handleAddCustomRow} className="text-[11px] py-1 px-2.5">
                + Add Custom Row
              </Button>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto border border-[#2E2E2E] rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#181818] border-b border-[#2E2E2E] text-[11px] font-semibold text-neutral-400 uppercase">
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5">HSN</th>
                  <th className="p-2.5 w-24">Qty</th>
                  <th className="p-2.5 w-20">Unit</th>
                  {poForm.showPricing && (
                    <>
                      <th className="p-2.5 w-28">Rate (₹)</th>
                      <th className="p-2.5 w-20">GST %</th>
                      <th className="p-2.5 text-right">Total (₹)</th>
                    </>
                  )}
                  <th className="p-2.5 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242424] bg-[#121212]">
                {poForm.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#181818]">
                    <td className="p-2">
                      <select 
                        value={item.category}
                        onChange={e => handleItemChange(item.id, 'category', e.target.value)}
                        className="bg-[#181818] border border-[#2E2E2E] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-neutral-400"
                      >
                        <option value="25g Chocolate">25g Chocolate</option>
                        <option value="8g Chocolate">8g Chocolate</option>
                        <option value="Hamper Item">Hamper Item</option>
                        <option value="Packaging">Packaging</option>
                        <option value="Raw Material">Raw Material</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={item.description}
                        onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                        className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-2 py-1 text-white text-xs font-semibold focus:outline-none focus:border-neutral-400"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={item.hsnCode}
                        onChange={e => handleItemChange(item.id, 'hsnCode', e.target.value)}
                        className="w-20 bg-[#181818] border border-[#2E2E2E] rounded-lg px-2 py-1 text-neutral-300 text-xs font-mono focus:outline-none focus:border-neutral-400"
                        placeholder="Optional"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        value={item.qty}
                        onChange={e => handleItemChange(item.id, 'qty', Number(e.target.value))}
                        className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-2 py-1 text-white font-mono font-bold text-xs focus:outline-none focus:border-neutral-400"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={item.unit}
                        onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                        className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-2 py-1 text-neutral-300 text-xs focus:outline-none focus:border-neutral-400"
                      />
                    </td>
                    {poForm.showPricing && (
                      <>
                        <td className="p-2">
                          <input 
                            type="number" 
                            value={item.rate}
                            onChange={e => handleItemChange(item.id, 'rate', Number(e.target.value))}
                            className="w-full bg-[#181818] border border-[#2E2E2E] rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-neutral-400"
                          />
                        </td>
                        <td className="p-2">
                          <select 
                            value={item.gstRate}
                            onChange={e => handleItemChange(item.id, 'gstRate', Number(e.target.value))}
                            className="bg-[#181818] border border-[#2E2E2E] rounded-lg px-2 py-1 text-neutral-300 text-xs font-mono focus:outline-none focus:border-neutral-400"
                          >
                            <option value={5}>5%</option>
                            <option value={18}>18%</option>
                            <option value={12}>12%</option>
                            <option value={0}>0%</option>
                          </select>
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-white text-xs">
                          ₹{item.total.toLocaleString('en-IN')}
                        </td>
                      </>
                    )}
                    <td className="p-2 text-center">
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-neutral-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Terms & Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Payment Terms (Fully Editable)</label>
              <input 
                type="text" 
                value={poForm.paymentTerms}
                onChange={e => setPoForm({ ...poForm, paymentTerms: e.target.value })}
                className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neutral-400"
                placeholder="e.g. 50% Advance, 50% on Delivery or Net 30 Days..."
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Founder Signatory Name</label>
              <input 
                type="text" 
                value={poForm.founderSignatureName}
                onChange={e => setPoForm({ ...poForm, founderSignatureName: e.target.value })}
                className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-neutral-400"
              />
            </div>
          </div>

          {poForm.showSla && (
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Mandatory Transit & Quality Instructions</label>
              <textarea 
                rows={3}
                value={poForm.specialInstructions}
                onChange={e => setPoForm({ ...poForm, specialInstructions: e.target.value })}
                className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-neutral-200 text-xs font-mono focus:outline-none focus:border-neutral-400"
              />
            </div>
          )}

          {/* Total Summary Bar */}
          <div className="bg-[#181818] border border-[#2E2E2E] p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              {poForm.showPricing ? (
                <>
                  <div className="text-xs text-neutral-400 uppercase font-semibold">Subtotal: ₹{calculatedSubtotal.toLocaleString('en-IN')} + GST: ₹{calculatedGstTotal.toLocaleString('en-IN')}</div>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    GRAND TOTAL: ₹{calculatedGrandTotal.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-neutral-400 italic">{numberToWordsINR(calculatedGrandTotal)}</div>
                </>
              ) : (
                <div className="text-sm font-bold text-white font-mono">
                  QUANTITY-ONLY PURCHASE ORDER ({poForm.items.reduce((a, b) => a + b.qty, 0)} Total Units)
                </div>
              )}
            </div>

            <Button 
              variant="primary"
              onClick={handleSavePo} 
              className="font-semibold py-2.5 px-6 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Issue Purchase Order & Generate PDF
            </Button>
          </div>
        </div>
      </Modal>

      {/* GRN LOG MODAL */}
      <Modal 
        isOpen={isGrnModalOpen} 
        onClose={() => setIsGrnModalOpen(false)} 
        title={`Log Goods Receipt (GRN) for ${selectedPo?.poNumber}`}
      >
        <div className="space-y-4 text-xs text-neutral-200">
          <div className="bg-[#181818] p-3 rounded-xl border border-[#2E2E2E]">
            <div className="font-semibold text-white">{selectedPo?.supplierName}</div>
            <div className="text-neutral-400 text-[11px] mt-0.5">Total Ordered Qty: <strong className="text-white">{selectedPo?.items.reduce((a, b) => a + b.qty, 0)} units</strong></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-neutral-300 mb-1 font-semibold">Good Qty Received</label>
              <input 
                type="number" 
                value={grnForm.qtyReceivedGood}
                onChange={e => setGrnForm({ ...grnForm, qtyReceivedGood: Number(e.target.value) })}
                className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-white font-bold font-mono focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="block text-neutral-300 mb-1 font-semibold">Damaged Qty</label>
              <input 
                type="number" 
                value={grnForm.qtyDamaged}
                onChange={e => setGrnForm({ ...grnForm, qtyDamaged: Number(e.target.value) })}
                className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-rose-400 font-bold font-mono focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="block text-neutral-300 mb-1 font-semibold">Shortage Qty</label>
              <input 
                type="number" 
                value={grnForm.qtyShortage}
                onChange={e => setGrnForm({ ...grnForm, qtyShortage: Number(e.target.value) })}
                className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-neutral-300 font-bold font-mono focus:outline-none focus:border-neutral-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-300 mb-1 font-semibold">Assigned Batch ID (For Inventory)</label>
            <input 
              type="text" 
              value={grnForm.batchId}
              onChange={e => setGrnForm({ ...grnForm, batchId: e.target.value })}
              className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-neutral-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 mb-1">Manufacturing Date</label>
              <input 
                type="date" 
                value={grnForm.mfgDate}
                onChange={e => setGrnForm({ ...grnForm, mfgDate: e.target.value })}
                className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="block text-neutral-300 mb-1">Expiry Date Guarantee</label>
              <input 
                type="date" 
                value={grnForm.expiryDate}
                onChange={e => setGrnForm({ ...grnForm, expiryDate: e.target.value })}
                className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-neutral-400"
              />
            </div>
          </div>

          <Button variant="primary" onClick={handleCreateGrn} className="w-full font-semibold py-2.5 mt-2">
            <ShieldCheck className="w-4 h-4 mr-1.5" /> Confirm Goods Receipt & Ingest into Live Stock
          </Button>
        </div>
      </Modal>

      {/* PDF PREVIEW & PRINT MODAL */}
      <Modal 
        isOpen={isPdfModalOpen} 
        onClose={() => setIsPdfModalOpen(false)} 
        title={`Purchase Order PDF Preview — ${selectedPo?.poNumber}`}
        size="xl"
      >
        {selectedPo && (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#181818] p-3 rounded-xl border border-[#2E2E2E]">
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  size="sm" 
                  variant="primary"
                  onClick={handleDownloadPdf} 
                  disabled={pdfStatus === 'generating'}
                  className="text-xs font-semibold"
                >
                  {pdfStatus === 'generating' ? (
                    <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-1.5" />
                  )}
                  {pdfStatus === 'generating' ? 'Generating PDF...' : 'Download PDF Document'}
                </Button>
                <Button size="sm" variant="secondary" onClick={handlePrintPo} className="text-xs">
                  <Printer className="w-4 h-4 mr-1.5" /> Print PO
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => setIsConsolidated(!isConsolidated)}
                  className={`text-xs ${isConsolidated ? 'border-neutral-400 text-white font-semibold' : 'text-neutral-300'}`}
                  title="Toggle between consolidated flavor grouping and individual line items"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-neutral-300" />
                  {isConsolidated ? 'Consolidated (1-Page)' : 'Itemized (All Rows)'}
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => selectedPo && handleDeletePo(selectedPo.id, selectedPo.poNumber)}
                  className="text-neutral-400 hover:text-rose-400 text-xs"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete PO
                </Button>
              </div>

              <Button 
                size="sm" 
                variant="secondary" 
                onClick={handleCopyTransmittal}
                className="text-xs"
              >
                {copySuccess ? <Check className="w-4 h-4 mr-1 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1 text-neutral-300" />}
                {copySuccess ? 'Copied to Clipboard!' : 'Copy WhatsApp Transmittal'}
              </Button>
            </div>

            {/* Printable PDF Template Box */}
            <div className="p-2 bg-[#121212] overflow-x-auto rounded-xl border border-[#2E2E2E]">
              <div 
                ref={poPrintRef}
                id="printable-document"
                className="w-full max-w-[794px] bg-white text-slate-900 p-5 sm:p-6 mx-auto font-sans text-xs shadow-lg relative border-t-4 border-amber-900"
                style={{ color: '#0f172a' }}
              >
                {/* Executive Professional B2B Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-3">
                  {/* Left: Gudoria Brand Details */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-950 text-amber-400 rounded-xl flex-shrink-0 shadow-md">
                      <GudLogo size={38} />
                    </div>
                    <div>
                      <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase leading-none">
                        GUDORIA FOOD INNOVATIONS PVT LTD
                      </h1>
                      <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
                        Pranavarn Tower, 50/549C, B-Block Office, B4 1st Floor, Petta, Poonithura, Ernakulam-682038
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-600 font-mono mt-0.5">
                        <span>Phone: 09544809992</span>
                        <span>•</span>
                        <span>Email: gudchocolates@gmail.com</span>
                        <span>•</span>
                        <span className="font-bold text-slate-900">GSTIN: 32AANCA8181G1ZK</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Sleek PO Metadata Card */}
                  <div className="text-right flex-shrink-0 bg-slate-900 text-white p-2.5 rounded-lg border border-slate-800 shadow-md">
                    <div className="text-[9px] font-extrabold uppercase tracking-widest text-amber-400 mb-0.5 border-b border-slate-800 pb-0.5">
                      OFFICIAL PURCHASE ORDER
                    </div>
                    <div className="text-xs font-mono font-bold text-white tracking-wider">{selectedPo.poNumber}</div>
                    <div className="text-[9px] text-slate-300 font-mono mt-0.5">Date: <strong className="text-slate-100">{selectedPo.date}</strong></div>
                    <div className="text-[9px] text-slate-300 font-mono">Expected: <strong className="text-amber-400">{selectedPo.expectedDelivery}</strong></div>
                  </div>
                </div>

                {/* Info Grid: Vendor Details vs Delivery Location */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Vendor Box */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-300">
                    <div className="text-[9px] font-extrabold uppercase text-amber-900 tracking-wider mb-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-amber-700" /> VENDOR / SUPPLIER DETAILS:
                    </div>
                    <div className="text-xs font-bold text-slate-950">{selectedPo.supplierName}</div>
                    <div className="text-[10px] text-slate-700 mt-0.5 leading-snug">{selectedPo.supplierAddress}</div>
                    <div className="text-[10px] text-slate-700 mt-0.5">Contact: <strong>{selectedPo.supplierContact}</strong></div>
                    <div className="text-[10px] text-slate-700 font-mono">Phone: {selectedPo.supplierPhone}</div>
                    {selectedPo.supplierGstin && (
                      <div className="text-[10px] text-slate-900 font-mono font-bold mt-1 pt-0.5 border-t border-slate-200">
                        GSTIN: {selectedPo.supplierGstin}
                      </div>
                    )}
                  </div>

                  {/* Ship To Box */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-300">
                    <div className="text-[9px] font-extrabold uppercase text-amber-900 tracking-wider mb-1 flex items-center gap-1">
                      <Truck className="w-3 h-3 text-amber-700" /> DELIVERY LOCATION & TERMS:
                    </div>
                    <div className="text-[10px] text-slate-800 font-medium leading-snug">{selectedPo.shippingAddress}</div>
                    
                    {selectedPo.showPaymentTerms && (
                      <div className="mt-2 pt-1 border-t border-slate-200 text-[10px]">
                        <span className="text-slate-600 font-medium">Payment Terms:</span>{' '}
                        <strong className="text-slate-950">{selectedPo.paymentTerms}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="w-full text-left border-collapse mb-3 text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-white font-bold text-[10px]">
                      <th className="py-1.5 px-2 border border-slate-900 w-8 text-center">#</th>
                      <th className="py-1.5 px-2 border border-slate-900">Item Description</th>
                      <th className="py-1.5 px-2 border border-slate-900 text-center">Category</th>
                      <th className="py-1.5 px-2 border border-slate-900 text-center">HSN</th>
                      <th className="py-1.5 px-2 border border-slate-900 text-right w-16">Qty</th>
                      <th className="py-1.5 px-2 border border-slate-900 text-center w-14">Unit</th>
                      {selectedPo.showPricing && (
                        <>
                          <th className="py-1.5 px-2 border border-slate-900 text-right w-20">Rate (₹)</th>
                          <th className="py-1.5 px-2 border border-slate-900 text-right w-14">GST %</th>
                          <th className="py-1.5 px-2 border border-slate-900 text-right w-24">Amount (₹)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(isConsolidated ? getConsolidatedPOItems(selectedPo.items) : selectedPo.items).map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="py-1.5 px-2 border border-slate-200 text-center font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-1.5 px-2 border border-slate-200 font-bold text-slate-950">
                          <div>{item.description}</div>
                          {(item as ConsolidatedPOItem).subtext && (
                            <div className="text-[10px] text-amber-900 font-medium font-mono mt-0.5 whitespace-normal leading-tight">
                              {(item as ConsolidatedPOItem).subtext}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-2 border border-slate-200 text-center text-[10px] text-slate-600">{item.category}</td>
                        <td className="py-1.5 px-2 border border-slate-200 text-center font-mono text-[10px] text-slate-600">{item.hsnCode || '-'}</td>
                        <td className="py-1.5 px-2 border border-slate-200 text-right font-mono font-bold text-slate-950 text-[11px]">{item.qty.toLocaleString('en-IN')}</td>
                        <td className="py-1.5 px-2 border border-slate-200 text-center text-slate-600 text-[10px]">{item.unit}</td>
                        {selectedPo.showPricing && (
                          <>
                            <td className="py-1.5 px-2 border border-slate-200 text-right font-mono text-[11px]">₹{item.rate.toLocaleString('en-IN')}</td>
                            <td className="py-1.5 px-2 border border-slate-200 text-right font-mono text-[10px]">{item.gstRate}%</td>
                            <td className="py-1.5 px-2 border border-slate-200 text-right font-mono font-bold text-slate-950 text-[11px]">₹{item.total.toLocaleString('en-IN')}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Financial Summary or Quantity-Only Banner */}
                {selectedPo.showPricing ? (
                  <div className="grid grid-cols-12 gap-4 mb-3">
                    <div className="col-span-7">
                      {selectedPo.showSla && (
                        <div className="bg-amber-50/60 p-2.5 rounded border border-amber-200 text-[10px] text-slate-700 space-y-0.5">
                          <div className="font-bold text-amber-950 uppercase tracking-wider text-[9px] flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-800" /> MANDATORY TRANSIT & QUALITY SLA:
                          </div>
                          <div className="whitespace-pre-line font-mono text-[9px] text-slate-800 leading-tight">
                            {selectedPo.specialInstructions}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="col-span-5 bg-slate-50 p-2.5 rounded-lg border border-slate-300 space-y-1 font-mono text-xs">
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>Subtotal:</span>
                        <span>₹{selectedPo.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>CGST (2.5% / 9%):</span>
                        <span>₹{(selectedPo.gstTotal / 2).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>SGST (2.5% / 9%):</span>
                        <span>₹{(selectedPo.gstTotal / 2).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="border-t-2 border-slate-900 pt-1 flex justify-between font-bold text-slate-950 text-xs">
                        <span>TOTAL PO VALUE:</span>
                        <span className="text-amber-900 font-extrabold text-sm">₹{selectedPo.grandTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 space-y-2">
                    <div className="bg-cyan-50 p-2.5 rounded border border-cyan-200 text-center font-mono font-bold text-cyan-950 text-xs">
                      QUANTITY-ONLY PURCHASE ORDER • TOTAL UNITS ORDERED: {selectedPo.items.reduce((a, b) => a + b.qty, 0).toLocaleString('en-IN')} Pcs
                    </div>
                    {selectedPo.showSla && (
                      <div className="bg-amber-50/60 p-2.5 rounded border border-amber-200 text-[10px] text-slate-700 space-y-0.5">
                        <div className="font-bold text-amber-950 uppercase tracking-wider text-[9px] flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-800" /> MANDATORY TRANSIT & QUALITY SLA:
                        </div>
                        <div className="whitespace-pre-line font-mono text-[9px] text-slate-800 leading-tight">
                          {selectedPo.specialInstructions}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedPo.showPricing && (
                  <div className="text-[10px] font-bold text-slate-900 italic border-t border-slate-200 pt-1.5 mb-4">
                    Amount in Words: {numberToWordsINR(selectedPo.grandTotal)}
                  </div>
                )}

                {/* Signatures Footer with Hima's Founder Signature Image */}
                <div className="pt-3 border-t-2 border-slate-950 flex justify-between items-end">
                  <div>
                    <div className="text-[9px] text-slate-500 font-mono">Acceptance & Confirmation by Vendor:</div>
                    <div className="mt-8 text-[11px] font-semibold text-slate-700">Authorized Vendor Representative Signature</div>
                  </div>

                  <div className="text-right">
                    <div className="text-[9px] text-slate-700 font-extrabold uppercase tracking-wider mb-0.5">
                      FOR GUDORIA FOOD INNOVATIONS PVT LTD
                    </div>

                    {/* Actual Founder Hima Signature Image */}
                    <div className="my-0.5 flex justify-end">
                      <img 
                        src="/images/brand/founder_signature.jpg" 
                        alt="Founder Hima Signature" 
                        className="h-11 max-w-[150px] object-contain"
                      />
                    </div>

                    <div className="text-[11px] font-black text-slate-950">{selectedPo.founderSignatureName}</div>
                    <div className="text-[9px] text-slate-600 font-semibold">Founder & Managing Director</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
