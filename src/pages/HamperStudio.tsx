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
  const [loadingSync, setLoadingSync] = useState(false);

  // New Project Form State
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');

  // Expense Form State
  const [newExpense, setNewExpense] = useState({ description: '', amount: 0 });

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

  const handleAddExpense = () => {
    if (!activeProject || !newExpense.description.trim() || newExpense.amount <= 0) return;
    const exp: TajProjectExpense = { id: `EXP-${Date.now()}`, description: newExpense.description, amount: newExpense.amount };
    updateProjectState({ ...activeProject, otherExpenses: [...activeProject.otherExpenses, exp] });
    setNewExpense({ description: '', amount: 0 });
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

    const totalExpenses = proj.otherExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = clientFinalCost - ourFinalCost - totalExpenses;
    const grossMarginPercent = clientFinalCost > 0 ? Math.round((netProfit / clientFinalCost) * 10000) / 100 : 0;

    return {
      ourTotalCost,
      clientTotalCost,
      ourFinalCost: Math.round(ourFinalCost * 100) / 100,
      clientFinalCost: Math.round(clientFinalCost * 100) / 100,
      totalExpenses,
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
          <Button onClick={() => setIsModalOpen(true)} className="mt-4 bg-purple-600 hover:bg-purple-500 text-white text-xs">
            <Plus className="w-4 h-4 mr-1" /> + New Hamper Project
          </Button>
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
              <div className="flex flex-wrap gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                <Button onClick={() => setIsCatalogPickerOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs">
                  <CheckSquare className="w-4 h-4 mr-1" /> Pick Items via Checkbox Catalog
                </Button>
                <Button onClick={() => setViewMode('proposal')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs">
                  <FileText className="w-4 h-4 mr-1" /> Generate Customer Proposal (PO)
                </Button>
                <Button onClick={() => setViewMode('delivery')} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs">
                  <Truck className="w-4 h-4 mr-1" /> Generate Delivery Note (Challan)
                </Button>
              </div>

              {/* Financial Rollup Summary */}
              {(() => {
                const math = calculateProjectMath(activeProject);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                      <div className="text-slate-500 text-[10px]">OUR FINAL COST</div>
                      <div className="text-slate-100 text-base font-bold mt-1">₹{math.ourFinalCost.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                      <div className="text-slate-500 text-[10px]">CLIENT FINAL COST</div>
                      <div className="text-purple-400 text-base font-bold mt-1">₹{math.clientFinalCost.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                      <div className="text-slate-500 text-[10px]">TOTAL EXPENSES</div>
                      <div className="text-rose-400 text-base font-bold mt-1">₹{math.totalExpenses.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                      <div className="text-slate-500 text-[10px]">NET PROFIT (MARGIN)</div>
                      <div className="text-emerald-400 text-base font-bold mt-1">₹{math.netProfit.toLocaleString('en-IN')} ({math.grossMarginPercent}%)</div>
                    </div>
                  </div>
                );
              })()}

              {/* Selected Items Table */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-100 flex items-center justify-between">
                    <span>Selected Hamper Items ({activeProject.lineItems.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  {activeProject.lineItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">
                      No items checked. Click "Pick Items via Checkbox Catalog" above to select components.
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

              {/* Other Project Expenses */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-100">Other Project Expenses (Printing, Travel, Courier, Porter)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex gap-2 bg-slate-950 p-2 rounded border border-slate-800">
                    <input 
                      type="text" 
                      placeholder="Expense Name (e.g. Onam Card Printing / Porter)" 
                      value={newExpense.description}
                      onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                      className="flex-1 bg-slate-900 border border-slate-800 text-slate-100 rounded px-2 py-1"
                    />
                    <input 
                      type="number" 
                      placeholder="Amount" 
                      value={newExpense.amount || ''}
                      onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                      className="w-32 bg-slate-900 border border-slate-800 text-slate-100 rounded px-2 py-1"
                    />
                    <Button size="sm" onClick={handleAddExpense} className="bg-rose-600 hover:bg-rose-500 text-white text-xs">
                      + Add Expense
                    </Button>
                  </div>

                  <div className="space-y-1">
                    {activeProject.otherExpenses.map(e => (
                      <div key={e.id} className="flex justify-between items-center bg-slate-950 p-2 rounded text-slate-300">
                        <span>{e.description}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-rose-400">₹{e.amount}</span>
                          <button onClick={() => handleRemoveExpense(e.id)} className="text-rose-400 hover:text-rose-300">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Checkbox Catalog Picker Modal */}
      <Modal isOpen={isCatalogPickerOpen} onClose={() => setIsCatalogPickerOpen(false)} title="Master Hamper Catalog Checkbox Picker">
        <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <p className="text-slate-400">Check off items from your master catalog to include them in <strong className="text-purple-400">{activeProject?.projectName}</strong>.</p>
          
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
                          <div className="text-[10px] text-slate-500 font-mono">Our Unit Cost: ₹{item.ourUnitCost} • GST: {item.gstRate}%</div>
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
