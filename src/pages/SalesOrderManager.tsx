import React, { useState } from 'react';
import { ShoppingBag, Search, Plus, Truck, FileText, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { SalesOrder, SalesOrderStatus, CommercialLineItem } from '../types/commercial';
import { ProductMasterService } from '../services/productMaster';
import { StorageEngine } from '../services/storageEngine';
import { auditLogService } from '../services/audit';

const STORAGE_KEY = 'gud_sales_orders_v1';

export const SalesOrderManager: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const [orders, setOrders] = useState<SalesOrder[]>(() => {
    return StorageEngine.getLocal<SalesOrder[]>(STORAGE_KEY, []);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for creating new Sales Order
  const [form, setForm] = useState({
    customerName: '',
    customerPoNumber: '',
    deliveryAddress: '',
    tier: 'corporate' as 'retail' | 'wholesale' | 'cafeHotel' | 'corporate',
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

  const handleCreateOrder = () => {
    if (!form.customerName.trim() || lineItems.length === 0) {
      alert('Please enter a Customer Name and add at least 1 line item.');
      return;
    }

    const subtotal = lineItems.reduce((acc, i) => acc + i.taxableValue, 0);
    const gstTotal = lineItems.reduce((acc, i) => acc + i.gstAmount, 0);
    const grandTotal = subtotal + gstTotal;

    const newSo: SalesOrder = {
      id: `SO-${Date.now().toString().slice(-4)}`,
      orderNumber: `SO-${Math.floor(2000 + Math.random() * 8000)}`,
      date: new Date().toISOString().split('T')[0],
      customerId: `CUST-${Date.now().toString().slice(-4)}`,
      customerName: form.customerName,
      customerPoNumber: form.customerPoNumber || undefined,
      items: lineItems,
      subtotal,
      gstTotal,
      deliveryCharge: 0,
      grandTotal,
      deliveryAddress: form.deliveryAddress || 'Standard Delivery Address',
      status: 'Confirmed',
      notes: form.notes
    };

    const updated = [newSo, ...orders];
    setOrders(updated);
    StorageEngine.setLocal(STORAGE_KEY, updated);
    setIsModalOpen(false);
    setLineItems([]);
    setForm({ customerName: '', customerPoNumber: '', deliveryAddress: '', tier: 'corporate', notes: '' });

    auditLogService.logSystemActivity(`Sales Order Created`, `Order ${newSo.orderNumber} for ${newSo.customerName}. Value: ₹${newSo.grandTotal}`);
  };

  const handleStatusChange = (id: string, status: SalesOrderStatus) => {
    const updated = orders.map(o => o.id === id ? { ...o, status } : o);
    setOrders(updated);
    StorageEngine.setLocal(STORAGE_KEY, updated);
  };

  const handleCreateDeliveryDispatch = (so: SalesOrder) => {
    const existingDeliveries = StorageEngine.getLocal<any[]>('gud_deliveries_v1', []);
    const newDel = {
      id: `DEL-${Date.now().toString().slice(-4)}`,
      deliveryNumber: `DEL-${Math.floor(3000 + Math.random() * 7000)}`,
      salesOrderId: so.id,
      customerId: so.customerId,
      customerName: so.customerName,
      deliveryDate: new Date().toISOString().split('T')[0],
      deliveryAddress: so.deliveryAddress,
      provider: 'Porter',
      trackingId: `TRK-PTR-${Math.floor(100000 + Math.random() * 900000)}`,
      deliveryCharge: so.deliveryCharge,
      status: 'In Transit',
      notes: `Fulfilled for Sales Order ${so.orderNumber}`
    };

    StorageEngine.setLocal('gud_deliveries_v1', [newDel, ...existingDeliveries]);
    handleStatusChange(so.id, 'Fulfilled');
    alert(`Delivery Dispatch ${newDel.deliveryNumber} generated for ${so.customerName}. Note: Actual stock deduction occurs upon dispatch event!`);
    if (onNavigate) onNavigate('/delivery');
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customerPoNumber && o.customerPoNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-emerald-500" /> Sales Orders & Customer PO Register
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Committed sales order register, customer PO lookup, and fulfillment dispatch triggers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Search Order # or Customer PO #..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg pl-9 pr-4 py-2 w-64 focus:outline-none focus:border-slate-700"
            />
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs">
            <Plus className="w-4 h-4 mr-1" /> + Create Sales Order
          </Button>
        </div>
      </div>

      {/* Orders List / Empty State */}
      {filteredOrders.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800 p-8 text-center text-slate-400">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-slate-300">No Sales Orders Found</p>
          <p className="text-xs text-slate-500 mt-1">Click below to record a new committed customer sales order.</p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
            <Plus className="w-4 h-4 mr-1" /> + Create Sales Order
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(so => (
            <Card key={so.id} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{so.orderNumber}</span>
                    {so.customerPoNumber && (
                      <span className="block text-[10px] font-mono text-amber-400">Cust PO: {so.customerPoNumber}</span>
                    )}
                    <CardTitle className="text-base text-slate-100 mt-1">{so.customerName}</CardTitle>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    so.status === 'Fulfilled' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' :
                    so.status === 'Confirmed' ? 'bg-blue-950/80 text-blue-400 border border-blue-800' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {so.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-300">
                <div className="text-slate-400">Address: {so.deliveryAddress}</div>
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                  <span className="text-slate-400">Order Value:</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">₹{so.grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                  {so.status !== 'Fulfilled' && (
                    <Button size="sm" onClick={() => handleCreateDeliveryDispatch(so)} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white w-full">
                      <Truck className="w-3 h-3 mr-1" /> Create Delivery & Dispatch Stock
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Customer Sales Order">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Customer / Business Name</label>
            <input 
              type="text" 
              value={form.customerName}
              onChange={e => setForm({ ...form, customerName: e.target.value })}
              placeholder="e.g. Acme Corp / Cafe Coffee Day" 
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Customer PO # (Optional)</label>
              <input 
                type="text" 
                value={form.customerPoNumber}
                onChange={e => setForm({ ...form, customerPoNumber: e.target.value })}
                placeholder="e.g. PO-99182"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              />
            </div>
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
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Delivery Address</label>
            <input 
              type="text" 
              value={form.deliveryAddress}
              onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
              placeholder="e.g. MG Road, Kochi, Kerala"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
            />
          </div>

          {/* Line Item Picker */}
          <div className="border border-slate-800 p-3 rounded-lg bg-slate-950 space-y-3">
            <h4 className="font-bold text-slate-200">Add Line Item</h4>
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
              + Add Item to Order
            </Button>
          </div>

          {/* Line Items Table */}
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

          <Button onClick={handleCreateOrder} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2">
            Confirm & Save Sales Order
          </Button>
        </div>
      </Modal>
    </div>
  );
};
