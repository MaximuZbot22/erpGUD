import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, Download, Printer, Search, 
  Calendar, Plus, Trash2, Copy, Check,
  ExternalLink, Sparkles, AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { StatisticsCard } from '../components/ui/StatisticsCard';
import { Button } from '../components/ui/Button';
import { 
  InvoiceService, 
  GstInvoiceRecord, 
  BASE_AUGUST_INVOICES 
} from '../services/invoiceService';

export const CAReports: React.FC = () => {
  const [invoices, setInvoices] = useState<GstInvoiceRecord[]>(BASE_AUGUST_INVOICES);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // New Invoice Form State for Manual Quick Add
  const [newInv, setNewInv] = useState({
    invoiceNo: '',
    date: '2026-09-01',
    party: '',
    partyGstin: '',
    taxableValue: '',
    cgst: '',
    sgst: '',
    chocolateQuantity: '',
    notes: ''
  });

  // Subscribe to real-time Firebase Firestore invoices with local cache fallback
  useEffect(() => {
    const unsubscribe = InvoiceService.subscribeToInvoices((loadedInvoices) => {
      setInvoices(loadedInvoices);
    });
    return unsubscribe;
  }, []);

  // Compute available months dynamically from all invoices + default recent months
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Always include August, September, October 2026
    monthsSet.add('2026-10');
    monthsSet.add('2026-09');
    monthsSet.add('2026-08');

    invoices.forEach(inv => {
      const ym = InvoiceService.extractYearMonth(inv.date);
      if (ym) monthsSet.add(ym);
    });

    return Array.from(monthsSet).sort().reverse();
  }, [invoices]);

  // Format month name (e.g. "2026-09" -> "September 2026")
  const formatMonthTitle = (ym: string): string => {
    if (!ym) return 'All Records';
    try {
      const [year, month] = ym.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    } catch {
      return ym;
    }
  };

  // Filter invoices for selected month & search query
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Month Filter
      if (selectedMonth) {
        const ym = InvoiceService.extractYearMonth(inv.date);
        if (ym !== selectedMonth) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInvoice = inv.invoiceNo.toLowerCase().includes(q);
        const matchParty = inv.party.toLowerCase().includes(q);
        const matchQty = (inv.chocolateQuantity || '').toLowerCase().includes(q);
        if (!matchInvoice && !matchParty && !matchQty) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, selectedMonth, searchQuery]);

  // Compute summary totals for the filtered set
  const totals = useMemo(() => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let totalTax = 0;
    let grossTotal = 0;

    filteredInvoices.forEach(inv => {
      const taxVal = inv.taxableValue || 0;
      const c = inv.cgst || 0;
      const s = inv.sgst || 0;
      taxable += taxVal;
      cgst += c;
      sgst += s;
      totalTax += (c + s);
      grossTotal += (inv.total || (taxVal + c + s));
    });

    return {
      count: filteredInvoices.length,
      taxable: Number(taxable.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      grossTotal: Number(grossTotal.toFixed(2))
    };
  }, [filteredInvoices]);

  // INR Currency Formatter
  const formatINR = (val: number): string => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Auto-calculate next invoice number when opening modal
  const handleOpenAddModal = () => {
    // Find highest invoice number sequence
    let highestSeq = 1171;
    invoices.forEach(inv => {
      const match = inv.invoiceNo.match(/Invoice-(\d+)-/i) || inv.invoiceNo.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (!isNaN(num) && num > highestSeq) highestSeq = num;
      }
    });

    const nextSeq = highestSeq + 1;
    const defaultDate = selectedMonth ? `${selectedMonth}-05` : new Date().toISOString().split('T')[0];

    setNewInv({
      invoiceNo: `Invoice-${nextSeq}-GUD-2026-Client`,
      date: defaultDate,
      party: '',
      partyGstin: '',
      taxableValue: '',
      cgst: '',
      sgst: '',
      chocolateQuantity: '6 bars',
      notes: ''
    });
    setShowAddModal(true);
  };

  // Auto-calculate 2.5% CGST and SGST when taxable value changes
  const handleTaxableChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val) && val > 0) {
      const taxHalf = Number((val * 0.025).toFixed(2));
      setNewInv(prev => ({
        ...prev,
        taxableValue: valStr,
        cgst: taxHalf.toString(),
        sgst: taxHalf.toString()
      }));
    } else {
      setNewInv(prev => ({
        ...prev,
        taxableValue: valStr,
        cgst: '',
        sgst: ''
      }));
    }
  };

  // Submit manual invoice to Firebase Firestore & local registry
  const handleSaveNewInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInv.invoiceNo || !newInv.party) return;

    setIsSaving(true);
    try {
      const taxVal = parseFloat(newInv.taxableValue) || 0;
      const c = parseFloat(newInv.cgst) || Number((taxVal * 0.025).toFixed(2));
      const s = parseFloat(newInv.sgst) || Number((taxVal * 0.025).toFixed(2));

      await InvoiceService.saveInvoice({
        invoiceNo: newInv.invoiceNo.trim(),
        date: newInv.date,
        party: newInv.party.trim(),
        partyGstin: newInv.partyGstin.trim(),
        taxableValue: taxVal,
        cgst: c,
        sgst: s,
        chocolateQuantity: newInv.chocolateQuantity.trim() || '1 order',
        notes: newInv.notes,
        entity: 'Goodoria Food Innovations',
        source: 'manual_entry'
      });

      // Ensure view is on the added month
      const addedYm = InvoiceService.extractYearMonth(newInv.date);
      if (addedYm) {
        setSelectedMonth(addedYm);
      }

      setShowAddModal(false);
    } catch (err: any) {
      console.error('Save invoice error:', err);
      alert('Failed to save invoice: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (invoiceNo: string) => {
    if (!window.confirm(`Delete invoice ${invoiceNo} from the GST register?`)) return;
    try {
      await InvoiceService.deleteInvoice(invoiceNo);
    } catch (err: any) {
      console.error('Delete error:', err);
    }
  };

  // Export exact 7-column CSV (matching screenshot)
  const handleExportCsv = () => {
    const periodLabel = selectedMonth ? formatMonthTitle(selectedMonth) : 'All_Time';
    InvoiceService.exportToExact7ColumnCsv(filteredInvoices, periodLabel);
  };

  // Copy WhatsApp/Email summary for CA
  const handleCopySummary = () => {
    const periodLabel = selectedMonth ? formatMonthTitle(selectedMonth) : 'All Time';
    const summaryText = `*GUDORIA FOOD INNOVATIONS - GST & Sales Register*\n` +
      `📅 Period: ${periodLabel}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📄 Invoices Issued: ${totals.count}\n` +
      `💰 Taxable Value: ${formatINR(totals.taxable)}\n` +
      `🏛️ CGST: ${formatINR(totals.cgst)}\n` +
      `🏛️ SGST: ${formatINR(totals.sgst)}\n` +
      `📈 Total GST (CGST+SGST): ${formatINR(totals.totalTax)}\n` +
      `💵 Gross Invoiced: ${formatINR(totals.grossTotal)}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Autonomously synced from Goodoria ERP & Firebase Cloud`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] border border-[#242424] p-6 rounded-2xl print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-[#c5a880]">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                CA & GST Sales Register
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Cloud Synced
                </span>
              </h1>
              <p className="text-xs text-[#888888]">
                Real-time autonomous outward sales register, CGST/SGST tax split, and party invoice records for CA audit.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySummary}
            className="flex items-center gap-2 text-xs border-[#333333] hover:bg-[#222222]"
            title="Copy summary for CA WhatsApp/Email"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#aaaaaa]" />}
            <span>{copiedSummary ? 'Summary Copied!' : 'Copy Summary'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs border-[#333333] hover:bg-[#222222]"
          >
            <Printer className="w-3.5 h-3.5 text-[#aaaaaa]" />
            <span>Print Register</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredInvoices.length === 0}
            className="flex items-center gap-2 text-xs border-[#333333] bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Download Excel (.csv)</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Invoice Entry</span>
          </Button>
        </div>
      </div>

      {/* 2. Month Selector & Search Controls */}
      <Card className="bg-[#141414] border-[#242424] print:hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Quick Month Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-[#777777] mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#c5a880]" />
                Month:
              </span>
              {availableMonths.map((ym) => {
                const isSelected = selectedMonth === ym;
                const count = invoices.filter(i => InvoiceService.extractYearMonth(i.date) === ym).length;
                return (
                  <button
                    key={ym}
                    type="button"
                    onClick={() => setSelectedMonth(ym)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-[#c5a880] text-black shadow-sm font-bold'
                        : 'bg-[#1b1b1b] text-[#aaaaaa] hover:text-white hover:bg-[#262626] border border-[#2b2b2b]'
                    }`}
                  >
                    {formatMonthTitle(ym)} ({count})
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedMonth('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedMonth === ''
                    ? 'bg-[#c5a880] text-black shadow-sm font-bold'
                    : 'bg-[#1b1b1b] text-[#aaaaaa] hover:text-white hover:bg-[#262626] border border-[#2b2b2b]'
                }`}
              >
                All Months ({invoices.length})
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#666666]" />
              <input
                type="text"
                placeholder="Search invoice or party..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#191919] border border-[#2d2d2d] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#c5a880]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 print:hidden">
        <StatisticsCard
          title="Invoices Logged"
          value={totals.count}
          description={`Period: ${selectedMonth ? formatMonthTitle(selectedMonth) : 'All Records'}`}
        />
        <StatisticsCard
          title="Taxable Turnover"
          value={formatINR(totals.taxable)}
          description="Base Sales Turnover"
          goldAccent
        />
        <StatisticsCard
          title="CGST"
          value={formatINR(totals.cgst)}
          description="Central GST @ 2.5%"
        />
        <StatisticsCard
          title="SGST"
          value={formatINR(totals.sgst)}
          description="State GST (Kerala) @ 2.5%"
        />
        <StatisticsCard
          title="Total GST Collected"
          value={formatINR(totals.totalTax)}
          description={`Gross: ${formatINR(totals.grossTotal)}`}
        />
      </div>

      {/* 4. Exact 7-Column Table (Matching User's Screenshot) */}
      <Card className="bg-[#141414] border-[#242424] overflow-hidden shadow-lg">
        {/* Table Title Bar */}
        <div className="bg-[#1f2937] text-white p-4 border-b border-[#374151] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-sky-400">
              {selectedMonth ? formatMonthTitle(selectedMonth) : 'All Months'} GST Sales Register
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 font-semibold border border-sky-800/50">
              {filteredInvoices.length} Invoices
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300 print:hidden">
            <span>Entity: <strong>Gudoria Food Innovations Pvt Ltd</strong></span>
            <span className="text-slate-500">•</span>
            <span>GSTIN: <strong>32AANCA8181G1ZK</strong></span>
          </div>
        </div>

        {/* The Exact 7 Columns Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#dddddd] border-collapse">
            <thead>
              {/* Header Styled like the Spreadsheet in the Screenshot */}
              <tr className="bg-[#1d4ed8] text-white text-[11px] font-bold uppercase tracking-wider border-b border-[#2563eb]">
                <th className="py-3 px-4 border-r border-blue-600">Invoice No.</th>
                <th className="py-3 px-4 border-r border-blue-600">Date</th>
                <th className="py-3 px-4 border-r border-blue-600">Party</th>
                <th className="py-3 px-4 text-right border-r border-blue-600">Taxable Value</th>
                <th className="py-3 px-4 text-right border-r border-blue-600">CGST</th>
                <th className="py-3 px-4 text-right border-r border-blue-600">SGST</th>
                <th className="py-3 px-4">Chocolate Quantity</th>
                <th className="py-3 px-3 text-center print:hidden w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[#777777]">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-[#1e1e1e] rounded-full text-[#c5a880]">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium text-white">
                        No invoices recorded for {selectedMonth ? formatMonthTitle(selectedMonth) : 'this period'} yet.
                      </p>
                      <p className="text-xs text-[#888888] max-w-md">
                        Every invoice you generate or enter automatically persists to Firebase and appears here in real-time.
                      </p>
                      <div className="pt-2 flex items-center gap-3">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleOpenAddModal}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          <span>+ Add Invoice for {selectedMonth ? formatMonthTitle(selectedMonth) : 'this Month'}</span>
                        </Button>
                        <a
                          href="#/invoice-generator"
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.hash = '/invoice-generator';
                          }}
                          className="text-xs text-[#c5a880] hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>Open Invoice Generator</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr 
                    key={inv.id || inv.invoiceNo} 
                    className="hover:bg-[#1a1a1a] transition-colors group"
                  >
                    {/* 1. Invoice No. */}
                    <td className="py-3 px-4 font-mono font-medium text-white whitespace-nowrap border-r border-[#262626]">
                      {inv.invoiceNo}
                    </td>

                    {/* 2. Date */}
                    <td className="py-3 px-4 text-[#cccccc] whitespace-nowrap border-r border-[#262626]">
                      {inv.date}
                    </td>

                    {/* 3. Party */}
                    <td className="py-3 px-4 text-white font-medium border-r border-[#262626]">
                      <div>{inv.party}</div>
                      {inv.partyGstin && (
                        <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                          GSTIN: {inv.partyGstin}
                        </div>
                      )}
                    </td>

                    {/* 4. Taxable Value */}
                    <td className="py-3 px-4 text-right font-mono font-medium text-white border-r border-[#262626]">
                      {formatINR(inv.taxableValue)}
                    </td>

                    {/* 5. CGST */}
                    <td className="py-3 px-4 text-right font-mono text-[#cccccc] border-r border-[#262626]">
                      {formatINR(inv.cgst)}
                    </td>

                    {/* 6. SGST */}
                    <td className="py-3 px-4 text-right font-mono text-[#cccccc] border-r border-[#262626]">
                      {formatINR(inv.sgst)}
                    </td>

                    {/* 7. Chocolate Quantity */}
                    <td className="py-3 px-4 text-[#dddddd] font-medium">
                      {inv.chocolateQuantity || '-'}
                    </td>

                    {/* Row Delete Action */}
                    <td className="py-3 px-3 text-center print:hidden">
                      <button
                        type="button"
                        onClick={() => handleDeleteInvoice(inv.invoiceNo)}
                        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition-opacity p-1"
                        title="Delete this record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Total Row matching the bottom of the screenshot */}
            {filteredInvoices.length > 0 && (
              <tfoot>
                <tr className="bg-[#1c1c1c] text-white font-bold border-t-2 border-[#333333] text-xs">
                  <td className="py-3.5 px-4 border-r border-[#2a2a2a] uppercase tracking-wider">
                    Total
                  </td>
                  <td className="py-3.5 px-4 border-r border-[#2a2a2a]"></td>
                  <td className="py-3.5 px-4 border-r border-[#2a2a2a] text-[#888888] font-normal">
                    {totals.count} Invoices
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400 border-r border-[#2a2a2a] text-sm">
                    {formatINR(totals.taxable)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-white border-r border-[#2a2a2a] text-sm">
                    {formatINR(totals.cgst)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-white border-r border-[#2a2a2a] text-sm">
                    {formatINR(totals.sgst)}
                  </td>
                  <td className="py-3.5 px-4 text-sky-300">
                    {totals.count} Orders / Batches
                  </td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* 5. Modal: Quick Add Invoice Entry */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#2e2e2e] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Add Invoice to GST Register</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#888888] hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewInvoice} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#888888] mb-1 font-medium">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={newInv.invoiceNo}
                    onChange={(e) => setNewInv({ ...newInv, invoiceNo: e.target.value })}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="Invoice-1172-GUD-2026-Client"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#888888] mb-1 font-medium">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={newInv.date}
                    onChange={(e) => setNewInv({ ...newInv, date: e.target.value })}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#888888] mb-1 font-medium">Party / Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newInv.party}
                  onChange={(e) => setNewInv({ ...newInv, party: e.target.value })}
                  className="w-full bg-[#121212] border border-[#2e2e2e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Royal Enfield Street or Naveen Kumar"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#888888] mb-1 font-medium">Party GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={newInv.partyGstin}
                    onChange={(e) => setNewInv({ ...newInv, partyGstin: e.target.value.toUpperCase() })}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-lg px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                    placeholder="32AAAAA0000A1Z5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#888888] mb-1 font-medium">Taxable Value (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newInv.taxableValue}
                    onChange={(e) => handleTaxableChange(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="1000.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#888888] mb-1 font-medium">CGST @ 2.5% (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInv.cgst}
                    onChange={(e) => setNewInv({ ...newInv, cgst: e.target.value })}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="25.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#888888] mb-1 font-medium">SGST @ 2.5% (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInv.sgst}
                    onChange={(e) => setNewInv({ ...newInv, sgst: e.target.value })}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="25.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#888888] mb-1 font-medium">Chocolate Quantity *</label>
                <input
                  type="text"
                  required
                  value={newInv.chocolateQuantity}
                  onChange={(e) => setNewInv({ ...newInv, chocolateQuantity: e.target.value })}
                  className="w-full bg-[#121212] border border-[#2e2e2e] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 6 bars, 2 Hampers, or 300 units (250 bars + 50 boxes)"
                />
              </div>

              <div className="pt-3 border-t border-[#282828] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs border-[#333333] hover:bg-[#222222] text-[#cccccc]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {isSaving ? 'Saving to Cloud...' : 'Save to Cloud & GST Register'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CAReports;
