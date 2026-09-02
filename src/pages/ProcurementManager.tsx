import React, { useState } from 'react';
import { Factory, Plus, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { StorageEngine } from '../services/storageEngine';
import { auditLogService } from '../services/audit';

export interface SupplierPO {
  id: string;
  poNumber: string;
  date: string;
  supplierName: string;
  expectedDelivery: string;
  items: { flavor: string; qtyOrdered: number; unitCost: number; totalCost: number }[];
  totalCost: number;
  gstAmount: number;
  grandTotal: number;
  status: 'Draft' | 'Sent' | 'Confirmed' | 'Partially Received' | 'Fully Received' | 'Cancelled';
  paymentTerms: string;
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

const STORAGE_PO_KEY = 'gud_purchase_orders_v1';
const STORAGE_GRN_KEY = 'gud_goods_receipts_v1';

export const ProcurementManager: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<SupplierPO[]>(() => {
    return StorageEngine.getLocal<SupplierPO[]>(STORAGE_PO_KEY, []);
  });

  const [grns, setGrns] = useState<GoodsReceiptNote[]>(() => {
    return StorageEngine.getLocal<GoodsReceiptNote[]>(STORAGE_GRN_KEY, []);
  });

  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<SupplierPO | null>(null);

  // PO Form State
  const [poForm, setPoForm] = useState({
    supplierName: 'Scaria (Gourmet Chocolate Factory)',
    itemFlavor: 'Almond Noir 25g',
    qtyOrdered: 100,
    unitCost: 65,
    paymentTerms: '50% Advance, 50% on Delivery',
    notes: ''
  });

  // GRN Form State
  const [grnForm, setGrnForm] = useState({
    qtyReceivedGood: 96,
    qtyDamaged: 2,
    qtyShortage: 2,
    batchId: `B-${new Date().getMonth() + 1}${new Date().getDate()}`,
    mfgDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    receivedBy: 'Operations Staff'
  });

  const handleCreatePo = () => {
    if (!poForm.supplierName.trim()) {
      alert('Please enter Supplier Name.');
      return;
    }

    const totalCost = Number(poForm.qtyOrdered) * Number(poForm.unitCost);
    const gstAmount = (totalCost * 18) / 100;
    const grandTotal = totalCost + gstAmount;

    const newPo: SupplierPO = {
      id: `PO-${Date.now().toString().slice(-4)}`,
      poNumber: `PO-${poForm.supplierName.includes('Scaria') ? 'SCARIA' : 'VEND'}-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
      supplierName: poForm.supplierName,
      expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      items: [{ flavor: poForm.itemFlavor, qtyOrdered: Number(poForm.qtyOrdered), unitCost: Number(poForm.unitCost), totalCost }],
      totalCost,
      gstAmount,
      grandTotal,
      status: 'Confirmed',
      paymentTerms: poForm.paymentTerms,
      notes: poForm.notes
    };

    const updated = [newPo, ...purchaseOrders];
    setPurchaseOrders(updated);
    StorageEngine.setLocal(STORAGE_PO_KEY, updated);
    setIsPoModalOpen(false);

    auditLogService.logSystemActivity(`Purchase Order Issued`, `PO ${newPo.poNumber} for ${newPo.supplierName}. Total: ₹${newPo.grandTotal}`);
  };

  const handleCreateGrn = () => {
    if (!selectedPo) return;

    const newGrn: GoodsReceiptNote = {
      id: `GRN-${Date.now().toString().slice(-4)}`,
      grnNumber: `GRN-${Math.floor(2000 + Math.random() * 8000)}`,
      date: new Date().toISOString().split('T')[0],
      poNumber: selectedPo.poNumber,
      supplierName: selectedPo.supplierName,
      qtyOrdered: selectedPo.items.reduce((a, b) => a + b.qtyOrdered, 0),
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
    const updatedPos = purchaseOrders.map(p => p.id === selectedPo.id ? { ...p, status: 'Fully Received' as const } : p);
    setPurchaseOrders(updatedPos);
    StorageEngine.setLocal(STORAGE_PO_KEY, updatedPos);

    setIsGrnModalOpen(false);
    auditLogService.logSystemActivity(`Goods Receipt Logged`, `GRN ${newGrn.grnNumber} for PO ${newGrn.poNumber}. Good: ${newGrn.qtyReceivedGood}, Damaged: ${newGrn.qtyDamaged}, Short: ${newGrn.qtyShortage}`);
    alert(`Goods Receipt ${newGrn.grnNumber} logged! Batch ${newGrn.batchIdAssigned} registered.`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Factory className="w-7 h-7 text-amber-500" /> Supplier Procurement & Scaria PO Management
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Generate Purchase Orders for Scaria, receive Goods Receipt Notes (GRN), and reconcile ordered vs received quantities.
          </p>
        </div>
        <Button onClick={() => setIsPoModalOpen(true)} className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs">
          <Plus className="w-4 h-4 mr-1" /> + Create Purchase Order
        </Button>
      </div>

      {/* PO List / Empty State */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Active Purchase Orders</h3>
        {purchaseOrders.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 p-8 text-center text-slate-400">
            <Factory className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-slate-300">No Purchase Orders Created</p>
            <p className="text-xs text-slate-500 mt-1">Click below to generate a new Purchase Order for Scaria or packaging suppliers.</p>
            <Button onClick={() => setIsPoModalOpen(true)} className="mt-4 bg-amber-600 hover:bg-amber-500 text-white text-xs">
              <Plus className="w-4 h-4 mr-1" /> + Create Purchase Order
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {purchaseOrders.map(po => (
              <Card key={po.id} className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono text-amber-400 font-bold">{po.poNumber}</span>
                      <CardTitle className="text-base text-slate-100 mt-1">{po.supplierName}</CardTitle>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      po.status === 'Fully Received' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' :
                      po.status === 'Confirmed' ? 'bg-amber-950/80 text-amber-400 border border-amber-800' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {po.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-300">
                  <div className="flex justify-between text-slate-400">
                    <span>Date: {po.date}</span>
                    <span>Expected: {po.expectedDelivery}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                    <span className="text-slate-400">PO Value:</span>
                    <span className="text-sm font-bold font-mono text-amber-400">₹{po.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                  {po.status !== 'Fully Received' && (
                    <Button size="sm" onClick={() => { setSelectedPo(po); setIsGrnModalOpen(true); }} className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Log Goods Receipt (GRN) & Receive Batch
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* GRN History */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Goods Received History (GRN)</h3>
        {grns.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 p-6 text-center text-slate-400 text-xs">
            No Goods Receipts logged yet. Receiving a PO registers a GRN and batch stock.
          </Card>
        ) : (
          <div className="space-y-2">
            {grns.map(grn => (
              <div key={grn.id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                <div>
                  <div className="font-mono text-emerald-400 font-bold">{grn.grnNumber} (PO: {grn.poNumber})</div>
                  <div className="text-slate-200 font-semibold mt-1">{grn.supplierName} • Batch Assigned: {grn.batchIdAssigned}</div>
                </div>
                <div className="flex gap-4 font-mono">
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

      {/* New PO Modal */}
      <Modal isOpen={isPoModalOpen} onClose={() => setIsPoModalOpen(false)} title="Create Supplier Purchase Order">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Supplier Name</label>
            <input 
              type="text" 
              value={poForm.supplierName}
              onChange={e => setPoForm({ ...poForm, supplierName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-400 mb-1">Item Description</label>
              <input 
                type="text" 
                value={poForm.itemFlavor}
                onChange={e => setPoForm({ ...poForm, itemFlavor: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Qty Ordered</label>
              <input 
                type="number" 
                value={poForm.qtyOrdered}
                onChange={e => setPoForm({ ...poForm, qtyOrdered: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              />
            </div>
          </div>
          <Button onClick={handleCreatePo} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2">
            Generate & Issue Purchase Order
          </Button>
        </div>
      </Modal>

      {/* GRN Modal */}
      <Modal isOpen={isGrnModalOpen} onClose={() => setIsGrnModalOpen(false)} title={`Log Goods Receipt for ${selectedPo?.poNumber}`}>
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Good Qty</label>
              <input 
                type="number" 
                value={grnForm.qtyReceivedGood}
                onChange={e => setGrnForm({ ...grnForm, qtyReceivedGood: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-emerald-400 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Damaged Qty</label>
              <input 
                type="number" 
                value={grnForm.qtyDamaged}
                onChange={e => setGrnForm({ ...grnForm, qtyDamaged: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-rose-400 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Shortage Qty</label>
              <input 
                type="number" 
                value={grnForm.qtyShortage}
                onChange={e => setGrnForm({ ...grnForm, qtyShortage: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-amber-400 font-bold"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Assigned Batch ID</label>
            <input 
              type="text" 
              value={grnForm.batchId}
              onChange={e => setGrnForm({ ...grnForm, batchId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono"
            />
          </div>
          <Button onClick={handleCreateGrn} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2">
            Confirm Goods Receipt & Register Batch
          </Button>
        </div>
      </Modal>
    </div>
  );
};
