import React, { useState } from 'react';
import { FileText, Plus, CheckCircle, ArrowRight, Save, Trash2, Send, Clock, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Quotation, CommercialLineItem, QuotationStatus } from '../types/commercial';
import { ProductMasterService } from '../services/productMaster';
import { StorageEngine } from '../services/storageEngine';
import { auditLogService } from '../services/audit';

const STORAGE_KEY = 'gud_quotations_v1';

export const QuotationStudio: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    return StorageEngine.getLocal<Quotation[]>(STORAGE_KEY, []);
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [form, setForm] = useState({
    customerName: '',
    validDays: 15,
    tier: 'corporate' as 'retail' | 'wholesale' | 'cafeHotel' | 'corporate',
    deliveryCharge: 0,
    customizationCharge: 0,
    notes: ''
  });

  const [selectedSku, setSelectedSku] = useState('SKU-ALMOND-25G');
  const [itemQty, setItemQty] = useState(10);
  const [lineItems, setLineItems] = useState<CommercialLineItem[]>([]);

  const products = ProductMasterService.getProducts();

  const handleAddItem = () => {
    const prod = ProductMasterService.findBySku(selectedSku);
    if (!prod) return;

    const unitPrice = ProductMasterService.getPriceForTier(prod, form.tier);
    const taxableValue = unitPrice * itemQty;
    const gstAmount = (taxableValue * prod.gstRate) / 100;
    const totalAmount = taxableValue + gstAmount;

    const newItem: CommercialLineItem = {
      id: `ITEM-${Date.now()}`,
      sku: prod.sku,
      name: prod.name,
      qty: itemQty,
      unitPrice,
      discount: 0,
      taxableValue,
      gstRate: prod.gstRate,
      gstAmount,
      totalAmount
    };

    setLineItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setLineItems(prev => prev.filter(i => i.id !== id));
  };

  const handleCreateQuotation = () => {
    if (!form.customerName.trim() || lineItems.length === 0) {
      alert('Please enter a Customer Name and add at least 1 line item.');
      return;
    }

    const subtotal = lineItems.reduce((acc, i) => acc + i.taxableValue, 0);
    const gstTotal = lineItems.reduce((acc, i) => acc + i.gstAmount, 0);
    const grandTotal = subtotal + gstTotal + Number(form.deliveryCharge) + Number(form.customizationCharge);

    const newQt: Quotation = {
      id: `QT-${Date.now().toString().slice(-4)}`,
      quotationNumber: `QT-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + form.validDays * 86400000).toISOString().split('T')[0],
      customerId: `CUST-${Date.now().toString().slice(-4)}`,
      customerName: form.customerName,
      items: lineItems,
      subtotal,
      discountTotal: 0,
      gstTotal,
      deliveryCharge: Number(form.deliveryCharge),
      customizationCharge: Number(form.customizationCharge),
      grandTotal,
      version: 1,
      status: 'Draft',
      notes: form.notes
    };

    const updated = [newQt, ...quotations];
    setQuotations(updated);
    StorageEngine.setLocal(STORAGE_KEY, updated);
    setIsModalOpen(false);
    setLineItems([]);
    setForm({ customerName: '', validDays: 15, tier: 'corporate', deliveryCharge: 0, customizationCharge: 0, notes: '' });

    auditLogService.logSystemActivity(`Quotation Created`, `Quotation ${newQt.quotationNumber} for ${newQt.customerName}. Total: ₹${newQt.grandTotal}`);
  };

  const handleStatusChange = (qtId: string, status: QuotationStatus) => {
    const updated = quotations.map(q => q.id === qtId ? { ...q, status } : q);
    setQuotations(updated);
    StorageEngine.setLocal(STORAGE_KEY, updated);
  };

  const handleConvertToSalesOrder = (qt: Quotation) => {
    const existingOrders = StorageEngine.getLocal<any[]>('gud_sales_orders_v1', []);
    const newSo = {
      id: `SO-${Date.now().toString().slice(-4)}`,
      orderNumber: `SO-${Math.floor(2000 + Math.random() * 8000)}`,
      date: new Date().toISOString().split('T')[0],
      customerId: qt.customerId,
      customerName: qt.customerName,
      items: qt.items,
      subtotal: qt.subtotal,
      gstTotal: qt.gstTotal,
      deliveryCharge: qt.deliveryCharge,
      grandTotal: qt.grandTotal,
      deliveryAddress: 'Standard Delivery Address',
      status: 'Confirmed',
      notes: `Converted from Quotation ${qt.quotationNumber}`
    };

    StorageEngine.setLocal('gud_sales_orders_v1', [newSo, ...existingOrders]);
    handleStatusChange(qt.id, 'Converted');
    alert(`Quotation ${qt.quotationNumber} successfully converted to Sales Order ${newSo.orderNumber}!`);
    if (onNavigate) onNavigate('/orders');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-7 h-7 text-amber-500" /> Quotation Studio & Commercial Lifecycle
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Create, track, and convert commercial quotations with multi-tier price master integration.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs">
          <Plus className="w-4 h-4 mr-2" /> + Create New Quotation
        </Button>
      </div>

      {/* Quotations List / Empty State */}
      {quotations.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800 p-8 text-center text-slate-400">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-slate-300">No Commercial Quotations Created</p>
          <p className="text-xs text-slate-500 mt-1">Click below to build a new commercial proposal and quote a customer.</p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-4 bg-amber-600 hover:bg-amber-500 text-white text-xs">
            <Plus className="w-4 h-4 mr-1" /> + Create New Quotation
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotations.map(qt => (
            <Card key={qt.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono text-amber-400 font-bold">{qt.quotationNumber}</span>
                    <CardTitle className="text-base text-slate-100 mt-1">{qt.customerName}</CardTitle>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    qt.status === 'Converted' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' :
                    qt.status === 'Sent' ? 'bg-blue-950/80 text-blue-400 border border-blue-800' :
                    qt.status === 'Accepted' ? 'bg-amber-950/80 text-amber-400 border border-amber-800' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {qt.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-300">
                <div className="flex justify-between text-slate-400">
                  <span>Date: {qt.date}</span>
                  <span>Valid: {qt.validUntil}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                  <span className="text-slate-400">Grand Total:</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">₹{qt.grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                  {qt.status !== 'Converted' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(qt.id, 'Sent')} className="text-xs border-slate-700">
                        <Send className="w-3 h-3 mr-1" /> Mark Sent
                      </Button>
                      <Button size="sm" onClick={() => handleConvertToSalesOrder(qt)} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
                        <ArrowRight className="w-3 h-3 mr-1" /> Convert to Sales Order
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Quotation Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Commercial Quotation">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Customer / Business Name</label>
            <input 
              type="text" 
              value={form.customerName}
              onChange={e => setForm({ ...form, customerName: e.target.value })}
              placeholder="e.g. Acme Corp / Dr. Dental" 
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Price Tier</label>
              <select 
                value={form.tier}
                onChange={e => setForm({ ...form, tier: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="cafeHotel">Cafe / Hotel</option>
                <option value="corporate">Corporate Gifting</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Validity (Days)</label>
              <input 
                type="number" 
                value={form.validDays}
                onChange={e => setForm({ ...form, validDays: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              />
            </div>
          </div>

          {/* Add Line Item */}
          <div className="border border-slate-800 p-3 rounded-lg bg-slate-950 space-y-3">
            <h4 className="font-bold text-slate-200">Add Product Line Item</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <select 
                  value={selectedSku}
                  onChange={e => setSelectedSku(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.sku}>{p.name} (Tier Price: ₹{ProductMasterService.getPriceForTier(p, form.tier)})</option>
                  ))}
                </select>
              </div>
              <input 
                type="number"
                min="1" 
                value={itemQty}
                onChange={e => setItemQty(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100"
              />
            </div>
            <Button size="sm" onClick={handleAddItem} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200">
              + Add Item to Quotation
            </Button>
          </div>

          {/* Item Table */}
          {lineItems.length > 0 && (
            <div className="space-y-2 border-t border-slate-800 pt-2">
              {lineItems.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-slate-900 p-2 rounded">
                  <div>
                    <div className="font-semibold text-slate-200">{item.name}</div>
                    <div className="text-slate-400">{item.qty} × ₹{item.unitPrice} + GST {item.gstRate}%</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-emerald-400 font-bold">₹{item.totalAmount}</span>
                    <button onClick={() => handleRemoveItem(item.id)} className="text-rose-400 hover:text-rose-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <Button onClick={handleCreateQuotation} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2">
              Generate & Save Quotation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
