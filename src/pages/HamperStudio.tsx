import React, { useState, useEffect } from 'react';
import { 
  Gift, Plus, Trash2, CheckCircle2, RefreshCw, CheckSquare, Square, 
  FileText, Truck, Sparkles, Box, Compass, ArrowRight, Sliders, 
  Info, ShieldCheck, ChevronRight, AlertTriangle, Layers, ArrowUpRight, Search
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { StorageEngine } from '../services/storageEngine';
import { 
  HamperCatalogService, 
  HamperCatalogItem, 
  SourcedDiscoveryItem 
} from '../services/hamperCatalog';
import { 
  HamperPricingEngine, 
  STANDARD_BOX_SPECS, 
  BoxCapacitySpec, 
  CuratedTierRecipe, 
  getItemVolumeUnits 
} from '../services/hamperPricingEngine';
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
  billableToClient?: boolean;
}

export interface TajHamperProject {
  id: string;
  projectName: string;
  clientName: string;
  date: string;
  selectedBoxId?: string;
  targetBudget?: number;
  orderQuantity?: number;
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

  const [sourcingPipeline, setSourcingPipeline] = useState<SourcedDiscoveryItem[]>(() => {
    return HamperCatalogService.getSourcingPipeline();
  });

  const [activeProject, setActiveProject] = useState<TajHamperProject | null>(() => {
    const list = StorageEngine.getLocal<TajHamperProject[]>(STORAGE_KEY, []);
    return list.length > 0 ? list[0] : null;
  });

  const [studioTab, setStudioTab] = useState<'workstation' | 'tier_recommender' | 'sourcing_pipeline'>('workstation');
  const [viewMode, setViewMode] = useState<'studio' | 'proposal' | 'delivery'>('studio');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatalogPickerOpen, setIsCatalogPickerOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [savingNewItem, setSavingNewItem] = useState(false);

  // Budget Engine State
  const [targetBudgetInput, setTargetBudgetInput] = useState<number>(1000);
  const [targetQtyInput, setTargetQtyInput] = useState<number>(50);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('All');

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
    billableToClient: false
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

  // Generate 3 Curated Tiers live
  const generatedTiers = HamperPricingEngine.generateTiersForBudget(
    targetBudgetInput || 1000,
    targetQtyInput || 50,
    masterCatalog
  );

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

  // Add New Item to Catalog & append to Google Sheet
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
        updateProjectState({
          ...activeProject,
          lineItems: [...activeProject.lineItems, newLine]
        });
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
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNewItem(false);
    }
  };

  // Promote Sourced Item from Discovery Pipeline to Master Catalog
  const handlePromoteSourcedItem = async (sourced: SourcedDiscoveryItem) => {
    const token = sessionStorage.getItem('gud_google_access_token');
    const res = await HamperCatalogService.promoteSourcedItemToCatalog(sourced, sourced.sampleMoq || 30, token);
    setMasterCatalog(res.updatedCatalog);
    setSourcingPipeline(res.updatedPipeline);
    alert(`✓ "${sourced.description}" promoted to Active Production Catalog!`);
  };

  // Create Project
  const handleCreateProject = () => {
    if (!projectName.trim() || !clientName.trim()) {
      alert('Please provide both Project Name and Client Name');
      return;
    }
    const proj: TajHamperProject = {
      id: `HMP-${Date.now().toString().slice(-4)}`,
      projectName: projectName.trim(),
      clientName: clientName.trim(),
      date: new Date().toISOString().split('T')[0],
      targetBudget: targetBudgetInput,
      orderQuantity: targetQtyInput,
      selectedBoxId: 'BOX-1012',
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

  // Apply a curated tier directly into the active project
  const handleApplyCuratedTier = (recipe: CuratedTierRecipe) => {
    if (!activeProject) {
      // Create project first
      const proj: TajHamperProject = {
        id: `HMP-${Date.now().toString().slice(-4)}`,
        projectName: `${recipe.tierName} (${targetQtyInput} units)`,
        clientName: 'Corporate Client',
        date: new Date().toISOString().split('T')[0],
        targetBudget: recipe.clientQuoteInclGst,
        orderQuantity: targetQtyInput,
        selectedBoxId: recipe.recommendedBox.id,
        lineItems: recipe.lineItems.map(it => ({
          id: `LINE-${Date.now()}-${it.catalogItem.id}`,
          category: it.catalogItem.category,
          description: it.catalogItem.description,
          qty: it.qty,
          ourUnitCost: it.catalogItem.ourUnitCost,
          clientUnitCost: it.catalogItem.clientUnitCost || Math.round(it.catalogItem.ourUnitCost * 1.8),
          gstRate: it.catalogItem.gstRate
        })),
        otherExpenses: [],
        status: 'Planning'
      };
      const updated = [proj, ...projects];
      setProjects(updated);
      StorageEngine.setLocal(STORAGE_KEY, updated);
      setActiveProject(proj);
    } else {
      const newLines: TajHamperLineItem[] = recipe.lineItems.map(it => ({
        id: `LINE-${Date.now()}-${it.catalogItem.id}`,
        category: it.catalogItem.category,
        description: it.catalogItem.description,
        qty: it.qty,
        ourUnitCost: it.catalogItem.ourUnitCost,
        clientUnitCost: it.catalogItem.clientUnitCost || Math.round(it.catalogItem.ourUnitCost * 1.8),
        gstRate: it.catalogItem.gstRate
      }));

      updateProjectState({
        ...activeProject,
        selectedBoxId: recipe.recommendedBox.id,
        targetBudget: recipe.clientQuoteInclGst,
        lineItems: newLines
      });
    }

    setStudioTab('workstation');
  };

  // Toggle item via Catalog Picker
  const handleToggleCatalogItem = (catItem: HamperCatalogItem, checked: boolean) => {
    if (!activeProject) return;

    if (checked) {
      const line: TajHamperLineItem = {
        id: `LINE-${Date.now()}-${catItem.id}`,
        category: catItem.category,
        description: catItem.description,
        qty: catItem.defaultQty || 1,
        ourUnitCost: catItem.ourUnitCost,
        clientUnitCost: catItem.clientUnitCost || Math.round(catItem.ourUnitCost * 1.8),
        gstRate: catItem.gstRate
      };
      updateProjectState({ ...activeProject, lineItems: [...activeProject.lineItems, line] });
    } else {
      updateProjectState({ 
        ...activeProject, 
        lineItems: activeProject.lineItems.filter(l => l.description.toLowerCase() !== catItem.description.toLowerCase()) 
      });
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
    let totalVolumeUnits = 0;

    proj.lineItems.forEach(item => {
      const ourCost = item.qty * item.ourUnitCost;
      const clientCost = item.qty * item.clientUnitCost;
      const ourGst = (ourCost * item.gstRate) / 100;
      const clientGst = (clientCost * item.gstRate) / 100;

      ourTotalCost += ourCost;
      clientTotalCost += clientCost;
      ourFinalCost += (ourCost + ourGst);
      clientFinalCost += (clientCost + clientGst);

      // Volume calculation
      const catItem = masterCatalog.find(c => c.description.toLowerCase() === item.description.toLowerCase()) || {
        description: item.description,
        category: item.category,
        ourUnitCost: item.ourUnitCost,
        gstRate: item.gstRate,
        defaultQty: 1,
        id: ''
      };
      totalVolumeUnits += getItemVolumeUnits(catItem) * item.qty;
    });

    const billableExpenses = proj.otherExpenses
      .filter(e => e.billableToClient !== false)
      .reduce((acc, e) => acc + e.amount, 0);

    const internalExpenses = proj.otherExpenses
      .filter(e => e.billableToClient === false)
      .reduce((acc, e) => acc + e.amount, 0);

    const totalExpenses = billableExpenses + internalExpenses;
    const totalClientQuote = clientFinalCost + billableExpenses;
    const netProfit = totalClientQuote - ourFinalCost - totalExpenses;
    const grossMarginPercent = totalClientQuote > 0 ? Math.round((netProfit / totalClientQuote) * 10000) / 100 : 0;

    // Box Capacity Check
    const activeBox = STANDARD_BOX_SPECS.find(b => b.id === proj.selectedBoxId) || STANDARD_BOX_SPECS[0];
    const capacityPercent = Math.min(Math.round((totalVolumeUnits / activeBox.maxVolumeUnits) * 100), 150);

    return {
      ourTotalCost: Math.round(ourTotalCost * 100) / 100,
      clientTotalCost: Math.round(clientTotalCost * 100) / 100,
      ourFinalCost: Math.round(ourFinalCost * 100) / 100,
      clientFinalCost: Math.round(clientFinalCost * 100) / 100,
      billableExpenses,
      internalExpenses,
      totalExpenses,
      totalClientQuote: Math.round(totalClientQuote * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      grossMarginPercent,
      totalVolumeUnits: Math.round(totalVolumeUnits * 10) / 10,
      activeBox,
      capacityPercent
    };
  };

  // Render Document Views if active
  if (viewMode === 'proposal' && activeProject) {
    return <HamperProposalDocument project={activeProject} onBack={() => setViewMode('studio')} />;
  }

  if (viewMode === 'delivery' && activeProject) {
    return <HamperDeliveryNoteDocument project={activeProject} onBack={() => setViewMode('studio')} />;
  }

  const activeMath = activeProject ? calculateProjectMath(activeProject) : null;

  const getItemThumbnail = (desc: string, category: string) => {
    const d = desc.toLowerCase();
    if (d.includes('almond')) return '/images/brand/prod_almond_art.png';
    if (d.includes('peanut')) return '/images/brand/prod_peanut_art.png';
    if (d.includes('orange')) return '/images/brand/prod_orange_art.png';
    if (d.includes('lemon')) return '/images/brand/prod_lemon_art.png';
    if (d.includes('sea salt') || d.includes('seasalt')) return '/images/brand/prod_seasalt_art.png';
    if (d.includes('mocha')) return '/images/brand/prod_mocha_art.png';
    if (d.includes('jackfruit')) return '/images/brand/prod_jackfruit_art.png';
    if (d.includes('8 piece') || d.includes('8-piece') || d.includes('8 pc') || d.includes('box')) return '/images/brand/prod_gift_8.jpg';
    if (d.includes('6 piece') || d.includes('6-piece') || d.includes('6 pc')) return '/images/brand/prod_gift_6.jpg';
    if (d.includes('house boat') || d.includes('souvenir') || category === 'Souvenir') return '/images/brand/kerala_heritage_hamper.jpg';
    if (d.includes('tin') || d.includes('chips') || category === 'Tins') return '/images/brand/prod_real_ppan0941.jpg';
    if (category === 'Chocolate Box' || category === 'Packaging') return '/images/brand/prod_gift_8.jpg';
    return '/images/brand/prod_real_ppan1026.jpg';
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 sm:p-6 lg:p-8 space-y-8 font-sans">
      
      {/* ATELIER TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-red-600/10 text-[#ff1e27] border border-red-500/20 text-[10px] font-bold uppercase tracking-widest">
              Confectionery & Corporate Atelier
            </span>
            <span className="text-zinc-500 text-xs">v3.0 Executive</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1.5 flex items-center gap-3">
            <Gift className="w-8 h-8 text-[#e50914]" />
            Hamper BOM Studio & Target-Cost Engine
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Engineer custom gifting collections from client budgets, evaluate volumetric fit, track landed procurement costs, and generate live profit quotes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button 
            onClick={handleSyncLiveCatalog} 
            disabled={loadingSync} 
            variant="outline" 
            className="border-[#262626] bg-[#141414] hover:bg-[#1f1f1f] text-zinc-300 text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingSync ? 'animate-spin text-[#e50914]' : ''}`} /> 
            Sync Sheet Catalog
          </Button>

          <Button 
            onClick={() => setIsNewItemModalOpen(true)} 
            className="bg-[#141414] hover:bg-[#1f1f1f] text-zinc-200 border border-[#2a2a2a] text-xs font-semibold h-9"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-[#e50914]" /> + Add Master SKU
          </Button>

          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-[#e50914] hover:bg-[#ff1e27] text-white font-bold text-xs shadow-lg shadow-red-950/50 h-9 tactile-press"
          >
            <Plus className="w-4 h-4 mr-1 stroke-[3]" /> + New Hamper Project
          </Button>
        </div>
      </div>

      {/* TARGET-BUDGET REVERSE COSTING BAR */}
      <div className="relative overflow-hidden rounded-2xl bg-[#121212] border border-[#262626] p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-md">
            <div className="flex items-center gap-2 text-[#ff1e27] font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#e50914]" /> Client Target Budget Matcher
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Instant 3-Tier Proposal Generator
            </h2>
            <p className="text-xs text-zinc-400">
              Enter the client's budget per hamper (incl. GST). The engine will curate <strong>Basic</strong>, <strong>Better</strong>, and <strong>Premium</strong> tiers with verified margins.
            </p>
          </div>

          {/* Budget Input & Presets */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-[#0c0c0c] p-1.5 rounded-xl border border-[#262626]">
              <div className="px-3 py-1 text-xs text-zinc-400 font-medium">Budget:</div>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-[#ff1e27] font-bold text-sm">₹</span>
                <input 
                  type="number"
                  value={targetBudgetInput}
                  onChange={e => setTargetBudgetInput(Math.max(Number(e.target.value), 100))}
                  className="w-28 pl-7 pr-2 py-1.5 bg-[#181818] border border-[#2e2e2e] rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>
              <div className="text-[10px] text-zinc-500 font-semibold uppercase pr-2">incl GST</div>
            </div>

            <div className="flex items-center gap-2 bg-[#0c0c0c] p-1.5 rounded-xl border border-[#262626]">
              <div className="px-3 py-1 text-xs text-zinc-400 font-medium">Qty:</div>
              <input 
                type="number"
                value={targetQtyInput}
                onChange={e => setTargetQtyInput(Math.max(Number(e.target.value), 1))}
                className="w-20 px-2 py-1.5 bg-[#181818] border border-[#2e2e2e] rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:border-[#e50914] text-center"
              />
            </div>

            {/* Quick Presets */}
            <div className="hidden sm:flex items-center gap-1.5">
              {[750, 1000, 1500, 2500].map(val => (
                <button
                  key={val}
                  onClick={() => {
                    setTargetBudgetInput(val);
                    setStudioTab('tier_recommender');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all tactile-press ${
                    targetBudgetInput === val 
                      ? 'bg-[#e50914] text-white font-bold shadow-md shadow-red-950/40' 
                      : 'bg-[#181818] border border-[#262626] hover:bg-[#222222] text-zinc-300'
                  }`}
                >
                  ₹{val}
                </button>
              ))}
            </div>

            <Button
              onClick={() => setStudioTab('tier_recommender')}
              className="bg-[#e50914] hover:bg-[#ff1e27] text-white font-bold text-xs h-10 px-4 shadow-md whitespace-nowrap tactile-press"
            >
              <Sparkles className="w-4 h-4 mr-1.5" /> Curate Tiers
            </Button>
          </div>
        </div>
      </div>

      {/* STUDIO NAVIGATION TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222222] pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStudioTab('workstation')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap tactile-press ${
              studioTab === 'workstation'
                ? 'bg-[#181818] text-white border border-[#383838] shadow-sm ring-1 ring-white/10'
                : 'text-zinc-400 hover:text-white hover:bg-[#141414]'
            }`}
          >
            <Sliders className="w-4 h-4 text-[#e50914]" /> Active Workstation & Canvas
          </button>

          <button
            onClick={() => setStudioTab('tier_recommender')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap tactile-press ${
              studioTab === 'tier_recommender'
                ? 'bg-[#181818] text-white border border-[#383838] shadow-sm ring-1 ring-white/10'
                : 'text-zinc-400 hover:text-white hover:bg-[#141414]'
            }`}
          >
            <Layers className="w-4 h-4 text-[#e50914]" /> 3-Tier Budget Architectures
          </button>

          <button
            onClick={() => setStudioTab('sourcing_pipeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap tactile-press ${
              studioTab === 'sourcing_pipeline'
                ? 'bg-[#181818] text-white border border-[#383838] shadow-sm ring-1 ring-white/10'
                : 'text-zinc-400 hover:text-white hover:bg-[#141414]'
            }`}
          >
            <Compass className="w-4 h-4 text-[#e50914]" /> Discovery & Procurement ({sourcingPipeline.length} SKUs)
          </button>
        </div>

        {activeProject && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setViewMode('proposal')}
              className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 text-xs"
            >
              <FileText className="w-3.5 h-3.5 mr-1" /> Export Formal Proposal
            </Button>
            <Button
              size="sm"
              onClick={() => setViewMode('delivery')}
              className="bg-[#181818] hover:bg-[#222222] text-zinc-300 border border-[#262626] text-xs"
            >
              <Truck className="w-3.5 h-3.5 mr-1" /> Delivery Note
            </Button>
          </div>
        )}
      </div>
      {/* TAB 1: 3-TIER COMPARISON MATRIX */}
      {studioTab === 'tier_recommender' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121212] p-4 rounded-xl border border-[#262626]">
            <div>
              <h3 className="text-sm font-bold text-white">
                Tier Comparison Matrix for Target Budget: ₹{targetBudgetInput.toLocaleString('en-IN')} incl. GST ({targetQtyInput} hampers)
              </h3>
              <p className="text-xs text-zinc-400">
                Pick the optimal balance for your client's executive tier or customize any recipe directly into your workstation.
              </p>
            </div>
            <div className="text-xs text-zinc-400 font-mono">
              Total Order Revenue: <span className="text-[#ff1e27] font-bold">₹{(targetBudgetInput * targetQtyInput).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[generatedTiers.tiers.basic, generatedTiers.tiers.better, generatedTiers.tiers.premium].map(recipe => (
              <div 
                key={recipe.tier}
                className={`relative rounded-2xl bg-gradient-to-b ${recipe.colorScheme.bg} border ${recipe.colorScheme.border} p-5 flex flex-col justify-between shadow-2xl transition-all hover:scale-[1.01]`}
              >
                <div>
                  {/* Hero Showcase Image */}
                  {recipe.image && (
                    <div className="w-full h-40 rounded-xl overflow-hidden mb-4 border border-white/10 relative group">
                      <img 
                        src={recipe.image} 
                        alt={recipe.tierName} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                      <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white uppercase tracking-wider bg-black/80 px-2 py-0.5 rounded border border-white/20">
                        {recipe.recommendedBox.name}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black border border-[#333333] text-zinc-200">
                      {recipe.badge}
                    </span>
                    <span className={`text-xs font-mono font-bold ${recipe.colorScheme.text}`}>
                      {recipe.grossMarginPercent}% Margin
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-white">{recipe.tierName}</h4>
                  <p className="text-xs text-zinc-400 mt-1 min-h-[36px]">{recipe.tagline}</p>

                  {/* Pricing Overview */}
                  <div className="bg-[#0c0c0c] p-3.5 rounded-xl border border-[#262626] my-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Client Quote:</span>
                      <span className="text-base font-bold font-mono text-white">₹{recipe.clientQuoteInclGst.toLocaleString('en-IN')} <span className="text-[10px] text-zinc-400 font-normal">incl GST</span></span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Our BOM Cost (with GST):</span>
                      <span className="text-zinc-300 font-mono">₹{recipe.ourBOMTotalWithGst.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="border-t border-[#222222] pt-2 flex justify-between items-center text-xs font-bold">
                      <span className="text-zinc-300">Net Profit / Hamper:</span>
                      <span className="text-[#ff1e27] font-mono">₹{recipe.netProfit.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-[11px] text-right text-zinc-400 font-mono">
                      Project Profit ({targetQtyInput} units): <span className="text-white font-bold">₹{(recipe.netProfit * targetQtyInput).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Packaging & Capacity */}
                  <div className="mb-4 text-xs space-y-1.5">
                    <div className="flex justify-between text-zinc-400">
                      <span>Packaging: <strong>{recipe.recommendedBox.name}</strong></span>
                      <span className="font-mono">{recipe.capacityUtilizationPercent}% full</span>
                    </div>
                    <div className="w-full bg-[#1e1e1e] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${recipe.capacityUtilizationPercent > 100 ? 'bg-rose-500' : 'bg-[#e50914]'}`}
                        style={{ width: `${Math.min(recipe.capacityUtilizationPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Components List */}
                  <div className="space-y-1.5 mb-6">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Curated Components:</div>
                    {recipe.lineItems.map((li, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-[#222222] text-zinc-300">
                        <div className="truncate max-w-[200px]" title={li.catalogItem.description}>
                          {li.qty}x {li.catalogItem.description}
                        </div>
                        <span className="text-zinc-400 font-mono text-[11px]">₹{li.catalogItem.ourUnitCost}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => handleApplyCuratedTier(recipe)}
                  className="w-full bg-[#e50914] hover:bg-[#ff1e27] text-white font-bold text-xs py-2.5 shadow-md flex items-center justify-center gap-1.5 tactile-press"
                >
                  Apply {recipe.tier} Tier to Workstation <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE WORKSTATION & CANVAS */}
      {studioTab === 'workstation' && (
        <div className="space-y-6">
          {projects.length === 0 ? (
            <div className="bg-[#121212] border border-[#262626] rounded-2xl p-12 text-center text-zinc-400 space-y-4">
              <Gift className="w-12 h-12 text-[#e50914]/60 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-white">No Corporate Hamper Projects Created Yet</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                  Start by using the Target-Budget Generator above to curate a 3-tier proposal, or click below to manually start a new project.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <Button onClick={() => setStudioTab('tier_recommender')} className="bg-[#e50914] hover:bg-[#ff1e27] text-white font-bold text-xs tactile-press">
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Use Target Budget Generator
                </Button>
                <Button onClick={() => setIsModalOpen(true)} variant="outline" className="text-zinc-300 border-[#2e2e2e] bg-[#181818] hover:bg-[#222222] text-xs">
                  + Create Blank Project
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT: PROJECT DIRECTORY & CLIENT DETAILS */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Client Projects</h3>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="text-xs text-[#ff1e27] hover:underline font-semibold"
                  >
                    + New
                  </button>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {projects.map(p => {
                    const math = calculateProjectMath(p);
                    const isSelected = activeProject?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setActiveProject(p)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#181818] border-[#e50914] shadow-md ring-1 ring-red-500/20'
                            : 'bg-[#121212] border-[#222222] hover:border-[#333333] text-zinc-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm text-white">{p.projectName}</span>
                          <span className="text-[10px] font-mono bg-black text-[#ff1e27] px-2 py-0.5 rounded border border-red-500/20">
                            {p.id}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">Client: <strong className="text-zinc-200">{p.clientName}</strong></div>

                        <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-[#222222] font-mono text-xs">
                          <span className="text-zinc-400">Net Profit:</span>
                          <span className="text-[#ff1e27] font-bold">₹{math.netProfit.toLocaleString('en-IN')} ({math.grossMarginPercent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Packaging Box Selection for Active Project */}
                {activeProject && activeMath && (
                  <div className="bg-[#121212] p-4 rounded-xl border border-[#222222] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-[#e50914]" /> Container / Box Fit
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {activeMath.totalVolumeUnits} / {activeMath.activeBox.maxVolumeUnits} units
                      </span>
                    </div>

                    <select
                      value={activeProject.selectedBoxId || 'BOX-1012'}
                      onChange={e => updateProjectState({ ...activeProject, selectedBoxId: e.target.value })}
                      className="w-full bg-[#0c0c0c] border border-[#2e2e2e] rounded-lg px-3 py-2 text-xs text-zinc-200 font-medium focus:outline-none focus:border-[#e50914]"
                    >
                      {STANDARD_BOX_SPECS.map(box => (
                        <option key={box.id} value={box.id}>
                          {box.name} ({box.dimensions}) - Max {box.maxVolumeUnits} units
                        </option>
                      ))}
                    </select>

                    {/* Volumetric Capacity Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-400">Volumetric Fill:</span>
                        <span className={`font-bold font-mono ${
                          activeMath.capacityPercent > 100 
                            ? 'text-rose-400' 
                            : 'text-white'
                        }`}>
                          {activeMath.capacityPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-[#262626]">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            activeMath.capacityPercent > 100 
                              ? 'bg-rose-500' 
                              : 'bg-[#e50914]'
                          }`}
                          style={{ width: `${Math.min(activeMath.capacityPercent, 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {activeMath.capacityPercent > 100 && '⚠️ Overfilled! Consider switching to a larger box (e.g. 10x12).'}
                        {activeMath.capacityPercent >= 70 && activeMath.capacityPercent <= 100 && '✨ Ideal presentation fit. Snug and luxurious.'}
                        {activeMath.capacityPercent < 70 && '💡 Box has extra room. Add shredded kraft paper or an extra snack pouch.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: INTERACTIVE HAMPER CANVAS & BOM TABLE */}
              {activeProject && activeMath && (
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Financial KPI Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#121212] p-3.5 rounded-xl border border-[#222222]">
                      <div className="text-[11px] text-zinc-400 font-medium">Client Quote Total</div>
                      <div className="text-lg font-bold font-mono text-white mt-1">₹{activeMath.totalClientQuote.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-zinc-500">Incl. Taxes & Logistics</div>
                    </div>

                    <div className="bg-[#121212] p-3.5 rounded-xl border border-[#222222]">
                      <div className="text-[11px] text-zinc-400 font-medium">Our Total Outflow</div>
                      <div className="text-lg font-bold font-mono text-zinc-300 mt-1">₹{(activeMath.ourFinalCost + activeMath.totalExpenses).toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-zinc-500">BOM + Expenses</div>
                    </div>

                    <div className="bg-gradient-to-b from-red-950/30 to-[#121212] p-3.5 rounded-xl border border-red-500/30">
                      <div className="text-[11px] text-[#ff1e27] font-medium">True Net Profit</div>
                      <div className="text-lg font-bold font-mono text-white mt-1">₹{activeMath.netProfit.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-[#ff1e27] font-bold">{activeMath.grossMarginPercent}% Net Margin</div>
                    </div>

                    <div className="bg-[#121212] p-3.5 rounded-xl border border-[#222222]">
                      <div className="text-[11px] text-zinc-400 font-medium">Hamper Components</div>
                      <div className="text-lg font-bold font-mono text-white mt-1">{activeProject.lineItems.length} SKUs</div>
                      <div className="text-[10px] text-zinc-500">{activeMath.totalVolumeUnits} volume units</div>
                    </div>
                  </div>

                  {/* Interactive Hamper Tray Canvas */}
                  <div className="bg-[#121212] rounded-2xl border border-[#222222] overflow-hidden shadow-xl">
                    <div className="p-4 bg-[#0c0c0c] border-b border-[#222222] flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Box className="w-4 h-4 text-[#e50914]" />
                          Hamper Assembly Canvas ({activeProject.lineItems.length} Items)
                        </h3>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Items inside {activeMath.activeBox.name}. Adjust quantities, costs, and client quote prices live.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm"
                          onClick={() => setIsCatalogPickerOpen(true)}
                          className="bg-[#e50914] hover:bg-[#ff1e27] text-white font-bold text-xs h-8 shadow-sm tactile-press"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> + Add Items from Catalog
                        </Button>
                      </div>
                    </div>

                    {/* Line Items Table */}
                    {activeProject.lineItems.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500 space-y-2">
                        <Gift className="w-10 h-10 text-zinc-700 mx-auto" />
                        <p className="text-xs">No components in this hamper tray yet.</p>
                        <Button
                          size="sm"
                          onClick={() => setIsCatalogPickerOpen(true)}
                          className="bg-[#181818] hover:bg-[#222222] text-zinc-300 text-xs mt-2 border border-[#262626]"
                        >
                          Open Component Picker
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#222222]">
                        {activeProject.lineItems.map(item => (
                          <div key={item.id} className="p-3.5 hover:bg-[#181818]/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={getItemThumbnail(item.description, item.category)} 
                                alt={item.description}
                                className="w-10 h-10 rounded-lg object-cover bg-black border border-[#2a2a2a] shrink-0" 
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded uppercase bg-[#1e1e1e] text-zinc-300 border border-[#2e2e2e]">
                                    {item.category}
                                  </span>
                                  <span className="text-xs font-semibold text-white">{item.description}</span>
                                </div>
                                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                                  Our Cost: ₹{item.ourUnitCost} + {item.gstRate}% GST | Total BOM: ₹{(item.qty * item.ourUnitCost).toFixed(2)}
                                </div>
                              </div>
                            </div>

                            {/* Steppers & Client Quote Inputs */}
                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              {/* Qty Stepper */}
                              <div className="flex items-center bg-[#0c0c0c] border border-[#2e2e2e] rounded-lg overflow-hidden">
                                <button
                                  onClick={() => handleUpdateItemProperty(item.description, 'qty', Math.max(item.qty - 1, 1))}
                                  className="px-2.5 py-1 text-zinc-400 hover:text-white hover:bg-[#222222] text-xs font-bold transition-colors"
                                >
                                  -
                                </button>
                                <span className="px-2.5 py-1 text-xs font-mono font-bold text-white min-w-[28px] text-center">
                                  {item.qty}
                                </span>
                                <button
                                  onClick={() => handleUpdateItemProperty(item.description, 'qty', item.qty + 1)}
                                  className="px-2.5 py-1 text-[#ff1e27] hover:text-white hover:bg-[#222222] text-xs font-bold transition-colors"
                                >
                                  +
                                </button>
                              </div>

                              {/* Client Unit Cost */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-zinc-400 font-medium">Quote ₹:</span>
                                <input
                                  type="number"
                                  value={item.clientUnitCost}
                                  onChange={e => handleUpdateItemProperty(item.description, 'clientUnitCost', Number(e.target.value))}
                                  className="w-20 px-2 py-1 bg-[#0c0c0c] border border-[#2e2e2e] rounded-lg text-xs font-mono font-bold text-[#ff1e27] text-right focus:outline-none focus:border-[#e50914]"
                                />
                              </div>

                              <button
                                onClick={() => handleRemoveLineItem(item.id)}
                                className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-[#222222] transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Operational Expenses Section */}
                  <div className="bg-[#121212] p-5 rounded-2xl border border-[#222222] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-[#e50914]" /> Operational & Assembly Expenses
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Logistics, porter, and delivery costs incurred from our end reduce your net margin.
                        </p>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAddExpense({ desc: 'Local Travel / Delivery', amount: 300, category: 'Travel', billable: false })}
                          className="px-2.5 py-1 rounded-lg bg-[#181818] border border-[#2e2e2e] text-zinc-200 hover:bg-[#222222] text-[11px] font-semibold transition-all tactile-press"
                        >
                          + Travel (₹300 - Absorbed)
                        </button>
                        <button
                          onClick={() => handleAddExpense({ desc: 'Courier Express Cargo', amount: 450, category: 'Courier', billable: true })}
                          className="px-2.5 py-1 rounded-lg bg-[#181818] border border-[#2e2e2e] text-zinc-200 hover:bg-[#222222] text-[11px] font-semibold transition-all tactile-press"
                        >
                          + Courier (₹450 - Billed)
                        </button>
                      </div>
                    </div>

                    {/* Expenses List */}
                    {activeProject.otherExpenses.length > 0 && (
                      <div className="space-y-2">
                        {activeProject.otherExpenses.map(exp => (
                          <div key={exp.id} className="flex justify-between items-center bg-[#0c0c0c] p-2.5 rounded-lg border border-[#222222] text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e1e] text-zinc-400 uppercase font-semibold">
                                {exp.category || 'Other'}
                              </span>
                              <span className="text-zinc-200">{exp.description}</span>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleToggleExpenseBillable(exp.id)}
                                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${
                                  exp.billableToClient 
                                    ? 'bg-red-950/70 text-red-300 border-red-700' 
                                    : 'bg-[#1e1e1e] text-zinc-300 border-[#333333]'
                                }`}
                              >
                                {exp.billableToClient ? '✓ Billed to Client' : '🛡️ Absorbed by Us (Reduces Profit)'}
                              </button>
                              <span className="font-mono font-bold text-rose-400">₹{exp.amount}</span>
                              <button onClick={() => handleRemoveExpense(exp.id)} className="text-zinc-500 hover:text-rose-400 p-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SOURCING & DISCOVERY PIPELINE */}
      {studioTab === 'sourcing_pipeline' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121212] p-4 rounded-xl border border-[#262626]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#e50914]" />
                Discovery & Experimental Procurement Pipeline ({sourcingPipeline.length} Scouted Items)
              </h3>
              <p className="text-xs text-zinc-400">
                Live stream from your Google Sheet <code>'Discovery & Procurement'</code> tab. Review samples, landed costs, and graduate approved items into active production.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-red-600/10 text-[#ff1e27] border border-red-500/20 text-xs font-bold font-mono">
                {sourcingPipeline.filter(s => s.status === 'Approved').length} Approved for Catalog
              </span>
            </div>
          </div>

          {/* Sourcing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sourcingPipeline.map(item => {
              const isApproved = item.status === 'Approved';
              const isInCatalog = masterCatalog.some(c => c.description.toLowerCase() === item.description.toLowerCase());

              return (
                <div 
                  key={item.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    isApproved 
                      ? 'bg-gradient-to-b from-red-950/20 to-[#121212] border-red-500/30' 
                      : item.status === 'Rejected'
                        ? 'bg-black/40 border-[#222222] opacity-60'
                        : 'bg-[#121212] border-[#222222]'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1e1e1e] text-zinc-300 uppercase">
                        {item.category}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        item.status === 'Approved'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : item.status === 'Under Review'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : item.status === 'Sample Ordered'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{item.description}</h4>
                    <div className="text-xs text-zinc-400 mt-1">Vendor: <strong className="text-zinc-200">{item.vendorLead}</strong></div>

                    {/* Cost Specs */}
                    <div className="bg-[#0c0c0c] p-2.5 rounded-lg border border-[#222222] my-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-500 text-[10px]">Est. Base Cost:</span>
                        <div className="font-mono font-bold text-zinc-200">₹{item.estUnitCost.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px]">Landed (incl GST):</span>
                        <div className="font-mono font-bold text-[#ff1e27]">₹{item.landedUnitCost.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px]">GST Rate:</span>
                        <div className="font-mono text-zinc-300">{item.gstRate}%</div>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px]">Sample MOQ:</span>
                        <div className="font-mono text-zinc-300">{item.sampleMoq} units</div>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-zinc-400 italic mb-3">"{item.notes}"</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#222222]">
                    {isInCatalog ? (
                      <div className="flex items-center justify-center gap-1 text-[#ff1e27] text-xs font-semibold py-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#e50914]" /> In Active Production Catalog
                      </div>
                    ) : isApproved ? (
                      <Button
                        onClick={() => handlePromoteSourcedItem(item)}
                        className="w-full bg-[#e50914] hover:bg-[#ff1e27] text-white font-bold text-xs py-2 tactile-press"
                      >
                        📥 Graduate to Active Catalog
                      </Button>
                    ) : (
                      <div className="text-center text-[11px] text-zinc-500 py-1">
                        {item.status === 'Under Review' ? 'Awaiting sample evaluation' : 'Sample testing in progress'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CATALOG PICKER MODAL */}
      <Modal isOpen={isCatalogPickerOpen} onClose={() => setIsCatalogPickerOpen(false)} title="Master Component Catalog Picker">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search catalog SKUs..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg text-xs text-white focus:outline-none focus:border-[#e50914]"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              {['All', 'Chocolates', 'Chocolate Box', 'Tins', 'Souvenir', 'Packaging'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCatalogCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all tactile-press ${
                    catalogCategoryFilter === cat 
                      ? 'bg-[#e50914] text-white' 
                      : 'bg-[#181818] text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
            {masterCatalog
              .filter(item => {
                const matchSearch = item.description.toLowerCase().includes(catalogSearch.toLowerCase()) || item.category.toLowerCase().includes(catalogSearch.toLowerCase());
                const matchCat = catalogCategoryFilter === 'All' || item.category === catalogCategoryFilter;
                return matchSearch && matchCat;
              })
              .map(item => {
                const isSelected = activeProject?.lineItems.some(l => l.description.toLowerCase() === item.description.toLowerCase());
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleCatalogItem(item, !isSelected)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-[#181818] border-[#e50914] text-white ring-1 ring-red-500/20' 
                        : 'bg-[#0c0c0c] border-[#222222] hover:border-[#333333] text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#e50914] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                      )}
                      <img 
                        src={getItemThumbnail(item.description, item.category)} 
                        alt={item.description} 
                        className="w-8 h-8 rounded-md object-cover bg-black border border-[#2a2a2a] shrink-0" 
                      />
                      <div>
                        <div className="text-xs font-semibold">{item.description}</div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          Category: {item.category} | Stock: {item.inStockQty ?? 'N/A'} | Vol: {getItemVolumeUnits(item)} units
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-white">₹{item.ourUnitCost}</div>
                      <div className="text-[10px] text-zinc-400">{item.gstRate}% GST</div>
                    </div>
                  </div>
                );
              })}
          </div>

          <Button 
            onClick={() => setIsCatalogPickerOpen(false)} 
            className="w-full bg-[#e50914] hover:bg-[#ff1e27] text-white font-bold text-xs py-2 mt-2 tactile-press"
          >
            Done Selecting Components
          </Button>
        </div>
      </Modal>

      {/* NEW ITEM MODAL */}
      <Modal isOpen={isNewItemModalOpen} onClose={() => setIsNewItemModalOpen(false)} title="Create New Component SKU & Append to Google Sheet">
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Category</label>
              <select
                value={newItemForm.category}
                onChange={e => {
                  const cat = e.target.value as any;
                  const defaultGst = (cat === 'Chocolates' || cat === 'Chocolate Box') ? 5 : 18;
                  const defaultShelf = (cat === 'Chocolates' || cat === 'Chocolate Box') ? '6 Months' : 'N/A (Non-perishable)';
                  setNewItemForm({ ...newItemForm, category: cat, gstRate: defaultGst, shelfLife: defaultShelf });
                }}
                className="w-full bg-[#0c0c0c] border border-[#2e2e2e] rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#e50914]"
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
              <label className="block text-zinc-400 mb-1 font-semibold">GST Rate (%)</label>
              <select
                value={newItemForm.gstRate}
                onChange={e => setNewItemForm({ ...newItemForm, gstRate: Number(e.target.value) as 5 | 18 })}
                className="w-full bg-[#0c0c0c] border border-[#2e2e2e] rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-[#e50914]"
              >
                <option value={5}>5% GST (Confectionery / Food items)</option>
                <option value={18}>18% GST (Packaging, Boxes, Souvenirs & Services)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Item Description & Specification</label>
            <input 
              type="text" 
              placeholder="e.g. Handmade Terracotta Diya / Gourmet Cashew Tin 150g"
              value={newItemForm.description}
              onChange={e => setNewItemForm({ ...newItemForm, description: e.target.value })}
              className="w-full bg-[#0c0c0c] border border-[#2e2e2e] rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#e50914]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Our Unit Cost (₹)</label>
              <input 
                type="number" 
                placeholder="45"
                value={newItemForm.ourUnitCost || ''}
                onChange={e => setNewItemForm({ ...newItemForm, ourUnitCost: Number(e.target.value) })}
                className="w-full bg-[#0c0c0c] border border-[#2e2e2e] rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-[#e50914]"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Default Client Quote (₹)</label>
              <input 
                type="number" 
                placeholder="90"
                value={newItemForm.clientUnitCost || ''}
                onChange={e => setNewItemForm({ ...newItemForm, clientUnitCost: Number(e.target.value) })}
                className="w-full bg-[#0c0c0c] border border-[#2e2e2e] rounded-lg px-3 py-2 text-[#ff1e27] font-bold font-mono focus:outline-none focus:border-[#e50914]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1">Shelf Life Guarantee</label>
              <input 
                type="text" 
                placeholder="e.g. 6 Months / N/A (Non-perishable)"
                value={newItemForm.shelfLife}
                onChange={e => setNewItemForm({ ...newItemForm, shelfLife: e.target.value })}
                className="w-full bg-[#0c0c0c] border border-[#2e2e2e] rounded-lg px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-[#e50914]"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Current Stock Quantity</label>
              <input 
                type="number" 
                placeholder="50"
                value={newItemForm.inStockQty || ''}
                onChange={e => setNewItemForm({ ...newItemForm, inStockQty: Number(e.target.value) })}
                className="w-full bg-[#0c0c0c] border border-[#2e2e2e] rounded-lg px-3 py-2 text-zinc-100 font-mono text-xs focus:outline-none focus:border-[#e50914]"
              />
            </div>
          </div>

          <Button 
            onClick={handleAddNewCatalogItem} 
            disabled={savingNewItem}
            className="w-full bg-[#e50914] hover:bg-[#ff1e27] text-white font-bold py-2.5 mt-2 shadow-sm tactile-press"
          >
            {savingNewItem ? 'Saving & Appending to Google Sheet...' : '✓ Add Item & Append to Google Sheet'}
          </Button>
        </div>
      </Modal>

      {/* NEW PROJECT MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Corporate Hamper Project">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Project / Event Name</label>
            <input 
              type="text" 
              placeholder="e.g. Taj Hotel Onam Hamper 2026"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="w-full bg-[#0c0c0c] border border-[#2e2e2e] rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#e50914]"
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Client Name</label>
            <input 
              type="text" 
              placeholder="e.g. Taj Malabar Resort & Spa"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full bg-[#0c0c0c] border border-[#2e2e2e] rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#e50914]"
            />
          </div>
          <Button onClick={handleCreateProject} className="w-full bg-[#e50914] hover:bg-[#ff1e27] text-white font-bold py-2.5 shadow-sm tactile-press">
            Create Project & Open Atelier Workstation
          </Button>
        </div>
      </Modal>
    </div>
  );
};
export default HamperStudio;
