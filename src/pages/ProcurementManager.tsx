import React, { useState, useRef } from 'react';
import { 
  Factory, Plus, FileText, CheckCircle2, ShieldCheck, Download, Printer, 
  Trash2, Copy, Sparkles, Boxes, Truck, RefreshCw, Eye, Building2,
  Calendar, Check, ShieldAlert, Award, FileSpreadsheet, Send, FileCheck, Layers
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
  gstRate: number; // e.g., 18 or 5 or 12
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
  shippingAddress: string;
  specialInstructions: string;
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
  shippingAddress: string;
  specialInstructions: string;
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

  const poPrintRef = useRef<HTMLDivElement>(null);

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
    shippingAddress: 'Gudoria Food Innovations(P) Ltd, Pranavarn Tower, 50/549C, B-Block Office, B4 First Floor, Petta, Poonithura, Ernakulam-682038',
    specialInstructions: '1. Temperature-controlled transit required (18°C–22°C).\n2. Minimum 6 months remaining shelf life upon receipt.\n3. Defective/damaged packaging will be rejected at GRN inspection.',
    founderSignatureName: 'Founder / Managing Director',
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

  // Add Item Presets
  const handleLoad25gPack = () => {
    const newItems: POItem[] = PRESET_25G_FLAVORS.map((p, idx) => ({
      ...p,
      id: `item-${Date.now()}-${idx}`,
      qty: 100,
      total: 100 * p.rate
    }));
    setPoForm(prev => ({ ...prev, items: newItems }));
  };

  const handleLoad8gPack = () => {
    const newItems: POItem[] = PRESET_8G_FLAVORS.map((p, idx) => ({
      ...p,
      id: `item-${Date.now()}-${idx}`,
      qty: 250,
      total: 250 * p.rate
    }));
    setPoForm(prev => ({ ...prev, items: newItems }));
  };

  const handleLoadHamperPack = () => {
    const newItems: POItem[] = PRESET_HAMPER_PACKAGING.map((p, idx) => ({
      ...p,
      id: `item-${Date.now()}-${idx}`,
      qty: 50,
      total: 50 * p.rate
    }));
    setPoForm(prev => ({ ...prev, items: newItems }));
  };

  const handleAddCustomRow = () => {
    const newItem: POItem = {
      id: `item-${Date.now()}`,
      category: 'Custom',
      description: 'Custom Item / Service',
      hsnCode: '9988',
      qty: 1,
      unit: 'Pcs',
      rate: 1000,
      gstRate: 18,
      total: 1000
    };
    setPoForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleRemoveItem = (id: string) => {
    if (poForm.items.length <= 1) {
      alert('A Purchase Order must have at least one line item.');
      return;
    }
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
      shippingAddress: poForm.shippingAddress,
      specialInstructions: poForm.specialInstructions,
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

  // PDF Export
  const handleDownloadPdf = async () => {
    if (!poPrintRef.current || !selectedPo) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = poPrintRef.current;
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${selectedPo.poNumber}_${selectedPo.supplierName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt as any).from(element).save();
    } catch (err) {
      console.error('PDF Generation Error:', err);
      window.print();
    }
  };

  // Copy Transmittal
  const handleCopyTransmittal = () => {
    if (!selectedPo) return;
    const text = `📦 *GUDORIA FOOD INNOVATIONS PRIVATE LIMITED*
*PURCHASE ORDER: ${selectedPo.poNumber}*
Date: ${selectedPo.date}
Vendor: ${selectedPo.supplierName}
Expected Delivery: ${selectedPo.expectedDelivery}

*ORDER SUMMARY:*
${selectedPo.items.map((i, idx) => `${idx + 1}. ${i.description} — Qty: ${i.qty} ${i.unit} @ ₹${i.rate}/unit = ₹${i.total.toLocaleString('en-IN')}`).join('\n')}

*Subtotal:* ₹${selectedPo.subtotal.toLocaleString('en-IN')}
*GST (18%):* ₹${selectedPo.gstTotal.toLocaleString('en-IN')}
*TOTAL PO VALUE:* ₹${selectedPo.grandTotal.toLocaleString('en-IN')}

*Payment Terms:* ${selectedPo.paymentTerms}
*Delivery Location:* ${selectedPo.shippingAddress}

Authorized Signatory: Gudoria Founder & MD
_Please confirm acceptance and target dispatch date._`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const filteredPOs = purchaseOrders.filter(po => statusFilter === 'All' || po.status === statusFilter);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Factory className="w-7 h-7 text-amber-500" /> Supplier Procurement & Scaria PO Studio
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Issue formal Purchase Orders to Scaria (25g & 8g flavors), packaging vendors, and hamper suppliers with Founder Signature & PDF export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
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
                shippingAddress: 'Gudoria Food Innovations(P) Ltd, Pranavarn Tower, 50/549C, B-Block Office, B4 First Floor, Petta, Poonithura, Ernakulam-682038',
                specialInstructions: '1. Temperature-controlled cold chain transit required (18°C–22°C).\n2. Minimum 6 months remaining shelf life upon receipt.\n3. Packaging defects or moisture compromise will result in GRN rejection.',
                founderSignatureName: 'Founder / Managing Director',
                items: PRESET_25G_FLAVORS.map((p, idx) => ({ ...p, id: `item-${Date.now()}-${idx}`, qty: 100, total: 100 * p.rate }))
              });
              setIsPoModalOpen(true);
            }} 
            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg shadow-amber-950/50"
          >
            <Plus className="w-4 h-4 mr-1.5" /> + Create Purchase Order
          </Button>
        </div>
      </div>

      {/* Preset Quick Actions Banner */}
      <Card className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border-amber-900/40 p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">Multi-Case PO Engine (Scaria, 25g/8g Flavors & Hampers)</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate tailored POs for Scaria chocolate factory (7 x 25g flavors, 4 x 8g mini flavors), packaging, or hamper accessories.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              size="sm" 
              onClick={() => { handleLoad25gPack(); setIsPoModalOpen(true); }} 
              className="bg-amber-950/80 hover:bg-amber-900 border border-amber-800/80 text-amber-300 text-xs"
            >
              🍫 Scaria 7 x 25g Pack
            </Button>
            <Button 
              size="sm" 
              onClick={() => { handleLoad8gPack(); setIsPoModalOpen(true); }} 
              className="bg-amber-950/80 hover:bg-amber-900 border border-amber-800/80 text-amber-300 text-xs"
            >
              🍬 Scaria 4 x 8g Minis
            </Button>
            <Button 
              size="sm" 
              onClick={() => { handleLoadHamperPack(); setIsPoModalOpen(true); }} 
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs"
            >
              🎁 Hamper & Packaging
            </Button>
          </div>
        </div>
      </Card>

      {/* PO Status Filter & List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-400" /> Purchase Orders Register ({filteredPOs.length})
          </h3>
          <div className="flex items-center gap-2">
            {['All', 'Sent', 'Confirmed', 'Partially Received', 'Fully Received'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  statusFilter === st 
                    ? 'bg-amber-600 text-white font-bold' 
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {filteredPOs.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 p-8 text-center text-slate-400">
            <Factory className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-slate-300">No Purchase Orders Found</p>
            <p className="text-xs text-slate-500 mt-1">Create a new PO for Scaria or packaging suppliers to track procurement.</p>
            <Button onClick={() => setIsPoModalOpen(true)} className="mt-4 bg-amber-600 hover:bg-amber-500 text-white text-xs">
              <Plus className="w-4 h-4 mr-1" /> + Create Purchase Order
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPOs.map((po) => (
              <Card key={po.id} className="bg-slate-900 border-slate-800 hover:border-amber-900/60 transition-all">
                <CardHeader className="pb-3 border-b border-slate-800/60">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                          {po.poNumber}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">Date: {po.date}</span>
                      </div>
                      <CardTitle className="text-base text-slate-100 mt-1.5 font-bold flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-amber-500" /> {po.supplierName}
                      </CardTitle>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                      po.status === 'Fully Received' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' :
                      po.status === 'Partially Received' ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800' :
                      po.status === 'Sent' || po.status === 'Confirmed' ? 'bg-amber-950/80 text-amber-400 border-amber-800' :
                      'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {po.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-3 text-xs text-slate-300">
                  {/* Items Preview */}
                  <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Line Items ({po.items.length}):
                    </div>
                    {po.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-200">
                        <span className="truncate max-w-[200px]">• {item.description}</span>
                        <span className="font-mono text-slate-400">{item.qty} {item.unit} @ ₹{item.rate}</span>
                      </div>
                    ))}
                    {po.items.length > 3 && (
                      <div className="text-[10px] text-amber-400 italic">
                        + {po.items.length - 3} more line items...
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Payment: <strong className="text-slate-200">{po.paymentTerms}</strong></span>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Total PO Value (incl. GST)</span>
                      <span className="text-base font-bold font-mono text-amber-400">₹{po.grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-800/80 pt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => { setSelectedPo(po); setIsPdfModalOpen(true); }}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-amber-400" /> View PO PDF
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => { setSelectedPo(po); handleCopyTransmittal(); }}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Copy WhatsApp
                      </Button>
                    </div>

                    {po.status !== 'Fully Received' && (
                      <Button 
                        size="sm" 
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
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
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
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Boxes className="w-4 h-4 text-emerald-400" /> Goods Received History (GRN & Batch Intake Log)
        </h3>
        {grns.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 p-6 text-center text-slate-400 text-xs">
            No Goods Receipts logged yet. Receiving a PO registers a GRN and updates live stock batches.
          </Card>
        ) : (
          <div className="space-y-2">
            {grns.map(grn => (
              <div key={grn.id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-400 font-bold">{grn.grnNumber}</span>
                    <span className="text-slate-400">PO: <strong className="text-amber-400">{grn.poNumber}</strong></span>
                    <span className="text-slate-400">• Date: {grn.date}</span>
                  </div>
                  <div className="text-slate-200 font-semibold mt-1 flex items-center gap-2">
                    <span>{grn.supplierName}</span>
                    <span className="text-slate-400">|</span>
                    <span className="font-mono text-cyan-400">Batch Registered: {grn.batchIdAssigned}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 font-mono bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                  <div>Ordered: <span className="text-slate-200 font-bold">{grn.qtyOrdered}</span></div>
                  <div>Good: <span className="text-emerald-400 font-bold">{grn.qtyReceivedGood}</span></div>
                  <div>Damaged: <span className="text-rose-400 font-bold">{grn.qtyDamaged}</span></div>
                  <div>Shortage: <span className="text-amber-400 font-bold">{grn.qtyShortage}</span></div>
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
        <div className="space-y-5 text-xs text-slate-200 max-h-[80vh] overflow-y-auto pr-1">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">PO Number</label>
              <input 
                type="text" 
                value={poForm.poNumber}
                onChange={e => setPoForm({ ...poForm, poNumber: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-amber-400 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">PO Issue Date</label>
              <input 
                type="date" 
                value={poForm.date}
                onChange={e => setPoForm({ ...poForm, date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Expected Delivery Date</label>
              <input 
                type="date" 
                value={poForm.expectedDelivery}
                onChange={e => setPoForm({ ...poForm, expectedDelivery: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
              />
            </div>
          </div>

          {/* Vendor Details */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-400" /> Supplier / Vendor Profile
              </h4>
              <span className="text-[11px] text-slate-400">Quick Select Preset Vendor:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESET_SUPPLIERS.map(s => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => handleSelectVendor(s.name)}
                  className={`p-2 rounded text-left border text-[11px] transition-all ${
                    poForm.supplierName === s.name 
                      ? 'bg-amber-950/80 border-amber-600 text-amber-300 font-bold' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="truncate font-semibold">{s.name}</div>
                  <div className="text-[10px] opacity-75 truncate">{s.contact}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-slate-400 mb-1">Vendor Name</label>
                <input 
                  type="text" 
                  value={poForm.supplierName}
                  onChange={e => setPoForm({ ...poForm, supplierName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100 font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Contact Person & Phone</label>
                <input 
                  type="text" 
                  value={poForm.supplierContact}
                  onChange={e => setPoForm({ ...poForm, supplierContact: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">Vendor Address & GSTIN</label>
                <input 
                  type="text" 
                  value={poForm.supplierAddress}
                  onChange={e => setPoForm({ ...poForm, supplierAddress: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                  placeholder="Address & GSTIN..."
                />
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons for Line Items */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" /> Line Items & Quantities
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleLoad25gPack} className="bg-amber-950 border border-amber-800 text-amber-300 text-[11px] py-1">
                + Load 7 x 25g Flavors
              </Button>
              <Button size="sm" onClick={handleLoad8gPack} className="bg-amber-950 border border-amber-800 text-amber-300 text-[11px] py-1">
                + Load 4 x 8g Minis
              </Button>
              <Button size="sm" onClick={handleLoadHamperPack} className="bg-slate-800 border border-slate-700 text-slate-200 text-[11px] py-1">
                + Load Hamper Items
              </Button>
              <Button size="sm" onClick={handleAddCustomRow} className="bg-emerald-950 border border-emerald-800 text-emerald-300 text-[11px] py-1">
                + Add Custom Row
              </Button>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5">HSN Code</th>
                  <th className="p-2.5 w-24">Qty</th>
                  <th className="p-2.5 w-20">Unit</th>
                  <th className="p-2.5 w-28">Rate (₹)</th>
                  <th className="p-2.5 w-20">GST %</th>
                  <th className="p-2.5 text-right">Total (₹)</th>
                  <th className="p-2.5 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {poForm.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900">
                    <td className="p-2">
                      <select 
                        value={item.category}
                        onChange={e => handleItemChange(item.id, 'category', e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs"
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
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 text-xs font-semibold"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={item.hsnCode}
                        onChange={e => handleItemChange(item.id, 'hsnCode', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        value={item.qty}
                        onChange={e => handleItemChange(item.id, 'qty', Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-amber-400 font-mono font-bold text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={item.unit}
                        onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        value={item.rate}
                        onChange={e => handleItemChange(item.id, 'rate', Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <select 
                        value={item.gstRate}
                        onChange={e => handleItemChange(item.id, 'gstRate', Number(e.target.value))}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs font-mono"
                      >
                        <option value={18}>18%</option>
                        <option value={12}>12%</option>
                        <option value={5}>5%</option>
                        <option value={0}>0%</option>
                      </select>
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-amber-400 text-xs">
                      ₹{item.total.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 text-center">
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-rose-400 hover:text-rose-300 p-1"
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
              <label className="block text-slate-400 font-semibold mb-1">Payment Terms</label>
              <select 
                value={poForm.paymentTerms}
                onChange={e => setPoForm({ ...poForm, paymentTerms: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              >
                <option value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</option>
                <option value="100% Advance">100% Advance</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Founder Signatory Name</label>
              <input 
                type="text" 
                value={poForm.founderSignatureName}
                onChange={e => setPoForm({ ...poForm, founderSignatureName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Special Transit & Quality Instructions</label>
            <textarea 
              rows={3}
              value={poForm.specialInstructions}
              onChange={e => setPoForm({ ...poForm, specialInstructions: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-xs font-mono"
            />
          </div>

          {/* Total Summary Bar */}
          <div className="bg-amber-950/40 border border-amber-800/80 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Subtotal: ₹{calculatedSubtotal.toLocaleString('en-IN')} + GST: ₹{calculatedGstTotal.toLocaleString('en-IN')}</div>
              <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                GRAND TOTAL: ₹{calculatedGrandTotal.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-300 italic">{numberToWordsINR(calculatedGrandTotal)}</div>
            </div>

            <Button 
              onClick={handleSavePo} 
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-6 text-xs shadow-lg"
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
        <div className="space-y-4 text-xs text-slate-200">
          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <div className="font-semibold text-slate-300">{selectedPo?.supplierName}</div>
            <div className="text-slate-400 text-[11px] mt-0.5">Total Ordered Qty: <strong className="text-amber-400">{selectedPo?.items.reduce((a, b) => a + b.qty, 0)} units</strong></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Good Qty Received</label>
              <input 
                type="number" 
                value={grnForm.qtyReceivedGood}
                onChange={e => setGrnForm({ ...grnForm, qtyReceivedGood: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-emerald-400 font-bold font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Damaged Qty</label>
              <input 
                type="number" 
                value={grnForm.qtyDamaged}
                onChange={e => setGrnForm({ ...grnForm, qtyDamaged: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-rose-400 font-bold font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Shortage Qty</label>
              <input 
                type="number" 
                value={grnForm.qtyShortage}
                onChange={e => setGrnForm({ ...grnForm, qtyShortage: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-amber-400 font-bold font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Assigned Batch ID (For Inventory)</label>
            <input 
              type="text" 
              value={grnForm.batchId}
              onChange={e => setGrnForm({ ...grnForm, batchId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-cyan-400 font-mono font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Manufacturing Date</label>
              <input 
                type="date" 
                value={grnForm.mfgDate}
                onChange={e => setGrnForm({ ...grnForm, mfgDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Expiry Date (3-Mo / 12-Mo Guarantee)</label>
              <input 
                type="date" 
                value={grnForm.expiryDate}
                onChange={e => setGrnForm({ ...grnForm, expiryDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100"
              />
            </div>
          </div>

          <Button onClick={handleCreateGrn} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 mt-2">
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
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-3 rounded border border-slate-800">
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleDownloadPdf} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold">
                  <Download className="w-4 h-4 mr-1.5" /> Download PDF Document
                </Button>
                <Button size="sm" variant="secondary" onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs">
                  <Printer className="w-4 h-4 mr-1.5" /> Print PO
                </Button>
              </div>

              <Button 
                size="sm" 
                variant="secondary" 
                onClick={handleCopyTransmittal}
                className="bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs hover:bg-emerald-900"
              >
                {copySuccess ? <Check className="w-4 h-4 mr-1 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1" />}
                {copySuccess ? 'Copied to Clipboard!' : 'Copy WhatsApp Transmittal'}
              </Button>
            </div>

            {/* Printable PDF Template Box */}
            <div className="p-2 bg-slate-950 overflow-x-auto rounded border border-slate-800">
              <div 
                ref={poPrintRef}
                className="w-[210mm] min-h-[285mm] bg-white text-slate-900 p-8 mx-auto font-sans text-xs shadow-2xl relative"
                style={{ color: '#0f172a' }}
              >
                {/* Header Section */}
                <div className="flex justify-between items-start border-b-2 border-amber-900 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-950 text-amber-400 rounded-xl">
                      <GudLogo size={42} />
                    </div>
                    <div>
                      <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                        GUDORIA FOOD INNOVATIONS PVT LTD
                      </h1>
                      <p className="text-[10px] text-slate-600 font-semibold">
                        Pranavam Tower 1st Floor, Petta, Poonithura, Maradu, Ernakulam, Kerala 682038
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Phone: 09544809992 | Email: gudchocolates@gmail.com | GSTIN: 32AANCA8181G1ZK
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider rounded border border-amber-300 mb-1">
                      PURCHASE ORDER
                    </span>
                    <div className="text-sm font-mono font-bold text-amber-900">{selectedPo.poNumber}</div>
                    <div className="text-[11px] text-slate-600 font-semibold">Date: {selectedPo.date}</div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* Vendor Box */}
                  <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
                    <div className="text-[10px] font-bold uppercase text-amber-800 tracking-wider mb-1">
                      VENDOR / SUPPLIER DETAILS:
                    </div>
                    <div className="text-xs font-bold text-slate-900">{selectedPo.supplierName}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">{selectedPo.supplierAddress}</div>
                    <div className="text-[11px] text-slate-600">Contact: {selectedPo.supplierContact}</div>
                    <div className="text-[11px] text-slate-600 font-mono">Phone: {selectedPo.supplierPhone}</div>
                    {selectedPo.supplierGstin && (
                      <div className="text-[11px] text-slate-800 font-mono font-semibold mt-1">
                        GSTIN: {selectedPo.supplierGstin}
                      </div>
                    )}
                  </div>

                  {/* Ship To Box */}
                  <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
                    <div className="text-[10px] font-bold uppercase text-amber-800 tracking-wider mb-1">
                      DELIVERY LOCATION & TERMS:
                    </div>
                    <div className="text-[11px] text-slate-700 font-medium">{selectedPo.shippingAddress}</div>
                    <div className="mt-2 text-[11px]">
                      <span className="text-slate-500">Expected Delivery:</span> <strong className="text-slate-900">{selectedPo.expectedDelivery}</strong>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-slate-500">Payment Terms:</span> <strong className="text-slate-900">{selectedPo.paymentTerms}</strong>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="w-full text-left border-collapse mb-6 text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[11px]">
                      <th className="p-2 border border-slate-800 w-8 text-center">#</th>
                      <th className="p-2 border border-slate-800">Item Description</th>
                      <th className="p-2 border border-slate-800 text-center">Category</th>
                      <th className="p-2 border border-slate-800 text-center">HSN</th>
                      <th className="p-2 border border-slate-800 text-right w-16">Qty</th>
                      <th className="p-2 border border-slate-800 text-center w-14">Unit</th>
                      <th className="p-2 border border-slate-800 text-right w-20">Rate (₹)</th>
                      <th className="p-2 border border-slate-800 text-right w-16">GST %</th>
                      <th className="p-2 border border-slate-800 text-right w-24">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedPo.items.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="p-2 border border-slate-200 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-900">{item.description}</td>
                        <td className="p-2 border border-slate-200 text-center text-[10px] text-slate-600">{item.category}</td>
                        <td className="p-2 border border-slate-200 text-center font-mono text-[11px] text-slate-600">{item.hsnCode}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono font-bold text-slate-900">{item.qty}</td>
                        <td className="p-2 border border-slate-200 text-center text-slate-600">{item.unit}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono">₹{item.rate.toLocaleString('en-IN')}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono">{item.gstRate}%</td>
                        <td className="p-2 border border-slate-200 text-right font-mono font-bold text-slate-900">₹{item.total.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Calculation Summary & Terms Grid */}
                <div className="grid grid-cols-12 gap-6 mb-6">
                  {/* Terms & Conditions */}
                  <div className="col-span-7 bg-amber-50/50 p-3 rounded border border-amber-200/80 text-[10px] text-slate-700 space-y-1">
                    <div className="font-bold text-amber-900 uppercase tracking-wider text-[10px]">
                      MANDATORY TRANSIT & QUALITY SLA:
                    </div>
                    <div className="whitespace-pre-line font-mono text-[10px] text-slate-800">
                      {selectedPo.specialInstructions}
                    </div>
                  </div>

                  {/* Financials Box */}
                  <div className="col-span-5 bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>₹{selectedPo.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (9%):</span>
                      <span>₹{(selectedPo.gstTotal / 2).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (9%):</span>
                      <span>₹{(selectedPo.gstTotal / 2).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
                      <span>TOTAL VALUE:</span>
                      <span className="text-amber-900">₹{selectedPo.grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-bold text-slate-800 italic border-t border-slate-200 pt-2 mb-8">
                  Amount in Words: {numberToWordsINR(selectedPo.grandTotal)}
                </div>

                {/* Signatures Footer */}
                <div className="pt-6 border-t-2 border-slate-900 flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-slate-500 font-mono">Acceptance by Vendor:</div>
                    <div className="mt-8 text-xs font-semibold text-slate-700">Authorized Vendor Representative Signature</div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                      FOR GUDORIA FOOD INNOVATIONS PRIVATE LIMITED
                    </div>

                    {/* Digital Signature Graphic Stamp */}
                    <div className="my-2 inline-flex items-center justify-end gap-2 border-2 border-dashed border-amber-800/60 p-2 rounded-lg bg-amber-50/80">
                      <div className="p-1.5 bg-amber-900 text-amber-100 rounded-full">
                        <Award className="w-5 h-5" />
                      </div>
                      <div className="text-left font-mono">
                        <div className="text-[10px] font-bold text-amber-950 uppercase">OFFICIALLY SIGNED & AUTHORIZED</div>
                        <div className="text-[9px] text-slate-700 font-semibold">{selectedPo.founderSignatureName}</div>
                        <div className="text-[8px] text-amber-900 opacity-80">REF: {selectedPo.poNumber} | VERIFIED</div>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-900">{selectedPo.founderSignatureName}</div>
                    <div className="text-[10px] text-slate-500">Founder & Managing Director</div>
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
