import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Download, Printer, Search, 
  Building2, Calendar, FileText, CheckCircle2, Clock, 
  Copy, Check
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { StatisticsCard } from '../components/ui/StatisticsCard';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import seedData from '../data/seedDataV2.json';
import { 
  GstReconciliationRow, 
  transformOrderToGstRow, 
  calculateGstSummaryKpis, 
  exportGstReconciliationToCsv,
  formatINR,
  getYearMonthKey,
  formatMonthName
} from '../utils/gstReconciliationExport';

const ENTITIES = [
  'Goodoria Food Innovations',
  'Goodoria Functional Food Innovations',
  'JAB Media Lab'
];

export const CAReports: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<string>('Goodoria Food Innovations');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [supplyTypeFilter, setSupplyTypeFilter] = useState<'ALL' | 'B2B' | 'B2C'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Build Customer Map
  const customerMap = useMemo(() => {
    const map = new Map<string, any>();
    if (seedData && seedData.Customer_Master) {
      seedData.Customer_Master.forEach((cust: any) => {
        if (cust.Customer_ID) {
          map.set(cust.Customer_ID, cust);
        }
      });
    }
    return map;
  }, []);

  // Transform all orders into GST rows
  const allGstRows = useMemo(() => {
    const rawOrders = (seedData && seedData.Orders_Log) || [];
    return rawOrders.map((order: any) => 
      transformOrderToGstRow(order, customerMap, selectedEntity)
    );
  }, [customerMap, selectedEntity]);

  // Extract available Year-Months from data
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const rawOrders = (seedData && seedData.Orders_Log) || [];
    rawOrders.forEach((o: any) => {
      const ym = getYearMonthKey(o.Date);
      if (ym) monthsSet.add(ym);
    });
    // Sort descending (latest month first)
    return Array.from(monthsSet).sort().reverse();
  }, []);

  // Default to latest month on initial load if not selected
  React.useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // Filter rows based on user selections
  const filteredRows = useMemo(() => {
    return allGstRows.filter((row) => {
      // Month Filter
      if (selectedMonth) {
        const ym = getYearMonthKey(row.invoiceDate);
        if (ym !== selectedMonth) {
          // Fallback check against raw order date match
          const rawOrder = (seedData.Orders_Log as any[]).find(o => o.Order_ID === row.orderId);
          if (rawOrder && getYearMonthKey(rawOrder.Date) !== selectedMonth) {
            return false;
          }
        }
      }

      // Supply Type Filter
      if (supplyTypeFilter !== 'ALL' && row.supplyType !== supplyTypeFilter) {
        return false;
      }

      // Payment Filter
      if (paymentFilter !== 'ALL') {
        const status = (row.paymentStatus || '').toLowerCase();
        if (paymentFilter === 'Paid' && !status.includes('paid')) return false;
        if (paymentFilter === 'Pending' && !status.includes('pending')) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = row.customerName.toLowerCase().includes(q);
        const matchInvoice = row.invoiceNo.toLowerCase().includes(q);
        const matchOrderId = row.orderId.toLowerCase().includes(q);
        const matchGstin = row.customerGstin.toLowerCase().includes(q);
        const matchItems = row.itemsDescription.toLowerCase().includes(q);
        if (!matchName && !matchInvoice && !matchOrderId && !matchGstin && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [allGstRows, selectedMonth, supplyTypeFilter, paymentFilter, searchQuery]);

  // Compute live KPIs for filtered subset
  const kpis = useMemo(() => {
    return calculateGstSummaryKpis(filteredRows);
  }, [filteredRows]);

  // Handlers
  const handleExportCsv = () => {
    const monthLabel = selectedMonth ? formatMonthName(selectedMonth) : 'All_Time';
    exportGstReconciliationToCsv(filteredRows, kpis, monthLabel, selectedEntity);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const monthLabel = selectedMonth ? formatMonthName(selectedMonth) : 'All Time';
    const summaryText = `*GUD ERP - Monthly Sales & GST Summary*\n` +
      `🏢 Entity: ${selectedEntity}\n` +
      `📅 Period: ${monthLabel}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📄 Invoices: ${kpis.totalInvoices} (${kpis.b2bCount} B2B, ${kpis.b2cCount} B2C)\n` +
      `💰 Taxable Turnover: ${formatINR(kpis.totalTaxableValue)}\n` +
      `🏛️ CGST (9%): ${formatINR(kpis.totalCgst)}\n` +
      `🏛️ SGST (9%): ${formatINR(kpis.totalSgst)}\n` +
      `🌐 IGST (18%): ${formatINR(kpis.totalIgst)}\n` +
      `📈 Total GST: ${formatINR(kpis.totalTax)}\n` +
      `💵 Gross Sales: ${formatINR(kpis.totalInvoiceValue)}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Generated from GUD ERP for CA Audit`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] border border-[#242424] p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-[#c5a880]">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                CA & GST Sales Reconciler
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1e293b] text-sky-400 border border-sky-800/40">
                  GSTR-1 Format
                </span>
              </h1>
              <p className="text-xs text-[#888888]">
                Monthly outward supplies, party GSTIN, place of supply, and tax split register for CA audit & tax filing.
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
            title="Copy WhatsApp/Email summary to clipboard"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#aaaaaa]" />}
            <span>{copiedSummary ? 'Summary Copied!' : 'Copy Summary'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2 text-xs border-[#333333] hover:bg-[#222222]"
          >
            <Printer className="w-3.5 h-3.5 text-[#aaaaaa]" />
            <span>Print Sheet</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-2 text-xs bg-[#c5a880] text-black font-semibold hover:bg-[#b0936b] shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download CA Excel (.csv)</span>
          </Button>
        </div>
      </div>

      {/* 2. Filter & Controls Bar */}
      <Card className="bg-[#141414] border-[#242424]">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Entity Selector */}
            <div>
              <label className="text-[11px] font-medium text-[#888888] mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-[#c5a880]" />
                Company Entity
              </label>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="w-full bg-[#1b1b1b] border border-[#2d2d2d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a880]"
              >
                {ENTITIES.map((ent) => (
                  <option key={ent} value={ent}>{ent}</option>
                ))}
              </select>
            </div>

            {/* Month & Period Selector */}
            <div>
              <label className="text-[11px] font-medium text-[#888888] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-[#c5a880]" />
                Tax Period / Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-[#1b1b1b] border border-[#2d2d2d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a880]"
              >
                <option value="">All Records ({allGstRows.length})</option>
                {availableMonths.map((ym) => (
                  <option key={ym} value={ym}>{formatMonthName(ym)}</option>
                ))}
              </select>
            </div>

            {/* Supply Type Filter */}
            <div>
              <label className="text-[11px] font-medium text-[#888888] mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-[#c5a880]" />
                Supply Type (GST)
              </label>
              <select
                value={supplyTypeFilter}
                onChange={(e) => setSupplyTypeFilter(e.target.value as any)}
                className="w-full bg-[#1b1b1b] border border-[#2d2d2d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a880]"
              >
                <option value="ALL">All Supplies (B2B + B2C)</option>
                <option value="B2B">B2B Only (With GSTIN)</option>
                <option value="B2C">B2C Only (Retail/Consumer)</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="text-[11px] font-medium text-[#888888] mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#c5a880]" />
                Payment Status
              </label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full bg-[#1b1b1b] border border-[#2d2d2d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a880]"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="Paid">Paid Orders Only</option>
                <option value="Pending">Pending / Unpaid</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative pt-1 border-t border-[#222222]">
            <Search className="w-4 h-4 absolute left-3 top-4 text-[#666666]" />
            <input
              type="text"
              placeholder="Search by Customer name, Invoice ref, GSTIN, Order ID, or Item description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#191919] border border-[#2d2d2d] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#c5a880]"
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Reconciled KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatisticsCard
          title="Invoices Issued"
          value={kpis.totalInvoices}
          description={`${kpis.b2bCount} B2B · ${kpis.b2cCount} B2C`}
        />
        <StatisticsCard
          title="Taxable Turnover"
          value={formatINR(kpis.totalTaxableValue)}
          description="GSTR-3B Table 3.1"
          goldAccent
        />
        <StatisticsCard
          title="CGST (9%)"
          value={formatINR(kpis.totalCgst)}
          description="Central Tax"
        />
        <StatisticsCard
          title="SGST (9%)"
          value={formatINR(kpis.totalSgst)}
          description="State Tax (Kerala)"
        />
        <StatisticsCard
          title="IGST (18%)"
          value={formatINR(kpis.totalIgst)}
          description="Inter-State Tax"
        />
        <StatisticsCard
          title="Gross Revenue"
          value={formatINR(kpis.totalInvoiceValue)}
          description={`Tax: ${formatINR(kpis.totalTax)}`}
        />
      </div>

      {/* 4. Main Reconciled Data Table */}
      <Card className="bg-[#141414] border-[#242424] overflow-hidden">
        <div className="p-4 border-b border-[#242424] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Reconciled Sales Register</h2>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#222222] text-[#aaaaaa]">
              {filteredRows.length} {filteredRows.length === 1 ? 'record' : 'records'}
            </span>
          </div>
          <span className="text-[11px] text-[#777777]">
            Showing for: <strong className="text-white">{selectedMonth ? formatMonthName(selectedMonth) : 'All Records'}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#cccccc]">
            <thead className="bg-[#191919] text-[11px] text-[#888888] font-medium uppercase tracking-wider border-b border-[#242424]">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Invoice / Order</th>
                <th className="py-3 px-4">Party / Customer</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4">POS</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Taxable (₹)</th>
                <th className="py-3 px-4 text-right">CGST (₹)</th>
                <th className="py-3 px-4 text-right">SGST (₹)</th>
                <th className="py-3 px-4 text-right">IGST (₹)</th>
                <th className="py-3 px-4 text-right">Total (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-[#666666]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileSpreadsheet className="w-8 h-8 text-[#444444]" />
                      <p className="text-sm font-medium">No sales or orders found for the selected filters.</p>
                      <p className="text-xs text-[#555555]">Try changing the tax period month or clearing search filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr 
                    key={`${row.orderId}-${idx}`}
                    className="hover:bg-[#1a1a1a] transition-colors"
                  >
                    <td className="py-3 px-4 text-[#666666] font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-3 px-4 text-white font-medium whitespace-nowrap">{row.invoiceDate}</td>
                    <td className="py-3 px-4 font-mono text-white text-[11px]">
                      <div>{row.invoiceNo}</div>
                      <div className="text-[10px] text-[#666666]">{row.orderId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white truncate max-w-[180px]" title={row.customerName}>
                        {row.customerName}
                      </div>
                      <div className="text-[10px] text-[#777777] truncate max-w-[180px]">
                        {row.itemsDescription}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {row.customerGstin === 'Unregistered' ? (
                        <span className="text-[#666666] text-[10px]">Unregistered</span>
                      ) : (
                        <span className="text-amber-400 font-semibold">{row.customerGstin}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-[#aaaaaa]">
                        {row.placeOfSupply}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        row.supplyType === 'B2B' 
                          ? 'bg-amber-950/50 text-amber-300 border border-amber-800/40' 
                          : 'bg-slate-900 text-slate-400 border border-slate-700/40'
                      }`}>
                        {row.supplyType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-white">
                      {formatINR(row.taxableValue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#aaaaaa]">
                      {row.cgstAmount > 0 ? formatINR(row.cgstAmount) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#aaaaaa]">
                      {row.sgstAmount > 0 ? formatINR(row.sgstAmount) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#aaaaaa]">
                      {row.igstAmount > 0 ? formatINR(row.igstAmount) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatINR(row.totalInvoiceValue)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge 
                        status={row.paymentStatus.toLowerCase().includes('paid') ? 'active' : 'google-sync-required'}
                        label={row.paymentStatus || 'Pending'}
                        className="text-[10px] px-2 py-0.5"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot className="bg-[#181818] border-t-2 border-[#2f2f2f] font-semibold text-white">
                <tr>
                  <td colSpan={7} className="py-3 px-4 text-right uppercase text-[11px] text-[#888888]">
                    Totals ({filteredRows.length} Invoices):
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#c5a880]">
                    {formatINR(kpis.totalTaxableValue)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-white">
                    {formatINR(kpis.totalCgst)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-white">
                    {formatINR(kpis.totalSgst)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-white">
                    {formatINR(kpis.totalIgst)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400 text-sm font-bold">
                    {formatINR(kpis.totalInvoiceValue)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CAReports;
