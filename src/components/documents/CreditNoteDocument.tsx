import React, { useRef, useState } from 'react';
import { 
  Printer, Download, ArrowLeft, Loader2, CloudUpload, CheckCircle, 
  FileText, ShieldCheck, Tag, Info, AlertTriangle, CornerDownRight 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { CreditNote } from '../../types/commercial';
import { GudLogo } from '../Sidebar';
import { exportElementToPdf, printIsolatedElement } from '../../utils/documentExport';
import { getAssetUrl } from '../../utils/assetPath';
import { numberToWordsINR } from '../../utils/numberToWords';
import { GoogleDriveService } from '../../services/google';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

interface CreditNoteDocumentProps {
  creditNote: CreditNote;
  onBack: () => void;
  onUpdate?: (updated: CreditNote) => void;
}

export const CreditNoteDocument: React.FC<CreditNoteDocumentProps> = ({ 
  creditNote, 
  onBack,
  onUpdate 
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [savingDrive, setSavingDrive] = useState(false);
  const [driveSuccessUrl, setDriveSuccessUrl] = useState<string | null>(creditNote.driveUrl || null);

  const { googleToken } = useAuth();
  const notificationCtx = useNotifications();

  // Print Isolated Document
  const handlePrint = () => {
    if (!printRef.current) {
      window.print();
      return;
    }
    printIsolatedElement(printRef.current);
  };

  // Download Direct A4 PDF
  const handleDownloadPdf = async () => {
    if (!printRef.current || downloading) return;
    setDownloading(true);
    try {
      await exportElementToPdf(printRef.current, {
        fileName: `CREDIT-NOTE-${creditNote.creditNoteNumber || creditNote.id}.pdf`,
        padding: '24px',
        scale: 1.75
      });
      if (notificationCtx?.sendNotification) {
        notificationCtx.sendNotification({
          title: 'PDF Downloaded',
          message: `Credit Note ${creditNote.creditNoteNumber} downloaded successfully.`,
          priority: 'low',
          channels: ['in-app']
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Credit Note PDF download error:', err);
      handlePrint();
    } finally {
      setDownloading(false);
    }
  };

  // Save PDF to Google Drive
  const handleSaveToDrive = async () => {
    if (!googleToken) {
      alert('Google Drive connection requires an active Google Session. Please log in with Google in Settings.');
      return;
    }
    if (!printRef.current || savingDrive) return;

    setSavingDrive(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `CREDIT-NOTE-${creditNote.creditNoteNumber || creditNote.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 1.75, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const worker = html2pdf().set(opt as any).from(printRef.current);
      const pdfBlob: Blob = await worker.output('blob');
      const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

      const uploaded = await GoogleDriveService.uploadFile(googleToken, file);
      if (uploaded && uploaded.id) {
        const driveUrl = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
        setDriveSuccessUrl(driveUrl);
        
        if (onUpdate) {
          onUpdate({
            ...creditNote,
            driveFileId: uploaded.id,
            driveUrl
          });
        }

        if (notificationCtx?.sendNotification) {
          notificationCtx.sendNotification({
            title: 'Saved to Google Drive',
            message: `Credit Note uploaded to Drive folder (${uploaded.name}).`,
            priority: 'low',
            channels: ['in-app']
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Save to Drive error:', err);
      alert('Failed to save to Google Drive. Please check token permissions.');
    } finally {
      setSavingDrive(false);
    }
  };

  // Tax and line calculations
  const taxableSubtotal = creditNote.taxableAmount || 
    creditNote.items.reduce((sum, it) => sum + (it.taxableAmount || (it.creditQty || it.qty || 1) * (it.rate || it.unitPrice || 0)), 0);

  const cgstAmount = creditNote.cgstTotal !== undefined 
    ? creditNote.cgstTotal 
    : (creditNote.gstAdjustment ? creditNote.gstAdjustment / 2 : (taxableSubtotal * 0.025));

  const sgstAmount = creditNote.sgstTotal !== undefined 
    ? creditNote.sgstTotal 
    : (creditNote.gstAdjustment ? creditNote.gstAdjustment / 2 : (taxableSubtotal * 0.025));

  const igstAmount = creditNote.igstTotal || 0;
  const totalTax = (cgstAmount + sgstAmount + igstAmount) || creditNote.gstAdjustment || 0;
  const grandTotal = creditNote.totalCredit || creditNote.grandTotal || (taxableSubtotal + totalTax);

  const amountInWords = creditNote.amountInWords || numberToWordsINR(grandTotal);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      
      {/* Top Action & Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#181818] p-4 rounded-2xl border border-[#282828] print:hidden shadow-lg">
        <Button 
          onClick={onBack} 
          variant="outline" 
          className="text-neutral-300 border-[#383838] hover:bg-[#252525] text-xs h-9"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Notes Registry
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {driveSuccessUrl ? (
            <a
              href={driveSuccessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-xl hover:bg-emerald-900/50 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" /> View on Google Drive
            </a>
          ) : (
            <Button
              onClick={handleSaveToDrive}
              disabled={savingDrive}
              variant="outline"
              className="border-[#383838] bg-[#222222] hover:bg-[#2c2c2c] text-neutral-200 text-xs h-9"
            >
              {savingDrive ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5 mr-1.5 text-blue-400" />}
              Save to Drive
            </Button>
          )}

          <Button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="bg-[#242424] hover:bg-[#303030] text-white border border-[#383838] font-medium text-xs h-9"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5 text-amber-400" />}
            Download PDF
          </Button>

          <Button 
            onClick={handlePrint} 
            className="bg-[#c2292e] hover:bg-[#a11f23] text-white font-semibold text-xs h-9 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Printable A4 Clean Document Sheet */}
      <div 
        ref={printRef} 
        className="bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-2xl space-y-6 font-sans border border-slate-200 text-xs max-w-[794px] mx-auto box-border print:p-0 print:shadow-none print:border-none print:rounded-none"
      >
        {/* Document Header with GUD Identity */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-bold text-2xl tracking-tight">
              <GudLogo size={36} /> GUDORIA FOOD INNOVATIONS
            </div>
            <p className="text-[11px] font-semibold text-slate-700 mt-1">
              Pranavam Tower 1st Floor, Petta, Poonithura, Maradu, Ernakulam, Kerala 682038
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Ph: +91 9544809992 | Email: gudchocolates@gmail.com | GSTIN: 32AALCG1234F1Z5
            </p>
          </div>

          <div className="text-right">
            <div className="inline-block bg-rose-50 border border-rose-200 text-rose-800 font-bold text-base px-3 py-1 rounded-lg uppercase tracking-wider">
              CREDIT NOTE
            </div>
            <div className="text-xs font-mono font-bold text-slate-800 mt-2">
              CN No: {creditNote.creditNoteNumber || creditNote.id}
            </div>
            <div className="text-[11px] text-slate-600 font-medium">
              Date: {creditNote.date || new Date().toISOString().split('T')[0]}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Status: <strong className="text-slate-800 uppercase">{creditNote.status || 'Issued'}</strong>
            </div>
          </div>
        </div>

        {/* Client & Linked Reference Details */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CREDIT ISSUED TO (CUSTOMER):</div>
            <div className="text-sm font-bold text-slate-900 mt-1">{creditNote.customerName}</div>
            {creditNote.billingAddress && (
              <div className="text-[11px] text-slate-600 mt-0.5 whitespace-pre-line">{creditNote.billingAddress}</div>
            )}
            {creditNote.customerGstin && (
              <div className="text-[10px] font-mono text-slate-700 mt-1">
                GSTIN: <strong>{creditNote.customerGstin}</strong>
              </div>
            )}
            {creditNote.contactPhone && (
              <div className="text-[10px] text-slate-500">Contact: {creditNote.contactPhone}</div>
            )}
          </div>

          <div className="space-y-1.5 border-l border-slate-200 pl-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ORIGINAL TRANSACTION LINKAGE:</div>
            
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Original Invoice #:</span>
              <strong className="font-mono text-slate-800">{creditNote.originalInvoiceNumber || creditNote.originalInvoiceId || 'N/A'}</strong>
            </div>

            {creditNote.originalInvoiceDate && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Original Invoice Date:</span>
                <span className="font-mono text-slate-700">{creditNote.originalInvoiceDate}</span>
              </div>
            )}

            {creditNote.salesOrderNumber && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Related Sales Order:</span>
                <span className="font-mono text-slate-700">{creditNote.salesOrderNumber}</span>
              </div>
            )}

            {creditNote.returnId && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Customer Return Ref:</span>
                <span className="font-mono text-slate-700">{creditNote.returnId}</span>
              </div>
            )}

            <div className="border-t border-slate-200 pt-1 flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Reason Category:</span>
              <span className="font-semibold text-rose-700">{creditNote.reason}</span>
            </div>
          </div>
        </div>

        {/* Reason Banner */}
        {creditNote.customReason && (
          <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-lg text-amber-900 text-[11px]">
            <strong>Specific Reason / Context:</strong> {creditNote.customReason}
          </div>
        )}

        {/* Itemized Credit Table */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">
              Itemized Adjustments / Credited Goods
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              ({creditNote.items.length} line items credited)
            </span>
          </div>

          <table className="w-full text-left border-collapse border border-slate-200 text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-2.5 px-3 border-r border-slate-200 text-center w-8">#</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Item Description</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center w-20">HSN/SAC</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center w-20">Credit Qty</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right w-24">Unit Rate (₹)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right w-24">Taxable (₹)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center w-16">GST %</th>
                <th className="py-2.5 px-3 text-right w-28">Line Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {creditNote.items.map((item, idx) => {
                const qty = item.creditQty !== undefined ? item.creditQty : (item.qty || 1);
                const rate = item.rate !== undefined ? item.rate : (item.unitPrice || 0);
                const taxable = item.taxableAmount !== undefined ? item.taxableAmount : (qty * rate);
                const gstRate = item.gstRate !== undefined ? item.gstRate : 5;
                const total = item.lineTotal !== undefined ? item.lineTotal : (item.total || (taxable * (1 + gstRate / 100)));

                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 font-medium">
                      <div>{item.description || item.sku || 'Item Adjustment'}</div>
                      {item.sku && item.sku !== item.description && (
                        <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono text-slate-600">
                      {item.hsnSac || '1806'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono font-bold text-slate-900">
                      {qty}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-slate-700">
                      ₹{rate.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-slate-800 font-semibold">
                      ₹{taxable.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono text-slate-600">
                      {gstRate}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Tax Breakup */}
        <div className="grid grid-cols-2 gap-6 pt-2">
          {/* Left: Amount in words & Declaration */}
          <div className="space-y-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL CREDIT AMOUNT IN WORDS:</div>
              <div className="font-semibold text-slate-900 text-xs mt-1 italic leading-snug">
                {amountInWords}
              </div>
            </div>

            <div className="text-[10px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">GST Declaration & Note:</p>
              <p>
                1. This Credit Note is issued in accordance with Section 34 of the CGST Act, 2017.
              </p>
              <p>
                2. Output tax liability has been adjusted corresponding to the reduction in taxable value.
              </p>
            </div>
          </div>

          {/* Right: Tax Breakdown Table */}
          <div className="space-y-1.5 font-mono text-xs border-t-2 border-slate-800 pt-3">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span>₹{taxableSubtotal.toFixed(2)}</span>
            </div>

            {creditNote.discountTotal ? (
              <div className="flex justify-between text-emerald-700">
                <span>Discount Allowed:</span>
                <span>-₹{creditNote.discountTotal.toFixed(2)}</span>
              </div>
            ) : null}

            {cgstAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>CGST:</span>
                <span>₹{cgstAmount.toFixed(2)}</span>
              </div>
            )}

            {sgstAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>SGST:</span>
                <span>₹{sgstAmount.toFixed(2)}</span>
              </div>
            )}

            {igstAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>IGST:</span>
                <span>₹{igstAmount.toFixed(2)}</span>
              </div>
            )}

            {creditNote.otherAdjustment ? (
              <div className="flex justify-between text-slate-600">
                <span>Other Adjustments:</span>
                <span>₹{creditNote.otherAdjustment.toFixed(2)}</span>
              </div>
            ) : null}

            <div className="flex justify-between text-sm font-bold text-rose-900 border-t-2 border-slate-800 pt-2">
              <span>TOTAL CREDIT:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer & Signature Box */}
        <div className="border-t border-slate-200 pt-6 mt-4">
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-1 text-[11px] text-slate-500">
              <div className="font-bold text-slate-700">Terms & Application:</div>
              <p>• The credited balance is credited to the customer account ledger.</p>
              <p>• It may be adjusted against future invoices or refunded via original payment mode.</p>
            </div>

            <div className="border border-slate-300 p-3.5 rounded-xl bg-slate-50/50 space-y-2 text-right">
              <div className="font-bold text-slate-800 text-[11px]">
                For GUDORIA FOOD INNOVATIONS PVT LTD:
              </div>
              <div className="py-1 flex justify-end">
                <img 
                  src={getAssetUrl('/images/brand/founder_signature.jpg')} 
                  alt="Founder Signature" 
                  className="h-10 max-w-[140px] object-contain" 
                />
              </div>
              <div className="text-[10px] text-slate-700 font-semibold border-t border-dashed border-slate-300 pt-1">
                Authorized Signatory (Finance & Commercials)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
