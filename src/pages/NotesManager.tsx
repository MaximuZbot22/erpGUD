import React, { useState } from 'react';
import { CreditCard, Plus, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { CreditNote, DebitNote } from '../types/commercial';
import { StorageEngine } from '../services/storageEngine';
import { auditLogService } from '../services/audit';

const STORAGE_CN_KEY = 'gud_credit_notes_v1';
const STORAGE_DN_KEY = 'gud_debit_notes_v1';

export const NotesManager: React.FC = () => {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(() => {
    return StorageEngine.getLocal<CreditNote[]>(STORAGE_CN_KEY, []);
  });

  const [debitNotes, setDebitNotes] = useState<DebitNote[]>(() => {
    return StorageEngine.getLocal<DebitNote[]>(STORAGE_DN_KEY, []);
  });

  const [isCnModalOpen, setIsCnModalOpen] = useState(false);
  const [isDnModalOpen, setIsDnModalOpen] = useState(false);

  // Credit Note Form State
  const [cnForm, setCnForm] = useState({
    customerName: '',
    originalInvoiceId: '',
    taxableAmount: 1000,
    gstRate: 18,
    reason: 'Billing Adjustment / Price Reversal',
    notes: ''
  });

  // Debit Note Form State
  const [dnForm, setDnForm] = useState({
    partyType: 'Supplier' as 'Customer' | 'Supplier',
    partyName: '',
    originalDocumentId: '',
    amount: 1000,
    reason: 'Price Variance / Defect Claim',
    notes: ''
  });

  const handleCreateCreditNote = () => {
    if (!cnForm.customerName.trim() || !cnForm.originalInvoiceId.trim()) {
      alert('Please enter Customer Name and Original Invoice ID.');
      return;
    }

    const taxableAmount = Number(cnForm.taxableAmount);
    const gstAdjustment = (taxableAmount * Number(cnForm.gstRate)) / 100;
    const totalCredit = taxableAmount + gstAdjustment;

    const newCn: CreditNote = {
      id: `CN-${Date.now().toString().slice(-4)}`,
      creditNoteNumber: `CN-${Math.floor(5000 + Math.random() * 5000)}`,
      date: new Date().toISOString().split('T')[0],
      customerId: `CUST-${Date.now().toString().slice(-4)}`,
      customerName: cnForm.customerName,
      originalInvoiceId: cnForm.originalInvoiceId,
      reason: cnForm.reason,
      items: [{ sku: 'GENERAL-CREDIT', qty: 1, unitPrice: taxableAmount, total: taxableAmount }],
      taxableAmount,
      gstAdjustment,
      totalCredit,
      approvalStatus: 'Approved',
      notes: cnForm.notes
    };

    const updated = [newCn, ...creditNotes];
    setCreditNotes(updated);
    StorageEngine.setLocal(STORAGE_CN_KEY, updated);
    setIsCnModalOpen(false);
    setCnForm({ customerName: '', originalInvoiceId: '', taxableAmount: 1000, gstRate: 18, reason: 'Billing Adjustment / Price Reversal', notes: '' });

    auditLogService.logSystemActivity(`Credit Note Issued`, `CN ${newCn.creditNoteNumber} for ${newCn.customerName}. Value: ₹${newCn.totalCredit}`);
  };

  const handleCreateDebitNote = () => {
    if (!dnForm.partyName.trim() || !dnForm.originalDocumentId.trim()) {
      alert('Please enter Party Name and Original Document ID.');
      return;
    }

    const amount = Number(dnForm.amount);
    const taxAdjustment = (amount * 18) / 100;
    const totalAmount = amount + taxAdjustment;

    const newDn: DebitNote = {
      id: `DN-${Date.now().toString().slice(-4)}`,
      debitNoteNumber: `DN-${Math.floor(6000 + Math.random() * 4000)}`,
      date: new Date().toISOString().split('T')[0],
      partyType: dnForm.partyType,
      partyId: `PARTY-${Date.now().toString().slice(-4)}`,
      partyName: dnForm.partyName,
      originalDocumentId: dnForm.originalDocumentId,
      reason: dnForm.reason,
      amount,
      taxAdjustment,
      totalAmount,
      approvalStatus: 'Approved',
      notes: dnForm.notes
    };

    const updated = [newDn, ...debitNotes];
    setDebitNotes(updated);
    StorageEngine.setLocal(STORAGE_DN_KEY, updated);
    setIsDnModalOpen(false);
    setDnForm({ partyType: 'Supplier', partyName: '', originalDocumentId: '', amount: 1000, reason: 'Price Variance / Defect Claim', notes: '' });

    auditLogService.logSystemActivity(`Debit Note Issued`, `DN ${newDn.debitNoteNumber} for ${newDn.partyName}. Value: ₹${newDn.totalAmount}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-500" /> Credit Notes & Debit Notes Registry
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Financial credit reversals, debit adjustments, and GST return tax adjustments linked to original invoices/documents.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCnModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs">
            <Plus className="w-4 h-4 mr-1" /> + Create Credit Note
          </Button>
          <Button onClick={() => setIsDnModalOpen(true)} className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs">
            <Plus className="w-4 h-4 mr-1" /> + Create Debit Note
          </Button>
        </div>
      </div>

      {/* Credit Notes Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Credit Notes (Customer Financial Reversals)</h3>
        {creditNotes.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 p-6 text-center text-slate-400 text-xs">
            No Credit Notes issued yet. Click "+ Create Credit Note" to record a financial adjustment.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {creditNotes.map(cn => (
              <Card key={cn.id} className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono text-emerald-400 font-bold">{cn.creditNoteNumber}</span>
                      <CardTitle className="text-base text-slate-100 mt-1">{cn.customerName}</CardTitle>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                      {cn.approvalStatus}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between text-slate-400">
                    <span>Linked Invoice: <strong className="text-slate-200">{cn.originalInvoiceId}</strong></span>
                    <span>Date: {cn.date}</span>
                  </div>
                  <div>Reason: {cn.reason}</div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                    <span className="text-slate-400">Total Credit Issued:</span>
                    <span className="text-sm font-bold font-mono text-emerald-400">₹{cn.totalCredit.toLocaleString('en-IN')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Debit Notes Section */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Debit Notes (Supplier / Customer Claims)</h3>
        {debitNotes.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 p-6 text-center text-slate-400 text-xs">
            No Debit Notes issued yet. Click "+ Create Debit Note" to record a debit claim.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debitNotes.map(dn => (
              <Card key={dn.id} className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono text-amber-400 font-bold">{dn.debitNoteNumber} ({dn.partyType})</span>
                      <CardTitle className="text-base text-slate-100 mt-1">{dn.partyName}</CardTitle>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">
                      {dn.approvalStatus}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between text-slate-400">
                    <span>Linked Document: <strong className="text-slate-200">{dn.originalDocumentId}</strong></span>
                    <span>Date: {dn.date}</span>
                  </div>
                  <div>Reason: {dn.reason}</div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                    <span className="text-slate-400">Total Debit Claim:</span>
                    <span className="text-sm font-bold font-mono text-amber-400">₹{dn.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Credit Note Modal */}
      <Modal isOpen={isCnModalOpen} onClose={() => setIsCnModalOpen(false)} title="Create Financial Credit Note">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Customer Name</label>
            <input 
              type="text" 
              value={cnForm.customerName}
              onChange={e => setCnForm({ ...cnForm, customerName: e.target.value })}
              placeholder="e.g. Dr. Dental / Prevalent AI"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Original Invoice ID</label>
              <input 
                type="text" 
                value={cnForm.originalInvoiceId}
                onChange={e => setCnForm({ ...cnForm, originalInvoiceId: e.target.value })}
                placeholder="e.g. INV-1146-GUD-2026"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Taxable Amount (₹)</label>
              <input 
                type="number" 
                value={cnForm.taxableAmount}
                onChange={e => setCnForm({ ...cnForm, taxableAmount: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Reason for Reversal / Adjustment</label>
            <input 
              type="text" 
              value={cnForm.reason}
              onChange={e => setCnForm({ ...cnForm, reason: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
            />
          </div>
          <Button onClick={handleCreateCreditNote} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2">
            Confirm & Issue Credit Note
          </Button>
        </div>
      </Modal>

      {/* Debit Note Modal */}
      <Modal isOpen={isDnModalOpen} onClose={() => setIsDnModalOpen(false)} title="Create Debit Note">
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Party Type</label>
              <select 
                value={dnForm.partyType}
                onChange={e => setDnForm({ ...dnForm, partyType: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              >
                <option value="Supplier">Supplier</option>
                <option value="Customer">Customer</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Party Name</label>
              <input 
                type="text" 
                value={dnForm.partyName}
                onChange={e => setDnForm({ ...dnForm, partyName: e.target.value })}
                placeholder="e.g. Scaria Factory"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Original Document #</label>
              <input 
                type="text" 
                value={dnForm.originalDocumentId}
                onChange={e => setDnForm({ ...dnForm, originalDocumentId: e.target.value })}
                placeholder="e.g. PO-SCARIA-881"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Amount (₹)</label>
              <input 
                type="number" 
                value={dnForm.amount}
                onChange={e => setDnForm({ ...dnForm, amount: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Reason</label>
            <input 
              type="text" 
              value={dnForm.reason}
              onChange={e => setDnForm({ ...dnForm, reason: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
            />
          </div>
          <Button onClick={handleCreateDebitNote} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2">
            Confirm & Issue Debit Note
          </Button>
        </div>
      </Modal>
    </div>
  );
};
