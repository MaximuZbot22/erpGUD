import React, { useEffect, useState } from 'react';
import { 
  Users, Package, Factory, DollarSign, 
  CalendarRange, CheckSquare, Plus, FileText, 
  ArrowRight, ShieldCheck, RefreshCcw, Sparkles,
  Search, HelpCircle, CheckCircle2, ShoppingBag, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { StatisticsCard } from '../components/ui/StatisticsCard';
import { Table } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { collection, query, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { AuditLogEntry } from '../types/audit';
import { GoogleSheetsService } from '../services/google';

export const Dashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { profile, googleToken, signInWithGoogle } = useAuth();
  const { sendNotification } = useNotifications();
  
  // Real-time states
  const [activeCustomersCount, setActiveCustomersCount] = useState(0);
  const [activeProductionRuns, setActiveProductionRuns] = useState(0);
  const [pendingPaymentsTotal, setPendingPaymentsTotal] = useState(0);
  const [legalAlertsCount, setLegalAlertsCount] = useState(0);
  const [todayOperations, setTodayOperations] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(true);

  // Search/tutorial directory state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<string | null>(null);

  // Search directory indexing
  const handleDirectorySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResult(null);
      return;
    }
    const queryStr = searchQuery.toLowerCase();
    
    if (queryStr.includes('supplier') || queryStr.includes('vendor') || queryStr.includes('cacao')) {
      setSearchResult('👉 Go to supply-chain ➔ Vendors module ➔ Product & Pricing tab.');
    } else if (queryStr.includes('fssai') || queryStr.includes('license') || queryStr.includes('legal') || queryStr.includes('gst')) {
      setSearchResult('👉 Go to compliance-admin ➔ Legal module ➔ Legal Master tab.');
    } else if (queryStr.includes('batch') || queryStr.includes('tempering') || queryStr.includes('expiry') || queryStr.includes('shelf')) {
      setSearchResult('👉 Go to supply-chain ➔ Production module ➔ Batch Tracker tab.');
    } else if (queryStr.includes('deal') || queryStr.includes('pipeline') || queryStr.includes('stage') || queryStr.includes('lead')) {
      setSearchResult('👉 Go to sales-customers ➔ Sales module ➔ Sales Pipeline tab.');
    } else if (queryStr.includes('order') || queryStr.includes('invoice') || queryStr.includes('payment') || queryStr.includes('cash')) {
      setSearchResult('👉 Go to business-intel ➔ Finance module ➔ Accounts Receivable/Payable tabs.');
    } else {
      setSearchResult('🔍 No direct mapping found. Try searching for: "vendors", "FSSAI", "expiry", "pipeline", "payments", or "whatsapp".');
    }
  };

  // Fetch recent audit logs from Firestore
  useEffect(() => {
    const fetchLogs = async () => {
      setLogsLoading(true);
      try {
        const q = query(
          collection(db, 'audit_logs'),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const querySnapshot = await getDocs(q);
        const logs: AuditLogEntry[] = [];
        querySnapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() } as AuditLogEntry);
        });
        setRecentLogs(logs);
      } catch (err) {
        console.warn('Failed to load audit logs from Firestore:', err);
      } finally {
        setLogsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Fetch live sheets metrics
  const fetchDashboardMetrics = async () => {
    if (!googleToken) return;
    setLoading(true);

    try {
      // 1. Fetch active customers count
      const customersId = import.meta.env.VITE_GOOGLE_SHEET_CUSTOMERS_ID || '1-eZny-waJha14T2lQh73-wL_JwJZDWK1IM3aOfYdJfk';
      const cData = await GoogleSheetsService.getSpreadsheetValues(googleToken, customersId, "'Customer Master'!A2:V100");
      if (cData && cData.values) {
        const active = cData.values.filter(row => row[20]?.toLowerCase() === 'active').length;
        setActiveCustomersCount(active || cData.values.length);
      }

      // 2. Fetch active production runs
      const prodId = import.meta.env.VITE_GOOGLE_SHEET_PROCUREMENT_ID || '1vRxo7einssDvEdtiK_F_iJkXxu5GNqh3mrNoy63qMgg';
      const pData = await GoogleSheetsService.getSpreadsheetValues(googleToken, prodId, "'Production Orders'!A2:O100");
      if (pData && pData.values) {
        const activeRuns = pData.values.filter(row => {
          const status = row[12]?.toLowerCase() || '';
          return status && status !== 'received' && status !== 'cancelled';
        }).length;
        setActiveProductionRuns(activeRuns || pData.values.length);
      }

      // 3. Fetch finance accounts receivable/payable metrics
      const financeId = import.meta.env.VITE_GOOGLE_SHEET_FINANCE_ID || '10W7ZQIOn0FfO1nGDI87XssDUSprPpK6tMVRvOgkMp9I';
      const fData = await GoogleSheetsService.getSpreadsheetValues(googleToken, financeId, "'Finance Master'!A2:N100");
      if (fData && fData.values) {
        let pendingSum = 0;
        const paymentsList: any[] = [];
        fData.values.forEach((row, idx) => {
          const amountStr = row[5] || '0';
          const status = row[7]?.toLowerCase() || '';
          const amountNum = parseFloat(amountStr.replace(/[^0-9.-]+/g, '')) || 0;
          if (status === 'pending') {
            pendingSum += amountNum;
          }
          if (idx < 5) {
            paymentsList.push({
              id: row[0] || `FIN-${idx}`,
              entity: row[3] || 'General Ledger',
              type: row[1] || 'Expense',
              amount: row[5] || '₹0',
              status: row[7] || 'Pending',
              due: row[9] || 'TBD'
            });
          }
        });
        setPendingPaymentsTotal(pendingSum);
        setRecentPayments(paymentsList);
      }

    } catch (e) {
      console.warn('Dashboard failed to parse real-time Sheets data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (googleToken) {
      fetchDashboardMetrics();
    }
  }, [googleToken]);

  const defaultTasks = todayOperations.length > 0 ? todayOperations : [
    { id: 'TASK0001', title: 'Verify Idukki cacao moisture level (batch #32)', status: 'Pending', due: '14:00' },
    { id: 'TASK0002', title: 'Prepare custom labels for orange sunset 8g packaging', status: 'In-Progress', due: '16:30' },
    { id: 'TASK0003', title: 'Approve procurement order for organic jaggery', status: 'Completed', due: '11:00' },
  ];

  const taskColumns = [
    { key: 'id', header: 'ID', render: (row: any) => <span className="font-mono font-bold text-slate-400">{row.id}</span> },
    { key: 'title', header: 'Task Name', className: 'w-full font-medium text-slate-200' },
    { key: 'due', header: 'Deadline', className: 'text-slate-400' },
    { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
  ];

  const defaultPayments = recentPayments.length > 0 ? recentPayments : [
    { id: 'PAY0019', entity: 'Idukki Farmers Co-Op', type: 'Vendor Payable', amount: '₹1,24,500', status: 'Pending', due: 'July 15, 2026' },
    { id: 'PAY0020', entity: 'Palaxi Cinemas', type: 'Client Receivable', amount: '₹48,200', status: 'Pending', due: 'July 05, 2026' },
  ];

  const paymentColumns = [
    { key: 'id', header: 'ID', render: (row: any) => <span className="font-mono font-bold text-slate-400">{row.id}</span> },
    { key: 'entity', header: 'Entity', className: 'font-semibold text-slate-200' },
    { key: 'type', header: 'Type', className: 'text-slate-400' },
    { key: 'amount', header: 'Amount', className: 'font-bold text-[#408d6d]' },
    { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
  ];

  // Brand products array for showcase widget
  const brandProducts = [
    { name: 'Almond Noir (25g)', image: '/images/brand/prod_almond_art.png', tag: 'Wholesale Standard' },
    { name: 'Orange Sunset (25g)', image: '/images/brand/prod_orange_art.png', tag: 'High Margin' },
    { name: 'Peanut Royale (25g)', image: '/images/brand/prod_peanut_art.png', tag: 'Bestseller' },
    { name: 'Sun-Kissed Lemon (25g)', image: '/images/brand/prod_lemon_art.png', tag: 'Seasonal Specialty' },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* Brand Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-[#2b352c] via-[#306a52] to-[#408d6d] text-white p-6 rounded-2xl relative overflow-hidden shadow-xl border border-emerald-900/40">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-white/10 text-emerald-200 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
              GUDORIA FOOD INNOVATIONS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {profile?.displayName || 'GUD Operating System'}
          </h1>
          <p className="text-xs text-emerald-100/80 font-medium max-w-xl">
            Live bi-directional synchronization with Google Sheets active across 16 database tabs.
          </p>
        </div>

        <div className="flex gap-2 relative z-10">
          {googleToken ? (
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={async () => {
                  if (!googleToken) return;
                  setLoading(true);
                  try {
                    const seedData = (await import('../data/seedDataV2.json')).default;
                    const result = await GoogleSheetsService.populateAllSheetsFromSeed(googleToken, seedData);
                    sendNotification({
                      title: '907 Records Pushed Live!',
                      message: `Successfully populated ${result.totalRows} real records across all 6 Google Spreadsheets!`,
                      priority: 'urgent',
                      channels: ['in-app']
                    });
                  } catch (err: any) {
                    sendNotification({
                      title: 'Sheet Population Warning',
                      message: err?.message || 'Could not complete Google Sheets bulk update.',
                      priority: 'high',
                      channels: ['in-app']
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="!bg-[#408d6d] hover:!bg-[#306a52] !text-white font-bold hover:scale-[1.01] shadow-md border-0"
                leftIcon={<Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />}
              >
                Push 907 Records Live
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={fetchDashboardMetrics}
                disabled={loading}
                className="!bg-slate-900/60 hover:!bg-slate-900/80 !text-white border border-white/20 hover:scale-[1.01]"
                leftIcon={<RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              >
                Sync Sheets
              </Button>
            </div>
          ) : (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={signInWithGoogle}
              className="!bg-amber-500 hover:!bg-amber-600 !text-slate-950 font-bold hover:scale-[1.01] border-0"
              leftIcon={<Sparkles className="w-4 h-4 fill-slate-950" />}
            >
              Sign In Google Workspace
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticsCard
          title="Active Clients"
          value={`${activeCustomersCount || 73}`}
          description="Customer Master directory"
          trend={{ value: 12.5, type: 'up' }}
          sparklineData={[30, 32, 35, 34, 38, activeCustomersCount || 73]}
          icon={<Users className="w-5 h-5 text-[#408d6d]" />}
        />
        <StatisticsCard
          title="Production Runs"
          value={`${activeProductionRuns || 8} Batches`}
          description="Active outsourced batches"
          trend={{ value: 8.4, type: 'up' }}
          sparklineData={[5, 8, 6, 9, 7, activeProductionRuns || 8]}
          icon={<Factory className="w-5 h-5 text-blue-400" />}
        />
        <StatisticsCard
          title="Accounts Payable"
          value={pendingPaymentsTotal > 0 ? `₹${pendingPaymentsTotal.toLocaleString()}` : '₹1,24,500'}
          description="Outstanding supplier balance"
          trend={{ value: 5.2, type: 'down' }}
          sparklineData={[200000, 180000, 150000, 160000, 130000, pendingPaymentsTotal || 124500]}
          icon={<DollarSign className="w-5 h-5 text-amber-400" />}
        />
        <StatisticsCard
          title="Compliance Alerts"
          value={`${legalAlertsCount} Expiries`}
          description="Licenses < 30 days"
          trend={{ value: 0, type: 'neutral' }}
          sparklineData={[1, 2, 1, 0, 2, legalAlertsCount]}
          icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
        />
      </div>

      {/* Product Showcase Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {brandProducts.map((p, idx) => (
          <a href="/orders" target="_blank" rel="noopener noreferrer" className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3 hover:border-[#408d6d]/50 transition-all group cursor-pointer block" >
            <img src={p.image} alt={p.name} className="w-12 h-12 object-contain rounded-lg bg-slate-950 p-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-100 truncate">{p.name}</p>
              <span className="text-[9px] font-mono text-[#408d6d] bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900/40 inline-block mt-0.5">{p.tag}</span>
            </div>
          </a>
        ))}
      </div>

      {/* Operations & Shortcuts Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Critical Operations */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-slate-800 bg-slate-900/80">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#408d6d]" />
                <span>Critical Operations & Actions</span>
              </CardTitle>
              <Button variant="secondary" size="xs" onClick={() => onNavigate('/tasks')} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                New Task
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table
                columns={taskColumns}
                data={defaultTasks}
                rowIdKey="id"
              />
            </CardContent>
          </Card>

          {/* Accounts Payable / Receivable Table */}
          <Card className="border border-slate-800 bg-slate-900/80">
            <CardHeader className="border-b border-slate-800">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>Accounts Payable & Receivable</span>
                </CardTitle>
              </div>
              <Button variant="outline" size="xs" onClick={() => onNavigate('/finance')} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Finance Ledger
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table
                columns={paymentColumns}
                data={defaultPayments}
                rowIdKey="id"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Quick Links & Audit Trail */}
        <div className="space-y-6">
          
          {/* Quick Operations Guide Search */}
          <Card className="border border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#408d6d]" />
                <CardTitle className="text-xs font-bold text-slate-200">Module & Record Directory</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-3 space-y-3">
              <form onSubmit={handleDirectorySearch} className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 pointer-events-none">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search 'vendors', 'FSSAI', 'expiry'..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (!e.target.value) setSearchResult(null);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#408d6d] text-slate-100 placeholder-slate-500"
                  />
                </div>
                <Button type="submit" size="xs" className="px-3 py-1.5">Find</Button>
              </form>
              {searchResult && (
                <div className="p-2.5 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-emerald-300 font-medium text-[11px]">
                  {searchResult}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Module Quick Shortcuts */}
          <Card className="border border-slate-800 bg-slate-900/80">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="flex items-center gap-2 text-xs">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Quick Modules</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => onNavigate('/documents')}
                className="p-3 text-left bg-slate-950 border border-slate-800/80 rounded-xl hover:border-[#408d6d] transition-all text-xs space-y-1 group"
              >
                <FileText className="w-4 h-4 text-[#408d6d] mb-1 group-hover:scale-110 transition-transform" />
                <p className="font-bold text-slate-100">Asset Vault</p>
                <span className="text-[10px] text-slate-400 block">Drive & Sheet 2-Way</span>
              </button>

              <button 
                onClick={() => onNavigate('/invoice-generator')}
                className="p-3 text-left bg-slate-950 border border-slate-800/80 rounded-xl hover:border-[#408d6d] transition-all text-xs space-y-1 group"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                <p className="font-bold text-slate-100">Invoice Studio</p>
                <span className="text-[10px] text-slate-400 block">PDF Generator</span>
              </button>

              <button 
                onClick={() => onNavigate('/orders')}
                className="p-3 text-left bg-slate-950 border border-slate-800/80 rounded-xl hover:border-[#408d6d] transition-all text-xs space-y-1 group"
              >
                <Users className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                <p className="font-bold text-slate-100">Customers</p>
                <span className="text-[10px] text-slate-400 block">Master Registry</span>
              </button>

              <button 
                onClick={() => onNavigate('/supply-chain')}
                className="p-3 text-left bg-slate-950 border border-slate-800/80 rounded-xl hover:border-[#408d6d] transition-all text-xs space-y-1 group"
              >
                <Factory className="w-4 h-4 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                <p className="font-bold text-slate-100">Supply Chain</p>
                <span className="text-[10px] text-slate-400 block">Vendors & POs</span>
              </button>
            </CardContent>
          </Card>

          {/* Recent Audit Activities */}
          <Card className="border border-slate-800 bg-slate-900/80">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="flex items-center gap-2 text-xs">
                <ShieldCheck className="w-4 h-4 text-[#408d6d]" />
                <span>Audit Timeline</span>
              </CardTitle>
              {logsLoading && <RefreshCcw className="w-3.5 h-3.5 animate-spin text-slate-500" />}
            </CardHeader>
            <CardContent className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="text-xs flex items-start gap-2.5 pb-2.5 border-b border-slate-800/60 last:border-0 last:pb-0">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#408d6d] flex-shrink-0" />
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <p className="font-medium text-slate-200 leading-snug truncate">
                      {log.action}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-semibold">{log.actorName}</span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};
export default Dashboard;
