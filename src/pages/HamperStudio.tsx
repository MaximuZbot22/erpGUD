import React, { useState, useEffect } from 'react';
import { Gift, Plus, Trash2, CheckCircle2, FileSpreadsheet, RefreshCw, CheckSquare, Square, FileText, Truck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { StorageEngine } from '../services/storageEngine';
import { auditLogService } from '../services/audit';
import { HamperCatalogService, HamperCatalogItem } from '../services/hamperCatalog';
import { HamperProposalDocument } from '../components/documents/HamperProposalDocument';
import { HamperDeliveryNoteDocument } from '../components/documents/HamperDeliveryNoteDocument';

export interface TajHamperLineItem {
  id: string;
  category: 'Tins' | 'Chocolates' | 'Souvenir' | 'Packaging' | 'Chocolate Box' | 'Other';
  description: string;
  qty: number;
  ourUnitCost: number;
  clientUnitCost: number;
  gstRate: 5 | 18;
}

export interface TajProjectExpense {
  id: string;
  description: string;
  amount: number;
  category?: 'Travel' | 'Courier' | 'Porter' | 'Printing' | 'Packaging' | 'Other';
  billableToClient?: boolean; // If true, added to client quote. If false, internal operational expense absorbed by us.
}

export interface TajHamperProject {
  id: string;
  projectName: string;
  clientName: string;
  date: string;
  lineItems: TajHamperLineItem[];
  otherExpenses: TajProjectExpense[];
  status: 'Planning' | 'Quoted' | 'Approved' | 'In Assembly' | 'Delivered';
  notes?: string;
}

const STORAGE_KEY = 'gud_taj_hamper_projects_v2';

export const HamperStudio: React.FC = () => {
  const [projects, setProjects] = useState<TajHamperProject[]>(() => {
    return StorageEngine.getLocal<TajHamperProject[]>(STORAGE_KEY, []);
  });

  const [masterCatalog, setMasterCatalog] = useState<HamperCatalogItem[]>(() => {
    return HamperCatalogService.getCatalog();
  });

  const [activeProject, setActiveProject] = useState<TajHamperProject | null>(null);
  const [viewMode, setViewMode] = useState<'workstation' | 'proposal' | 'delivery'>('workstation');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatalogPickerOpen, setIsCatalogPickerOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [savingNewItem, setSavingNewItem] = useState(false);

  // New Project Form State
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');

  // Expense Form State
  const [newExpense, setNewExpense] = useState<{
    description: string;
    amount: number;
    category: 'Travel' | 'Courier' | 'Porter' | 'Printing' | 'Packaging' | 'Other';
    billableToClient: boolean;
  }>({
    description: '',
    amount: 0,
    category: 'Travel',
    billableToClient: false // Default to our end expense (absorbed)
  });

  // New Catalog Item Form State
  const [newItemForm, setNewItemForm] = useState<{
    category: 'Tins' | 'Chocolates' | 'Souvenir' | 'Packaging' | 'Chocolate Box' | 'Other';
    description: string;
    ourUnitCost: number;
    clientUnitCost: number;
    defaultQty: number;
    gstRate: 5 | 18;
    shelfLife: string;
    inStockQty: number;
  }>({
    category: 'Packaging',
    description: '',
    ourUnitCost: 50,
    clientUnitCost: 100,
    defaultQty: 1,
    gstRate: 18,
    shelfLife: 'N/A (Non-perishable)',
    inStockQty: 25
  });

  // Sync Live Sheet Catalog
  const handleSyncLiveCatalog = async () => {
    setLoadingSync(true);
    try {
      const updated = await HamperCatalogService.syncWithGoogleSheet();
      setMasterCatalog(updated);
      alert(`Master Hamper Catalog synced live! Total ${updated.length} items available.`);
    } catch (e) {
      console.warn('Sync catalog error:', e);
    } finally {
      setLoadingSync(false);
    }
  };

  // Add New Item and reflect back into Google Sheets
  const handleAddNewCatalogItem = async () => {
    if (!newItemForm.description.trim()) {
      alert('Please enter an Item Description.');
      return;
    }
    if (newItemForm.ourUnitCost <= 0) {
      alert('Please enter a valid Our Unit Cost.');
      return;
    }

    setSavingNewItem(true);
    try {
      const token = sessionStorage.getItem('gud_google_access_token');
      const itemToSave: HamperCatalogItem = {
        id: `CAT-${Date.now().toString().slice(-4)}`,
        category: newItemForm.category,
        description: newItemForm.description.trim(),
        ourUnitCost: Number(newItemForm.ourUnitCost),
        clientUnitCost: Number(newItemForm.clientUnitCost || newItemForm.ourUnitCost * 2),
        defaultQty: Number(newItemForm.defaultQty || 1),
        gstRate: newItemForm.gstRate,
        shelfLife: newItemForm.shelfLife,
        inStockQty: Number(newItemForm.inStockQty || 0)
      };

      const result = await HamperCatalogService.addNewItemWithSheetSync(itemToSave, token);
      setMasterCatalog(result.items);

      // If there is an active project, auto-include this new item
      if (activeProject) {
        const newLine: TajHamperLineItem = {
          id: `LINE-${Date.now()}-${itemToSave.id}`,
          category: itemToSave.category,
          description: itemToSave.description,
          qty: itemToSave.defaultQty,
          ourUnitCost: itemToSave.ourUnitCost,
          clientUnitCost: itemToSave.clientUnitCost || itemToSave.ourUnitCost * 2,
          gstRate: itemToSave.gstRate
        };
        const updatedProj = { ...activeProject, lineItems: [...activeProject.lineItems, newLine] };
        updateProjectState(updatedProj);
      }

      setIsNewItemModalOpen(false);
      setNewItemForm({
        category: 'Packaging',
        description: '',
        ourUnitCost: 50,
        clientUnitCost: 100,
        defaultQty: 1,
        gstRate: 18,
        shelfLife: 'N/A (Non-perishable)',
        inStockQty: 25
      });

      if (result.syncedToGoogle) {
        alert(`✓ Added "${itemToSave.description}" to Master Catalog and appended to Google Sheet ('items' tab)!`);
      } else {
        alert(`✓ Added "${itemToSave.description}" to Master Catalog locally! (Connect Google Workspace to auto-sync to Sheets)`);
      }
    } catch (err: any) {
      console.error('Error adding new catalog item:', err);
      alert('Failed to add item: ' + (err.message || err));
    } finally {
      setSavingNewItem(false);
    }
  };

  const handleCreateProject = () => {
    if (!projectName.trim() || !clientName.trim()) {
      alert('Please enter Project Name and Client Name.');
      return;
    }

    const proj: TajHamperProject = {
      id: `HMP-${Date.now().toString().slice(-4)}`,
      projectName,
      clientName,
      date: new Date().toISOString().split('T')[0],
      lineItems: [],
      otherExpenses: [],
      status: 'Planning'
    };

    const updated = [proj, ...projects];
    setProjects(updated);
    StorageEngine.setLocal(STORAGE_KEY, updated);
    setActiveProject(proj);
    setProjectName('');
    setClientName('');
    setIsModalOpen(false);
  };

  // Toggle item via Checkbox Catalog Picker
  const handleToggleCatalogItem = (catItem: HamperCatalogItem, checked: boolean) => {
    if (!activeProject) return;

    if (checked) {
      // Add item to active project
      const line: TajHamperLineItem = {
        id: `LINE-${Date.now()}-${catItem.id}`,
        category: catItem.category,
        description: catItem.description,
        qty: catItem.defaultQty || 1,
        ourUnitCost: catItem.ourUnitCost,
        clientUnitCost: catItem.clientUnitCost || Math.round(catItem.ourUnitCost * 2), // Default 2x markup quote
        gstRate: catItem.gstRate
      };
      const updatedProj = { ...activeProject, lineItems: [...activeProject.lineItems, line] };
      updateProjectState(updatedProj);
    } else {
      // Remove item from active project
      const updatedProj = { ...activeProject, lineItems: activeProject.lineItems.filter(l => l.description.toLowerCase() !== catItem.description.toLowerCase()) };
      updateProjectState(updatedProj);
    }
  };

  const handleUpdateItemProperty = (description: string, field: 'qty' | 'clientUnitCost' | 'gstRate', val: number) => {
    if (!activeProject) return;
    const updatedItems = activeProject.lineItems.map(l => {
      if (l.description.toLowerCase() === description.toLowerCase()) {
        return { ...l, [field]: val };
      }
      return l;
    });
    updateProjectState({ ...activeProject, lineItems: updatedItems });
  };

  const handleRemoveLineItem = (lineId: string) => {
    if (!activeProject) return;
    updateProjectState({ ...activeProject, lineItems: activeProject.lineItems.filter(l => l.id !== lineId) });
  };

  const handleAddExpense = (preset?: { desc: string; amount: number; category: any; billable: boolean }) => {
    if (!activeProject) return;
    
    const desc = preset ? preset.desc : newExpense.description.trim();
    const amt = preset ? preset.amount : newExpense.amount;
    const cat = preset ? preset.category : newExpense.category;
    const billable = preset ? preset.billable : newExpense.billableToClient;

    if (!desc || amt <= 0) return;

    const exp: TajProjectExpense = {
      id: `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      description: desc,
      amount: amt,
      category: cat,
      billableToClient: billable
    };

    updateProjectState({ ...activeProject, otherExpenses: [...activeProject.otherExpenses, exp] });
    setNewExpense({ description: '', amount: 0, category: 'Travel', billableToClient: false });
  };

  const handleToggleExpenseBillable = (expId: string) => {
    if (!activeProject) return;
    const updatedExpenses = activeProject.otherExpenses.map(e => {
      if (e.id === expId) {
        return { ...e, billableToClient: !e.billableToClient };
      }
      return e;
    });
    updateProjectState({ ...activeProject, otherExpenses: updatedExpenses });
  };

  const handleRemoveExpense = (expId: string) => {
    if (!activeProject) return;
    updateProjectState({ ...activeProject, otherExpenses: activeProject.otherExpenses.filter(e => e.id !== expId) });
  };

  const updateProjectState = (updatedProj: TajHamperProject) => {
    setActiveProject(updatedProj);
    const updatedList = projects.map(p => p.id === updatedProj.id ? updatedProj : p);
    setProjects(updatedList);
    StorageEngine.setLocal(STORAGE_KEY, updatedList);
  };

  // Helper Calculations for active project
  const calculateProjectMath = (proj: TajHamperProject) => {
    let ourTotalCost = 0;
    let clientTotalCost = 0;
    let ourFinalCost = 0;
    let clientFinalCost = 0;

    proj.lineItems.forEach(item => {
      const ourCost = item.qty * item.ourUnitCost;
      const clientCost = item.qty * item.clientUnitCost;
      const ourGst = (ourCost * item.gstRate) / 100;
      const clientGst = (clientCost * item.gstRate) / 100;

      ourTotalCost += ourCost;
      clientTotalCost += clientCost;
      ourFinalCost += (ourCost + ourGst);
      clientFinalCost += (clientCost + clientGst);
    });

    // Expenses: Billable to client vs Absorbed internally
    const billableExpenses = proj.otherExpenses
      .filter(e => e.billableToClient !== false)
      .reduce((acc, e) => acc + e.amount, 0);

    const internalExpenses = proj.otherExpenses
      .filter(e => e.billableToClient === false)
      .reduce((acc, e) => acc + e.amount, 0);

    const totalExpenses = billableExpenses + internalExpenses;

    // Total Client Quoted Value includes items + billable logistics/freight
    const totalClientQuote = clientFinalCost + billableExpenses;

    // Total Outflow / Out-of-pocket from our end = Our BOM Goods Cost + All internal & incurred expenses
    // If an expense is billed to client, client pays us, but we also paid for it.
    // If it's absorbed, client doesn't pay, we pay for it out of margin.
    // Therefore: Net Profit = Total Revenue (Client Quote) - Our BOM Cost - Total Expenses Paid by Us
    const netProfit = totalClientQuote - ourFinalCost - totalExpenses;
    const grossMarginPercent = totalClientQuote > 0 ? Math.round((netProfit / totalClientQuote) * 10000) / 100 : 0;

    return {
      ourTotalCost,
      clientTotalCost,
      ourFinalCost: Math.round(ourFinalCost * 100) / 100,
      clientFinalCost: Math.round(clientFinalCost * 100) / 100,
      billableExpenses,
      internalExpenses,
      totalExpenses,
      totalClientQuote: Math.round(totalClientQuote * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      grossMarginPercent
    };
  };

  // Group master catalog by Category
  const catalogByCategory = masterCatalog.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, HamperCatalogItem[]>);

  // Render Document Views if active
  if (viewMode === 'proposal' && activeProject) {
    return <HamperProposalDocument project={activeProject} onBack={() => setViewMode('workstation')} />;
  }

  if (viewMode === 'delivery' && activeProject) {
    return <HamperDeliveryNoteDocument project={activeProject} onBack={() => setViewMode('workstation')} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Gift className="w-7 h-7 text-purple-500" /> Corporate Hamper Studio & Master Catalog
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Pick & choose items via Checkbox Catalog Picker, calculate costs live, and export Customer Proposals & Delivery Notes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsNewItemModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> + Add New Item to Catalog
          </Button>
          <Button onClick={handleSyncLiveCatalog} disabled={loadingSync} variant="outline" className="text-slate-300 border-slate-700 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingSync ? 'animate-spin' : ''}`} /> Sync Sheet Catalog
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs">
            <Plus className="w-4 h-4 mr-1" /> + New Hamper Project
          </Button>
        </div>
      </div>

      {/* Projects List / Empty State */}
      {projects.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800 p-8 text-center text-slate-400">
          <Gift className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-slate-300">No Hamper Projects Created</p>
          <p className="text-xs text-slate-500 mt-1">Click below to create a new corporate hamper project and check off items from your master catalog.</p>
          <div className="flex justify-center gap-3 mt-4">
            <Button onClick={() => setIsNewItemModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
              <Plus className="w-4 h-4 mr-1" /> + Add New Master Item
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white text-xs">
              <Plus className="w-4 h-4 mr-1" /> + New Hamper Project
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects Directory Sidebar */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hamper Projects</h3>
            {projects.map(p => {
              const math = calculateProjectMath(p);
              return (
                <div 
                  key={p.id}
                  onClick={() => setActiveProject(p)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    activeProject?.id === p.id 
                      ? 'bg-purple-950/40 border-purple-600 text-slate-100' 
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm">{p.projectName}</span>
                    <span className="text-[10px] font-mono bg-slate-800 text-purple-400 px-2 py-0.5 rounded">{p.id}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Client: {p.clientName}</div>
                  <div className="flex justify-between items-center mt-2 border-t border-slate-800/80 pt-2 font-mono text-xs">
                    <span>Net Profit:</span>
                    <span className="text-emerald-400 font-bold">₹{math.netProfit.toLocaleString('en-IN')} ({math.grossMarginPercent}%)</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Project Workstation */}
          {activeProject && (
            <div className="lg:col-span-2 space-y-6">
              {/* Document Action Buttons */}
              <div className="flex flex-wrap gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setIsCatalogPickerOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs">
                    <CheckSquare className="w-4 h-4 mr-1" /> Pick Items via Catalog
                  </Button>
                  <Button onClick={() => setIsNewItemModalOpen(true)} variant="outline" className="text-emerald-400 border-emerald-700 hover:bg-emerald-950/50 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add New Item to Catalog
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setViewMode('proposal')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs">
                    <FileText className="w-4 h-4 mr-1" /> Proposal (PO)
                  </Button>
                  <Button onClick={() => setViewMode('delivery')} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs">
                    <Truck className="w-4 h-4 mr-1" /> Delivery Note
                  </Button>
                </div>
              </div>

              {/* Financial Rollup Summary */}
              {(() => {
                const math = calculateProjectMath(activeProject);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                      <div className="text-slate-500 text-[10px]">OUR BOM GOODS COST</div>
                      <div className="text-slate-100 text-base font-bold mt-1">₹{math.ourFinalCost.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Incl. GST</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                      <div className="text-slate-500 text-[10px]">TOTAL CLIENT QUOTE</div>
                      <div className="text-purple-400 text-base font-bold mt-1">₹{math.totalClientQuote.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-purple-300 mt-0.5">Items + Billable Services</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                      <div className="text-slate-500 text-[10px]">OUR EXPENSES (TRAVEL, ETC)</div>
                      <div className="text-rose-400 text-base font-bold mt-1">₹{math.totalExpenses.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-rose-300 mt-0.5">₹{math.internalExpenses} absorbed / ₹{math.billableExpenses} billed</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                      <div className="text-slate-500 text-[10px]">TRUE NET PROFIT (MARGIN)</div>
                      <div className="text-emerald-400 text-base font-bold mt-1">₹{math.netProfit.toLocaleString('en-IN')} ({math.grossMarginPercent}%)</div>
                      <div className="text-[10px] text-emerald-400 mt-0.5">After all expenses</div>
                    </div>
                  </div>
                );
              })()}

              {/* Selected Items Table */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-100 flex items-center justify-between">
                    <span>Selected Hamper Items ({activeProject.lineItems.length})</span>
                    <span className="text-xs font-normal text-slate-400">Custom unit quote updates client final cost</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  {activeProject.lineItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">
                      No items checked. Click "Pick Items via Catalog" above to select components.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                            <th className="p-2">Cat</th>
                            <th className="p-2">Description</th>
                            <th className="p-2">Qty</th>
                            <th className="p-2">Our Cost</th>
                            <th className="p-2">Client Quote</th>
                            <th className="p-2">Our Final</th>
                            <th className="p-2">Client Final</th>
                            <th className="p-2 text-right">Remove</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {activeProject.lineItems.map(item => {
                            const ourCost = item.qty * item.ourUnitCost;
                            const clientCost = item.qty * item.clientUnitCost;
                            const ourFinal = ourCost + (ourCost * item.gstRate / 100);
                            const clientFinal = clientCost + (clientCost * item.gstRate / 100);
                            return (
                              <tr key={item.id}>
                                <td className="p-2 text-purple-400 font-bold">{item.category}</td>
                                <td className="p-2 font-sans font-semibold text-slate-200">{item.description}</td>
                                <td className="p-2">
                                  <input 
                                    type="number" 
                                    min="1" 
                                    value={item.qty}
                                    onChange={e => handleUpdateItemProperty(item.description, 'qty', Number(e.target.value))}
                                    className="w-16 bg-slate-950 border border-slate-800 rounded px-1 text-center text-slate-100 font-mono"
                                  />
                                </td>
                                <td className="p-2">₹{item.ourUnitCost}</td>
                                <td className="p-2">
                                  <input 
                                    type="number" 
                                    value={item.clientUnitCost}
                                    onChange={e => handleUpdateItemProperty(item.description, 'clientUnitCost', Number(e.target.value))}
                                    className="w-20 bg-slate-950 border border-slate-800 rounded px-1 text-purple-400 font-bold text-right"
                                  />
                                </td>
                                <td className="p-2 font-bold">₹{Math.round(ourFinal)}</td>
                                <td className="p-2 text-emerald-400 font-bold">₹{Math.round(clientFinal)}</td>
                                <td className="p-2 text-right">
                                  <button onClick={() => handleRemoveLineItem(item.id)} className="text-rose-400 hover:text-rose-300">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Operational Expenses (Travel, Courier, Porter, Printing) */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <CardTitle className="text-sm font-bold text-slate-100">
                      Project Expenses & Fulfillment Outflow (Travel, Courier, Porter)
                    </CardTitle>
                    <span className="text-[11px] text-amber-400 font-normal">
                      Expenses from our end directly reduce net profit margin
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Quick Presets:</span>
                    <button 
                      onClick={() => handleAddExpense({ desc: 'Travel & Local Delivery Logistics', amount: 300, category: 'Travel', billable: false })}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1"
                    >
                      🚗 Travel (₹300 - Our Expense)
                    </button>
                    <button 
                      onClick={() => handleAddExpense({ desc: 'Courier / Temperature Express Transit', amount: 450, category: 'Courier', billable: false })}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1"
                    >
                      📦 Courier Transit (₹450)
                    </button>
                    <button 
                      onClick={() => handleAddExpense({ desc: 'Porter Loading & Unloading', amount: 200, category: 'Porter', billable: false })}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1"
                    >
                      👷 Porter Charges (₹200)
                    </button>
                    <button 
                      onClick={() => handleAddExpense({ desc: 'Client Gift Card & Logo Stamping', amount: 350, category: 'Printing', billable: true })}
                      className="px-2 py-1 rounded bg-purple-950/60 hover:bg-purple-900 text-purple-300 border border-purple-700 text-[11px] flex items-center gap-1"
                    >
                      🏷️ Custom Print (₹350 - Bill to Client)
                    </button>
                  </div>

                  {/* Manual Expense Input Bar */}
                  <div className="flex flex-wrap sm:flex-nowrap gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 items-center">
                    <select
                      value={newExpense.category}
                      onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}
                      className="bg-slate-900 border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs"
                    >
                      <option value="Travel">🚗 Travel</option>
                      <option value="Courier">📦 Courier</option>
                      <option value="Porter">👷 Porter</option>
                      <option value="Printing">🏷️ Printing</option>
                      <option value="Packaging">🎁 Packaging</option>
                      <option value="Other">💼 Other</option>
                    </select>

                    <input 
                      type="text" 
                      placeholder="Expense Description (e.g. Travel to Taj Marine Drive)" 
                      value={newExpense.description}
                      onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                      className="flex-1 bg-slate-900 border border-slate-800 text-slate-100 rounded px-2.5 py-1 text-xs"
                    />

                    <div className="relative">
                      <span className="absolute left-2 top-1 text-slate-500 text-xs">₹</span>
                      <input 
                        type="number" 
                        placeholder="Amount" 
                        value={newExpense.amount || ''}
                        onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                        className="w-24 bg-slate-900 border border-slate-800 text-slate-100 rounded pl-5 pr-2 py-1 text-xs font-mono"
                      />
                    </div>

                    <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer whitespace-nowrap bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <input 
                        type="checkbox" 
                        checked={newExpense.billableToClient}
                        onChange={e => setNewExpense({ ...newExpense, billableToClient: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      Bill to Client
                    </label>

                    <Button size="sm" onClick={() => handleAddExpense()} className="bg-rose-600 hover:bg-rose-500 text-white text-xs whitespace-nowrap">
                      + Add Expense
                    </Button>
                  </div>

                  {/* Expenses List */}
                  {activeProject.otherExpenses.length === 0 ? (
                    <div className="text-center py-3 text-slate-500 border border-dashed border-slate-800 rounded">
                      No operational expenses recorded yet. Click a quick preset or add travel/courier above.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {activeProject.otherExpenses.map(e => (
                        <div key={e.id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold uppercase">
                              {e.category || 'Other'}
                            </span>
                            <span className="font-medium text-slate-200">{e.description}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleExpenseBillable(e.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                e.billableToClient 
                                  ? 'bg-purple-950/70 text-purple-300 border-purple-700' 
                                  : 'bg-amber-950/60 text-amber-300 border-amber-800'
                              }`}
                              title="Click to toggle between Absorbed by Us and Billed to Client"
                            >
                              {e.billableToClient ? '✓ Billed to Client' : '🛡️ Absorbed by Us (Reduces Profit)'}
                            </button>

                            <span className="font-mono font-bold text-rose-400">₹{e.amount.toLocaleString('en-IN')}</span>

                            <button onClick={() => handleRemoveExpense(e.id)} className="text-rose-400 hover:text-rose-300">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Checkbox Catalog Picker Modal */}
      <Modal isOpen={isCatalogPickerOpen} onClose={() => setIsCatalogPickerOpen(false)} title="Master Hamper Catalog Checkbox Picker">
        <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded border border-slate-800">
            <p className="text-slate-400">Check off items from your master catalog to include them in <strong className="text-purple-400">{activeProject?.projectName}</strong>.</p>
            <Button size="sm" onClick={() => { setIsCatalogPickerOpen(false); setIsNewItemModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] whitespace-nowrap ml-2">
              <Plus className="w-3.5 h-3.5 mr-1" /> + Create New Item
            </Button>
          </div>
          
          {Object.entries(catalogByCategory).map(([cat, items]) => (
            <div key={cat} className="space-y-2 border-t border-slate-800 pt-3">
              <h4 className="font-bold text-purple-400 uppercase text-[11px]">{cat} ({items.length})</h4>
              <div className="space-y-1.5">
                {items.map(item => {
                  const isChecked = activeProject?.lineItems.some(l => l.description.toLowerCase() === item.description.toLowerCase());
                  const activeLine = activeProject?.lineItems.find(l => l.description.toLowerCase() === item.description.toLowerCase());

                  return (
                    <div key={item.id} className={`flex items-center justify-between p-2.5 rounded border ${isChecked ? 'bg-purple-950/30 border-purple-800' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                        <input 
                          type="checkbox" 
                          checked={isChecked || false}
                          onChange={e => handleToggleCatalogItem(item, e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700"
                        />
                        <div>
                          <div className="font-semibold text-slate-100">{item.description}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Our Unit Cost: ₹{item.ourUnitCost} • GST: {item.gstRate}% {item.shelfLife ? `• ${item.shelfLife}` : ''}</div>
                        </div>
                      </label>

                      {isChecked && activeLine && (
                        <div className="flex items-center gap-2 font-mono" onClick={e => e.stopPropagation()}>
                          <div>
                            <span className="text-[9px] text-slate-500 block">Qty</span>
                            <input 
                              type="number" 
                              min="1" 
                              value={activeLine.qty}
                              onChange={e => handleUpdateItemProperty(item.description, 'qty', Number(e.target.value))}
                              className="w-14 bg-slate-900 border border-slate-700 text-center text-slate-100 text-xs rounded"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 block">Quote Price</span>
                            <input 
                              type="number" 
                              value={activeLine.clientUnitCost}
                              onChange={e => handleUpdateItemProperty(item.description, 'clientUnitCost', Number(e.target.value))}
                              className="w-16 bg-slate-900 border border-slate-700 text-right text-purple-400 font-bold text-xs rounded px-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <Button onClick={() => setIsCatalogPickerOpen(false)} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 mt-4">
            Done Selecting Items
          </Button>
        </div>
      </Modal>

      {/* Add New Master Item Modal (Appends to Google Sheet 'items' tab & local catalog) */}
      <Modal isOpen={isNewItemModalOpen} onClose={() => setIsNewItemModalOpen(false)} title="Add New Item to Master Hamper Catalog">
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-950 border border-emerald-900/60 rounded-lg text-emerald-400 text-[11px] leading-relaxed">
            ✨ This will add the item to your <strong>Master Catalog</strong> and automatically append a new row to the <strong>'items'</strong> tab in your Google Sheet (<span className="font-mono text-slate-300">hamper_cost_calculator.erp</span>).
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Item Category</label>
              <select
                value={newItemForm.category}
                onChange={e => {
                  const cat = e.target.value as any;
                  const defaultGst = (cat === 'Chocolates' || cat === 'Chocolate Box') ? 5 : 18;
                  const defaultShelf = (cat === 'Chocolates' || cat === 'Chocolate Box') ? '6 Months' : 'N/A (Non-perishable)';
                  setNewItemForm({ ...newItemForm, category: cat, gstRate: defaultGst, shelfLife: defaultShelf });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
              >
                <option value="Packaging">Packaging (Rigid Boxes, Bags, Shredded Paper)</option>
                <option value="Chocolates">Chocolates (Bars & Confections)</option>
                <option value="Chocolate Box">Chocolate Box (Assortments)</option>
                <option value="Tins">Tins (Banana Chips, Gourmet Snacks)</option>
                <option value="Souvenir">Souvenir (Kathakali, Houseboat, Kerala Artefacts)</option>
                <option value="Other">Other Custom Components</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">GST Rate (%)</label>
              <select
                value={newItemForm.gstRate}
                onChange={e => setNewItemForm({ ...newItemForm, gstRate: Number(e.target.value) as 5 | 18 })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono"
              >
                <option value={5}>5% GST (Confectionery / Food items)</option>
                <option value={18}>18% GST (Packaging, Boxes, Souvenirs & Services)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Item Description & Specification</label>
            <input 
              type="text" 
              placeholder="e.g. Handmade Terracotta Diya / Gourmet Cashew Tin 150g"
              value={newItemForm.description}
              onChange={e => setNewItemForm({ ...newItemForm, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Our Unit Cost (₹)</label>
              <input 
                type="number" 
                placeholder="45"
                value={newItemForm.ourUnitCost || ''}
                onChange={e => setNewItemForm({ ...newItemForm, ourUnitCost: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Default Client Quote (₹)</label>
              <input 
                type="number" 
                placeholder="90"
                value={newItemForm.clientUnitCost || ''}
                onChange={e => setNewItemForm({ ...newItemForm, clientUnitCost: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-purple-400 font-bold font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Shelf Life Guarantee</label>
              <input 
                type="text" 
                placeholder="e.g. 6 Months / N/A (Non-perishable)"
                value={newItemForm.shelfLife}
                onChange={e => setNewItemForm({ ...newItemForm, shelfLife: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Current Stock Quantity</label>
              <input 
                type="number" 
                placeholder="50"
                value={newItemForm.inStockQty || ''}
                onChange={e => setNewItemForm({ ...newItemForm, inStockQty: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono text-xs"
              />
            </div>
          </div>

          <Button 
            onClick={handleAddNewCatalogItem} 
            disabled={savingNewItem}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 mt-2"
          >
            {savingNewItem ? 'Saving & Appending to Google Sheet...' : '✓ Add Item & Append to Google Sheet'}
          </Button>
        </div>
      </Modal>

      {/* New Project Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Corporate Hamper Project">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Project Name</label>
            <input 
              type="text" 
              placeholder="e.g. Taj Hotel Onam Hamper 2026"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Client Name</label>
            <input 
              type="text" 
              placeholder="e.g. Taj Malabar Resort"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100"
            />
          </div>
          <Button onClick={handleCreateProject} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2">
            Create Project & Open Checkbox Workstation
          </Button>
        </div>
      </Modal>
    </div>
  );
};

