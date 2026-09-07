import React, { useState, useEffect } from 'react';
import { GudLogo } from '../components/Sidebar';
import { 
  FileText, Plus, Minus, Trash2, Printer, CheckCircle, 
  Sparkles, DollarSign, Calculator, Download, Save, RefreshCw,
  FolderPlus, Edit3, ArrowRight, Truck, Pin, PinOff
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import seedData from '../data/seedDataV2.json';
import { GoogleSheetsService, GoogleDriveService } from '../services/google';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { exportElementToPdf, printIsolatedElement } from '../utils/documentExport';
import { getAssetUrl } from '../utils/assetPath';

interface InvoiceItem {
  id: string;
  name: string;
  description: string;
  rate: number;
  qty: number;
  unit: string;
}

interface FlavorCounts {
  almond: number;
  peanut: number;
  orange: number;
  lemon: number;
  seaSalt: number;
  mocha: number;
  jackfruit: number;
}

// Convert Number to Words (Indian Rupee Format)
function numberToWordsINR(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return 'Zero Only/-';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function numToWords(n: number): string {
    if (n < 20) return single[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + single[n % 10] : '');
    if (n < 1000) return single[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + numToWords(n % 10000000) : '');
  }

  return `Rupees ${numToWords(rounded)} Only/-`;
}

const PRESET_CUSTOMERS = [
  {
    Customer_ID: 'CUST-DRDENTAL',
    Business_Name: 'Dr. Dental Clinic',
    Contact_Person: 'Dr. Dental',
    Address: 'Kochi, Kerala',
    City: 'Kochi',
    State: 'Kerala',
    Notes: ''
  },
  {
    Customer_ID: 'CUST-0074',
    Business_Name: 'Moby',
    Contact_Person: 'Moby',
    Address: 'Kaniyapilly Rd, near Holiday Inn Hotel',
    City: 'Ernakulam',
    State: 'Kerala 682028 India',
    Notes: ''
  },
  {
    Customer_ID: 'CUST-0075',
    Business_Name: 'Nihala Jasmine',
    Contact_Person: 'Nihala Jasmine',
    Address: 'Naduvath House No:4, Kanhiyoor, Mookuthala Post',
    City: 'Malapuram Dist',
    State: 'Kerala - 679574',
    Notes: ''
  },
  {
    Customer_ID: 'CUST-0041',
    Business_Name: 'Naveen',
    Contact_Person: 'Naveen',
    Address: 'Delivery: Self',
    City: 'Ernakulam',
    State: 'Kerala',
    Notes: ''
  }
];

const PRESET_ORDERS = [
  {
    Order_ID: 'ORD-0212',
    Date: '2026-08-01',
    Customer_ID: 'CUST-0074',
    Items: 'Almond 25g x1, Orange 25g x1, Lemon 25g x1, Mocha 25g x1, Sea Salt 25g x1, Jackfruit 25g x1',
    Qty: '6',
    Price_Per_Unit: '117.9143',
    Total_Amount: '742.86',
    Invoice_Ref: '1153',
    Notes: 'Payment for delivery due upon receipt. Please reference Invoice No on bank transfer / UPI payments.'
  },
  {
    Order_ID: 'ORD-0213',
    Date: '2026-08-03',
    Customer_ID: 'CUST-0041',
    Items: 'Almond 25g x1, Peanut 25g x1, Orange 25g x1, Lemon 25g x1, Mocha 25g x1, Sea Salt 25g x1, Jackfruit 25g x1',
    Qty: '7',
    Price_Per_Unit: '117.9143',
    Total_Amount: '866.67',
    Invoice_Ref: '1154',
    Notes: 'Payment for delivery due upon receipt. Please reference Invoice No on bank transfer / UPI payments.'
  },
  {
    Order_ID: 'ORD-0214',
    Date: '2026-08-03',
    Customer_ID: 'CUST-0075',
    Items: 'Peanut 25g x1, Jackfruit 25g x1, Almond 25g x1',
    Qty: '3',
    Price_Per_Unit: '117.9143',
    Total_Amount: '371.43',
    Invoice_Ref: 'C',
    Notes: 'Payment for delivery due upon receipt. Please reference Invoice No on bank transfer / UPI payments.'
  }
];

function parseItemsStringToState(itemsStr: string) {
  const newFlavors: FlavorCounts = {
    almond: 0,
    peanut: 0,
    orange: 0,
    lemon: 0,
    seaSalt: 0,
    mocha: 0,
    jackfruit: 0
  };
  let newBox6 = 0;
  let newBox8 = 0;
  let newHamper = 0;

  if (!itemsStr) return { flavors: newFlavors, box6Qty: newBox6, box8Qty: newBox8, hamperQty: newHamper };

  // Parse Orange
  const orangeMatch = itemsStr.match(/Orange\s*[-:\s]\s*(\d+)/i) || itemsStr.match(/Orange[^\d]*(\d+)/i);
  if (orangeMatch) newFlavors.orange = parseInt(orangeMatch[1], 10);

  // Parse Sea Salt
  const saltMatch = itemsStr.match(/Sea\s*Salt\s*[-:\s]\s*(\d+)/i) || itemsStr.match(/Sea\s*Salt[^\d]*(\d+)/i);
  if (saltMatch) newFlavors.seaSalt = parseInt(saltMatch[1], 10);

  // Parse Almond
  const almondMatch = itemsStr.match(/Almond\s*[-:\s]\s*(\d+)/i) || itemsStr.match(/Almond[^\d]*(\d+)/i);
  if (almondMatch) newFlavors.almond = parseInt(almondMatch[1], 10);

  // Parse Mocha
  const mochaMatch = itemsStr.match(/Mocha\s*[-:\s]\s*(\d+)/i) || itemsStr.match(/Mocha[^\d]*(\d+)/i);
  if (mochaMatch) newFlavors.mocha = parseInt(mochaMatch[1], 10);

  // Parse Peanut
  const peanutMatch = itemsStr.match(/Peanut\s*[-:\s]\s*(\d+)/i) || itemsStr.match(/Peanut[^\d]*(\d+)/i);
  if (peanutMatch) newFlavors.peanut = parseInt(peanutMatch[1], 10);

  // Parse Jackfruit
  const jackMatch = itemsStr.match(/Jackfruit\s*[-:\s]\s*(\d+)/i) || itemsStr.match(/Jackfruit[^\d]*(\d+)/i);
  if (jackMatch) newFlavors.jackfruit = parseInt(jackMatch[1], 10);

  // Parse Lemon
  const lemonMatch = itemsStr.match(/Lemon\s*[-:\s]\s*(\d+)/i) || itemsStr.match(/Lemon[^\d]*(\d+)/i);
  if (lemonMatch) newFlavors.lemon = parseInt(lemonMatch[1], 10);

  // Parse Box 6
  const box6Match = itemsStr.match(/6\s*(?:Piece|Pcs|Pc)?\s*Box[^\d]*(\d+)/i) || itemsStr.match(/Box\s*6[^\d]*(\d+)/i);
  if (box6Match) newBox6 = parseInt(box6Match[1], 10);

  // Parse Box 8
  const box8Match = itemsStr.match(/8\s*(?:Piece|Pcs|Pc)?\s*Box[^\d]*(\d+)/i) || itemsStr.match(/Box\s*8[^\d]*(\d+)/i);
  if (box8Match) newBox8 = parseInt(box8Match[1], 10);

  // Parse Hamper
  const hamperMatch = itemsStr.match(/(?:Gift\s*)?Hamper[^\d]*(\d+)/i);
  if (hamperMatch) newHamper = parseInt(hamperMatch[1], 10);

  return { flavors: newFlavors, box6Qty: newBox6, box8Qty: newBox8, hamperQty: newHamper };
}

export const InvoiceGenerator: React.FC = () => {
  const { googleToken, signInWithGoogle } = useAuth();
  const { sendNotification } = useNotifications();

  // Combine seed customers with PRESET_CUSTOMERS
  const mergeCustomers = (base: any[]) => {
    const list = [...base];
    PRESET_CUSTOMERS.forEach(preset => {
      if (!list.some(c => c.Customer_ID === preset.Customer_ID || (c.Business_Name && c.Business_Name.toLowerCase() === preset.Business_Name.toLowerCase()))) {
        list.unshift(preset);
      }
    });
    return list;
  };

  const mergeOrders = (base: any[]) => {
    const list = [...base];
    PRESET_ORDERS.forEach(preset => {
      if (!list.some(o => o.Order_ID === preset.Order_ID)) {
        list.unshift(preset);
      }
    });
    return list;
  };

  // Live customer list (fetched from Google Sheets when authenticated, else seed data)
  const [liveCustomers, setLiveCustomers] = useState<any[]>(() => mergeCustomers(seedData.Customer_Master));

  useEffect(() => {
    if (!googleToken) {
      setLiveCustomers(mergeCustomers(seedData.Customer_Master));
      return;
    }
    const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ORDERS || '1uUfxL_k6k4ebzHPWL4pwwtdIaxzZ-6mW4mqB_6iJnXo';
    GoogleSheetsService.getSpreadsheetValues(googleToken, sheetId, "'Customer_Master'!A1:Z")
      .then(res => {
        if (res?.values && res.values.length > 1) {
          const [headerRow, ...rows] = res.values;
          const parsed = rows.map((row: string[]) => {
            const obj: Record<string,string> = {};
            headerRow.forEach((h: string, i: number) => { obj[h] = row[i] || ''; });
            return obj;
          });
          setLiveCustomers(mergeCustomers(parsed));
        }
      })
      .catch(() => setLiveCustomers(mergeCustomers(seedData.Customer_Master)));
  }, [googleToken]);

  // Live Orders list from Orders_Log
  const [liveOrders, setLiveOrders] = useState<any[]>(() => mergeOrders(seedData.Orders_Log || []));
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState<'new' | 'from-sheet'>('new');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');

  const fetchLiveOrders = () => {
    if (!googleToken) { setLiveOrders(mergeOrders(seedData.Orders_Log || [])); return; }
    setLoadingOrders(true);
    const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ORDERS || '1uUfxL_k6k4ebzHPWL4pwwtdIaxzZ-6mW4mqB_6iJnXo';
    GoogleSheetsService.getSpreadsheetValues(googleToken, sheetId, "'Orders_Log'!A1:Z")
      .then(res => {
        if (res?.values && res.values.length > 1) {
          const [headerRow, ...rows] = res.values;
          const parsed = rows.map((row: string[]) => {
            const obj: Record<string,string> = {};
            headerRow.forEach((h: string, i: number) => { obj[h] = row[i] || ''; });
            return obj;
          });
          setLiveOrders(mergeOrders(parsed));
        }
      })
      .catch(() => setLiveOrders(mergeOrders(seedData.Orders_Log || [])))
      .finally(() => setLoadingOrders(false));
  };

  useEffect(() => { fetchLiveOrders(); }, [googleToken]);

  // Invoice Form State with LocalStorage Draft Auto-Save
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCin, setClientCin] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  
  const [invoiceSeq, setInvoiceSeq] = useState('1156');
  const [invoiceTag, setInvoiceTag] = useState('Client');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [gstMode, setGstMode] = useState<'inclusive' | 'exclusive'>('exclusive');
  const [discount, setDiscount] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState('Payment for delivery due upon receipt. Please reference Invoice No on bank transfer / UPI payments.');

  const [saving, setSaving] = useState(false);
  const [exportingDocs, setExportingDocs] = useState(false);
  const [draftSavedAlert, setDraftSavedAlert] = useState(false);

  // Locked Invoice Preview mode: keep invoice pinned while editor controls scroll with blur fade
  const [lockPreview, setLockPreview] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('gud_invoice_preview_locked');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleLockPreview = () => {
    setLockPreview(prev => {
      const next = !prev;
      try {
        localStorage.setItem('gud_invoice_preview_locked', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // 7 Flavor Interactive Counters for 25g Bars — Default to ZERO for a clean slate
  const [flavors, setFlavors] = useState<FlavorCounts>({
    almond: 0,
    peanut: 0,
    orange: 0,
    lemon: 0,
    seaSalt: 0,
    mocha: 0,
    jackfruit: 0
  });

  // Box Counters — Default to ZERO
  const [box6Qty, setBox6Qty] = useState(0);
  const [box8Qty, setBox8Qty] = useState(0);
  const [hamperQty, setHamperQty] = useState(0);

  // Custom Unit Rate Overrides
  const [barUnitPrice, setBarUnitPrice] = useState<number>(120);
  const [box6UnitPrice, setBox6UnitPrice] = useState<number>(450);
  const [box8UnitPrice, setBox8UnitPrice] = useState<number>(600);
  const [hamperUnitPrice, setHamperUnitPrice] = useState<number>(3000);
  const [courierCharge, setCourierCharge] = useState<number>(0);

  // Load draft from localStorage on initial mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('gud_invoice_draft_v3');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.clientName !== undefined) setClientName(parsed.clientName);
        if (parsed.clientAddress !== undefined) setClientAddress(parsed.clientAddress);
        if (parsed.clientCin !== undefined) setClientCin(parsed.clientCin);
        if (parsed.clientGstin !== undefined) setClientGstin(parsed.clientGstin);
        if (parsed.invoiceSeq !== undefined) setInvoiceSeq(parsed.invoiceSeq);
        if (parsed.invoiceTag !== undefined) setInvoiceTag(parsed.invoiceTag);
        if (parsed.invoiceDate !== undefined) setInvoiceDate(parsed.invoiceDate);
        if (parsed.flavors) setFlavors(parsed.flavors);
        if (parsed.box6Qty !== undefined) setBox6Qty(parsed.box6Qty);
        if (parsed.box8Qty !== undefined) setBox8Qty(parsed.box8Qty);
        if (parsed.hamperQty !== undefined) setHamperQty(parsed.hamperQty);
        if (parsed.barUnitPrice !== undefined) setBarUnitPrice(parsed.barUnitPrice);
        if (parsed.courierCharge !== undefined) setCourierCharge(parsed.courierCharge);
        if (parsed.discount !== undefined) setDiscount(parsed.discount);
        if (parsed.gstMode !== undefined) setGstMode(parsed.gstMode);
        if (parsed.selectedCustomerId !== undefined) setSelectedCustomerId(parsed.selectedCustomerId);
      }
    } catch (e) {
      console.warn('Failed to load invoice draft:', e);
    }
  }, []);

  // Save draft to localStorage on form changes
  useEffect(() => {
    const draftPayload = {
      selectedCustomerId,
      clientName,
      clientAddress,
      clientCin,
      clientGstin,
      invoiceSeq,
      invoiceTag,
      invoiceDate,
      flavors,
      box6Qty,
      box8Qty,
      hamperQty,
      barUnitPrice,
      courierCharge,
      discount,
      gstMode
    };
    try {
      localStorage.setItem('gud_invoice_draft_v3', JSON.stringify(draftPayload));
      setDraftSavedAlert(true);
      const timer = setTimeout(() => setDraftSavedAlert(false), 2000);
      return () => clearTimeout(timer);
    } catch (e) {
      console.warn('Failed to save invoice draft:', e);
    }
  }, [
    selectedCustomerId, clientName, clientAddress, clientCin, clientGstin,
    invoiceSeq, invoiceTag, invoiceDate, flavors, box6Qty, box8Qty,
    hamperQty, barUnitPrice, courierCharge, discount, gstMode
  ]);

  // Completely reset form to blank slate (0 quantities & empty client info)
  const handleClearToBlankForm = () => {
    localStorage.removeItem('gud_invoice_draft_v3');
    setSelectedCustomerId('');
    setClientName('');
    setClientAddress('');
    setClientCin('');
    setClientGstin('');
    setInvoiceSeq('1156');
    setInvoiceTag('Client');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setFlavors({ almond: 0, peanut: 0, orange: 0, lemon: 0, seaSalt: 0, mocha: 0, jackfruit: 0 });
    setBox6Qty(0);
    setBox8Qty(0);
    setHamperQty(0);
    setBarUnitPrice(120);
    setCourierCharge(0);
    setDiscount(0);
    setGstMode('exclusive');
    setSelectedOrderId('');
    sendNotification({
      title: 'Invoice Form Cleared',
      message: 'Form reset to a clean slate (0 quantities). Type your new invoice details.',
      priority: 'medium',
      channels: ['in-app']
    });
  };

  // Helper function to apply order & customer details seamlessly
  const applyOrderToInvoice = (order: any, customerObj?: any) => {
    const cust = customerObj || liveCustomers.find(c => c.Customer_ID === order?.Customer_ID) || liveCustomers.find(c =>
      order?.Customer_ID && (
        c.Customer_ID?.toLowerCase().includes(order.Customer_ID.toLowerCase()) ||
        c.Business_Name?.toLowerCase().includes(order.Customer_ID.toLowerCase()) ||
        c.Contact_Person?.toLowerCase().includes(order.Customer_ID.toLowerCase())
      )
    );

    if (cust) {
      setSelectedCustomerId(cust.Customer_ID);
      setClientName(cust.Business_Name || cust.Contact_Person || '');
      const addrParts = [cust.Address, cust.City, cust.State].filter(Boolean);
      setClientAddress(addrParts.join(', ') || 'Kerala');
      const cleanTag = (cust.Business_Name || cust.Contact_Person || 'Client').replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
      setInvoiceTag(cleanTag || 'Client');
      if (cust.Notes) {
        const gstinMatch = cust.Notes.match(/GSTIN\s*[:|-]?\s*([A-Z0-9]{15})/i) || cust.Notes.match(/GST no\s*[:|-]?\s*([A-Z0-9]{15})/i);
        setClientGstin(gstinMatch ? `GSTIN - ${gstinMatch[1]}` : '');
        const cinMatch = cust.Notes.match(/CIN\s*[:|-]?\s*([A-Z0-9]{21})/i);
        setClientCin(cinMatch ? `CIN - ${cinMatch[1]}` : '');
      } else {
        setClientGstin('');
        setClientCin('');
      }
    }

    if (order) {
      setSelectedOrderId(order.Order_ID || '');
      if (order.Date) setInvoiceDate(order.Date);
      if (order.Invoice_Ref || order.Order_ID) {
        const refStr = order.Invoice_Ref || order.Order_ID;
        const seqMatch = refStr.match(/Invoice-([A-Z0-9]+)-/i) || refStr.match(/(\d+|[A-Z])/i);
        if (seqMatch) setInvoiceSeq(seqMatch[1]);
      }

      if (order.Price_Per_Unit) {
        const parsedRate = parseFloat(order.Price_Per_Unit);
        if (!isNaN(parsedRate) && parsedRate > 0) {
          setBarUnitPrice(parsedRate);
        }
      }

      if (order.Courier_Charge || order.Shipping) {
        const courier = parseFloat(order.Courier_Charge || order.Shipping);
        if (!isNaN(courier)) setCourierCharge(courier);
      }

      if (order.Discount) {
        const disc = parseFloat(order.Discount);
        if (!isNaN(disc)) setDiscount(disc);
      }

      if (order.Notes) {
        setInvoiceNotes(order.Notes);
      }

      if (order.Items) {
        const parsed = parseItemsStringToState(order.Items);
        setFlavors(parsed.flavors);
        setBox6Qty(parsed.box6Qty);
        setBox8Qty(parsed.box8Qty);
        setHamperQty(parsed.hamperQty);
      }
    }
  };

  // Load an existing order from sheet to generate invoice (no re-push)
  const handleLoadFromOrder = (orderId: string) => {
    const order = liveOrders.find(o => o.Order_ID === orderId);
    if (!order) return;
    applyOrderToInvoice(order);
    sendNotification({ title: 'Order Loaded', message: `Order ${orderId} loaded into invoice. Ready to print!`, priority: 'medium', channels: ['in-app'] });
  };

  // Reset all items for a repeat-customer new order (keeps client details)
  const handleResetItemsForRepeatOrder = () => {
    setFlavors({ almond: 0, peanut: 0, orange: 0, lemon: 0, seaSalt: 0, mocha: 0, jackfruit: 0 });
    setBox6Qty(0); setBox8Qty(0); setHamperQty(0);
    setCourierCharge(0); setDiscount(0);
    // Auto-increment invoice seq
    setInvoiceSeq(prev => String(parseInt(prev || '1153') + 1));
    sendNotification({ title: 'Items Cleared', message: 'Customer details kept. Enter new items and save.', priority: 'medium', channels: ['in-app'] });
  };

  // Helper to adjust flavor counts
  const adjustFlavor = (flavor: keyof FlavorCounts, delta: number) => {
    setFlavors(prev => ({
      ...prev,
      [flavor]: Math.max(0, prev[flavor] + delta)
    }));
  };

  const totalBarsQty = Object.values(flavors).reduce((a, b) => a + b, 0);

  // Build items list dynamically based on counters & custom rates
  const buildItemsList = (): InvoiceItem[] => {
    const list: InvoiceItem[] = [];

    if (hamperQty > 0) {
      list.push({
        id: 'hamper',
        name: 'GUD Chocolates',
        description: 'Gift Hamper',
        rate: hamperUnitPrice,
        qty: hamperQty,
        unit: 'Hamper'
      });
    }

    if (totalBarsQty > 0) {
      const flavorParts: string[] = [];
      if (flavors.orange > 0) flavorParts.push(`Orange - ${flavors.orange} bars`);
      if (flavors.seaSalt > 0) flavorParts.push(`Sea Salt - ${flavors.seaSalt} bars`);
      if (flavors.almond > 0) flavorParts.push(`Almond - ${flavors.almond} bars`);
      if (flavors.mocha > 0) flavorParts.push(`Mocha - ${flavors.mocha} bars`);
      if (flavors.peanut > 0) flavorParts.push(`Peanut - ${flavors.peanut} bars`);
      if (flavors.jackfruit > 0) flavorParts.push(`Jackfruit - ${flavors.jackfruit} bars`);
      if (flavors.lemon > 0) flavorParts.push(`Lemon - ${flavors.lemon} bars`);

      const descStr = `GUD Chocolate Bars (${flavorParts.join(', ')})`;

      list.push({
        id: 'bars',
        name: 'GUD Chocolates',
        description: descStr,
        rate: barUnitPrice,
        qty: totalBarsQty,
        unit: 'bars'
      });
    }

    if (box6Qty > 0) {
      list.push({
        id: 'box6',
        name: 'GUD 6 Piece Box',
        description: 'Assorted Gourmet Chocolates Box (6 Pcs)',
        rate: box6UnitPrice,
        qty: box6Qty,
        unit: 'boxes'
      });
    }

    if (box8Qty > 0) {
      list.push({
        id: 'box8',
        name: 'GUD 8 Piece Box',
        description: 'Assorted Luxury Chocolates Box (8 Pcs)',
        rate: box8UnitPrice,
        qty: box8Qty,
        unit: 'boxes'
      });
    }

    return list;
  };

  const items = buildItemsList();

  const handleCustomerSelect = (cid: string) => {
    setSelectedCustomerId(cid);
    const found = liveCustomers.find(c => c.Customer_ID === cid);
    if (found) {
      // Find matching order in liveOrders for this customer
      const matchingOrder = liveOrders.find(o =>
        o.Customer_ID === cid ||
        o.Customer_ID === found.Customer_ID ||
        (found.Business_Name && o.Customer_ID && (
          o.Customer_ID.toLowerCase().includes(found.Business_Name.toLowerCase()) ||
          found.Business_Name.toLowerCase().includes(o.Customer_ID.toLowerCase())
        )) ||
        (found.Contact_Person && o.Customer_ID && (
          o.Customer_ID.toLowerCase().includes(found.Contact_Person.toLowerCase()) ||
          found.Contact_Person.toLowerCase().includes(o.Customer_ID.toLowerCase())
        )) ||
        (o.Invoice_Ref && found.Business_Name && o.Invoice_Ref.toLowerCase().includes(found.Business_Name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()))
      );

      if (matchingOrder) {
        applyOrderToInvoice(matchingOrder, found);
        sendNotification({
          title: 'Invoice Auto-Filled',
          message: `Auto-populated invoice for ${found.Business_Name || found.Contact_Person}! Ready to print.`,
          priority: 'medium',
          channels: ['in-app']
        });
      } else {
        setClientName(found.Business_Name || found.Contact_Person || '');
        const addrParts = [found.Address, found.City, found.State].filter(Boolean);
        setClientAddress(addrParts.join(', ') || 'Kerala');
        const cleanTag = (found.Business_Name || found.Contact_Person || 'Client').replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
        setInvoiceTag(cleanTag || 'Client');
        if (found.Notes) {
          const gstinMatch = found.Notes.match(/GSTIN\s*[:|-]?\s*([A-Z0-9]{15})/i) || found.Notes.match(/GST no\s*[:|-]?\s*([A-Z0-9]{15})/i);
          setClientGstin(gstinMatch ? `GSTIN - ${gstinMatch[1]}` : '');
          const cinMatch = found.Notes.match(/CIN\s*[:|-]?\s*([A-Z0-9]{21})/i);
          setClientCin(cinMatch ? `CIN - ${cinMatch[1]}` : '');
        } else {
          setClientGstin('');
          setClientCin('');
        }
      }
    }
  };

  // Tax Calculations with multi‑tier GST (5% for items, 18% for courier)
  let itemsSubtotal = 0;
  let courierBase = 0;

  if (gstMode === 'exclusive') {
    // Exclusive: rates are gross
    itemsSubtotal = items.reduce((acc, item) => acc + (item.rate * item.qty), 0);
    courierBase = courierCharge;
  } else {
    // Inclusive: back‑calculate base amounts
    itemsSubtotal = items.reduce((acc, item) => {
      const baseRate = item.rate / 1.05;
      return acc + (baseRate * item.qty);
    }, 0);
    courierBase = courierCharge / 1.18;
  }

  const subtotal = itemsSubtotal + courierBase;
  const sgst = itemsSubtotal * 0.025 + courierBase * 0.09; // 2.5% on items, 9% on courier
  const cgst = itemsSubtotal * 0.025 + courierBase * 0.09;
  const grossTotal = subtotal + sgst + cgst;
  const totalReceivable = Math.max(0, grossTotal - discount);
  const invoiceNoFormatted = `Invoice-${invoiceSeq}-GUD-${new Date(invoiceDate).getFullYear()}-${invoiceTag}`;

  // PDF Export State Guard
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');

  const handlePrint = () => {
    const element = document.getElementById('printable-invoice-container');
    if (!element) {
      window.print();
      return;
    }
    printIsolatedElement(element);
  };

  // Production-Grade Non-Blocking PDF Export Pipeline
  const handleDownloadPdf = async () => {
    if (pdfStatus === 'generating') return;
    setPdfStatus('generating');

    try {
      const element = document.getElementById('printable-invoice-container');
      if (!element) throw new Error('Invoice container not found');

      await exportElementToPdf(element, {
        fileName: invoiceNoFormatted,
        padding: '24px',
        scale: 1.75
      });
      setPdfStatus('success');
      sendNotification({
        title: 'PDF Downloaded',
        message: `${invoiceNoFormatted}.pdf ready and saved!`,
        priority: 'low',
        channels: ['in-app']
      });
    } catch (err: any) {
      console.error('PDF generation error:', err);
      setPdfStatus('error');
      // Fallback to isolated native print if html2pdf fails
      const element = document.getElementById('printable-invoice-container');
      if (element) {
        printIsolatedElement(element);
      } else {
        window.print();
      }
    } finally {
      setTimeout(() => setPdfStatus('idle'), 600);
    }
  };

  // Save Invoice to Google Docs / Google Drive
  const handleSaveToGoogleDocs = async () => {
    if (!googleToken) {
      sendNotification({
        title: 'Google Sign In Required',
        message: 'Please click "Connect Drive/Sheets" to authenticate Google Workspace.',
        priority: 'urgent',
        channels: ['in-app']
      });
      return;
    }

    setExportingDocs(true);
    try {
      const htmlContent = `
INVOICE - GUDORIA FOOD INNOVATIONS
==================================================
Invoice No: ${invoiceNoFormatted}
Date: ${new Date(invoiceDate).toLocaleDateString('en-GB')}

BILL TO:
${clientName}
${clientAddress}
${clientGstin}
${clientCin}

ORDER DETAILS:
--------------------------------------------------
${items.map(i => `${i.name} - ${i.description}\nRate: INR ${i.rate} | Qty: ${i.qty} ${i.unit} | Subtotal: INR ${(i.rate * i.qty).toFixed(2)}`).join('\n\n')}

TAX SUMMARY:
--------------------------------------------------
Subtotal: INR ${subtotal.toFixed(2)}
SGST @2.5%: INR ${sgst.toFixed(2)}
CGST @2.5%: INR ${cgst.toFixed(2)}
${discount > 0 ? `Discount: INR ${discount.toFixed(2)} (-)` : ''}
TOTAL RECEIVABLE: INR ${totalReceivable.toFixed(2)}
Amount in Words: ${numberToWordsINR(totalReceivable)}

BANK DETAILS:
Gudoria Food Innovations Private Limited
Branch: ERNAKULAM - NRI
Account: 0307073000000080
IFSC: SIBL0000307
GSTIN: 32AANCA8181G1ZK
CIN: U72200KL2015PTC039279
==================================================
      `;

      const folderId = import.meta.env.VITE_GOOGLE_DRIVE_INVOICES_FOLDER_ID || '1YQub2YGgO5JmrF8U1broZt8JC3Zb-5Hy';
      const file = new File([htmlContent], `${invoiceNoFormatted}.txt`, { type: 'text/plain' });
      await GoogleDriveService.uploadFile(googleToken, file, folderId);

      sendNotification({
        title: 'Saved to Google Drive!',
        message: `Uploaded ${invoiceNoFormatted} to Google Drive successfully.`,
        priority: 'medium',
        channels: ['in-app']
      });
    } catch (err: any) {
      console.error(err);
      sendNotification({
        title: 'Export Warning',
        message: err?.message || 'Could not upload to Google Drive.',
        priority: 'urgent',
        channels: ['in-app']
      });
    } finally {
      setExportingDocs(false);
    }
  };

  const handleSaveAndPushOrder = async () => {
    setSaving(true);
    try {
      if (googleToken) {
        const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ORDERS || '1uUfxL_k6k4ebzHPWL4pwwtdIaxzZ-6mW4mqB_6iJnXo';
        
        const orderRow = [
          `ORD${Date.now().toString().slice(-4)}`,
          invoiceDate,
          selectedCustomerId || 'CUST001',
          'Direct',
          items.map(i => `${i.name} (${i.description}) x${i.qty}`).join('; '),
          items.reduce((acc, i) => acc + i.qty, 0).toString(),
          items[0]?.rate.toString() || '0',
          '5%',
          totalReceivable.toFixed(2),
          'Paid',
          'Delivered',
          'Self',
          invoiceNoFormatted,
          '',
          `Generated Invoice ${invoiceNoFormatted}`
        ];

        await GoogleSheetsService.appendSpreadsheetValues(googleToken, sheetId, 'Orders_Log!A:O', [orderRow]);
        sendNotification({
          title: 'Invoice Saved & Logged!',
          message: `Invoice ${invoiceNoFormatted} synced to Google Sheets.`,
          priority: 'medium',
          channels: ['in-app'],
          targetRoles: ['Owner', 'Admin']
        });
      } else {
        sendNotification({
          title: 'Saved Locally',
          message: `Invoice ${invoiceNoFormatted} generated. Sign in to Google Workspace to sync to live sheets.`,
          priority: 'medium',
          channels: ['in-app'],
          targetRoles: ['Owner', 'Admin']
        });
      }
    } catch (err: any) {
      sendNotification({
        title: 'Sync Warning',
        message: err?.message || 'Could not reach Google Sheets API.',
        priority: 'urgent',
        channels: ['in-app'],
        targetRoles: ['Owner', 'Admin']
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner (Hidden on Print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1f1f1f] p-5 rounded-2xl border border-[#2e2e2e] shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-md bg-[#272727] text-white border border-[#383838] font-heading">
              GUD Billing Engine
            </span>
            <span className="text-xs text-[#aaaaaa]">GST 5% & 18% Multi-Tier</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1 font-heading">
            Invoice Studio & Generator
          </h1>
          <p className="text-xs text-[#aaaaaa] mt-0.5">
            Create wholesale invoices, customize pricing presets, export PDF & Drive documents, and sync to Google Sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {draftSavedAlert && (
            <span className="text-[10px] font-medium text-[#aaaaaa] bg-[#272727] border border-[#383838] px-2.5 py-1 rounded-md flex items-center gap-1">
              <span>💾</span> Saved
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearToBlankForm} 
            className="text-xs bg-[#272727] hover:bg-[#383838] text-white border border-[#383838] font-medium"
            title="Reset all quantities, client fields, and rates to a clean blank invoice"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>New / Blank Invoice</span>
          </Button>
          {!googleToken && (
            <Button variant="outline" size="sm" onClick={signInWithGoogle} className="text-xs border-[#383838] bg-[#272727] hover:bg-[#383838] text-neutral-200">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Connect Drive</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSaveToGoogleDocs} disabled={exportingDocs} className="text-xs border-[#383838] bg-[#272727] hover:bg-[#383838] text-neutral-200">
            <FolderPlus className="w-3.5 h-3.5" />
            <span>{exportingDocs ? 'Saving...' : 'Save to Drive'}</span>
          </Button>
          <button
            type="button"
            onClick={toggleLockPreview}
            className={`text-xs px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all tactile-press ${
              lockPreview
                ? 'bg-[#2a2618] border-amber-500/40 text-amber-300 shadow-sm'
                : 'bg-[#272727] border-[#383838] text-neutral-400 hover:text-white'
            }`}
            title={lockPreview ? "Invoice preview is locked in position while editing. Click to enable free scroll." : "Click to lock invoice preview in view while editing."}
          >
            {lockPreview ? <Pin className="w-3.5 h-3.5 text-amber-400 rotate-45" /> : <PinOff className="w-3.5 h-3.5 text-neutral-400" />}
            <span>{lockPreview ? 'Locked View' : 'Free Scroll'}</span>
          </button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleDownloadPdf} 
            disabled={pdfStatus === 'generating'} 
            className="text-xs font-semibold bg-[#f1f1f1] hover:bg-white text-[#0f0f0f] shadow-sm rounded-xl"
          >
            <Download className={`w-3.5 h-3.5 ${pdfStatus === 'generating' ? 'animate-spin' : ''}`} />
            <span>{pdfStatus === 'generating' ? 'Generating PDF...' : 'Download PDF'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs border-[#383838] bg-[#272727] hover:bg-[#383838] text-neutral-200">
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </Button>
          {invoiceMode === 'new' ? (
            <Button variant="secondary" size="sm" onClick={handleSaveAndPushOrder} disabled={saving} className="text-xs border-[#383838] bg-[#272727] hover:bg-[#383838] text-white">
              <Save className="w-3.5 h-3.5 text-neutral-300" />
              <span>{saving ? 'Syncing...' : 'Save & Log'}</span>
            </Button>
          ) : (
            <span className="px-3 py-1.5 text-[11px] font-medium text-neutral-300 bg-[#272727] rounded-lg border border-[#383838]">
              📋 From-Sheet Mode
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor Controls (Hidden on Print) */}
        <div className="lg:col-span-5 print:hidden relative">
          <div className="relative">
            {lockPreview && (
              <div className="pointer-events-none sticky top-0 z-20 h-5 w-full bg-gradient-to-b from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent backdrop-blur-[2px] transition-all rounded-t-xl" />
            )}

            <div 
              className={`space-y-5 transition-all ${
                lockPreview 
                  ? 'lg:max-h-[calc(100vh-135px)] lg:overflow-y-auto lg:pr-2.5 pt-1 pb-10 scroll-smooth' 
                  : ''
              }`}
              style={lockPreview ? {
                maskImage: 'linear-gradient(to bottom, transparent 0px, black 28px, black calc(100% - 32px), transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 28px, black calc(100% - 32px), transparent 100%)'
              } : undefined}
            >

          {/* ── Mode Toggle & Quick Reset Action Bar ── */}
          <Card className="border border-[#262626]">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Invoice Workflow</p>
                <button
                  type="button"
                  onClick={() => {
                    setFlavors({ almond: 0, peanut: 0, orange: 0, lemon: 0, seaSalt: 0, mocha: 0, jackfruit: 0 });
                    setBox6Qty(0);
                    setBox8Qty(0);
                    setHamperQty(0);
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#202020] hover:bg-[#2a2a2a] text-neutral-300 border border-[#333333] transition-all"
                  title="Zero out all flavor and box quantities immediately"
                >
                  ↺ Reset Quantities (0)
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setInvoiceMode('new'); setSelectedOrderId(''); }}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition tactile-press ${
                    invoiceMode === 'new'
                      ? 'bg-neutral-800 border-neutral-600 text-white shadow-sm'
                      : 'bg-[#181818] border-[#2c2c2c] text-neutral-400 hover:text-white hover:bg-[#222222]'
                  }`}
                >
                  ✏️ New Invoice
                  <div className="text-[9px] font-normal opacity-80 mt-0.5">Fill items → Push to Sheets</div>
                </button>
                <button
                  type="button"
                  onClick={() => { setInvoiceMode('from-sheet'); fetchLiveOrders(); }}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition tactile-press ${
                    invoiceMode === 'from-sheet'
                      ? 'bg-neutral-800 border-neutral-600 text-white shadow-sm'
                      : 'bg-[#181818] border-[#2c2c2c] text-neutral-400 hover:text-white hover:bg-[#222222]'
                  }`}
                >
                  📋 From Existing Order
                  <div className="text-[9px] font-normal opacity-80 mt-0.5">Load from Sheets → PDF only</div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* ── Load from Existing Order (mode = from-sheet) ── */}
          {invoiceMode === 'from-sheet' && (
            <Card className="border border-[#383838] bg-[#161616]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>📋 Select Existing Order</span>
                  <button type="button" onClick={fetchLiveOrders} disabled={loadingOrders}
                    className="text-[10px] text-red-400 hover:underline font-bold disabled:opacity-50">
                    {loadingOrders ? 'Refreshing...' : '↻ Refresh'}
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <input
                  type="text"
                  placeholder="Search by Order ID or Customer ID..."
                  value={orderSearchTerm}
                  onChange={e => setOrderSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-[#333333] bg-[#0c0c0c] p-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {liveOrders
                    .filter(o => !orderSearchTerm || `${o.Order_ID} ${o.Customer_ID} ${o.Items || ''}`.toLowerCase().includes(orderSearchTerm.toLowerCase()))
                    .slice(0, 50)
                    .map(order => (
                      <button
                        key={order.Order_ID}
                        type="button"
                        onClick={() => handleLoadFromOrder(order.Order_ID)}
                        className={`w-full text-left p-2 rounded-lg border transition text-[11px] ${
                          selectedOrderId === order.Order_ID
                            ? 'bg-red-950/40 border-red-600/70 text-white'
                            : 'bg-[#181818] border-[#2c2c2c] text-neutral-300 hover:border-neutral-500'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold font-mono text-white">{order.Order_ID}</span>
                          <span className="text-neutral-500 text-[10px]">{order.Date}</span>
                        </div>
                        <div className="text-neutral-400 truncate mt-0.5">{order.Customer_ID} — ₹{order.Total_Amount || order.Amount || '?'}</div>
                      </button>
                    ))
                  }
                  {liveOrders.length === 0 && <p className="text-neutral-500 text-center py-4">No orders loaded. Click Refresh.</p>}
                </div>
                {selectedOrderId && (
                  <div className="p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-200 text-[11px] font-semibold">
                    ✅ Order {selectedOrderId} loaded. Adjust items below → Download PDF. Do NOT click "Save &amp; Log" (already in sheets).
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Customer & Invoice Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Customer & Invoice Details</span>
                <span className="text-xs text-red-400 font-normal">v2 Data Synced</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-300 mb-1 flex items-center justify-between">
                  <span>Select Customer</span>
                  {selectedCustomerId && (
                    <button type="button" onClick={handleResetItemsForRepeatOrder}
                      className="text-[10px] text-red-400 hover:underline font-bold">
                      🔄 New Order (same customer)
                    </button>
                  )}
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={e => handleCustomerSelect(e.target.value)}
                  className="w-full rounded-lg border border-[#303030] bg-[#0c0c0c] p-2 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="">-- Choose Customer ({liveCustomers.length} synced) --</option>
                  {liveCustomers.map(c => (
                    <option key={c.Customer_ID} value={c.Customer_ID}>
                      {c.Business_Name} ({c.Contact_Person})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-300 mb-1">
                  Client Name / Company
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full rounded-lg border border-[#303030] bg-[#0c0c0c] p-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-300 mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={clientAddress}
                  onChange={e => setClientAddress(e.target.value)}
                  className="w-full rounded-lg border border-[#303030] bg-[#0c0c0c] p-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-neutral-300 mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={clientGstin}
                    onChange={e => setClientGstin(e.target.value)}
                    className="w-full rounded-lg border border-[#303030] bg-[#0c0c0c] p-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-300 mb-1">
                    CIN
                  </label>
                  <input
                    type="text"
                    value={clientCin}
                    onChange={e => setClientCin(e.target.value)}
                    className="w-full rounded-lg border border-[#303030] bg-[#0c0c0c] p-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-neutral-300 mb-1">
                    Seq No
                  </label>
                  <input
                    type="text"
                    value={invoiceSeq}
                    onChange={e => setInvoiceSeq(e.target.value)}
                    className="w-full rounded-lg border border-[#303030] bg-[#0c0c0c] p-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-300 mb-1">
                    Tag
                  </label>
                  <input
                    type="text"
                    value={invoiceTag}
                    onChange={e => setInvoiceTag(e.target.value)}
                    className="w-full rounded-lg border border-[#303030] bg-[#0c0c0c] p-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full rounded-lg border border-[#303030] bg-[#0c0c0c] p-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive 7 Flavors Bar Counters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>25g Chocolate Bar Flavor Counters</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-300 font-mono">
                    Total: {totalBarsQty} bars
                  </span>
                  <button
                    type="button"
                    onClick={() => setFlavors({ almond: 0, peanut: 0, orange: 0, lemon: 0, seaSalt: 0, mocha: 0, jackfruit: 0 })}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1e1e1e] hover:bg-[#282828] text-neutral-300 border border-[#333333] transition-all"
                    title="Zero out all flavor counters"
                  >
                    Zero Flavors (0)
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {/* Rate Presets & Custom Input */}
              <div className="bg-[#0c0c0c] p-3 rounded-xl border border-[#262626] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-300">Unit Rate (₹/bar)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBarUnitPrice(150)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-mono font-semibold transition-all ${
                        barUnitPrice === 150 
                          ? 'bg-neutral-800 text-white border border-neutral-600 shadow-sm font-bold' 
                          : 'bg-[#1e1e1e] border border-[#303030] text-neutral-300 hover:bg-[#282828] hover:text-white'
                      }`}
                    >
                      Std ₹150
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarUnitPrice(130)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-mono font-semibold transition-all ${
                        barUnitPrice === 130 
                          ? 'bg-neutral-800 text-white border border-neutral-600 shadow-sm font-bold' 
                          : 'bg-[#1e1e1e] border border-[#303030] text-neutral-300 hover:bg-[#282828] hover:text-white'
                      }`}
                    >
                      BNI ₹130
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarUnitPrice(120)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-mono font-semibold transition-all ${
                        barUnitPrice === 120 
                          ? 'bg-neutral-800 text-white border border-neutral-600 shadow-sm font-bold' 
                          : 'bg-[#1e1e1e] border border-[#303030] text-neutral-300 hover:bg-[#282828] hover:text-white'
                      }`}
                    >
                      GVQ ₹120
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  value={barUnitPrice}
                  onChange={e => setBarUnitPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#303030] p-1.5 text-xs bg-[#141414] text-white font-mono font-semibold focus:outline-none focus:border-neutral-500"
                />
              </div>

              {/* 7 Flavors Grid — crisp, high-contrast steppers with product visual */}
              <div className="space-y-2">
                {[
                  { key: 'almond', label: 'Almond Noir', img: getAssetUrl('/images/brand/prod_almond_art.png') },
                  { key: 'peanut', label: 'Peanut Royale', img: getAssetUrl('/images/brand/prod_peanut_art.png') },
                  { key: 'orange', label: 'Orange Sunset', img: getAssetUrl('/images/brand/prod_orange_art.png') },
                  { key: 'lemon', label: 'Sun-Kissed Lemon', img: getAssetUrl('/images/brand/prod_lemon_art.png') },
                  { key: 'seaSalt', label: 'Indian Sea Salt', img: getAssetUrl('/images/brand/prod_seasalt_art.png') },
                  { key: 'mocha', label: 'Midnight Mocha', img: getAssetUrl('/images/brand/prod_mocha_art.png') },
                  { key: 'jackfruit', label: 'Malabar Jackfruit', img: getAssetUrl('/images/brand/prod_jackfruit_art.png') },
                ].map(({ key, label, img }) => {
                  const fk = key as keyof FlavorCounts;
                  return (
                    <div key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] hover:border-[#404040] hover:bg-[#141414] transition-all">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <img src={img} alt={label} className="w-8 h-8 object-contain rounded-md bg-[#181818] p-0.5 border border-[#303030] shrink-0" />
                        <span className="font-semibold text-white text-xs truncate">{label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => adjustFlavor(fk, -1)}
                          className="w-7 h-7 rounded-lg bg-[#202020] hover:bg-[#2c2c2c] border border-[#333333] flex items-center justify-center text-neutral-300 font-bold active:scale-95 transition-transform"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={flavors[fk]}
                          onChange={e => setFlavors(prev => ({ ...prev, [fk]: Math.max(0, parseInt(e.target.value) || 0) }))}
                          className="w-12 text-center font-bold font-mono text-white bg-[#141414] border border-[#303030] rounded-lg py-1 text-xs focus:outline-none focus:border-neutral-500"
                        />
                        <button
                          type="button"
                          onClick={() => adjustFlavor(fk, 1)}
                          className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white flex items-center justify-center font-bold active:scale-95 transition-transform shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Interactive Boxes & Hampers Counters & Custom Rates */}
          <Card>
            <CardHeader className="pb-3 border-b border-[#242424]">
              <CardTitle className="text-sm font-semibold text-white flex items-center justify-between">
                <span>Boxes & Gift Hampers (Editable Rates)</span>
                <button
                  type="button"
                  onClick={() => { setBox6Qty(0); setBox8Qty(0); setHamperQty(0); }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1e1e1e] hover:bg-[#282828] text-neutral-300 border border-[#333333] transition-all"
                  title="Zero out all box and hamper quantities"
                >
                  Zero Boxes (0)
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs pt-3">
              {/* Gift Hamper */}
              <div className="p-3 rounded-xl bg-[#0c0c0c] border border-[#262626] hover:border-[#404040] transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={getAssetUrl('/images/brand/kerala_heritage_hamper.jpg')} alt="Gift Hamper" className="w-8 h-8 object-cover rounded-md bg-[#181818] border border-[#303030] shrink-0" />
                    <div className="font-semibold text-white">Gift Hamper</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setHamperQty(Math.max(0, hamperQty - 1))}
                      className="w-7 h-7 rounded-lg bg-[#202020] hover:bg-[#2c2c2c] border border-[#333333] flex items-center justify-center font-bold text-neutral-300 active:scale-95 transition-transform">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input type="number" min="0" value={hamperQty}
                      onChange={e => setHamperQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 text-center font-bold font-mono bg-[#141414] border border-[#303030] rounded-lg py-1 text-xs text-white" />
                    <button type="button" onClick={() => setHamperQty(hamperQty + 1)}
                      className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white flex items-center justify-center font-bold active:scale-95 transition-transform shadow-sm">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#202020]">
                  <span className="text-neutral-400 font-medium">Rate (₹/Hamper):</span>
                  <input
                    type="number"
                    value={hamperUnitPrice}
                    onChange={e => setHamperUnitPrice(Number(e.target.value))}
                    className="w-28 rounded-lg border border-[#303030] p-1 text-right font-mono text-xs bg-[#141414] text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* 6-Piece Box */}
              <div className="p-3 rounded-xl bg-[#0c0c0c] border border-[#262626] hover:border-[#404040] transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={getAssetUrl('/images/brand/prod_gift_6.jpg')} alt="6-Piece Box" className="w-8 h-8 object-cover rounded-md bg-[#181818] border border-[#303030] shrink-0" />
                    <div className="font-semibold text-white">6-Piece Box</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setBox6Qty(Math.max(0, box6Qty - 1))}
                      className="w-7 h-7 rounded-lg bg-[#202020] hover:bg-[#2c2c2c] border border-[#333333] flex items-center justify-center font-bold text-neutral-300 active:scale-95 transition-transform">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input type="number" min="0" value={box6Qty}
                      onChange={e => setBox6Qty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 text-center font-bold font-mono bg-[#141414] border border-[#303030] rounded-lg py-1 text-xs text-white" />
                    <button type="button" onClick={() => setBox6Qty(box6Qty + 1)}
                      className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white flex items-center justify-center font-bold active:scale-95 transition-transform shadow-sm">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#202020]">
                  <span className="text-neutral-400 font-medium">Rate (₹/Box):</span>
                  <input
                    type="number"
                    value={box6UnitPrice}
                    onChange={e => setBox6UnitPrice(Number(e.target.value))}
                    className="w-28 rounded-lg border border-[#303030] p-1 text-right font-mono text-xs bg-[#141414] text-white focus:outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              {/* 8-Piece Box */}
              <div className="p-3 rounded-xl bg-[#0c0c0c] border border-[#262626] hover:border-[#404040] transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={getAssetUrl('/images/brand/prod_gift_8.jpg')} alt="8-Piece Box" className="w-8 h-8 object-cover rounded-md bg-[#181818] border border-[#303030] shrink-0" />
                    <div className="font-semibold text-white">8-Piece Box</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setBox8Qty(Math.max(0, box8Qty - 1))}
                      className="w-7 h-7 rounded-lg bg-[#202020] hover:bg-[#2c2c2c] border border-[#333333] flex items-center justify-center font-bold text-neutral-300 active:scale-95 transition-transform">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input type="number" min="0" value={box8Qty}
                      onChange={e => setBox8Qty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 text-center font-bold font-mono bg-[#141414] border border-[#303030] rounded-lg py-1 text-xs text-white" />
                    <button type="button" onClick={() => setBox8Qty(box8Qty + 1)}
                      className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white flex items-center justify-center font-bold active:scale-95 transition-transform shadow-sm">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#202020]">
                  <span className="text-neutral-400 font-medium">Rate (₹/Box):</span>
                  <input
                    type="number"
                    value={box8UnitPrice}
                    onChange={e => setBox8UnitPrice(Number(e.target.value))}
                    className="w-28 rounded-lg border border-[#303030] p-1 text-right font-mono text-xs bg-[#141414] text-white focus:outline-none focus:border-neutral-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & GST Mode */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calculator className="w-4 h-4 text-red-500" />
                <span>GST Tax Mode & Discounts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-300 mb-1">
                  Tax Calculation Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGstMode('exclusive')}
                    className={`p-2.5 rounded-lg border text-center font-medium transition tactile-press ${
                      gstMode === 'exclusive'
                        ? 'bg-red-600/15 border-red-500 text-white font-bold'
                        : 'bg-[#181818] border-[#2c2c2c] text-neutral-400 hover:text-white hover:bg-[#202020]'
                    }`}
                  >
                    <div>Exclusive GST</div>
                    <div className="text-[10px] text-neutral-400 font-normal">Base + 5% Tax</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGstMode('inclusive')}
                    className={`p-2.5 rounded-lg border text-center font-medium transition tactile-press ${
                      gstMode === 'inclusive'
                        ? 'bg-red-600/15 border-red-500 text-white font-bold'
                        : 'bg-[#181818] border-[#2c2c2c] text-neutral-400 hover:text-white hover:bg-[#202020]'
                    }`}
                  >
                    <div>Inclusive GST</div>
                    <div className="text-[10px] text-neutral-400 font-normal">Rate / 1.05 Back-calc</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-300 mb-1">
                  Discount Deduction (₹)
                </label>
                <input
                  type="number"
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#303030] bg-[#0c0c0c] p-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-300 mb-1 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-red-400" />
                  Courier / Shipping Charge (₹) <span className="text-neutral-500 font-normal">(GST 18%)</span>
                </label>
                <input
                  type="number"
                  value={courierCharge}
                  onChange={e => setCourierCharge(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#303030] bg-[#0c0c0c] p-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  placeholder="0.00"
                />
                <p className="text-[10px] text-neutral-500 mt-1">GST @18% is applied separately on courier charges. Set 0 to exclude.</p>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Notes & Delivery Terms Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-500" />
                <span>Invoice Notes & Delivery Terms</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-300 mb-1">
                  Custom Notes / Payment Terms (e.g. Payment for delivery)
                </label>
                <textarea
                  rows={3}
                  value={invoiceNotes}
                  onChange={e => setInvoiceNotes(e.target.value)}
                  className="w-full rounded-lg border border-[#303030] bg-[#0c0c0c] p-2 text-xs text-white focus:outline-none focus:border-red-500"
                  placeholder="Enter invoice terms, delivery notes, or UPI instructions..."
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setInvoiceNotes('Payment for delivery due upon receipt. Please reference Invoice No on UPI / bank transfers.')}
                  className="px-2 py-0.5 text-[10px] rounded bg-[#181818] text-neutral-300 border border-[#2c2c2c] hover:bg-[#242424] hover:text-white"
                >
                  Preset: Delivery Payment
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceNotes('50% advance received. Balance payment due within 7 days of delivery.')}
                  className="px-2 py-0.5 text-[10px] rounded bg-[#181818] text-neutral-300 border border-[#2c2c2c] hover:bg-[#242424] hover:text-white"
                >
                  Preset: 50% Advance
                </button>
              </div>
            </CardContent>
          </Card>
            </div>

            {lockPreview && (
              <div className="pointer-events-none sticky bottom-0 z-20 h-8 w-full bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent backdrop-blur-[2px] transition-all -mt-8 rounded-b-xl" />
            )}
          </div>
        </div>

        {/* Printable Invoice Container (Isolated via #printable-invoice-container) */}
        <div className={`lg:col-span-7 transition-all ${lockPreview ? 'lg:sticky lg:top-4' : ''}`}>
          {/* Header Bar for Live Preview Status & Pin Toggle (Print Hidden) */}
          <div className="flex items-center justify-between pb-2.5 px-1 text-xs text-neutral-400 print:hidden">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-neutral-200">Live Invoice Document</span>
              <span className="text-[10px] text-neutral-500 font-mono">Standard A4</span>
            </div>
            <button
              type="button"
              onClick={toggleLockPreview}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-all tactile-press ${
                lockPreview
                  ? 'bg-[#2a2618] border-amber-500/40 text-amber-300 shadow-sm'
                  : 'bg-[#1a1a1a] border-[#2c2c2c] text-neutral-400 hover:text-white'
              }`}
              title={lockPreview ? "Invoice stays pinned in view while editing. Click to enable free scroll." : "Click to lock invoice in place."}
            >
              {lockPreview ? <Pin className="w-3 h-3 text-amber-400 rotate-45" /> : <PinOff className="w-3 h-3 text-neutral-500" />}
              <span>{lockPreview ? 'Locked in View' : 'Free Scroll'}</span>
            </button>
          </div>

          <div className={lockPreview ? 'lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto pr-1' : ''}>
            <div 
              id="printable-invoice-container"
              className="bg-white text-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 font-sans text-xs max-w-[794px] mx-auto box-border"
            >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoice</h1>
                <p className="text-slate-800 font-bold text-sm">Gudoria Food Innovations Private Limited</p>
                <p className="text-slate-500 text-[11px]">Pranavam Tower 1st Floor, Petta, Poonithura, Maradu, Ernakulam, Kerala 682038</p>
                <p className="text-slate-500 text-[11px]">Ph: +91 95448 09992 | Email: gudchocolates@gmail.com</p>
              </div>
              <div className="text-right flex items-center justify-end">
                <div className="p-1.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                  <GudLogo size={36} />
                </div>
              </div>
            </div>

            {/* Client & Metadata */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider mb-1">Invoice To:</div>
                <div className="font-bold text-slate-900 text-sm">{clientName}</div>
                <div className="text-slate-600 whitespace-pre-line mt-0.5">{clientAddress}</div>
                {clientCin && <div className="text-slate-600 font-mono text-[11px] mt-1">{clientCin}</div>}
                {clientGstin && <div className="text-slate-600 font-mono text-[11px]">{clientGstin}</div>}
              </div>
              <div className="text-right space-y-1">
                <div>
                  <span className="text-slate-400 font-medium">Invoice No: </span>
                  <span className="font-bold text-slate-900 font-mono">{invoiceNoFormatted}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Date: </span>
                  <span className="font-semibold text-slate-800">{new Date(invoiceDate).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="mb-6">
              <div className="text-slate-700 font-bold uppercase text-[11px] mb-2 tracking-wide">Order Details</div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-300 bg-slate-50 text-slate-700 font-bold">
                    <th className="py-2 px-2">Item</th>
                    <th className="py-2 px-2">Description</th>
                    <th className="py-2 px-2 text-right">Rate</th>
                    <th className="py-2 px-2 text-center">Total Qty</th>
                    <th className="py-2 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => {
                    const displayRate = gstMode === 'inclusive' ? (item.rate / 1.05).toFixed(2) : item.rate.toFixed(2);
                    const lineTotal = gstMode === 'inclusive' ? ((item.rate / 1.05) * item.qty).toFixed(2) : (item.rate * item.qty).toFixed(2);
                    return (
                      <tr key={item.id} className="align-top">
                        <td className="py-2.5 px-2 font-semibold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-2 text-slate-600 whitespace-pre-line">{item.description}</td>
                        <td className="py-2.5 px-2 text-right font-mono">₹{displayRate}/{item.unit.replace(/s$/, '')}</td>
                        <td className="py-2.5 px-2 text-center font-medium">{item.qty} {item.unit}</td>
                        <td className="py-2.5 px-2 text-right font-bold font-mono">₹{lineTotal}</td>
                      </tr>
                    );
                  })}
                  {courierCharge > 0 && (
                    <tr className="align-top bg-amber-50/40">
                      <td className="py-2.5 px-2 font-semibold text-slate-900">Courier / Shipping</td>
                      <td className="py-2.5 px-2 text-slate-500 text-[11px]">Delivery charges (GST @18% applicable)</td>
                      <td className="py-2.5 px-2 text-right font-mono">₹{courierBase.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-center font-medium">1 shipment</td>
                      <td className="py-2.5 px-2 text-right font-bold font-mono">₹{courierBase.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Tax & Summary */}
            <div className="flex justify-end mb-6">
              <div className="w-64 space-y-1.5 text-right font-medium">
                {courierCharge > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Courier Charge (Base)</span>
                    <span className="font-mono">₹{courierBase.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>SGST @2.5%</span>
                  <span className="font-mono">₹{sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST @2.5%</span>
                  <span className="font-mono">₹{cgst.toFixed(2)}</span>
                </div>
                {courierCharge > 0 && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Courier SGST @9%</span>
                    <span className="font-mono">included in above</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount</span>
                    <span className="font-mono">₹{discount.toFixed(2)} (-)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total Amount Receivable */}
            <div className="border-y-2 border-slate-900 py-3 mb-6 flex justify-between items-center">
              <div>
                <div className="text-slate-900 font-bold text-sm">Total Amount Receivable :</div>
                <div className="text-slate-600 text-[11px] italic mt-0.5">
                  Amount in Words : <span className="font-semibold text-slate-800">{numberToWordsINR(totalReceivable)}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold font-mono text-slate-900">₹{totalReceivable.toFixed(2)}</span>
              </div>
            </div>

            {/* Invoice Notes / Payment Terms Block */}
            {invoiceNotes && (
              <div className="mb-6 p-3 rounded-lg bg-amber-50/50 border border-amber-200/80 text-[11px]">
                <div className="font-bold text-amber-950 uppercase text-[10px] tracking-wider mb-0.5">Notes & Terms:</div>
                <div className="text-slate-700 whitespace-pre-line leading-relaxed font-medium">{invoiceNotes}</div>
              </div>
            )}

            {/* Bank Details Footer */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-[10px] text-slate-500">
              <div>
                <div className="font-bold text-slate-800 text-[11px] mb-1">Bank Details</div>
                <div>Account Name: <span className="font-semibold text-slate-700">Gudoria Food Innovations Private Limited</span></div>
                <div>Branch Name: <span className="font-semibold text-slate-700">ERNAKULAM - NRI</span></div>
                <div>Account Number: <span className="font-semibold font-mono text-slate-700">0307073000000080</span></div>
                <div>IFSC Code: <span className="font-semibold font-mono text-slate-700">SIBL0000307</span></div>
                <div className="mt-1">GST NO: <span className="font-semibold font-mono text-slate-700">32AANCA8181G1ZK</span></div>
                <div>CIN: <span className="font-semibold font-mono text-slate-700">U72200KL2015PTC039279</span></div>
              </div>
              <div className="text-right flex flex-col items-end justify-end space-y-1">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">For Gudoria Food Innovations Pvt Ltd</div>
                <img src={getAssetUrl('/images/brand/founder_signature.jpg')} alt="Founder Signature" className="h-12 max-w-[140px] object-contain my-1" />
                <div className="text-[10px] font-semibold text-slate-700">Authorized Signatory</div>
                <div className="text-[9px] text-slate-400">Founder & Operations</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
