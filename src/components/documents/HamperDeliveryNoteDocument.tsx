import React, { useRef, useState } from 'react';
import { Printer, ArrowLeft, PackageCheck, Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { TajHamperProject } from '../../pages/HamperStudio';
import { GudLogo } from '../Sidebar';
import { exportElementToPdf, printIsolatedElement } from '../../utils/documentExport';
import { getAssetUrl } from '../../utils/assetPath';

interface DeliveryNoteProps {
  project: TajHamperProject;
  onBack: () => void;
}

export const HamperDeliveryNoteDocument: React.FC<DeliveryNoteProps> = ({ project, onBack }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => {
    if (!printRef.current) {
      window.print();
      return;
    }
    printIsolatedElement(printRef.current);
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current || downloading) return;
    setDownloading(true);
    try {
      await exportElementToPdf(printRef.current, {
        fileName: `DEL-NOTE-${project.id || 'Delivery'}.pdf`,
        padding: '24px',
        scale: 1.75
      });
    } catch (err) {
      console.error('Delivery note PDF download error:', err);
      handlePrint();
    } finally {
      setDownloading(false);
    }
  };

  // Consolidate 25g bars into a single line item for compact packing list presentation
  const consolidatedItems: Array<{
    id: string;
    category: string;
    description: string;
    qty: number;
  }> = [];

  const flavorBars: typeof project.lineItems = [];

  project.lineItems.forEach(item => {
    const d = item.description.toLowerCase();
    const is25g = d.includes('(25g)') || d.includes('25 grm') || d.includes('25g') || 
      ['sea salt', 'jackfruit', 'almond noir', 'orange sunset', 'mocha', 'lemon', 'peanut royale'].some(f => d.includes(f));

    if (is25g && item.category === 'Chocolates') {
      flavorBars.push(item);
    } else {
      consolidatedItems.push({
        id: item.id,
        category: item.category,
        description: item.description,
        qty: item.qty
      });
    }
  });

  if (flavorBars.length > 0) {
    const totalBarsQty = flavorBars.reduce((sum, b) => sum + b.qty, 0);
    const flavorBreakdown = flavorBars
      .filter(b => b.qty > 0)
      .map(b => {
        const cleanName = b.description.replace(/\(25g\)/i, '').replace(/25 grm/i, '').trim();
        return `${cleanName} x ${b.qty}`;
      })
      .join(', ');

    consolidatedItems.unshift({
      id: 'CONSOLIDATED-25G-BARS',
      category: 'Chocolates',
      description: flavorBars.length === 1 && flavorBars[0].qty > 0
        ? flavorBars[0].description
        : `25g Artisan Chocolate Bars (${flavorBreakdown})`,
      qty: totalBarsQty
    });
  }

  const totalItemsCount = project.lineItems.reduce((acc, i) => acc + i.qty, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Controls Bar */}
      <div className="flex justify-between items-center bg-[#181818] p-4 rounded-xl border border-[#282828] print:hidden">
        <Button onClick={onBack} variant="outline" className="text-neutral-300 border-[#383838] hover:bg-[#252525] text-xs">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Project Workstation
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="bg-[#242424] hover:bg-[#303030] text-white border border-[#383838] font-medium text-xs"
          >
            {downloading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            Download PDF
          </Button>
          <Button onClick={handlePrint} className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs">
            <Printer className="w-4 h-4 mr-1" /> Print Delivery Note / Save as PDF
          </Button>
        </div>
      </div>

      {/* Printable A4 Delivery Note Sheet */}
      <div ref={printRef} className="bg-white text-slate-900 p-8 rounded-xl shadow-2xl space-y-6 font-sans border border-slate-200 text-xs max-w-[794px] mx-auto box-border print:p-0 print:shadow-none print:border-none print:rounded-none">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xl">
              <GudLogo size={32} /> GUDORIA FOOD INNOVATIONS
            </div>
            <p className="text-[11px] text-slate-700 font-bold mt-1">Pranavam Tower 1st Floor, Petta, Poonithura, Maradu, Ernakulam, Kerala 682038</p>
            <p className="text-[11px] text-slate-500">Ph: 09544809992 • Email: gudchocolates@gmail.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-blue-900 uppercase tracking-wide">Hamper Delivery Note</h2>
            <div className="text-[11px] font-mono text-slate-600 mt-0.5">Challan #: DEL-NOTE-{project.id}</div>
            <div className="text-[11px] text-slate-500">Dispatch Date: {new Date().toISOString().split('T')[0]}</div>
          </div>
        </div>

        {/* Delivery Details */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
          <div>
            <div className="text-slate-400 uppercase font-bold text-[10px]">DELIVERED TO (CLIENT):</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{project.clientName}</div>
            <div className="text-slate-600 text-[11px]">Corporate Delivery Address / Site</div>
          </div>
          <div>
            <div className="text-slate-400 uppercase font-bold text-[10px]">SHIPMENT DETAILS:</div>
            <div className="text-sm font-bold text-blue-900 mt-0.5">{project.projectName}</div>
            <div className="text-slate-600 text-[11px]">Total Packaged Units: <strong>{totalItemsCount} items / components</strong></div>
          </div>
        </div>

        {/* Itemized Delivery Packing List */}
        <div className="space-y-1.5">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-blue-600" /> Dispatched Packing List & Component Verification
          </h3>
          <table className="w-full text-left border-collapse border border-slate-200 text-xs">
            <thead>
              <tr className="bg-blue-50 border-b border-slate-200 text-blue-950 font-bold">
                <th className="py-2 px-3 border-r border-slate-200 text-center w-8">#</th>
                <th className="py-2 px-3 border-r border-slate-200 w-24">Category</th>
                <th className="py-2 px-3 border-r border-slate-200">Item Description</th>
                <th className="py-2 px-3 border-r border-slate-200 text-center w-28">Dispatched Qty</th>
                <th className="py-2 px-3 text-center w-36">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {consolidatedItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-semibold text-blue-900">{item.category}</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-medium">{item.description}</td>
                  <td className="py-2 px-3 border-r border-slate-200 text-center font-bold font-mono">{item.qty}</td>
                  <td className="py-2 px-3 text-center font-semibold text-emerald-700">✓ Packed & Verified</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Non-Financial Declaration */}
        <div className="bg-slate-100 p-3 rounded text-[11px] text-slate-600 border border-slate-200">
          <strong>Non-Financial Delivery Note:</strong> This document serves as proof of physical handover of packaged hamper goods. Tax invoice will be issued separately or attached.
        </div>

        {/* Handover & Receiver Signature Box */}
        <div className="border-t border-slate-200 pt-8">
          <div className="grid grid-cols-2 gap-10 text-xs">
            <div className="border border-slate-300 p-4 rounded-lg bg-slate-50/50 space-y-2">
              <div className="font-bold text-slate-800">DISPATCHED BY (GUDORIA LOGISTICS):</div>
              <div className="py-2">
                <img src={getAssetUrl('/images/brand/founder_signature.jpg')} alt="Founder Signature" className="h-12 max-w-[150px] object-contain" />
              </div>
              <div className="text-[10px] text-slate-700 font-semibold border-t border-dashed border-slate-300 pt-1">Logistics Executive / Authorized Signatory</div>
            </div>
            <div className="border border-blue-300 p-4 rounded-lg bg-blue-50/30 space-y-4">
              <div className="font-bold text-blue-950">RECEIVED IN GOOD CONDITION BY (CLIENT RECEIVER):</div>
              <div className="text-[10px] text-slate-500">"I acknowledge receipt of all above packaged hamper items intact."</div>
              <div className="border-b border-dashed border-blue-400 pt-4"></div>
              <div className="text-[10px] text-slate-500">Receiver Signature, Name, Phone & Date</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
