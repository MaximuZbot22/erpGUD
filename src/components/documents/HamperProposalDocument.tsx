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
      <div ref={printRef} className="bg-white text-slate-900 p-10 rounded-xl shadow-2xl space-y-8 font-sans border border-slate-200 text-sm max-w-[794px] mx-auto box-border print:p-0 print:shadow-none print:border-none print:rounded-none">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-2xl">
              <GudLogo size={36} /> GUDORIA FOOD INNOVATIONS
            </div>
            <p className="text-xs text-slate-700 font-bold mt-1">Pranavam Tower 1st Floor, Petta, Poonithura, Maradu, Ernakulam, Kerala 682038</p>
            <p className="text-xs text-slate-500">Ph: 09544809992 • Email: gudchocolates@gmail.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Customer Proposal & PO Offer</h2>
            <div className="text-xs text-slate-500 font-mono mt-1">Ref #: PROPOSAL-{project.id}</div>
            <div className="text-xs text-slate-500">Date: {project.date}</div>
            <div className="text-xs text-amber-700 font-semibold mt-1">Valid Until: {new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]}</div>
          </div>
        </div>

        {/* Client & Project Details */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
          <div>
            <div className="text-slate-400 uppercase font-bold text-[10px]">PREPARED FOR CLIENT:</div>
            <div className="text-base font-bold text-slate-900 mt-1">{project.clientName}</div>
            <div className="text-slate-600">Corporate Client Partner</div>
          </div>
          <div>
            <div className="text-slate-400 uppercase font-bold text-[10px]">PROJECT SPECIFICATION:</div>
            <div className="text-base font-bold text-purple-900 mt-1">{project.projectName}</div>
            <div className="text-slate-600">Status: Commercial Quotation</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Itemized Corporate Hamper Composition</h3>
          <table className="w-full text-left border-collapse border border-slate-200 text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <th className="p-3 border-r border-slate-200">#</th>
                <th className="p-3 border-r border-slate-200">Category</th>
                <th className="p-3 border-r border-slate-200">Item Description</th>
                <th className="p-3 border-r border-slate-200 text-center">Qty / Hamper</th>
                <th className="p-3 border-r border-slate-200 text-right">Unit Price (₹)</th>
                <th className="p-3 border-r border-slate-200 text-center">GST %</th>
                <th className="p-3 text-right">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {project.lineItems.map((item, idx) => {
                const lineTotal = item.qty * item.clientUnitCost;
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                    <td className="p-3 border-r border-slate-200 font-semibold text-purple-900">{item.category}</td>
                    <td className="p-3 border-r border-slate-200">{item.description}</td>
                    <td className="p-3 border-r border-slate-200 text-center font-bold">{item.qty}</td>
                    <td className="p-3 border-r border-slate-200 text-right font-mono">₹{item.clientUnitCost}</td>
                    <td className="p-3 border-r border-slate-200 text-center font-mono">{item.gstRate}%</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">₹{lineTotal.toLocaleString('en-IN')}</td>
                  </tr>
                );
              })}
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
