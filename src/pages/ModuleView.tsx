import React, { useState, useEffect } from 'react';
import { 
  Factory, FileText, HardDrive, FileSpreadsheet, 
  RotateCcw, Sparkles, Plus, CheckSquare, 
  ArrowUpRight, Users, MessageSquare, Scale, Cpu, Megaphone,
  Search, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useVersion } from '../context/VersionContext';
import { V2_SPREADSHEET_SCHEMAS } from '../config/v2Schema';
import seedDataV2 from '../data/seedDataV2.json';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { FileViewer, FileData } from '../components/ui/FileViewer';
import { FileUpload } from '../components/ui/FileUpload';
import { Drawer } from '../components/ui/Drawer';
import { Modal } from '../components/ui/Modal';
import { collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { auditLogService } from '../services/audit';
import { GoogleSheetsService } from '../services/google';

const moduleGuides: Record<string, { purpose: string; tabs: { name: string; desc: string }[]; tip?: string }> = {
  customers: {
    purpose: 'Manage Goodoria customer database, sales pipeline stage, orders, and interaction logs.',
    tabs: [
      { name: 'Customer Master', desc: 'Main customer profiles (business names, contact details, status).' },
      { name: 'Sales Pipeline', desc: 'Deal tracking from sample stage to closing value.' },
      { name: 'Interaction Log', desc: 'Historical log of calls, WhatsApps, meetings, and emails.' },
      { name: 'Orders', desc: 'Invoiced wholesale transactions, quantities, and delivery status.' },
      { name: 'Follow-up Dashboard', desc: 'Automated views showing leads and payments due today.' }
    ],
    tip: 'Everything links back to Customer ID. Always reference the ID rather than re-typing customer names.'
  },
  sales: {
    purpose: 'Track deal progression, estimated contract values, and closing probabilities.',
    tabs: [
      { name: 'Sales Pipeline', desc: 'Active deal records, assigned owners, and next follow-up dates.' },
      { name: 'Customer Master', desc: 'Customer directory lookup.' },
      { name: 'Orders', desc: 'Wholesale order statuses and links.' }
    ],
    tip: 'Keep stages updated (e.g. sample sent, won, lost) to generate accurate pipeline forecast metrics.'
  },
  vendors: {
    purpose: 'Directory of cacao farmers, packaging vendors, printers, and services.',
    tabs: [
      { name: 'Vendor Master', desc: 'Master supplier register, categories, and contact info.' },
      { name: 'Product & Pricing', desc: 'Items supplied, standard cost, MOQ, and alternate vendors.' },
      { name: 'Purchase Orders', desc: 'Sourcing orders, expected arrivals, and receipt confirmations.' },
      { name: 'Payments & Invoices', desc: 'Transaction logs, amounts paid, balance due, and dates.' },
      { name: 'Performance & Relationship', desc: 'Ratings for quality, timeliness, and communication.' }
    ],
    tip: 'Use performance reviews (1-5 ratings) to negotiate pricing and optimize cacao supply chains.'
  },
  production: {
    purpose: 'Track manufacturing runs outsourced to chocolate factory vendors.',
    tabs: [
      { name: 'Production Master', desc: 'Active outsourced batches, cacao weights, and completion dates.' },
      { name: 'Goods Received', desc: 'Inventory counts received back, damage logging, and QC passes.' },
      { name: 'Batch Tracker', desc: 'Traceability database with manufacturing/expiry dates and stock.' },
      { name: 'Manufacturing Costs', desc: 'Detailed cost breakdown including transport and testing.' }
    ],
    tip: 'Every production batch is traceable. Track batch numbers to maintain food compliance.'
  },
  procurement: {
    purpose: 'Manage raw material supply and outsourced manufacturing runs.',
    tabs: [
      { name: 'Production Orders', desc: 'Active raw materials sent and expected product return dates.' },
      { name: 'Goods Received', desc: 'Check received quantities, damages, and log receiver staff.' },
      { name: 'Packaging Management', desc: 'Track boxes, stand-up pouches, stickers, and MOQ status.' },
      { name: 'Cost Tracker', desc: 'Track manufacturing, transport, packaging, and testing costs.' },
      { name: 'Batch Tracker', desc: 'Food traceability, manufacturing dates, and shelf-life tracking.' }
    ],
    tip: 'Keep expected completion and return dates updated for automated calendar coordination.'
  },
  packaging: {
    purpose: 'Detailed digital dashboard for packaging pouches, labels, and boxes.',
    tabs: [
      { name: 'Packaging Master', desc: 'Artwork versions, pouch/box sizes, materials, and unit costs.' },
      { name: 'Packaging Orders', desc: 'Orders placed, expected deliveries, and receipt confirmations.' },
      { name: 'Artwork & Designs', desc: 'Creative designs, version histories, and Drive links.' },
      { name: 'Packaging Samples', desc: 'Vendor sampling checks, approvals, and review feedback.' }
    ],
    tip: 'Always log design version changes (V1, V2) to prevent printing obsolete graphics.'
  },
  marketing: {
    purpose: 'Manage content scheduling, campaigns, exhibitions, and brand assets.',
    tabs: [
      { name: 'Campaign Master', desc: 'Summer launches, Diwali offers, objectives, and budget tracking.' },
      { name: 'Content Planner', desc: 'Instagram reels, stories, captions, and Scheduled/Posted status.' },
      { name: 'Marketing Calendar', desc: 'Visual timeline tracking platforms (Instagram, events, ads).' },
      { name: 'Events & Exhibitions', desc: 'Log distribuition samples, sales made, and leads collected.' }
    ],
    tip: 'Use standard color codes (Posted = Green, Scheduled = Blue, Designing = Yellow) to sync calendars.'
  },
  finance: {
    purpose: 'Consolidated cash flow command board, receivables, and payables.',
    tabs: [
      { name: 'Finance Master', desc: 'General ledger for incomes, expenses, and payment modes.' },
      { name: 'Accounts Receivable', desc: 'Client balances, invoices, and payment tracking.' },
      { name: 'Accounts Payable', desc: 'Vendor invoices, balances, and payment schedules.' },
      { name: 'Cash Flow Dashboard', desc: 'Cash inflows, outflows, and running account balances.' }
    ],
    tip: 'Ensure Invoice Number is added for seamless reconciliation with bank statements.'
  },
  legal: {
    purpose: 'Compliance licensing directory, certificates, and contract files.',
    tabs: [
      { name: 'Legal Master', desc: 'GST, FSSAI, trademarks, rental contracts, and authority officers.' },
      { name: 'Renewal Tracker', desc: 'Alerts, expected approvals, and renewal fee payments.' },
      { name: 'Legal Activity Log', desc: 'Inspections, meetings, CA submissions, and next action items.' },
      { name: 'Document Repository', desc: 'Clean index of Google Drive PDF certificate files.' }
    ],
    tip: 'Always set a Renewal Reminder offset (e.g. 30/60/90 days) to trigger early platform alerts.'
  },
  meetings: {
    purpose: 'Minutes registration, keputusan (decisions), and action item assignments.',
    tabs: [
      { name: 'Meeting Register', desc: 'Agendas, organizer names, status, and Google Doc links.' },
      { name: 'Decision Register', desc: 'Key business decisions, reasons, and implementation outcomes.' },
      { name: 'Action Items', desc: 'To-do lists assigned during the meeting with status tracking.' }
    ],
    tip: 'Linking decisions directly to action items ensures tasks get executed and never lost.'
  },
  research: {
    purpose: 'Knowledge repository for functional ingredients, competitor USPs, and SOPs.',
    tabs: [
      { name: 'Research Master', desc: 'Cocoa studies, product development stage, and recommendations.' },
      { name: 'Competitor Database', desc: 'Competitor pricing, strengths, USPs, and observations.' },
      { name: 'Functional Food Research', desc: 'Scientific benefits, cost impact, and suppliers.' },
      { name: 'Product Development', desc: 'Prototype concepts, costing, and testing progression.' },
      { name: 'SOP & Internal Knowledge', desc: 'Departmental Standard Operating Procedures.' }
    ],
    tip: 'Log research findings here instead of scattered documents to keep the team aligned.'
  },
  documents: {
    purpose: 'Vault for all digital assets, templates, and Google Drive links.',
    tabs: [
      { name: 'Asset Master', desc: 'Central file index, file types, parent folders, and owners.' },
      { name: 'Brand Assets', desc: 'Logos, fonts, color palettes, and usage guidelines.' },
      { name: 'Packaging Assets', desc: 'Dielines, artwork PDFs, and vendor spec sheets.' },
      { name: 'Legal Assets', desc: 'GST/FSSAI digital copies and validity schedules.' }
    ],
    tip: 'Uploading files from this screen automatically registers them in the Google Sheet index.'
  },
  products: {
    purpose: 'Product catalog master registry - chocolate recipes, SKUs, and weights.',
    tabs: [
      { name: 'Product Master', desc: 'Recipe specs (Almond Noir, Orange Sunset), weight variants, and status.' }
    ],
    tip: 'Ensure SKU remains unique and uppercase (e.g., ALM-NOIR-25G) to keep billing accurate.'
  },
  whatsapp: {
    purpose: 'WhatsApp broadcast campaign manager, contact groups, and message templates.',
    tabs: [
      { name: 'Contact Master', desc: 'Full contact base synced from customers, leads, and vendors.' },
      { name: 'Broadcast Campaigns', desc: 'Message delivery counts, read rates, and conversions.' },
      { name: 'Conversation Tracker', desc: 'Incoming/outgoing log, mood indicators, and action items.' },
      { name: 'Follow-up Tracker', desc: 'Auto reminders to follow up with cold contacts.' },
      { name: 'WhatsApp Templates', desc: 'Quick templates for payment reminders and launches.' }
    ],
    tip: 'Check templates status before sending broadcasts to ensure WhatsApp approval.'
  }
};

const STATIC_TABS: Record<string, string[]> = {
  'customers': ['Customer Master'],
  'sales': ['Sales Pipeline'],
  'vendors': ['Vendor Master'],
  'production': ['Production Orders', 'Batch Tracker', 'Tempering & Moulding', 'Manufacturing Costs', 'Inventory Control'],
  'procurement': ['Production Orders', 'Vendor Master', 'Purchase Orders', 'Packaging Master', 'Ingredients Cost'],
  'packaging': ['Packaging Master'],
  'legal': ['Legal Master'],
  'finance': ['Finance Master'],
  'marketing': ['Campaign Master', 'Content Planner', 'Marketing Calendar', 'Events & Exhibitions', 'Marketing Costs'],
  'whatsapp': ['WhatsApp Contact Master', 'Broadcast Campaigns', 'Conversation Tracker', 'Follow-up Tracker', 'WhatsApp Templates', 'Analytics Dashboard', '[Lookup] Vendor Master', '[Lookup] Customer Master'],
  'meetings': ['Meeting Register', 'Meetings', 'Decision Register', 'Action Items', 'Sheet1'],
  'research': ['Research Master'],
  'documents': ['Asset Master'],
  'products': ['Product Master'],
};

interface ModuleViewProps {
  moduleId: string;
}

export const ModuleView: React.FC<ModuleViewProps> = ({ moduleId }) => {
  const { profile, googleToken, signInWithGoogle } = useAuth();
  const { sendNotification } = useNotifications();
  const [showGuide, setShowGuide] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(
    (localStorage.getItem('gud_view_mode') as 'table' | 'cards') || 'table'
  );

  const handleSetViewMode = (mode: 'table' | 'cards') => {
    setViewMode(mode);
    localStorage.setItem('gud_view_mode', mode);
  };

  // Firestore Production Batches State
  const [batches, setBatches] = useState<any[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [variant, setVariant] = useState('Almond Noir (25g)');
  const [weight, setWeight] = useState('15');
  const [temp, setTemp] = useState('31.5');
  const [humidity, setHumidity] = useState('45');
  const [batchStatus, setBatchStatus] = useState('Tempered');

  // Firestore Document Vault State
  const [documents, setDocuments] = useState<FileData[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);

  const { version } = useVersion();

  // Google Sheets Sync Settings (6 Streamlined v2 Spreadsheets)
  const getSpreadsheetIdForModule = (modId: string): string => {
    const env = import.meta.env;
    switch (modId) {
      case 'orders':
      case 'customers':
      case 'sales':
        return env.VITE_GOOGLE_SHEET_ORDERS || '1uUfxL_k6k4ebzHPWL4pwwtdIaxzZ-6mW4mqB_6iJnXo';
      case 'supply-chain':
      case 'vendors':
      case 'production':
      case 'procurement':
      case 'packaging':
      case 'products':
        return env.VITE_GOOGLE_SHEET_VENDORS || '1JDUQjgETO7xF0M2GaFsejkF3CWJGpPkz3zD9Qse9Zv8';
      case 'marketing':
        return env.VITE_GOOGLE_SHEET_MARKETING || '1UI7o2XDjfea2QPDQ3kGE97p_0bIJhv5eK2XSNnrzT4M';
      case 'finance':
        return env.VITE_GOOGLE_SHEET_FINANCE || '1WuaX5JZLQ1IGNUBaVhK0dcqzrEbYX2fPz0qv6VBujHE';
      case 'legal':
        return env.VITE_GOOGLE_SHEET_LEGAL || '1zvRLFrAeCs5siW4UdijmF_JNSJLOS8opDirQY5lEZAI';
      case 'tasks':
        return env.VITE_GOOGLE_SHEET_TASKS || '1PIw-enBWLfu_LGwWDh6u1tdfjGCPO4P-Q5t2R0Eit84';
      default:
        return env.VITE_GOOGLE_SHEET_ORDERS || '1uUfxL_k6k4ebzHPWL4pwwtdIaxzZ-6mW4mqB_6iJnXo';
    }
  };

  const [sheetId, setSheetId] = useState(getSpreadsheetIdForModule(moduleId));
  const [sheetRange, setSheetRange] = useState('A2:Z');
  const [syncing, setSyncing] = useState(false);
  const [sheetRows, setSheetRows] = useState<any[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);

  // CRM Multi-tab & dynamic headers state
  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  
  // CRM Direct writeback states
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [editValues, setEditValues] = useState<string[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newRowValues, setNewRowValues] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  // Tick counter to trigger manual re-fetch (auto-refresh on tab focus)
  const [refreshTick, setRefreshTick] = useState(0);

  // Sync state values when moduleId changes
  useEffect(() => {
    const spreadsheetId = getSpreadsheetIdForModule(moduleId);
    setSheetId(spreadsheetId);
    setSearchTerm('');
    setSelectedRow(null);
    setIsAddOpen(false);
  }, [moduleId]);

  // Load Spreadsheet Tabs dynamically when moduleId, version, or googleToken changes
  useEffect(() => {
    const loadSpreadsheetTabs = async () => {
      const mappedKey = (moduleId === 'sales' || moduleId === 'customers') ? 'orders' : ((moduleId === 'production' || moduleId === 'procurement' || moduleId === 'packaging' || moduleId === 'products' || moduleId === 'vendors') ? 'supply-chain' : moduleId);
      const v2Schema = V2_SPREADSHEET_SCHEMAS[mappedKey];
      if (v2Schema) {
        const tabList = v2Schema.tabs.map(t => t.name);
        setTabs(tabList);
        if (tabList.length > 0) {
          setActiveTab(tabList[0]);
        } else {
          setActiveTab('');
        }
        return;
      }

      const activeSheetId = getSpreadsheetIdForModule(moduleId);
      
      // Fallback to static tabs if no Google Token is present
      if (!googleToken || !activeSheetId) {
        const staticList = STATIC_TABS[moduleId] || [];
        setTabs(staticList);
        if (staticList.length > 0) {
          const defaultTabs: Record<string, string> = {
            'customers': 'Customer Master',
            'sales': 'Sales Pipeline',
            'vendors': 'Vendor Master',
            'production': 'Production Orders',
            'procurement': 'Production Orders',
            'packaging': 'Packaging Master',
            'legal': 'Legal Master',
            'finance': 'Finance Master',
            'marketing': 'Campaign Master',
            'whatsapp': 'WhatsApp Contact Master',
            'meetings': 'Meeting Register',
            'research': 'Research Master',
            'documents': 'Asset Master',
            'products': 'Product Master',
          };
          const preferred = defaultTabs[moduleId];
          if (preferred && staticList.includes(preferred)) {
            setActiveTab(preferred);
          } else {
            setActiveTab(staticList[0]);
          }
        } else {
          setActiveTab('');
        }
        return;
      }

      try {
        const metadata = await GoogleSheetsService.getSpreadsheetMetadata(googleToken, activeSheetId);
        const tabNames = metadata.sheets.map((s: any) => s.properties.title);
        
        let filteredTabNames = tabNames;
        if (moduleId === 'production') {
          filteredTabNames = tabNames.filter(name => 
            name.toLowerCase().includes('production') || 
            name.toLowerCase().includes('received') || 
            name.toLowerCase().includes('batch') ||
            name.toLowerCase().includes('cost') ||
            name.toLowerCase().includes('manufacturing')
          );
        } else if (moduleId === 'procurement') {
          filteredTabNames = tabNames.filter(name => 
            name.toLowerCase().includes('orders') || 
            name.toLowerCase().includes('received') || 
            name.toLowerCase().includes('packaging') || 
            name.toLowerCase().includes('cost') ||
            name.toLowerCase().includes('batch')
          );
        }

        setTabs(filteredTabNames);
        if (filteredTabNames.length > 0) {
          const defaultTabs: Record<string, string> = {
            'customers': 'Customer Master',
            'sales': 'Sales Pipeline',
            'vendors': 'Vendor Master',
            'production': 'Production Orders',
            'procurement': 'Production Orders',
            'packaging': 'Packaging Master',
            'legal': 'Legal Master',
            'finance': 'Finance Master',
            'marketing': 'Campaign Master',
            'whatsapp': 'WhatsApp Contact Master',
            'meetings': 'Meeting Register',
            'research': 'Research Master',
            'documents': 'Asset Master',
            'products': 'Product Master',
          };
          const preferred = defaultTabs[moduleId];
          if (preferred && filteredTabNames.includes(preferred)) {
            setActiveTab(preferred);
          } else {
            setActiveTab(filteredTabNames[0]);
          }
        }
      } catch (err) {
        console.warn("Failed to load spreadsheet tabs, falling back to static list:", err);
        const staticList = STATIC_TABS[moduleId] || [];
        setTabs(staticList);
        if (staticList.length > 0) {
          setActiveTab(staticList[0]);
        } else {
          setActiveTab('');
        }
      }
    };
    loadSpreadsheetTabs();
  }, [moduleId, version, googleToken]);

  // Auto-refresh on tab focus (window visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && googleToken && activeTab) {
        setRefreshTick(t => t + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [googleToken, activeTab]);

  // Load live Google Sheet headers and data when activeTab changes directly from Google Sheets
  useEffect(() => {
    if (!moduleId || !activeTab || !tabs.includes(activeTab)) {
      setSheetRows([]);
      setHeaders([]);
      return;
    }

    setSheetLoading(true);
    const activeSheetId = getSpreadsheetIdForModule(moduleId);

    if (activeSheetId) {
      const loadDirectValues = async () => {
        try {
          // 1. Fetch headers (row 1)
          let headerRow: string[] = [];
          try {
            const headerResponse = await GoogleSheetsService.getSpreadsheetValues(
              googleToken,
              activeSheetId,
              `'${activeTab}'!A1:Z1`
            );
            headerRow = (headerResponse.values && headerResponse.values[0]) || [];
          } catch (e) {
            console.warn('[Sheets Loader] Header fetch failed, using schema fallback:', e);
          }

          const mappedKey = (moduleId === 'sales' || moduleId === 'customers') ? 'orders' : ((moduleId === 'production' || moduleId === 'procurement' || moduleId === 'packaging' || moduleId === 'products' || moduleId === 'vendors') ? 'supply-chain' : moduleId);
          const v2Schema = V2_SPREADSHEET_SCHEMAS[mappedKey];
          const tabSchema = v2Schema?.tabs.find(t => t.name === activeTab);
          const effectiveHeaders = tabSchema ? tabSchema.headers : (headerRow.length > 0 ? headerRow : []);

          if (effectiveHeaders.length === 0) {
            setHeaders([]);
            setSheetRows([]);
            setSheetLoading(false);
            return;
          }
          setHeaders(effectiveHeaders);

          // 2. Fetch rows (rows 2 to 100)
          let dataValues: any[] = [];
          if (headerRow.length > 0) {
            try {
              const endColLetter = String.fromCharCode(65 + Math.min(headerRow.length - 1, 25));
              const dataResponse = await GoogleSheetsService.getSpreadsheetValues(
                googleToken,
                activeSheetId,
                `'${activeTab}'!A2:${endColLetter}10000`
              );
              if (dataResponse && dataResponse.values) {
                dataValues = dataResponse.values;
              }
            } catch (e) {
              console.warn('[Sheets Loader] Values fetch failed:', e);
            }
          }

          if (dataValues.length > 0) {
            setSheetRows(dataValues.map((row, idx) => ({
              _rowNumber: idx + 2,
              values: effectiveHeaders.map((_, colIdx) => row[colIdx] !== undefined ? String(row[colIdx]) : '')
            })));
          } else {
            // Seed fallback for tab
            const seedRows = (seedDataV2 as any)[activeTab] || [];
            setSheetRows(seedRows.map((r: any, idx: number) => ({
              _rowNumber: idx + 2,
              values: effectiveHeaders.map(h => r[h] !== undefined ? String(r[h]) : '')
            })));
          }
          setSheetLoading(false);
        } catch (err) {
          console.error("[Sheets Loader] Direct load failed for tab:", activeTab, err);
          const mappedKey = (moduleId === 'sales' || moduleId === 'customers') ? 'orders' : ((moduleId === 'production' || moduleId === 'procurement' || moduleId === 'packaging' || moduleId === 'products' || moduleId === 'vendors') ? 'supply-chain' : moduleId);
          const v2Schema = V2_SPREADSHEET_SCHEMAS[mappedKey];
          const tabSchema = v2Schema?.tabs.find(t => t.name === activeTab);
          if (tabSchema) {
            setHeaders(tabSchema.headers);
            const seedRows = (seedDataV2 as any)[activeTab] || [];
            setSheetRows(seedRows.map((r: any, idx: number) => ({
              _rowNumber: idx + 2,
              values: tabSchema.headers.map(h => r[h] !== undefined ? String(r[h]) : '')
            })));
          }
          setSheetLoading(false);
        }
      };
      loadDirectValues();
    } else {
      const mappedKey = (moduleId === 'sales' || moduleId === 'customers') ? 'orders' : ((moduleId === 'production' || moduleId === 'procurement' || moduleId === 'packaging' || moduleId === 'products' || moduleId === 'vendors') ? 'supply-chain' : moduleId);
      const v2Schema = V2_SPREADSHEET_SCHEMAS[mappedKey];
      const tabSchema = v2Schema?.tabs.find(t => t.name === activeTab);
      if (tabSchema) {
        setHeaders(tabSchema.headers);
        const seedRows = (seedDataV2 as any)[activeTab] || [];
        setSheetRows(seedRows.map((r: any, idx: number) => ({
          _rowNumber: idx + 2,
          values: tabSchema.headers.map(h => r[h] !== undefined ? String(r[h]) : '')
        })));
      }
      setSheetLoading(false);
    }
  }, [moduleId, activeTab, googleToken, tabs, refreshTick]);

  // Initialize editValues and newRowValues helpers
  useEffect(() => {
    if (selectedRow) {
      setEditValues([...selectedRow.values]);
    } else {
      setEditValues([]);
    }
  }, [selectedRow]);

  useEffect(() => {
    if (headers.length > 0) {
      setNewRowValues(new Array(headers.length).fill(''));
    }
  }, [headers]);

  // Handle direct row updates back to Google Sheet
  const handleEditRowSave = async () => {
    const activeSheetId = getSpreadsheetIdForModule(moduleId);
    if (!activeSheetId || !selectedRow || !googleToken) return;

    setSyncing(true);
    try {
      const endColLetter = String.fromCharCode(65 + Math.min(editValues.length - 1, 25));
      const writeRange = `'${activeTab}'!A${selectedRow._rowNumber}:${endColLetter}${selectedRow._rowNumber}`;
      
      await GoogleSheetsService.updateSpreadsheetValues(
        googleToken,
        activeSheetId,
        writeRange,
        [editValues]
      );

      // Update local state directly so UI updates immediately
      setSheetRows(prev => prev.map(row => 
        row._rowNumber === selectedRow._rowNumber ? { ...row, values: editValues } : row
      ));

      if (profile) {
        await auditLogService.logActivity(
          { uid: profile.uid, email: profile.email, displayName: profile.displayName },
          `Edited row ${selectedRow._rowNumber} in Google Sheet tab ${activeTab}`,
          'system',
          `Values: ${JSON.stringify(editValues)}`
        );
      }

      setSelectedRow(null);
    } catch (err: any) {
      console.error("Failed to update Google Sheet row:", err);
      alert(`Error saving to Google Sheets: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Handle direct row appends back to Google Sheet
  const handleAddRowSave = async () => {
    const activeSheetId = getSpreadsheetIdForModule(moduleId);
    if (!activeSheetId || !googleToken || !activeTab) return;

    setSyncing(true);
    try {
      const endColLetter = String.fromCharCode(65 + Math.min(newRowValues.length - 1, 25));
      const writeRange = `'${activeTab}'!A:${endColLetter}`;

      await GoogleSheetsService.appendSpreadsheetValues(
        googleToken,
        activeSheetId,
        writeRange,
        [newRowValues]
      );

      // Append locally
      const nextRowNumber = sheetRows.length + 2;
      setSheetRows(prev => [...prev, {
        _rowNumber: nextRowNumber,
        values: newRowValues
      }]);

      if (profile) {
        await auditLogService.logActivity(
          { uid: profile.uid, email: profile.email, displayName: profile.displayName },
          `Appended new record to Google Sheet tab ${activeTab}`,
          'system',
          `Values: ${JSON.stringify(newRowValues)}`
        );
      }

      setIsAddOpen(false);
      setNewRowValues(new Array(headers.length).fill(''));
    } catch (err: any) {
      console.error("Failed to append row to Google Sheets:", err);
      alert(`Error appending to Google Sheets: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Beta B2B form states
  const [b2bName, setB2bName] = useState('');
  const [b2bItem, setB2bItem] = useState('');
  const [b2bAmount, setB2bAmount] = useState('45000');
  const [b2bEntries, setB2bEntries] = useState<any[]>([]);

  // Real-time Firestore sync for Production batches
  useEffect(() => {
    if (moduleId !== 'production') return;
    setBatchLoading(true);
    const q = query(collection(db, 'production_batches'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setBatches(list);
      setBatchLoading(false);
    });
    return () => unsubscribe();
  }, [moduleId]);

  // Real-time Firestore sync for Documents
  useEffect(() => {
    if (moduleId !== 'documents') return;
    setDocsLoading(true);
    const q = query(collection(db, 'documents'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: FileData[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as FileData);
      });
      setDocuments(list);
      setDocsLoading(false);
    });
    return () => unsubscribe();
  }, [moduleId]);

  // Handle logging new production batch
  const handleLogBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const nextBatchId = `BATCH${Math.floor(Math.random() * 9000 + 1000)}`;
      const payload = {
        batchId: nextBatchId,
        variant,
        weightKg: parseFloat(weight),
        temperature: parseFloat(temp),
        humidity: parseFloat(humidity),
        status: batchStatus,
        operator: profile.displayName,
        timestamp: Date.now()
      };

      await addDoc(collection(db, 'production_batches'), payload);
      
      await auditLogService.logActivity(
        { uid: profile.uid, email: profile.email, displayName: profile.displayName },
        'Logged new chocolate production batch',
        'production',
        `Logged batch: ${nextBatchId} (${variant}, ${weight}kg)`,
        nextBatchId
      );

      // Trigger notification if status is Warning
      if (parseFloat(temp) > 33.5 || parseFloat(temp) < 29) {
        await sendNotification({
          title: 'Tempering Chamber Temperature Warning',
          message: `Batch ${nextBatchId} registered abnormal temperature ${temp}°C. Quality Check triggered.`,
          priority: 'urgent',
          channels: ['in-app', 'discord'],
          targetRoles: ['Owner', 'Production']
        });
      }

      // Reset form
      setWeight('15');
      setTemp('31.5');
    } catch (err) {
      console.error(err);
    }
  };

  // Handle document upload reference registration in Firestore
  const handleFileUploadComplete = async (fileInfo: any) => {
    if (!profile) return;
    try {
      await addDoc(collection(db, 'documents'), {
        name: fileInfo.name,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        webViewLink: fileInfo.webViewLink || '',
        modifiedTime: new Date().toLocaleString(),
        timestamp: Date.now(),
        owners: [profile.displayName],
        versionHistory: [
          { version: 1, modifiedTime: new Date().toLocaleString(), modifiedBy: profile.displayName, size: fileInfo.size }
        ],
        contentString: fileInfo.mimeType.startsWith('text/') ? "ID,Date,Product,Quantity,Revenue\nSALE0001,2026-07-01,Almond Noir 25g,120,₹14400\nSALE0002,2026-07-03,Sunset Orange 8g,400,₹24000\nSALE0003,2026-07-05,Lemon Cacao 25g,95,₹11400" : undefined
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Google sheet mock data preview
  const mockSheetRows = [
    { col1: 'CUST0082', col2: 'Deepika Sweets Wholesale', col3: 'Mumbai, MH', col4: 'B2B Client' },
    { col1: 'CUST0083', col2: 'Gourmet Organic Cafe', col3: 'Kochi, KL', col4: 'Retail Partner' },
    { col1: 'CUST0084', col2: 'Grand Hyatt Pastry Shop', col3: 'Bengaluru, KA', col4: 'B2B Client' }
  ];

  // Execute Sheets Sync
  const handleSheetsSync = () => {
    setSyncing(true);
    setTimeout(async () => {
      setSyncing(false);
      if (profile) {
        await auditLogService.logActivity(
          { uid: profile.uid, email: profile.email, displayName: profile.displayName },
          `Synchronized ${moduleId} database sheet`,
          'system',
          `Pulled data from Spreadsheet: ${sheetId}, range: ${sheetRange}`
        );
      }
    }, 1200);
  };

  // Handle B2B beta additions
  const handleAddB2b = (e: React.FormEvent) => {
    e.preventDefault();
    if (!b2bName.trim()) return;

    const nextId = moduleId === 'procurement' 
      ? `PROC${Math.floor(Math.random() * 9000 + 1000)}`
      : `SALE${Math.floor(Math.random() * 9000 + 1000)}`;

    const newEntry = {
      id: nextId,
      name: b2bName,
      item: b2bItem,
      amount: `₹${parseInt(b2bAmount).toLocaleString()}`,
      status: 'Pending'
    };

    setB2bEntries([newEntry, ...b2bEntries]);
    setB2bName('');
    setB2bItem('');
  };

  // ----------------------------------------------------
  // 1. ACTIVE MODULE: PRODUCTION (Tempering Room Logger)
  // ----------------------------------------------------
  if (moduleId === 'production') {
    const columns = [
      { key: 'batchId', header: 'Batch ID', render: (row: any) => <span className="font-mono font-bold text-slate-400">{row.batchId}</span> },
      { key: 'variant', header: 'Chocolate Flavor', className: 'font-semibold' },
      { key: 'weightKg', header: 'Batch Weight (kg)' },
      { key: 'temperature', header: 'Chamber Temp', render: (row: any) => <span>{row.temperature}°C</span> },
      { key: 'humidity', header: 'Humidity', render: (row: any) => <span>{row.humidity}%</span> },
      { key: 'status', header: 'Process State', render: (row: any) => <StatusBadge status={row.status} /> },
      { key: 'operator', header: 'Operator' }
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <Factory className="w-6 h-6 text-emerald-700" />
              <span>Production Control Center</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Log batches, monitor tempering temperatures, and manage chocolate mold runs.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Batch Logger Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Log Tempering Batch</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogBatch} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">Chocolate Flavor / Variant</label>
                  <select
                    value={variant}
                    onChange={(e) => setVariant(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
                  >
                    <option>Almond Noir (25g)</option>
                    <option>Orange Sunset (25g)</option>
                    <option>Peanut Royale (25g)</option>
                    <option>Sun-Kissed Lemon (25g)</option>
                    <option>Almond Noir (8g)</option>
                    <option>Orange Sunset (8g)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400">Tempering Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400">Room Humidity (%)</label>
                    <input
                      type="number"
                      required
                      value={humidity}
                      onChange={(e) => setHumidity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400">Batch Status</label>
                    <select
                      value={batchStatus}
                      onChange={(e) => setBatchStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
                    >
                      <option>Tempered</option>
                      <option>Cooling</option>
                      <option>Packaged</option>
                      <option>Warning (Temp Check)</option>
                    </select>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Commit Batch to Database
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Active Batches Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Active Tempering Run History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table
                columns={columns}
                data={batches}
                rowIdKey="batchId"
                loading={batchLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. ACTIVE MODULE: DOCUMENTS (Google Drive Vault Explorer)
  // ----------------------------------------------------
  if (moduleId === 'documents') {
    const docColumns = [
      { key: 'name', header: 'File Name', className: 'font-semibold text-slate-800 dark:text-slate-200' },
      { key: 'size', header: 'File Size' },
      { key: 'modifiedTime', header: 'Last Modified' },
      { key: 'owners', header: 'File Creator', render: (row: FileData) => <span>{row.owners?.join(', ')}</span> }
    ];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-emerald-700" />
            <span>Document Sync Vault</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Google Drive integrated folder. Sync compliance docs, wholesale agreements, and batch specs.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Drive Explorer Grid */}
          <Card className="lg:col-span-2 space-y-6">
            <CardHeader>
              <CardTitle>Documents List</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table
                columns={docColumns}
                data={documents}
                rowIdKey="id"
                loading={docsLoading}
                rowActions={(row) => [
                  { label: 'Open Previewer', onClick: () => setSelectedFile(row) },
                  { label: 'Download file', onClick: () => console.log('Downloading', row.name) }
                ]}
              />
            </CardContent>
          </Card>

          {/* Uploader and Viewer Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Secure Document Ingest</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload onUploadComplete={handleFileUploadComplete} />
              </CardContent>
            </Card>

            {selectedFile && (
              <Drawer
                isOpen={true}
                onClose={() => setSelectedFile(null)}
                title="Viewer Pane"
              >
                <FileViewer file={selectedFile} />
              </Drawer>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. GOOGLE SYNC SYNC MODULES (Customers, Vendors, Finance, Products)
  // ----------------------------------------------------
  const isSyncRequired = [
    'orders', 'supply-chain', 'tasks', 'customers', 'sales', 'whatsapp', 'production', 
    'procurement', 'vendors', 'products', 'marketing', 'finance', 'research', 
    'legal', 'meetings', 'packaging'
  ].includes(moduleId);
  if (isSyncRequired) {
    // Dynamically build table columns based on spreadsheet headers
    const dynamicColumns = headers.map((header, colIdx) => ({
      key: `col_${colIdx}`,
      header: header || `Col ${colIdx + 1}`,
      className: colIdx === 1 ? 'font-semibold' : '',
      render: (row: any) => {
        const val = row.values[colIdx] || '';
        // If the header looks like a status, render a status badge
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('status') || lowerHeader.includes('state')) {
          const lowerVal = val.toLowerCase();
          const badgeType = lowerVal.includes('active') || lowerVal.includes('complete') || lowerVal.includes('paid') ? 'success' :
                            lowerVal.includes('pending') || lowerVal.includes('progress') ? 'warning' : 'neutral';
          return <StatusBadge status={badgeType} label={val} />;
        }
        return <span>{val}</span>;
      }
    }));

    // Filter rows based on search term
    const filteredRows = sheetRows.filter(row => 
      row.values.some((val: string) => val.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-neutral-300" />
              <span className="capitalize">{moduleId} CRM Portal</span>
            </h1>
            <p className="text-xs text-[#aaaaaa] mt-0.5">
              Live bi-directional synchronization with Google Sheets. Updates save instantly.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {googleToken ? (
              <div className="flex items-center gap-2">
                <StatusBadge status="success" label="Google Synced" />
                <Button
                  type="button"
                  size="xs"
                  variant="primary"
                  onClick={async () => {
                    if (!googleToken) return;
                    setSyncing(true);
                    try {
                      const activeSheetId = getSpreadsheetIdForModule(moduleId);
                      const seedRows = (seedDataV2 as any)[activeTab] || [];
                      if (seedRows.length === 0) {
                        sendNotification({
                          title: 'Nothing to Sync',
                          message: `Tab ${activeTab} has no offline seed rows.`,
                          priority: 'medium',
                          channels: ['in-app']
                        });
                        setSyncing(false);
                        return;
                      }

                      // Convert seed objects to array values matching headers
                      const valuesToPush = seedRows.map((r: any) => headers.map(h => r[h] !== undefined ? String(r[h]) : ''));
                      
                      // Push to Google Sheets API
                      await GoogleSheetsService.updateSpreadsheetValues(
                        googleToken,
                        activeSheetId,
                        `'${activeTab}'!A2`,
                        valuesToPush
                      );

                      sendNotification({
                        title: 'Live Push Successful!',
                        message: `Successfully wrote ${valuesToPush.length} records into '${activeTab}' on Google Sheets!`,
                        priority: 'high',
                        channels: ['in-app']
                      });
                    } catch (err: any) {
                      sendNotification({
                        title: 'Sync Error',
                        message: err?.message || 'Could not push to Google Sheets.',
                        priority: 'urgent',
                        channels: ['in-app']
                      });
                    } finally {
                      setSyncing(false);
                    }
                  }}
                  disabled={syncing}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  {syncing ? 'Pushing...' : `Push ${((seedDataV2 as any)[activeTab] || []).length} Rows to Sheet`}
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="xs" onClick={signInWithGoogle} className="border-[#383838] bg-[#272727] text-neutral-200 hover:bg-[#333333]">
                Authenticate Sheets API
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="border-[#383838] bg-[#272727] text-neutral-200 hover:bg-[#333333]"
              onClick={() => {
                setSheetLoading(true);
                const activeSheetId = getSpreadsheetIdForModule(moduleId);
                if (googleToken && activeSheetId && activeTab) {
                  const endColLetter = String.fromCharCode(65 + Math.min(headers.length - 1, 25));
                  GoogleSheetsService.getSpreadsheetValues(googleToken, activeSheetId, `'${activeTab}'!A2:${endColLetter}10000`)
                    .then(data => {
                      if (data && data.values) {
                        setSheetRows(data.values.map((row, idx) => ({
                          _rowNumber: idx + 2,
                          values: headers.map((_, colIdx) => row[colIdx] !== undefined ? String(row[colIdx]) : '')
                        })));
                      }
                    })
                    .finally(() => setSheetLoading(false));
                }
              }}
              disabled={sheetLoading}
              title="Refresh live data from Google Sheets"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${sheetLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Module Guide Banner */}
        {moduleGuides[moduleId] && (
          <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-3.5 relative overflow-hidden transition-all duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-[#272727] border border-[#383838] rounded-lg text-white mt-0.5">
                  <Info className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {moduleId.toUpperCase()} Guidance Guide
                  </h4>
                  <p className="text-[11px] text-[#aaaaaa] mt-0.5 leading-relaxed">
                    {moduleGuides[moduleId].purpose}
                  </p>
                  
                  {showGuide && (
                    <div className="mt-3 space-y-2 border-t border-[#282828] pt-2.5">
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                        {moduleGuides[moduleId].tabs.map((tab, idx) => (
                          <div key={idx} className="text-[11px] leading-tight">
                            <span className="font-bold text-neutral-200">📄 {tab.name}</span>
                            <span className="text-[#aaaaaa]"> — {tab.desc}</span>
                          </div>
                        ))}
                      </div>
                      {moduleGuides[moduleId].tip && (
                        <p className="text-[10px] text-neutral-300 bg-[#222222] p-2 rounded-lg border border-[#333333] font-medium">
                          💡 <b>Operational Tip:</b> {moduleGuides[moduleId].tip}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="text-[10px] font-semibold text-[#aaaaaa] hover:text-white px-2 py-0.5 border border-[#383838] bg-[#272727] rounded flex-shrink-0 tactile-press"
              >
                {showGuide ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
          </div>
        )}

        {/* Tab Switcher Navigation (Google Sheets mimic) */}
        {tabs.length > 0 && (
          <div className="border-b border-[#282828] flex items-center gap-1 overflow-x-auto pb-px scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchTerm('');
                  setSelectedRow(null);
                }}
                className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 tactile-press cursor-pointer ${
                  activeTab === tab 
                    ? 'border-white text-white font-bold bg-[#272727] rounded-t-lg'
                    : 'border-transparent text-[#aaaaaa] hover:text-white hover:bg-[#1f1f1f] rounded-t-lg'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* CRM Tools: Search and Action Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#888888] pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder={`Search in ${activeTab || 'sheet'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-white placeholder-[#888888]"
            />
          </div>
          <div className="flex items-center gap-1 bg-[#141414] p-1 border border-[#2e2e2e] rounded-lg flex-shrink-0">
            <button
              onClick={() => handleSetViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all duration-150 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#272727] text-white border border-[#383838] shadow-sm'
                  : 'text-[#aaaaaa] hover:text-white'
              }`}
            >
              🗃️ Table View
            </button>
            <button
              onClick={() => handleSetViewMode('cards')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all duration-150 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[#272727] text-white border border-[#383838] shadow-sm'
                  : 'text-[#aaaaaa] hover:text-white'
              }`}
            >
              🖼️ Card View
            </button>
          </div>
          {googleToken && headers.length > 0 && (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                const initialVals = new Array(headers.length).fill('');
                const mappedKey = (moduleId === 'sales' || moduleId === 'customers') ? 'orders' : ((moduleId === 'production' || moduleId === 'procurement' || moduleId === 'packaging' || moduleId === 'products' || moduleId === 'vendors') ? 'supply-chain' : moduleId);
                const v2Schema = V2_SPREADSHEET_SCHEMAS[mappedKey];
                const tabSchema = v2Schema?.tabs.find(t => t.name === activeTab);
                if (tabSchema && tabSchema.idHeader && tabSchema.idPrefix) {
                  const idIdx = headers.indexOf(tabSchema.idHeader);
                  if (idIdx !== -1) {
                    let maxNum = 0;
                    const allRows = [...sheetRows, ...((seedDataV2 as any)[activeTab] || [])];
                    allRows.forEach((r: any) => {
                      const val = r.values ? r.values[idIdx] : (tabSchema.idHeader ? r[tabSchema.idHeader] : undefined);
                      if (val && typeof val === 'string') {
                        const match = val.match(/(\d+)/);
                        if (match) {
                          const num = parseInt(match[1], 10);
                          if (num > maxNum) maxNum = num;
                        }
                      }
                    });
                    const nextNum = maxNum + 1;
                    const padLen = ['VEND', 'GR', 'PO', 'STK', 'MKT', 'EVT', 'FIN', 'LEG', 'DEC'].includes(tabSchema.idPrefix) ? 3 : 4;
                    initialVals[idIdx] = `${tabSchema.idPrefix}-${String(nextNum).padStart(padLen, '0')}`;
                  }
                }
                setNewRowValues(initialVals);
                setIsAddOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
              className="py-2 text-xs font-bold"
            >
              Add Record
            </Button>
          )}
        </div>

        {/* CRM Main Grid Table Card */}
        <Card className="overflow-hidden border border-[#2e2e2e] bg-[#1f1f1f]">
          <CardContent className="p-0">
            {dynamicColumns.length > 0 ? (
              viewMode === 'table' ? (
                <Table
                  columns={dynamicColumns}
                  data={filteredRows}
                  rowIdKey="_rowNumber"
                  loading={sheetLoading}
                  rowActions={(row) => googleToken ? [
                    { 
                      label: 'Edit Record', 
                      onClick: () => {
                        setSelectedRow(row);
                      } 
                    }
                  ] : []}
                />
              ) : (
                /* Card View Mode */
                sheetLoading ? (
                  <div className="py-12 text-center text-xs text-[#aaaaaa]">
                    Loading records in Card view...
                  </div>
                ) : (
                  <div className="p-4 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredRows.map((row) => {
                      const idVal = row.values[0] || `ROW-${row._rowNumber}`;
                      const titleVal = row.values[1] || `Record #${row._rowNumber}`;
                      const subVal = row.values[2] || row.values[4] || '';
                      const extraVal = row.values[3] || '';
                      const statusVal = row.values.find((v: string) => 
                        ['paid', 'pending', 'active', 'delivered', 'completed', 'in-progress'].includes(v.toLowerCase())
                      ) || '';

                      const lowerStatus = statusVal.toLowerCase();

                      return (
                        <a
                          key={row._rowNumber}
                          href={`/${moduleId}?row=${row._rowNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { e.preventDefault(); setSelectedRow(row); }}
                          className="bg-[#181818] border border-[#282828] rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm cursor-pointer hover:border-[#444444] hover:bg-[#222222] transition-all no-underline tactile-press"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-neutral-300 bg-[#272727] border border-[#383838] px-2 py-0.5 rounded uppercase">
                                {idVal}
                              </span>
                              {statusVal && (
                                <StatusBadge 
                                  status={lowerStatus.includes('paid') || lowerStatus.includes('active') || lowerStatus.includes('delivered') ? 'success' : 'warning'} 
                                  label={statusVal} 
                                  className="text-[9px] py-0 border-0" 
                                />
                              )}
                            </div>
                            
                            <h4 className="text-xs font-bold text-white line-clamp-1">
                              {titleVal}
                            </h4>
                            
                            {subVal && (
                              <p className="text-[11px] text-[#aaaaaa] line-clamp-2 leading-relaxed">
                                {subVal}
                              </p>
                            )}
                          </div>
                          
                          {extraVal && (
                            <div className="pt-2 border-t border-[#282828] flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-[#888888]">
                                {headers[3] || 'Category'}:
                              </span>
                              <span className="text-[10px] font-bold text-neutral-200 truncate max-w-[120px]">
                                {extraVal}
                              </span>
                            </div>
                          )}
                        </a>
                      );
                    })}
                  </div>
                )
              )
            ) : (
              <div className="py-12 text-center text-xs text-[#aaaaaa]">
                {sheetLoading ? 'Discovering spreadsheet structure...' : 'No columns detected. Verify this sheet tab is not empty.'}
              </div>
            )}
            
            {!sheetLoading && filteredRows.length === 0 && sheetRows.length > 0 && (
              <div className="py-8 text-center text-xs text-[#aaaaaa]">
                No matching results found for search term "{searchTerm}".
              </div>
            )}

            {!googleToken && (
              <div className="p-6 bg-[#181818] border-t border-[#282828] flex flex-col items-center justify-center text-center space-y-3">
                <span className="text-xs text-[#aaaaaa] max-w-sm">
                  You are currently logged in anonymously. To read and write directly to your live Google Sheets, click the button below to authorize.
                </span>
                <Button type="button" size="sm" variant="primary" onClick={signInWithGoogle}>
                  Connect Google Workspace
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 1. EDIT RECORD DRAWER (50% RIGHT SLIDE-OVER) */}
        <Drawer
          size="half"
          isOpen={selectedRow !== null}
          onClose={() => setSelectedRow(null)}
          title={`Edit Row #${selectedRow?._rowNumber || ''} — ${activeTab}`}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRow(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditRowSave} loading={syncing} size="sm" variant="primary">
                Save Changes
              </Button>
            </>
          }
        >
          <div className="space-y-5 text-xs">
            <div className="p-3 bg-[#181818] border border-[#2e2e2e] rounded-lg text-[#aaaaaa] flex items-center justify-between">
              <span>Modifying record in tab: <strong className="font-mono text-white">{activeTab}</strong></span>
              <span className="text-[10px] font-mono bg-[#272727] text-white border border-[#383838] px-2 py-0.5 rounded font-bold">ROW #{selectedRow?._rowNumber}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {headers.map((header, idx) => {
                const mappedKey = (moduleId === 'sales' || moduleId === 'customers') ? 'orders' : ((moduleId === 'production' || moduleId === 'procurement' || moduleId === 'packaging' || moduleId === 'products' || moduleId === 'vendors') ? 'supply-chain' : moduleId);
                const v2Schema = V2_SPREADSHEET_SCHEMAS[mappedKey];
                const tabSchema = v2Schema?.tabs.find(t => t.name === activeTab);
                
                // Is this the PRIMARY ID for this tab? (e.g. Customer_ID in Customer_Master)
                const isPrimaryId = tabSchema?.idHeader === header;
                
                // Foreign key references (only when NOT the primary ID of current tab)
                const isForeignCustomer = header === 'Customer_ID' && !isPrimaryId;
                const isForeignVendor = header === 'Vendor_ID' && !isPrimaryId;
                const isForeignPo = header === 'PO_ID' && !isPrimaryId;
                const isForeignOrder = header === 'Order_ID' && !isPrimaryId;
                
                // Schema-defined dropdown options (e.g. Status, Payment_Mode)
                const schemaDropdownOptions = tabSchema?.dropdowns?.[header];
                
                return (
                  <div key={header} className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wide">
                      {header.replace(/_/g, ' ')}
                      {isPrimaryId && <span className="ml-2 text-[9px] text-[#888888] font-mono">PRIMARY KEY</span>}
                    </label>

                    {isPrimaryId ? (
                      /* PRIMARY ID: Read-only, cannot be changed */
                      <input
                        type="text"
                        value={editValues[idx] || ''}
                        readOnly
                        className="w-full px-3 py-2.5 bg-[#181818] border border-[#333333] rounded-lg text-xs text-neutral-300 font-mono font-bold cursor-not-allowed"
                      />
                    ) : isForeignCustomer ? (
                      /* FOREIGN KEY: Customer_ID dropdown */
                      <select
                        value={editValues[idx] || ''}
                        onChange={(e) => {
                          const nextVals = [...editValues];
                          nextVals[idx] = e.target.value;
                          setEditValues(nextVals);
                        }}
                        className="w-full px-3 py-2 bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-xs text-white font-medium"
                      >
                        <option value="">-- Choose Customer --</option>
                        {sheetRows.length > 0 && activeTab !== 'Customer_Master' ? (
                          (() => {
                            // Try to get customer list from the orders spreadsheet Customer_Master tab
                            const custHeaders = V2_SPREADSHEET_SCHEMAS['orders']?.tabs.find(t => t.name === 'Customer_Master')?.headers || [];
                            const custIdIdx = custHeaders.indexOf('Customer_ID');
                            const custNameIdx = custHeaders.indexOf('Business_Name');
                            const custContactIdx = custHeaders.indexOf('Contact_Person');
                            // Use seedData as fallback
                            return seedDataV2.Customer_Master.map(c => (
                              <option key={c.Customer_ID} value={c.Customer_ID}>
                                {c.Customer_ID} - {c.Business_Name || c.Contact_Person}
                              </option>
                            ));
                          })()
                        ) : (
                          seedDataV2.Customer_Master.map(c => (
                            <option key={c.Customer_ID} value={c.Customer_ID}>
                              {c.Customer_ID} - {c.Business_Name || c.Contact_Person}
                            </option>
                          ))
                        )}
                      </select>
                    ) : isForeignVendor ? (
                      /* FOREIGN KEY: Vendor_ID dropdown */
                      <select
                        value={editValues[idx] || ''}
                        onChange={(e) => {
                          const nextVals = [...editValues];
                          nextVals[idx] = e.target.value;
                          setEditValues(nextVals);
                        }}
                        className="w-full px-3 py-2 bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-xs text-white font-medium"
                      >
                        <option value="">-- Choose Vendor --</option>
                        {seedDataV2.Vendor_Master.map(v => (
                          <option key={v.Vendor_ID} value={v.Vendor_ID}>
                            {v.Vendor_ID} - {v.Company_Name || v.Contact_Person}
                          </option>
                        ))}
                      </select>
                    ) : isForeignPo ? (
                      /* FOREIGN KEY: PO_ID dropdown */
                      <select
                        value={editValues[idx] || ''}
                        onChange={(e) => {
                          const nextVals = [...editValues];
                          nextVals[idx] = e.target.value;
                          setEditValues(nextVals);
                        }}
                        className="w-full px-3 py-2 bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-xs text-white font-medium"
                      >
                        <option value="">-- Choose Purchase Order --</option>
                        {seedDataV2.Purchase_Orders.map(p => (
                          <option key={p.PO_ID} value={p.PO_ID}>
                            {p.PO_ID} - {p.Item_Description}
                          </option>
                        ))}
                      </select>
                    ) : isForeignOrder ? (
                      /* FOREIGN KEY: Order_ID dropdown */
                      <select
                        value={editValues[idx] || ''}
                        onChange={(e) => {
                          const nextVals = [...editValues];
                          nextVals[idx] = e.target.value;
                          setEditValues(nextVals);
                        }}
                        className="w-full px-3 py-2 bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-xs text-white font-medium"
                      >
                        <option value="">-- Choose Order --</option>
                        {seedDataV2.Orders_Log.map(o => (
                          <option key={o.Order_ID} value={o.Order_ID}>
                            {o.Order_ID} - {o.Customer_ID} ({o.Items?.substring(0, 30) || ''})
                          </option>
                        ))}
                      </select>
                    ) : schemaDropdownOptions ? (
                      /* SCHEMA DROPDOWN: e.g. Status, Payment_Mode, Customer_Type */
                      <select
                        value={editValues[idx] || ''}
                        onChange={(e) => {
                          const nextVals = [...editValues];
                          nextVals[idx] = e.target.value;
                          setEditValues(nextVals);
                        }}
                        className="w-full px-3 py-2 bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-xs text-white font-medium"
                      >
                        <option value="">-- Select --</option>
                        {schemaDropdownOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      /* REGULAR TEXT INPUT */
                      <input
                        type="text"
                        value={editValues[idx] || ''}
                        onChange={(e) => {
                          const nextVals = [...editValues];
                          nextVals[idx] = e.target.value;
                          setEditValues(nextVals);
                        }}
                        className="w-full px-3 py-2.5 bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-xs text-white font-medium"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Drawer>

        {/* 2. ADD RECORD DRAWER (50% RIGHT SLIDE-OVER) */}
        <Drawer
          size="half"
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title={`Add New Record — ${activeTab}`}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRowSave} loading={syncing} size="sm" variant="primary">
                Append Record
              </Button>
            </>
          }
        >
          <div className="space-y-5 text-xs">
            <div className="p-3 bg-[#181818] border border-[#2e2e2e] rounded-lg text-[#aaaaaa] flex items-center justify-between">
              <span>Appending to sheet tab: <strong className="font-mono text-white">{activeTab}</strong></span>
              <span className="text-[10px] font-mono bg-[#272727] text-white border border-[#383838] px-2 py-0.5 rounded font-bold">AUTO-ID GENERATED</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {headers.map((header, idx) => {
                const mappedKey = (moduleId === 'sales' || moduleId === 'customers') ? 'orders' : ((moduleId === 'production' || moduleId === 'procurement' || moduleId === 'packaging' || moduleId === 'products' || moduleId === 'vendors') ? 'supply-chain' : moduleId);
                const v2Schema = V2_SPREADSHEET_SCHEMAS[mappedKey];
                const tabSchema = v2Schema?.tabs.find(t => t.name === activeTab);
                
                // Is this the PRIMARY ID for this tab? (e.g. Customer_ID in Customer_Master, Order_ID in Orders_Log)
                const isPrimaryId = tabSchema?.idHeader === header;
                
                // Foreign key references (only when NOT the primary ID of current tab)
                const isForeignCustomer = header === 'Customer_ID' && !isPrimaryId;
                const isForeignVendor = header === 'Vendor_ID' && !isPrimaryId;
                const isForeignPo = header === 'PO_ID' && !isPrimaryId;
                const isForeignOrder = header === 'Order_ID' && !isPrimaryId;
                
                // Schema-defined dropdown options (e.g. Status, Payment_Mode, Customer_Type)
                const schemaDropdownOptions = tabSchema?.dropdowns?.[header];
                
                return (
                  <div key={header} className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wide">
                      {header.replace(/_/g, ' ')}
                      {isPrimaryId && <span className="ml-2 text-[9px] text-[#888888] font-mono">AUTO-GENERATED</span>}
                    </label>

                    {isPrimaryId ? (
                      /* PRIMARY ID: Read-only, auto-generated by ERP */
                      <input
                        type="text"
                        value={newRowValues[idx] || ''}
                        readOnly
                        className="w-full px-3 py-2.5 bg-[#181818] border border-[#333333] rounded-lg text-xs text-neutral-300 font-mono font-bold cursor-not-allowed"
                      />
                    ) : isForeignCustomer ? (
                      /* FOREIGN KEY: Customer_ID dropdown with auto-fill */
                      <select
                        value={newRowValues[idx] || ''}
                        onChange={(e) => {
                          const nextVals = [...newRowValues];
                          nextVals[idx] = e.target.value;
                          
                          // Auto-fill related customer fields if selecting a customer
                          if (e.target.value) {
                            const selectedCust = seedDataV2.Customer_Master.find(c => c.Customer_ID === e.target.value);
                            if (selectedCust) {
                              // Auto-fill Channel/Lead_Source if it exists in headers
                              const channelIdx = headers.indexOf('Channel');
                              if (channelIdx !== -1 && !nextVals[channelIdx]) {
                                nextVals[channelIdx] = (selectedCust as any).Lead_Source || '';
                              }
                            }
                          }
                          
                          setNewRowValues(nextVals);
                        }}
                        className="w-full px-3 py-2 bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-xs text-white font-medium"
                      >
                        <option value="">-- Choose Customer --</option>
                        {seedDataV2.Customer_Master.map(c => (
                          <option key={c.Customer_ID} value={c.Customer_ID}>
                            {c.Customer_ID} - {c.Business_Name || c.Contact_Person}
                          </option>
                        ))}
                      </select>
                    ) : isForeignVendor ? (
                      /* FOREIGN KEY: Vendor_ID dropdown */
                      <select
                        value={newRowValues[idx] || ''}
                        onChange={(e) => {
                          const nextVals = [...newRowValues];
                          nextVals[idx] = e.target.value;
                          setNewRowValues(nextVals);
                        }}
                        className="w-full px-3 py-2 bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-xs text-white font-medium"
                      >
                        <option value="">-- Choose Vendor --</option>
                        {seedDataV2.Vendor_Master.map(v => (
                          <option key={v.Vendor_ID} value={v.Vendor_ID}>
                            {v.Vendor_ID} - {v.Company_Name || v.Contact_Person}
                          </option>
                        ))}
                      </select>
                    ) : isForeignPo ? (
                      /* FOREIGN KEY: PO_ID dropdown */
                      <select
                        value={newRowValues[idx] || ''}
                        onChange={(e) => {
                          const nextVals = [...newRowValues];
                          nextVals[idx] = e.target.value;
                          setNewRowValues(nextVals);
                        }}
                        className="w-full px-3 py-2 bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-xs text-white font-medium"
                      >
                        <option value="">-- Choose Purchase Order --</option>
                        {seedDataV2.Purchase_Orders.map(p => (
                          <option key={p.PO_ID} value={p.PO_ID}>
                            {p.PO_ID} - {p.Item_Description}
                          </option>
                        ))}
                      </select>
                    ) : isForeignOrder ? (
                      /* FOREIGN KEY: Order_ID dropdown */
                      <select
                        value={newRowValues[idx] || ''}
                        onChange={(e) => {
                          const nextVals = [...newRowValues];
                          nextVals[idx] = e.target.value;
                          setNewRowValues(nextVals);
                        }}
                        className="w-full px-3 py-2 bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-xs text-white font-medium"
                      >
                        <option value="">-- Choose Order --</option>
                        {seedDataV2.Orders_Log.map(o => (
                          <option key={o.Order_ID} value={o.Order_ID}>
                            {o.Order_ID} - {o.Customer_ID} ({o.Items?.substring(0, 30) || ''})
                          </option>
                        ))}
                      </select>
                    ) : schemaDropdownOptions ? (
                      /* SCHEMA DROPDOWN: e.g. Status, Payment_Mode, Customer_Type */
                      <select
                        value={newRowValues[idx] || ''}
                        onChange={(e) => {
                          const nextVals = [...newRowValues];
                          nextVals[idx] = e.target.value;
                          setNewRowValues(nextVals);
                        }}
                        className="w-full px-3 py-2 bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-xs text-white font-medium"
                      >
                        <option value="">-- Select --</option>
                        {schemaDropdownOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      /* REGULAR TEXT INPUT */
                      <input
                        type="text"
                        placeholder={`Enter ${header.replace(/_/g, ' ').toLowerCase()}`}
                        value={newRowValues[idx] || ''}
                        onChange={(e) => {
                          const nextVals = [...newRowValues];
                          nextVals[idx] = e.target.value;
                          setNewRowValues(nextVals);
                        }}
                        className="w-full px-3 py-2.5 bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-xs text-white font-medium"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Drawer>
      </div>
    );
  }

  // ----------------------------------------------------
  // 4. BETA B2B MODULES (Procurement, Sales, Reports)
  // ----------------------------------------------------
  const isBeta = ['procurement', 'sales', 'reports'].includes(moduleId);
  if (isBeta) {
    const b2bColumns = [
      { key: 'id', header: 'ID', render: (row: any) => <span className="font-mono font-bold text-slate-400">{row.id}</span> },
      { key: 'name', header: moduleId === 'procurement' ? 'Vendor Partner' : 'Client Account', className: 'font-semibold' },
      { key: 'item', header: 'Item / Package Description' },
      { key: 'amount', header: 'Financial Value', className: 'font-bold' },
      { key: 'status', header: 'Ledger State', render: (row: any) => <StatusBadge status={row.status} /> }
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white capitalize flex items-center gap-2">
              <ArrowUpRight className="w-6 h-6 text-emerald-700" />
              <span>{moduleId} Ledger</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage wholesale {moduleId} operations and audit transaction histories.</p>
          </div>
          <StatusBadge status="warning" label="Beta Stage" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* New entry form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Add Ledger Record</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddB2b} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">
                    {moduleId === 'procurement' ? 'Vendor Name' : 'Client Business Name'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cocoa Sourcing Co"
                    value={b2bName}
                    onChange={(e) => setB2bName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">Details / Line items</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500kg Idukki Organic Beans"
                    value={b2bItem}
                    onChange={(e) => setB2bItem(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">Record Value (₹)</label>
                  <input
                    type="number"
                    required
                    value={b2bAmount}
                    onChange={(e) => setB2bAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Submit Ledger Record
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Ledger records list */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>B2B Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table
                columns={b2bColumns}
                data={b2bEntries.length > 0 ? b2bEntries : [
                  { id: `${moduleId === 'procurement' ? 'PROC' : 'SALE'}0082`, name: 'Arun Cacao Cultivators', item: '400kg Single-Origin Cocoa Mass', amount: '₹1,44,000', status: 'Pending' },
                  { id: `${moduleId === 'procurement' ? 'PROC' : 'SALE'}0081`, name: 'Indaids Packaging Pvt', item: '8,000x Orange Sunset Wrappers', amount: '₹12,500', status: 'Paid' }
                ]}
                rowIdKey="id"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 5. UNCONNECTED STUB MODULES (Marketing, Legal, Automation)
  // ----------------------------------------------------
  const getIcon = () => {
    switch (moduleId) {
      case 'marketing': return <Megaphone className="w-12 h-12 text-slate-350" />;
      case 'legal': return <Scale className="w-12 h-12 text-slate-350" />;
      case 'automation': return <Cpu className="w-12 h-12 text-slate-350" />;
      default: return <HardDrive className="w-12 h-12 text-slate-350" />;
    }
  };

  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-4">
      <div className="inline-flex p-4 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800">
        {getIcon()}
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-800 dark:text-white capitalize">{moduleId} Module Frame Loaded</h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed mt-1">
          This business module is registered in the core registry. Connect Google Apps Script webhook trigger inSettings to activate this module interface.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => (window as any).gudNavigate('/settings')}>
        Configure Webhooks in Settings
      </Button>
    </div>
  );
};
export default ModuleView;
