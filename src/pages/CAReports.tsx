import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileSpreadsheet, Download, Printer, Search, 
  Calendar, Plus, Copy, Check, ExternalLink, 
  RotateCcw, Sparkles, AlertCircle, ArrowUpRight, 
  Database, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardContent } from '../components/ui/Card';
import { StatisticsCard } from '../components/ui/StatisticsCard';
import { Button } from '../components/ui/Button';
import { GoogleSheetsService } from '../services/google';
import seedDataV2 from '../data/seedDataV2.json';
import { 
  InvoiceService, 
  GstInvoiceRecord, 
  BASE_AUGUST_INVOICES 
} from '../services/invoiceService';

// Clean numeric strings with commas, currency symbols (e.g. "9,000.00" -> 9000)
function cleanNumber(val: any): number {
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Strictly follow Indian DD/MM/YYYY date ordering (Day / Month / Year)
function parseOrderDate(rawDate: string, invoiceNo?: string, fallbackDate?: string): { dateDisplay: string; ym: string } {
  let str = (rawDate || '').trim();
  if (!str) {
    if (invoiceNo && /119[1-4]/i.test(invoiceNo)) {
      str = '05/09/2026';
    } else if (fallbackDate) {
      str = fallbackDate;
    }
  }
  if (!str) return { dateDisplay: '', ym: '' };

  // 1. DD/MM/YYYY or DD-MM-YYYY (Strict Indian convention: Day / Month / Year)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return {
      dateDisplay: `${day}-${month}-${year}`,
      ym: `${year}-${month}`
    };
  }

  // 2. YYYY-MM-DD (ISO date from e-commerce / website orders like '2026-09-30 3:43:24')
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return {
      dateDisplay: `${day}-${month}-${year}`,
      ym: `${year}-${month}`
    };
  }

  return {
    dateDisplay: str,
    ym: InvoiceService.extractYearMonth(str)
  };
}

export const CAReports: React.FC = () => {
  const { googleToken, signInWithGoogle } = useAuth();
  const { sendNotification } = useNotifications();

  // Primary Data State: Loaded from Google Sheets Orders_Log + Customer_Master
  const [ordersLog, setOrdersLog] = useState<any[]>(() => seedDataV2.Orders_Log || []);
  const [customerMaster, setCustomerMaster] = useState<any[]>(() => seedDataV2.Customer_Master || []);
  const [loadingSheet, setLoadingSheet] = useState<boolean>(false);
  const [isGoogleSynced, setIsGoogleSynced] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');

  // Real-time Cloud Invoices from Firebase Firestore
  const [cloudInvoices, setCloudInvoices] = useState<GstInvoiceRecord[]>([]);

  // UI Filter & Modal States - Default to September 2026
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // New Order / Invoice Form State
  const [newOrder, setNewOrder] = useState({
    invoiceNo: '',
    date: '2026-09-01',
    customerName: '',
    customerId: 'CUST-0001',
    items: 'Almond 25g x10, Peanut 25g x5',
    qty: '15',
    taxableValue: '1800',
    cgst: '45.00',
    sgst: '45.00',
    channel: 'Direct',
    notes: 'Payment received upon delivery'
  });

  const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEET_ORDERS || '1uUfxL_k6k4ebzHPWL4pwwtdIaxzZ-6mW4mqB_6iJnXo';

  // 1. Fetch Orders_Log and Customer_Master directly from Google Sheets
  const fetchLiveOrdersFromSheet = useCallback(async () => {
    setLoadingSheet(true);
    try {
      let ordersRows: any[] = [];
      let customerRows: any[] = [];

      // Fetch from Google Sheets API
      const ordersRes = await GoogleSheetsService.getSpreadsheetValues(
        googleToken,
        spreadsheetId,
        "'Orders_Log'!A1:Z10000"
      );

      if (ordersRes?.values && ordersRes.values.length > 1) {
        const [headers, ...rows] = ordersRes.values;
        ordersRows = rows.map(r => {
          const obj: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => {
            obj[h] = r[idx] !== undefined ? String(r[idx]).trim() : '';
          });
          return obj;
        });
      }

      const custRes = await GoogleSheetsService.getSpreadsheetValues(
        googleToken,
        spreadsheetId,
        "'Customer_Master'!A1:Z1000"
      );

      if (custRes?.values && custRes.values.length > 1) {
        const [headers, ...rows] = custRes.values;
        customerRows = rows.map(r => {
          const obj: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => {
            obj[h] = r[idx] !== undefined ? String(r[idx]).trim() : '';
          });
          return obj;
        });
      }

      // Merge with offline seed data if sheet returns fewer records
      const finalOrders = ordersRows.length > 0 ? ordersRows : (seedDataV2.Orders_Log || []);
      const finalCustomers = customerRows.length > 0 ? customerRows : (seedDataV2.Customer_Master || []);

      setOrdersLog(finalOrders);
      setCustomerMaster(finalCustomers);
      setIsGoogleSynced(ordersRows.length > 0);
      setLastSyncedTime(new Date().toLocaleTimeString());

      if (ordersRows.length > 0) {
        sendNotification({
          title: 'Google Sheets Synced',
          message: `Loaded ${ordersRows.length} live rows from 'Orders_Log'`,
          priority: 'low',
          channels: ['in-app']
        });
      }
    } catch (err: any) {
      console.warn('[CAReports] Could not load live sheets, using seed data:', err);
      setOrdersLog(seedDataV2.Orders_Log || []);
      setCustomerMaster(seedDataV2.Customer_Master || []);
      setIsGoogleSynced(false);
    } finally {
      setLoadingSheet(false);
    }
  }, [googleToken, spreadsheetId, sendNotification]);

  // Initial load on mount and when googleToken changes
  useEffect(() => {
    fetchLiveOrdersFromSheet();
  }, [fetchLiveOrdersFromSheet]);

  // Real-time subscription to Firebase Firestore for any newly created invoices
  useEffect(() => {
    const unsub = InvoiceService.subscribeToInvoices((invoices) => {
      setCloudInvoices(invoices || []);
    });
    return unsub;
  }, []);

  // Helper map for fast customer lookups
  const customerMap = useMemo(() => {
    const map = new Map<string, any>();
    customerMaster.forEach(c => {
      if (c.Customer_ID) map.set(c.Customer_ID, c);
      if (c.Business_Name) map.set(c.Business_Name.toLowerCase(), c);
    });
    return map;
  }, [customerMaster]);

  // 2. Transform Orders_Log into the Exact 7-Column CA & GST Register (Strict Indian DD/MM/YYYY)
  const gstRows: GstInvoiceRecord[] = useMemo(() => {
    let lastDate = '05-09-2026';

    const sheetRecords: GstInvoiceRecord[] = ordersLog.map((order, idx) => {
      // 1. Invoice No.
      const invoiceNo = (order.Invoice_Link || order.Invoice_Ref || order.Order_ID || `ORD-${idx + 1}`).trim();

      // 2. Date parsing (strictly DD/MM/YYYY)
      const { dateDisplay, ym } = parseOrderDate(order.Date, invoiceNo, lastDate);
      if (dateDisplay) lastDate = dateDisplay;

      // 3. Party Name resolution via Customer_Master
      const custId = order.Customer_ID || '';
      const cust = customerMap.get(custId) || customerMap.get(custId.toLowerCase());
      let party = '';
      if (cust) {
        party = cust.Business_Name || cust.Contact_Person || custId;
      } else if (order.Invoice_Link) {
        // Extract party name suffix from Invoice_Link e.g. "Invoice-1153-GUD-2026-Moby" -> "Moby"
        const tagMatch = order.Invoice_Link.match(/GUD-\d{4}-([A-Za-z0-9_\s&]+)/i) || 
                         order.Invoice_Link.match(/Invoice-\d+-([A-Za-z0-9_\s&]+)/i);
        party = tagMatch ? tagMatch[1].trim() : (custId || 'Direct Customer');
      } else {
        party = custId || 'Direct Customer';
      }

      // 4. Taxable Value & Tax Calculations (reversing 5% GST from retail gross total)
      const totalVal = cleanNumber(order.Total_Value || order.Amount);
      const priceUnit = cleanNumber(order.Price_Per_Unit);
      const qtyNum = cleanNumber(order.Qty) || 1;
      const grossTotal = totalVal > 0 ? totalVal : (priceUnit * qtyNum);
      const gstPercent = cleanNumber(order.GST_Percent) || 5;

      // Check if this invoice matches our audited August pack for exact numbers
      const audited = BASE_AUGUST_INVOICES.find(a => 
        (a.invoiceNo && invoiceNo && a.invoiceNo.toLowerCase().includes(invoiceNo.toLowerCase())) ||
        (invoiceNo && a.invoiceNo && invoiceNo.toLowerCase().includes(a.invoiceNo.toLowerCase()))
      );

      let taxableValue: number;
      let cgst: number;
      let sgst: number;
      let totalGst: number;
      let total: number;

      if (audited) {
        taxableValue = audited.taxableValue;
        cgst = audited.cgst;
        sgst = audited.sgst;
        totalGst = audited.totalGst || Number((cgst + sgst).toFixed(2));
        total = audited.total || Number((taxableValue + totalGst).toFixed(2));
      } else {
        taxableValue = Number((grossTotal / (1 + gstPercent / 100)).toFixed(2));
        cgst = Number(((grossTotal - taxableValue) / 2).toFixed(2));
        sgst = Number(((grossTotal - taxableValue) / 2).toFixed(2));
        totalGst = Number((cgst + sgst).toFixed(2));
        total = Number((taxableValue + totalGst).toFixed(2));
      }

      let chocolateQuantity = audited ? audited.chocolateQuantity : (order.Items || `${qtyNum} units`);

      return {
        id: order.Order_ID || invoiceNo,
        invoiceNo,
        date: dateDisplay,
        yearMonth: ym,
        party,
        partyGstin: cust?.Notes?.match(/GSTIN\s*[:|-]?\s*([A-Z0-9]{15})/i)?.[1] || '',
        taxableValue,
        cgst,
        sgst,
        totalGst,
        total,
        chocolateQuantity,
        entity: 'Goodoria Food Innovations',
        source: 'imported'
      };
    });

    // Merge any custom Firestore cloud invoices that are not in Google Sheets
    const existingInvoices = new Set(sheetRecords.map(r => r.invoiceNo.toLowerCase()));
    const extraCloudRecords: GstInvoiceRecord[] = [];

    cloudInvoices.forEach(cloudInv => {
      if (!cloudInv.invoiceNo || existingInvoices.has(cloudInv.invoiceNo.toLowerCase())) return;
      const { dateDisplay, ym } = parseOrderDate(cloudInv.date, cloudInv.invoiceNo);
      extraCloudRecords.push({
        ...cloudInv,
        date: dateDisplay || cloudInv.date,
        yearMonth: ym || InvoiceService.extractYearMonth(cloudInv.date)
      });
      existingInvoices.add(cloudInv.invoiceNo.toLowerCase());
    });

    return [...sheetRecords, ...extraCloudRecords];
  }, [ordersLog, customerMap, cloudInvoices]);

  // Compute available months dynamically from all order dates
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Always include current and recent months
    monthsSet.add('2026-10');
    monthsSet.add('2026-09');
    monthsSet.add('2026-08');

    gstRows.forEach(row => {
      const ym = (row as any).yearMonth || InvoiceService.extractYearMonth(row.date);
      if (ym) monthsSet.add(ym);
    });

    return Array.from(monthsSet).sort().reverse();
  }, [gstRows]);

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

  // Filter rows for selected month & search query
  const filteredRows = useMemo(() => {
    return gstRows.filter(row => {
      // Month Filter
      if (selectedMonth) {
        const ym = (row as any).yearMonth || InvoiceService.extractYearMonth(row.date);
        if (ym !== selectedMonth) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInvoice = row.invoiceNo.toLowerCase().includes(q);
        const matchParty = row.party.toLowerCase().includes(q);
        const matchQty = (row.chocolateQuantity || '').toLowerCase().includes(q);
        if (!matchInvoice && !matchParty && !matchQty) {
          return false;
        }
      }

      return true;
    });
  }, [gstRows, selectedMonth, searchQuery]);

  // Compute summary totals for the filtered set
  const totals = useMemo(() => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let totalTax = 0;
    let grossTotal = 0;

    filteredRows.forEach(row => {
      taxable += (row.taxableValue || 0);
      cgst += (row.cgst || 0);
      sgst += (row.sgst || 0);
      totalTax += (row.totalGst || 0);
      grossTotal += (row.total || 0);
    });

    return {
      count: filteredRows.length,
      taxable: Number(taxable.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      grossTotal: Number(grossTotal.toFixed(2))
    };
  }, [filteredRows]);

  // INR Currency Formatter
  const formatINR = (val: number): string => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Auto-calculate next invoice number when opening modal
  const handleOpenAddModal = () => {
    let highestSeq = 1171;
    gstRows.forEach(r => {
      const match = r.invoiceNo.match(/Invoice-(\d+)-/i) || r.invoiceNo.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (!isNaN(num) && num > highestSeq) highestSeq = num;
      }
    });

    const nextSeq = highestSeq + 1;
    const defaultDate = selectedMonth ? `${selectedMonth}-05` : new Date().toISOString().split('T')[0];

    setNewOrder({
      invoiceNo: `Invoice-${nextSeq}-GUD-2026-Client`,
      date: defaultDate,
      customerName: 'Direct Client',
      customerId: 'CUST-0001',
      items: '6 bars (Orange, Sea Salt, Almond)',
      qty: '6',
      taxableValue: '742.86',
      cgst: '18.57',
      sgst: '18.57',
      channel: 'Direct',
      notes: 'Payment received upon delivery'
    });
    setShowAddModal(true);
  };

  // Auto-calculate 2.5% CGST and SGST when taxable value changes in modal
  const handleTaxableChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val) && val > 0) {
      const taxHalf = Number((val * 0.025).toFixed(2));
      setNewOrder(prev => ({
        ...prev,
        taxableValue: valStr,
        cgst: taxHalf.toString(),
        sgst: taxHalf.toString()
      }));
    } else {
      setNewOrder(prev => ({
        ...prev,
        taxableValue: valStr,
        cgst: '',
        sgst: ''
      }));
    }
  };

  // Submit new order directly to Google Sheets Orders_Log!A:O
  const handleSaveOrderToSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.invoiceNo || !newOrder.customerName) return;

    setIsSaving(true);
    try {
      const taxVal = parseFloat(newOrder.taxableValue) || 0;
      const orderId = `ORD-${Date.now().toString().slice(-4)}`;

      const orderRowObj = {
        Order_ID: orderId,
        Date: newOrder.date,
        Customer_ID: newOrder.customerId || 'CUST-0001',
        Channel: newOrder.channel || 'Direct',
        Items: newOrder.items,
        Qty: newOrder.qty || '1',
        Price_Per_Unit: (taxVal / (parseFloat(newOrder.qty) || 1)).toFixed(2),
        GST_Percent: '5%',
        Total_Value: taxVal.toFixed(2),
        Payment_Status: 'Paid',
        Delivery_Status: 'Delivered',
        Delivery_Method: 'Self',
        Tracking_ID: '',
        Invoice_Link: newOrder.invoiceNo.trim(),
        Notes: newOrder.notes
      };

      // 1. If Google Token is available, push directly to Google Sheets Orders_Log
      if (googleToken) {
        const rowArray = [
          orderRowObj.Order_ID,
          orderRowObj.Date,
          orderRowObj.Customer_ID,
          orderRowObj.Channel,
          orderRowObj.Items,
          orderRowObj.Qty,
          orderRowObj.Price_Per_Unit,
          orderRowObj.GST_Percent,
          orderRowObj.Total_Value,
          orderRowObj.Payment_Status,
          orderRowObj.Delivery_Status,
          orderRowObj.Delivery_Method,
          orderRowObj.Tracking_ID,
          orderRowObj.Invoice_Link,
          orderRowObj.Notes
        ];

        await GoogleSheetsService.appendSpreadsheetValues(
          googleToken,
          spreadsheetId,
          "'Orders_Log'!A:O",
          [rowArray]
        );

        sendNotification({
          title: 'Added to Google Sheets Orders_Log',
          message: `${newOrder.invoiceNo} appended to spreadsheet successfully!`,
          priority: 'medium',
          channels: ['in-app']
        });
      }

      // 2. Add to local Orders_Log state immediately
      setOrdersLog(prev => [orderRowObj, ...prev]);

      // 3. Ensure view is on the added month
      const addedYm = InvoiceService.extractYearMonth(newOrder.date);
      if (addedYm) {
        setSelectedMonth(addedYm);
      }

      setShowAddModal(false);
    } catch (err: any) {
      console.error('Save order error:', err);
      alert('Failed to save order to sheet: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Export exact 7-column CSV (matching spreadsheet layout)
  const handleExportCsv = () => {
    const periodLabel = selectedMonth ? formatMonthTitle(selectedMonth) : 'All_Time';
    InvoiceService.exportToExact7ColumnCsv(filteredRows, periodLabel);
  };

  // Copy WhatsApp/Email summary for CA
  const handleCopySummary = () => {
    const periodLabel = selectedMonth ? formatMonthTitle(selectedMonth) : 'All Time';
    const summaryText = `*GUDORIA FOOD INNOVATIONS - CA & GST Sales Register*\n` +
      `📅 Period: ${periodLabel}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📄 Invoices / Orders: ${totals.count}\n` +
      `💰 Taxable Value: ${formatINR(totals.taxable)}\n` +
      `🏛️ CGST (2.5%): ${formatINR(totals.cgst)}\n` +
      `🏛️ SGST (2.5%): ${formatINR(totals.sgst)}\n` +
      `📈 Total GST: ${formatINR(totals.totalTax)}\n` +
      `💵 Gross Invoiced: ${formatINR(totals.grossTotal)}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Source: Google Sheets Orders_Log (${ordersLog.length} rows synced)`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] border border-[#242424] p-6 rounded-2xl print:hidden shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-[#c5a880]">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  CA &amp; GST Sales Register
                </h1>
                {isGoogleSynced ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Sheets Synced ({ordersLog.length} rows)</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-800/40 flex items-center gap-1">
                    <Database className="w-3 h-3 text-amber-300" />
                    <span>Orders CRM Local ({ordersLog.length} rows)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#888888] mt-0.5">
                Autonomously populated from <strong>Orders_Log</strong> in Google Sheets. Live CGST &amp; SGST breakdown for CA tax audits.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Direct Link to Orders CRM Portal */}
          <a
            href="#/modules/orders"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = '/modules/orders';
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#333333] bg-[#1a1a1a] hover:bg-[#252525] text-neutral-300 hover:text-white transition font-medium"
            title="Open the Orders CRM Portal to view and edit raw order logs"
          >
            <span>Orders CRM Portal</span>
            <ArrowUpRight className="w-3 h-3 text-neutral-400" />
          </a>

          {/* Sync / Refresh from Google Sheets */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLiveOrdersFromSheet}
            disabled={loadingSheet}
            className="flex items-center gap-1.5 text-xs border-[#333333] hover:bg-[#222222]"
            title="Refresh order logs directly from Google Sheets"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-[#aaaaaa] ${loadingSheet ? 'animate-spin' : ''}`} />
            <span>{loadingSheet ? 'Syncing...' : 'Sync Sheet'}</span>
          </Button>

          {!googleToken && (
            <Button
              variant="outline"
              size="sm"
              onClick={signInWithGoogle}
              className="flex items-center gap-1.5 text-xs border-amber-800/40 bg-amber-950/30 text-amber-200 hover:bg-amber-900/40"
            >
              <span>Connect Google</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 text-xs border-[#333333] hover:bg-[#222222]"
            title="Copy summary for CA WhatsApp/Email"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#aaaaaa]" />}
            <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs border-[#333333] hover:bg-[#222222]"
          >
            <Printer className="w-3.5 h-3.5 text-[#aaaaaa]" />
            <span>Print</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-1.5 text-xs border-[#333333] bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Order to Sheet</span>
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
                const count = gstRows.filter(r => ((r as any).yearMonth || InvoiceService.extractYearMonth(r.date)) === ym).length;
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
                All Months ({gstRows.length})
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
          title="Orders Logged"
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
              {filteredRows.length} Orders
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300 print:hidden">
            <span>Entity: <strong>Gudoria Food Innovations Pvt Ltd</strong></span>
            <span className="text-slate-500">•</span>
            <span>GSTIN: <strong>32AANCA8181G1ZK</strong></span>
            {lastSyncedTime && (
              <span className="text-[11px] text-slate-400">
                (Last sync: {lastSyncedTime})
              </span>
            )}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#777777]">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-[#1e1e1e] rounded-full text-[#c5a880]">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium text-white">
                        No orders found in Orders_Log for {selectedMonth ? formatMonthTitle(selectedMonth) : 'this period'}.
                      </p>
                      <p className="text-xs text-[#888888] max-w-md">
                        Every order logged in the Orders CRM Portal or Google Sheets appears here autonomously with auto-calculated CGST &amp; SGST.
                      </p>
                      <div className="pt-2 flex items-center gap-3">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleOpenAddModal}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          <span>+ Add Order for {selectedMonth ? formatMonthTitle(selectedMonth) : 'this Month'}</span>
                        </Button>
                        <a
                          href="#/modules/orders"
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.hash = '/modules/orders';
                          }}
                          className="text-xs text-[#c5a880] hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>Open Orders CRM Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr 
                    key={row.id || row.invoiceNo} 
                    className="hover:bg-[#1a1a1a] transition-colors group"
                  >
                    {/* 1. Invoice No. */}
                    <td className="py-3 px-4 font-mono font-medium text-white whitespace-nowrap border-r border-[#262626]">
                      {row.invoiceNo}
                    </td>

                    {/* 2. Date */}
                    <td className="py-3 px-4 text-[#cccccc] whitespace-nowrap border-r border-[#262626]">
                      {row.date}
                    </td>

                    {/* 3. Party */}
                    <td className="py-3 px-4 text-white font-medium border-r border-[#262626]">
                      <div>{row.party}</div>
                      {row.partyGstin && (
                        <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                          GSTIN: {row.partyGstin}
                        </div>
                      )}
                    </td>

                    {/* 4. Taxable Value */}
                    <td className="py-3 px-4 text-right font-mono font-medium text-white border-r border-[#262626]">
                      {formatINR(row.taxableValue)}
                    </td>

                    {/* 5. CGST */}
                    <td className="py-3 px-4 text-right font-mono text-[#cccccc] border-r border-[#262626]">
                      {formatINR(row.cgst)}
                    </td>

                    {/* 6. SGST */}
                    <td className="py-3 px-4 text-right font-mono text-[#cccccc] border-r border-[#262626]">
                      {formatINR(row.sgst)}
                    </td>

                    {/* 7. Chocolate Quantity */}
                    <td className="py-3 px-4 text-[#dddddd] font-medium">
                      {row.chocolateQuantity || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Total Row matching the bottom of the screenshot */}
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="bg-[#1c1c1c] text-white font-bold border-t-2 border-[#333333] text-xs">
                  <td className="py-3.5 px-4 border-r border-[#2a2a2a] uppercase tracking-wider">
                    Total
                  </td>
                  <td className="py-3.5 px-4 border-r border-[#2a2a2a]"></td>
                  <td className="py-3.5 px-4 border-r border-[#2a2a2a] text-[#888888] font-normal">
                    {totals.count} Orders
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
                    {totals.count} Orders Logged
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* 5. Modal: Add Order Record Directly to Sheets Orders_Log */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#2e2e2e] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Add Order to Orders_Log &amp; GST Register</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#888888] hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOrderToSheet} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] font-medium mb-1">Invoice / Reference No. *</label>
                  <input
                    type="text"
                    required
                    value={newOrder.invoiceNo}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, invoiceNo: e.target.value }))}
                    placeholder="Invoice-1172-GUD-2026-Client"
                    className="w-full bg-[#111111] border border-[#333333] rounded-lg p-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#aaaaaa] font-medium mb-1">Order Date *</label>
                  <input
                    type="date"
                    required
                    value={newOrder.date}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-[#111111] border border-[#333333] rounded-lg p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#aaaaaa] font-medium mb-1">Party / Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newOrder.customerName}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="e.g. TAJ Malabar, Cafe Coffee Day, Nishant"
                  className="w-full bg-[#111111] border border-[#333333] rounded-lg p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] font-medium mb-1">Chocolate Items Description *</label>
                  <input
                    type="text"
                    required
                    value={newOrder.items}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, items: e.target.value }))}
                    placeholder="e.g. 6 bars (Orange, Almond), 2 Boxes"
                    className="w-full bg-[#111111] border border-[#333333] rounded-lg p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#aaaaaa] font-medium mb-1">Quantity (Units) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newOrder.qty}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, qty: e.target.value }))}
                    className="w-full bg-[#111111] border border-[#333333] rounded-lg p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-[#111111] p-3 rounded-xl border border-[#262626]">
                <div>
                  <label className="block text-[#aaaaaa] font-medium mb-1">Taxable Value (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newOrder.taxableValue}
                    onChange={(e) => handleTaxableChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#191919] border border-[#333333] rounded-lg p-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#aaaaaa] font-medium mb-1">CGST (2.5%)</label>
                  <input
                    type="text"
                    readOnly
                    value={newOrder.cgst}
                    className="w-full bg-[#191919] border border-[#333333] rounded-lg p-2 text-emerald-400 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#aaaaaa] font-medium mb-1">SGST (2.5%)</label>
                  <input
                    type="text"
                    readOnly
                    value={newOrder.sgst}
                    className="w-full bg-[#191919] border border-[#333333] rounded-lg p-2 text-emerald-400 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#888888] pt-1">
                <span>
                  Total Payable with 5% GST: <strong className="text-white">₹{((parseFloat(newOrder.taxableValue) || 0) * 1.05).toFixed(2)}</strong>
                </span>
                <span>Destination: <strong>Google Sheets Orders_Log</strong></span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#282828]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="border-[#333333] text-[#aaaaaa] hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {isSaving ? 'Appending to Sheet...' : 'Save & Append to Sheet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
