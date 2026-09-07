import React, { useRef, useState } from 'react';
import { Printer, Download, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { TajHamperProject } from '../../pages/HamperStudio';
import { GudLogo } from '../Sidebar';
import { exportElementToPdf, printIsolatedElement } from '../../utils/documentExport';
import { getAssetUrl } from '../../utils/assetPath';

interface ProposalDocProps {
  project: TajHamperProject;
  onBack: () => void;
}

export const HamperProposalDocument: React.FC<ProposalDocProps> = ({ project, onBack }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Math Calculations for Proposal
  let subtotal = 0;
  let gstTotal = 0;

  project.lineItems.forEach(item => {
    const clientCost = item.qty * item.clientUnitCost;
    const clientGst = (clientCost * item.gstRate) / 100;
    subtotal += clientCost;
    gstTotal += clientGst;
  });

  // Only billable expenses are charged to the client on the proposal quote
  const billableExpenses = project.otherExpenses.filter(e => e.billableToClient !== false);
  const totalBillableExpenses = billableExpenses.reduce((acc, e) => acc + e.amount, 0);
  const grandTotal = Math.round(subtotal + gstTotal + totalBillableExpenses);

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
        fileName: `PROPOSAL-${project.id || 'Project'}.pdf`,
        padding: '24px',
        scale: 1.75
      });
    } catch (err) {
      console.error('Hamper Proposal PDF download error:', err);
      handlePrint();
    } finally {
      setDownloading(false);
    }
  };

  // Consolidate 25g bars into a single line item for compact presentation
  const consolidatedItems: Array<{
    id: string;
    category: string;
    description: string;
    qty: number;
    clientUnitCost: number;
    gstRate: number;
    lineTotal: number;
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
        qty: item.qty,
        clientUnitCost: item.clientUnitCost,
        gstRate: item.gstRate,
        lineTotal: item.qty * item.clientUnitCost
      });
    }
  });

  if (flavorBars.length > 0) {
    const totalBarsQty = flavorBars.reduce((sum, b) => sum + b.qty, 0);
    const unitPrice = flavorBars[0].clientUnitCost || 99;
    const gstRate = flavorBars[0].gstRate || 5;
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
      qty: totalBarsQty,
      clientUnitCost: unitPrice,
      gstRate: gstRate,
      lineTotal: totalBarsQty * unitPrice
    });
  }

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
            <Printer className="w-4 h-4 mr-1" /> Print Proposal / Save as PDF
          </Button>
        </div>
      </div>

      {/* Printable A4 Document Sheet */}
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
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Customer Proposal & PO Offer</h2>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">Ref #: PROPOSAL-{project.id}</div>
            <div className="text-[11px] text-slate-500">Date: {project.date}</div>
            <div className="text-[11px] text-amber-700 font-semibold mt-0.5">Valid Until: {new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]}</div>
          </div>
        </div>

        {/* Client & Project Details */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
          <div>
            <div className="text-slate-400 uppercase font-bold text-[10px]">PREPARED FOR CLIENT:</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{project.clientName}</div>
            <div className="text-slate-600 text-[11px]">Corporate Client Partner</div>
          </div>
          <div>
            <div className="text-slate-400 uppercase font-bold text-[10px]">PROJECT SPECIFICATION:</div>
            <div className="text-sm font-bold text-purple-900 mt-0.5">{project.projectName}</div>
            <div className="text-slate-600 text-[11px]">Status: Commercial Quotation</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-1.5">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Itemized Corporate Hamper Composition</h3>
          <table className="w-full text-left border-collapse border border-slate-200 text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-2 px-3 border-r border-slate-200 text-center w-8">#</th>
                <th className="py-2 px-3 border-r border-slate-200 w-24">Category</th>
                <th className="py-2 px-3 border-r border-slate-200">Item Description</th>
                <th className="py-2 px-3 border-r border-slate-200 text-center w-24">Qty / Hamper</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right w-24">Unit Price (₹)</th>
                <th className="py-2 px-3 border-r border-slate-200 text-center w-16">GST %</th>
                <th className="py-2 px-3 text-right w-28">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {consolidatedItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-semibold text-purple-900">{item.category}</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-medium">{item.description}</td>
                  <td className="py-2 px-3 border-r border-slate-200 text-center font-bold font-mono">{item.qty}</td>
                  <td className="py-2 px-3 border-r border-slate-200 text-right font-mono">₹{item.clientUnitCost}</td>
                  <td className="py-2 px-3 border-r border-slate-200 text-center font-mono">{item.gstRate}%</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">₹{item.lineTotal.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Expenses & Financial Summary */}
        <div className="flex justify-end pt-2">
          <div className="w-72 space-y-2 text-xs font-mono border-t-2 border-slate-800 pt-3">
            <div className="flex justify-between text-slate-600">
              <span>Items Subtotal:</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST Total:</span>
              <span>₹{Math.round(gstTotal).toLocaleString('en-IN')}</span>
            </div>
            {totalBillableExpenses > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Services & Logistics:</span>
                <span>₹{totalBillableExpenses.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-purple-900 border-t border-slate-300 pt-2">
              <span>GRAND TOTAL:</span>
              <span>₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Terms & Client Approval Box */}
        <div className="border-t border-slate-200 pt-6 space-y-4">
          <div className="text-xs text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">Terms & Conditions:</p>
            <p>1. Payment terms: 50% advance upon PO confirmation, 50% upon delivery completion.</p>
            <p>2. Customized branding, boxes, and note cards are non-refundable once production commences.</p>
          </div>

          <div className="grid grid-cols-2 gap-10 pt-4 text-xs">
            <div className="border border-slate-300 p-4 rounded-lg bg-slate-50/50 space-y-2">
              <div className="font-bold text-slate-800">For GUDORIA FOOD INNOVATIONS PVT LTD:</div>
              <div className="py-2">
                <img src={getAssetUrl('/images/brand/founder_signature.jpg')} alt="Founder Signature" className="h-12 max-w-[150px] object-contain" />
              </div>
              <div className="text-[10px] text-slate-700 font-semibold border-t border-dashed border-slate-300 pt-1">Authorized Signatory (Founder & Operations)</div>
            </div>
            <div className="border border-purple-300 p-4 rounded-lg bg-purple-50/30 space-y-4">
              <div className="font-bold text-purple-900">CLIENT ACCEPTANCE & PO APPROVAL:</div>
              <div className="text-[10px] text-slate-500">"We confirm acceptance of this proposal and authorize production."</div>
              <div className="border-b border-dashed border-purple-400 pt-6"></div>
              <div className="text-[10px] text-slate-500">Client Authorized Signature, Name & Seal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
