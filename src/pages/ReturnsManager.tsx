import React, { useState } from 'react';
import { RotateCcw, Plus, CheckCircle, ShieldAlert, ArrowLeftRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { CustomerReturnRecord, CreditNote, ReturnDisposition } from '../types/commercial';
import { StorageEngine } from '../services/storageEngine';
import { auditLogService } from '../services/audit';

const STORAGE_KEY = 'gud_customer_returns_v1';

export const ReturnsManager: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const [returns, setReturns] = useState<CustomerReturnRecord[]>(() => {
    return StorageEngine.getLocal<CustomerReturnRecord[]>(STORAGE_KEY, []);
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    invoiceId: '',
    sku: 'SKU-ALMOND-25G',
    name: 'Almond Noir 25g',
    qty: 5,
    unitPrice: 110,
    disposition: 'Restock' as ReturnDisposition,
    notes: ''
  });

  const handleCreateReturn = () => {
    if (!form.customerId.trim() || !form.invoiceId.trim()) {
      alert('Please enter Customer Name and Original Invoice ID.');
      return;
    }

    const newReturn: CustomerReturnRecord = {
      id: `RET-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      customerId: form.customerId,
      originalInvoiceId: form.invoiceId,
      items: [{ sku: form.sku, name: form.name, qty: Number(form.qty), unitPrice: Number(form.unitPrice) }],
      disposition: form.disposition,
      approvalStatus: 'Approved',
      notes: form.notes
    };

    // Generate Credit Note automatically if disposition requires financial adjustment
    const existingCNs = StorageEngine.getLocal<CreditNote[]>('gud_credit_notes_v1', []);
    const taxableAmount = Number(form.qty) * Number(form.unitPrice);
    const gstAdjustment = (taxableAmount * 18) / 100;
    const totalCredit = taxableAmount + gstAdjustment;

    const newCN: CreditNote = {
      id: `CN-${Date.now().toString().slice(-4)}`,
      creditNoteNumber: `CN-${Math.floor(5000 + Math.random() * 5000)}`,
      date: new Date().toISOString().split('T')[0],
      customerId: form.customerId,
      customerName: form.customerId,
      originalInvoiceId: form.invoiceId,
      reason: `Customer Return - ${form.disposition}`,
      items: [{ sku: form.sku, qty: Number(form.qty), unitPrice: Number(form.unitPrice), total: taxableAmount }],
      taxableAmount,
      gstAdjustment,
      totalCredit,
      approvalStatus: 'Approved',
      notes: form.notes
    };

    newReturn.creditNoteId = newCN.id;

    StorageEngine.setLocal('gud_credit_notes_v1', [newCN, ...existingCNs]);
    const updatedReturns = [newReturn, ...returns];
    setReturns(updatedReturns);
    StorageEngine.setLocal(STORAGE_KEY, updatedReturns);

    setIsModalOpen(false);
    setForm({ customerId: '', invoiceId: '', sku: 'SKU-ALMOND-25G', name: 'Almond Noir 25g', qty: 5, unitPrice: 110, disposition: 'Restock', notes: '' });

    auditLogService.logSystemActivity(`Customer Return & Credit Note Created`, `Return ID: ${newReturn.id}, Credit Note: ${newCN.creditNoteNumber}, Disposition: ${newReturn.disposition}`);
    alert(`Customer Return logged! Credit Note ${newCN.creditNoteNumber} (₹${totalCredit}) generated.`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <RotateCcw className="w-7 h-7 text-rose-500" /> Customer Returns & QC Disposition
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Log customer return requests, perform QC disposition (Restock, Damaged, Sample, Disposal), and generate Credit Notes.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs">
          <Plus className="w-4 h-4 mr-1" /> + Log Customer Return
        </Button>
      </div>

      {/* Returns List / Empty State */}
      {returns.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800 p-8 text-center text-slate-400">
          <RotateCcw className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-slate-300">No Customer Returns Logged</p>
          <p className="text-xs text-slate-500 mt-1">Click below to record a new return and issue a credit note.</p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-4 bg-rose-600 hover:bg-rose-500 text-white text-xs">
            <Plus className="w-4 h-4 mr-1" /> + Log Customer Return
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {returns.map(ret => (
            <Card key={ret.id} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono text-rose-400 font-bold">{ret.id}</span>
                    <CardTitle className="text-base text-slate-100 mt-1">Customer: {ret.customerId}</CardTitle>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-slate-800 text-amber-400 border border-slate-700">
                    Disposition: {ret.disposition}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-slate-300">
                <div>Invoice Link: <strong className="text-slate-200">{ret.originalInvoiceId || 'N/A'}</strong></div>
                <div>Items: {ret.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</div>
                {ret.creditNoteId && (
                  <div className="bg-slate-950 p-2 rounded text-emerald-400 font-mono font-bold flex justify-between">
                    <span>Linked Credit Note:</span>
                    <span>{ret.creditNoteId}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Customer Return & Generate Credit Note">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Customer Name</label>
            <input 
              type="text" 
              value={form.customerId}
              onChange={e => setForm({ ...form, customerId: e.target.value })}
              placeholder="e.g. Dr. Dental / Prevalent AI"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Original Invoice ID</label>
            <input 
              type="text" 
              value={form.invoiceId}
              onChange={e => setForm({ ...form, invoiceId: e.target.value })}
              placeholder="e.g. INV-1146-GUD-2026"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Returned Qty</label>
              <input 
                type="number" 
                value={form.qty}
                onChange={e => setForm({ ...form, qty: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">QC Disposition</label>
              <select 
                value={form.disposition}
                onChange={e => setForm({ ...form, disposition: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              >
                <option value="Restock">Restock to Inventory</option>
                <option value="Damaged">Damaged</option>
                <option value="Sample">Convert to Sample</option>
                <option value="Disposal">Disposal</option>
              </select>
            </div>
          </div>
          <Button onClick={handleCreateReturn} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2">
            Confirm Return & Issue Credit Note
          </Button>
        </div>
      </Modal>
    </div>
  );
};
