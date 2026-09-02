import React, { useState } from 'react';
import { Truck, Search, CheckCircle2, Plus, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { DeliveryRecord, DeliveryProvider, DeliveryStatus } from '../types/commercial';
import { StorageEngine } from '../services/storageEngine';
import { auditLogService } from '../services/audit';

const STORAGE_KEY = 'gud_deliveries_v1';

export const DeliveryManager: React.FC = () => {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>(() => {
    return StorageEngine.getLocal<DeliveryRecord[]>(STORAGE_KEY, []);
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    deliveryAddress: '',
    provider: 'Porter' as DeliveryProvider,
    trackingId: '',
    deliveryCharge: 0,
    notes: ''
  });

  const handleCreateDelivery = () => {
    if (!form.customerName.trim()) {
      alert('Please enter a Customer Name.');
      return;
    }

    const newDel: DeliveryRecord = {
      id: `DEL-${Date.now().toString().slice(-4)}`,
      deliveryNumber: `DEL-${Math.floor(3000 + Math.random() * 7000)}`,
      salesOrderId: `SO-${Date.now().toString().slice(-4)}`,
      customerId: `CUST-${Date.now().toString().slice(-4)}`,
      customerName: form.customerName,
      deliveryDate: new Date().toISOString().split('T')[0],
      deliveryAddress: form.deliveryAddress || 'Standard Shipping Address',
      provider: form.provider,
      trackingId: form.trackingId || `TRK-${form.provider.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
      deliveryCharge: Number(form.deliveryCharge),
      status: 'In Transit',
      notes: form.notes
    };

    const updated = [newDel, ...deliveries];
    setDeliveries(updated);
    StorageEngine.setLocal(STORAGE_KEY, updated);
    setIsModalOpen(false);
    setForm({ customerName: '', deliveryAddress: '', provider: 'Porter', trackingId: '', deliveryCharge: 0, notes: '' });

    auditLogService.logSystemActivity(`Delivery Dispatch Created`, `Delivery ${newDel.deliveryNumber} for ${newDel.customerName} via ${newDel.provider}`);
  };

  const handleStatusChange = (id: string, status: DeliveryStatus) => {
    const updated = deliveries.map(d => d.id === id ? { ...d, status } : d);
    setDeliveries(updated);
    StorageEngine.setLocal(STORAGE_KEY, updated);
    auditLogService.logSystemActivity(`Delivery Status Changed`, `Delivery ID: ${id} updated to ${status}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Truck className="w-7 h-7 text-blue-500" /> Delivery & Dispatch Operations
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Fulfillment dispatch tracker linked to Sales Orders. Physical dispatch events deduct stock.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs">
          <Plus className="w-4 h-4 mr-1" /> + Create Delivery Dispatch
        </Button>
      </div>

      {/* Deliveries Grid / Empty State */}
      {deliveries.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800 p-8 text-center text-slate-400">
          <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-slate-300">No Delivery Dispatches Logged</p>
          <p className="text-xs text-slate-500 mt-1">Click below to record a new courier or self-delivery dispatch.</p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white text-xs">
            <Plus className="w-4 h-4 mr-1" /> + Create Delivery Dispatch
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deliveries.map(del => (
            <Card key={del.id} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono text-blue-400 font-bold">{del.deliveryNumber}</span>
                    <CardTitle className="text-base text-slate-100 mt-1">{del.customerName}</CardTitle>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    del.status === 'Delivered' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' :
                    del.status === 'In Transit' ? 'bg-blue-950/80 text-blue-400 border border-blue-800' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {del.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-300">
                <div className="flex justify-between text-slate-400">
                  <span>Provider: <strong className="text-slate-200">{del.provider}</strong></span>
                  <span>Date: {del.deliveryDate}</span>
                </div>
                {del.trackingId && (
                  <div className="bg-slate-950 p-2 rounded font-mono text-xs text-slate-300 flex justify-between">
                    <span className="text-slate-500">Tracking #:</span>
                    <span className="text-amber-400 font-bold">{del.trackingId}</span>
                  </div>
                )}
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                  <span className="text-slate-400">Delivery Charge:</span>
                  <span className="text-sm font-bold font-mono text-slate-200">₹{del.deliveryCharge}</span>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  {del.status !== 'Delivered' && (
                    <Button size="sm" onClick={() => handleStatusChange(del.id, 'Delivered')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Delivered
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Delivery Dispatch">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Customer Name</label>
            <input 
              type="text" 
              value={form.customerName}
              onChange={e => setForm({ ...form, customerName: e.target.value })}
              placeholder="e.g. Prevalent AI / Taj Hotel" 
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Delivery Provider</label>
              <select 
                value={form.provider}
                onChange={e => setForm({ ...form, provider: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              >
                <option value="Porter">Porter</option>
                <option value="Dunzo">Dunzo</option>
                <option value="BlueDart">BlueDart</option>
                <option value="Delhivery">Delhivery</option>
                <option value="Self">Self Delivery</option>
                <option value="Scaria">Scaria</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Tracking ID (Optional)</label>
              <input 
                type="text" 
                value={form.trackingId}
                onChange={e => setForm({ ...form, trackingId: e.target.value })}
                placeholder="Auto-generated if blank" 
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Delivery Address</label>
            <input 
              type="text" 
              value={form.deliveryAddress}
              onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
              placeholder="e.g. Taj Malabar Resort, Willingdon Island, Kochi"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
            />
          </div>
          <Button onClick={handleCreateDelivery} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2">
            Confirm & Dispatch Delivery
          </Button>
        </div>
      </Modal>
    </div>
  );
};
