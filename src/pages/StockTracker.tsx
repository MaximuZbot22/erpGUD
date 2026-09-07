import React, { useState, useEffect, useMemo } from 'react';
import { 
  PackageCheck, AlertTriangle, Plus, ArrowUpRight, ArrowDownRight, 
  RefreshCw, Search, CheckCircle2, Factory, Clock, ShieldAlert,
  Boxes, Truck, Sparkles, Filter, Info, ChevronRight, Share2, Layers, Wrench
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { GoogleSheetsService } from '../services/google';
import { getAssetUrl } from '../utils/assetPath';

export interface FlavorData {
  almond: number;
  orange: number;
  jackfruit: number;
  lemon: number;
  mocha: number;
  seaSalt: number;
  peanuts: number;
}

export interface StockBatch {
  dateReceived: string;
  batchId: string;
  mfgDate?: string;
  totalIn: FlavorData;
  damagedIn: FlavorData;
}

export interface StockMovement {
  id: string;
  date: string;
  reason: string;
  batchId: string;
  stockType: 'Good' | 'Damaged';
  flavors: FlavorData;
}

const FLAVOR_CONFIG: { 
  key: keyof FlavorData; 
  name: string; 
  shortName: string; 
  color: string; 
  dotColor: string; 
  image: string; 
}[] = [
  { key: 'almond', name: 'Almond Noir 25g', shortName: 'Almond', color: 'text-amber-400', dotColor: 'bg-amber-500', image: getAssetUrl('/images/brand/prod_almond_art.png') },
  { key: 'orange', name: 'Orange Sunset 25g', shortName: 'Orange', color: 'text-orange-400', dotColor: 'bg-orange-500', image: getAssetUrl('/images/brand/prod_orange_art.png') },
  { key: 'jackfruit', name: 'Malabar Jackfruit 25g', shortName: 'Jackfruit', color: 'text-yellow-400', dotColor: 'bg-yellow-400', image: getAssetUrl('/images/brand/prod_jackfruit_art.png') },
  { key: 'lemon', name: 'Sun-Kissed Lemon 25g', shortName: 'Lemon', color: 'text-lime-400', dotColor: 'bg-lime-400', image: getAssetUrl('/images/brand/prod_lemon_art.png') },
  { key: 'mocha', name: 'Midnight Mocha 25g', shortName: 'Mocha', color: 'text-amber-600', dotColor: 'bg-amber-700', image: getAssetUrl('/images/brand/prod_mocha_art.png') },
  { key: 'seaSalt', name: 'Indian Sea Salt 25g', shortName: 'Sea Salt', color: 'text-cyan-400', dotColor: 'bg-cyan-400', image: getAssetUrl('/images/brand/prod_seasalt_art.png') },
  { key: 'peanuts', name: 'Peanut Royale 25g', shortName: 'Peanuts', color: 'text-stone-300', dotColor: 'bg-stone-300', image: getAssetUrl('/images/brand/prod_peanut_art.png') }
];

const parseSafeInt = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const cleaned = String(val).replace(/[^0-9-]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
};

// Initial Seed Batches matching the user's exact Google Sheet structure
const SEED_BATCHES: StockBatch[] = [
  {
    dateReceived: '2023-07-05',
    batchId: 'B-0705',
    totalIn: { almond: 50, orange: 50, jackfruit: 50, lemon: 50, mocha: 50, seaSalt: 50, peanuts: 50 },
    damagedIn: { almond: 2, orange: 2, jackfruit: 2, lemon: 2, mocha: 2, seaSalt: 2, peanuts: 2 }
  },
  {
    dateReceived: '2023-07-12',
    batchId: 'B-0712',
    totalIn: { almond: 60, orange: 60, jackfruit: 60, lemon: 60, mocha: 60, seaSalt: 60, peanuts: 60 },
    damagedIn: { almond: 0, orange: 0, jackfruit: 0, lemon: 0, mocha: 0, seaSalt: 0, peanuts: 0 }
  },
  {
    dateReceived: '2023-08-02',
    batchId: 'B-0802',
    totalIn: { almond: 40, orange: 40, jackfruit: 40, lemon: 40, mocha: 40, seaSalt: 40, peanuts: 40 },
    damagedIn: { almond: 5, orange: 5, jackfruit: 5, lemon: 5, mocha: 5, seaSalt: 5, peanuts: 5 }
  },
  {
    dateReceived: '2023-08-05',
    batchId: 'B-0805',
    totalIn: { almond: 70, orange: 70, jackfruit: 70, lemon: 70, mocha: 70, seaSalt: 70, peanuts: 70 },
    damagedIn: { almond: 1, orange: 1, jackfruit: 1, lemon: 1, mocha: 1, seaSalt: 1, peanuts: 1 }
  },
  {
    dateReceived: '2023-08-10',
    batchId: 'B-0810',
    totalIn: { almond: 55, orange: 55, jackfruit: 55, lemon: 55, mocha: 55, seaSalt: 55, peanuts: 55 },
    damagedIn: { almond: 3, orange: 3, jackfruit: 3, lemon: 3, mocha: 3, seaSalt: 3, peanuts: 3 }
  },
  {
    dateReceived: '2026-08-18',
    batchId: 'B-0820',
    totalIn: { almond: 80, orange: 80, jackfruit: 80, lemon: 80, mocha: 80, seaSalt: 80, peanuts: 80 },
    damagedIn: { almond: 2, orange: 2, jackfruit: 2, lemon: 2, mocha: 2, seaSalt: 2, peanuts: 2 }
  }
];

const SEED_MOVEMENTS: StockMovement[] = [
  {
    id: 'MOV-001',
    date: '2023-07-06',
    reason: 'Customer Order (Customer A)',
    batchId: 'B-0705',
    stockType: 'Good',
    flavors: { almond: 10, orange: 5, jackfruit: 10, lemon: 5, mocha: 10, seaSalt: 5, peanuts: 10 }
  },
  {
    id: 'MOV-002',
    date: '2023-07-07',
    reason: 'Supplier Return (Damaged Sample)',
    batchId: 'B-0705',
    stockType: 'Damaged',
    flavors: { almond: 2, orange: 1, jackfruit: 2, lemon: 0, mocha: 2, seaSalt: 1, peanuts: 1 }
  },
  {
    id: 'MOV-003',
    date: '2023-07-15',
    reason: 'Customer Order (Customer B)',
    batchId: 'B-0712',
    stockType: 'Good',
    flavors: { almond: 20, orange: 15, jackfruit: 20, lemon: 15, mocha: 20, seaSalt: 15, peanuts: 20 }
  },
  {
    id: 'MOV-004',
    date: '2023-08-03',
    reason: 'Supplier Return (Damaged)',
    batchId: 'B-0802',
    stockType: 'Damaged',
    flavors: { almond: 5, orange: 5, jackfruit: 5, lemon: 5, mocha: 5, seaSalt: 5, peanuts: 5 }
  }
];

export const StockTracker: React.FC = () => {
  const { googleToken, signInWithGoogle } = useAuth();
  const { sendNotification } = useNotifications();

  // Primary State
  const [batches, setBatches] = useState<StockBatch[]>(() => {
    try {
      const saved = localStorage.getItem('gud_stock_batches_v1');
      return saved ? JSON.parse(saved) : SEED_BATCHES;
    } catch {
      return SEED_BATCHES;
    }
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem('gud_stock_movements_v1');
      return saved ? JSON.parse(saved) : SEED_MOVEMENTS;
    } catch {
      return SEED_MOVEMENTS;
    }
  });

  const [searchVal, setSearchVal] = useState('');
  const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);

  // 10-Row Table Pagination Controls
  const [batchPage, setBatchPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('gud_stock_batches_v1', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('gud_stock_movements_v1', JSON.stringify(movements));
  }, [movements]);

  // Fetch live Google Sheet Data if Token Available
  const fetchSheetStockData = async () => {
    if (!googleToken) return;
    setLoadingSync(true);
    const sheetId = '12F0V0uId2dB9QJsnIqZACVdCjcrmHVO_ra-8q46KKXk';
    try {
      // Try 'Inventory Tracker' tab first, then fallback to 'Stock Summary'
      let res;
      try {
        res = await GoogleSheetsService.getSpreadsheetValues(googleToken, sheetId, "'Inventory Tracker'!A6:AD");
      } catch {
        res = await GoogleSheetsService.getSpreadsheetValues(googleToken, sheetId, "'Stock Summary'!A5:AE");
      }

      if (res?.values && res.values.length > 0) {
        const parsedBatches: StockBatch[] = [];
        res.values.forEach((row: string[]) => {
          if (!row[0] || !row[1]) return;
          const bId = row[1].trim();
          parsedBatches.push({
            dateReceived: row[0],
            batchId: bId,
            totalIn: {
              almond: parseSafeInt(row[2]),
              orange: parseSafeInt(row[6]),
              jackfruit: parseSafeInt(row[10]),
              lemon: parseSafeInt(row[14]),
              mocha: parseSafeInt(row[18]),
              seaSalt: parseSafeInt(row[22]),
              peanuts: parseSafeInt(row[26])
            },
            damagedIn: {
              almond: parseSafeInt(row[3]),
              orange: parseSafeInt(row[7]),
              jackfruit: parseSafeInt(row[11]),
              lemon: parseSafeInt(row[15]),
              mocha: parseSafeInt(row[19]),
              seaSalt: parseSafeInt(row[23]),
              peanuts: parseSafeInt(row[27])
            }
          });
        });
        setBatches(parsedBatches);
      } else {
        // Sheet was emptied/cleared by user -> reflect empty stock in ERP
        setBatches([]);
      }

      // Also fetch live Stock Movements tab if present
      try {
        const movRes = await GoogleSheetsService.getSpreadsheetValues(googleToken, sheetId, "'Stock Movements'!A2:K");
        if (movRes?.values && movRes.values.length > 0) {
          const parsedMovs: StockMovement[] = [];
          movRes.values.forEach((row: string[], idx: number) => {
            if (!row[0] || !row[2]) return;
            parsedMovs.push({
              id: `MOV-LIVE-${idx + 1}`,
              date: row[0],
              reason: row[1] || 'Movement',
              batchId: row[2].trim(),
              stockType: (row[3] === 'Damaged' ? 'Damaged' : 'Good') as 'Good' | 'Damaged',
              flavors: {
                almond: parseSafeInt(row[4]),
                orange: parseSafeInt(row[5]),
                jackfruit: parseSafeInt(row[6]),
                lemon: parseSafeInt(row[7]),
                mocha: parseSafeInt(row[8]),
                seaSalt: parseSafeInt(row[9]),
                peanuts: parseSafeInt(row[10])
              }
            });
          });
          setMovements(parsedMovs);
        } else {
          setMovements([]);
        }
      } catch (e) {
        console.warn('Google Sheet movements fetch error:', e);
      }
    } catch (e) {
      console.warn('Google Sheet stock fetch error, using local state:', e);
    } finally {
      setLoadingSync(false);
    }
  };

  useEffect(() => {
    fetchSheetStockData();
  }, [googleToken]);

  // Compute Remaining Stock Balances Per Batch and Totals
  const batchBalances = useMemo(() => {
    return batches.map(b => {
      // Calculate movements for this specific batch
      const batchMovs = movements.filter(m => m.batchId.toLowerCase() === b.batchId.toLowerCase());
      
      const goodDeductions: FlavorData = { almond: 0, orange: 0, jackfruit: 0, lemon: 0, mocha: 0, seaSalt: 0, peanuts: 0 };
      const damagedDeductions: FlavorData = { almond: 0, orange: 0, jackfruit: 0, lemon: 0, mocha: 0, seaSalt: 0, peanuts: 0 };

      batchMovs.forEach(m => {
        FLAVOR_CONFIG.forEach(f => {
          if (m.stockType === 'Good') {
            goodDeductions[f.key] += (m.flavors[f.key] || 0);
          } else {
            damagedDeductions[f.key] += (m.flavors[f.key] || 0);
          }
        });
      });

      const goodRemaining: FlavorData = {
        almond: Math.max(0, parseSafeInt(b.totalIn.almond) - parseSafeInt(b.damagedIn.almond) - parseSafeInt(goodDeductions.almond)),
        orange: Math.max(0, parseSafeInt(b.totalIn.orange) - parseSafeInt(b.damagedIn.orange) - parseSafeInt(goodDeductions.orange)),
        jackfruit: Math.max(0, parseSafeInt(b.totalIn.jackfruit) - parseSafeInt(b.damagedIn.jackfruit) - parseSafeInt(goodDeductions.jackfruit)),
        lemon: Math.max(0, parseSafeInt(b.totalIn.lemon) - parseSafeInt(b.damagedIn.lemon) - parseSafeInt(goodDeductions.lemon)),
        mocha: Math.max(0, parseSafeInt(b.totalIn.mocha) - parseSafeInt(b.damagedIn.mocha) - parseSafeInt(goodDeductions.mocha)),
        seaSalt: Math.max(0, parseSafeInt(b.totalIn.seaSalt) - parseSafeInt(b.damagedIn.seaSalt) - parseSafeInt(goodDeductions.seaSalt)),
        peanuts: Math.max(0, parseSafeInt(b.totalIn.peanuts) - parseSafeInt(b.damagedIn.peanuts) - parseSafeInt(goodDeductions.peanuts))
      };

      const damagedRemaining: FlavorData = {
        almond: Math.max(0, parseSafeInt(b.damagedIn.almond) - parseSafeInt(damagedDeductions.almond)),
        orange: Math.max(0, parseSafeInt(b.damagedIn.orange) - parseSafeInt(damagedDeductions.orange)),
        jackfruit: Math.max(0, parseSafeInt(b.damagedIn.jackfruit) - parseSafeInt(damagedDeductions.jackfruit)),
        lemon: Math.max(0, parseSafeInt(b.damagedIn.lemon) - parseSafeInt(damagedDeductions.lemon)),
        mocha: Math.max(0, parseSafeInt(b.damagedIn.mocha) - parseSafeInt(damagedDeductions.mocha)),
        seaSalt: Math.max(0, parseSafeInt(b.damagedIn.seaSalt) - parseSafeInt(damagedDeductions.seaSalt)),
        peanuts: Math.max(0, parseSafeInt(b.damagedIn.peanuts) - parseSafeInt(damagedDeductions.peanuts))
      };

      const totalGoodLeft = Object.values(goodRemaining).reduce((a, b) => a + b, 0);
      const totalDamagedLeft = Object.values(damagedRemaining).reduce((a, b) => a + b, 0);

      // 3-Month (90 Days) Shelf Life Math
      const recvMs = new Date(b.dateReceived).getTime();
      const expiryMs = isNaN(recvMs) ? Date.now() + (90 * 86400000) : recvMs + (90 * 86400000);
      const expiryDateStr = new Date(expiryMs).toISOString().split('T')[0];
      const daysRemaining = Math.ceil((expiryMs - Date.now()) / 86400000);

      let shelfLifeStatus: 'FRESH' | 'EXPIRING_SOON' | 'CRITICAL' | 'EXPIRED' = 'FRESH';
      if (daysRemaining <= 0) shelfLifeStatus = 'EXPIRED';
      else if (daysRemaining <= 14) shelfLifeStatus = 'CRITICAL';
      else if (daysRemaining <= 30) shelfLifeStatus = 'EXPIRING_SOON';

      return {
        ...b,
        goodRemaining,
        damagedRemaining,
        totalGoodLeft,
        totalDamagedLeft,
        expiryDate: expiryDateStr,
        daysRemaining,
        shelfLifeStatus
      };
    });
  }, [batches, movements]);

  // Grand Totals across all active batches
  const grandTotals = useMemo(() => {
    const totalGood: FlavorData = { almond: 0, orange: 0, jackfruit: 0, lemon: 0, mocha: 0, seaSalt: 0, peanuts: 0 };
    const totalDamaged: FlavorData = { almond: 0, orange: 0, jackfruit: 0, lemon: 0, mocha: 0, seaSalt: 0, peanuts: 0 };

    batchBalances.forEach(b => {
      FLAVOR_CONFIG.forEach(f => {
        totalGood[f.key] += b.goodRemaining[f.key];
        totalDamaged[f.key] += b.damagedRemaining[f.key];
      });
    });

    const sumGood = Object.values(totalGood).reduce((a, b) => a + b, 0);
    const sumDamaged = Object.values(totalDamaged).reduce((a, b) => a + b, 0);

    return { totalGood, totalDamaged, sumGood, sumDamaged };
  }, [batchBalances]);

  // FIFO Engine: Find oldest batch with remaining good stock
  const fifoOldestBatch = useMemo(() => {
    const activeBatches = batchBalances.filter(b => b.totalGoodLeft > 0);
    if (activeBatches.length === 0) return null;
    // Sort ascending by dateReceived
    activeBatches.sort((a, b) => new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime());
    return activeBatches[0];
  }, [batchBalances]);

  // Paginated Batches (10 per page)
  const totalBatchPages = Math.max(1, Math.ceil(batchBalances.length / ROWS_PER_PAGE));
  const paginatedBatches = useMemo(() => {
    const start = (batchPage - 1) * ROWS_PER_PAGE;
    return batchBalances.slice(start, start + ROWS_PER_PAGE);
  }, [batchBalances, batchPage]);

  // Paginated Movements (10 per page)
  const totalMovementPages = Math.max(1, Math.ceil(movements.length / ROWS_PER_PAGE));
  const paginatedMovements = useMemo(() => {
    const start = (movementPage - 1) * ROWS_PER_PAGE;
    return movements.slice(start, start + ROWS_PER_PAGE);
  }, [movements, movementPage]);

  // Form State for Receiving New Batch Modal
  const [newBatchForm, setNewBatchForm] = useState({
    dateReceived: new Date().toISOString().split('T')[0],
    batchId: `B-08${Math.floor(21 + Math.random() * 70)}`,
    mfgDate: new Date().toISOString().split('T')[0],
    totalIn: { almond: 50, orange: 50, jackfruit: 50, lemon: 50, mocha: 50, seaSalt: 50, peanuts: 50 },
    damagedIn: { almond: 0, orange: 0, jackfruit: 0, lemon: 0, mocha: 0, seaSalt: 0, peanuts: 0 }
  });

  // Form State for Movement Modal
  const [newMovementForm, setNewMovementForm] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: 'Customer Order',
    batchId: '',
    stockType: 'Good' as 'Good' | 'Damaged',
    flavors: { almond: 0, orange: 0, jackfruit: 0, lemon: 0, mocha: 0, seaSalt: 0, peanuts: 0 }
  });

  // Set default FIFO batch when movement modal opens
  useEffect(() => {
    if (isMovementModalOpen && fifoOldestBatch) {
      setNewMovementForm(prev => ({ ...prev, batchId: fifoOldestBatch.batchId }));
    }
  }, [isMovementModalOpen, fifoOldestBatch]);

  // Save New Batch Submission
  const handleAddBatch = async () => {
    const newEntry: StockBatch = {
      dateReceived: newBatchForm.dateReceived,
      batchId: newBatchForm.batchId.toUpperCase().trim(),
      mfgDate: newBatchForm.mfgDate,
      totalIn: { ...newBatchForm.totalIn },
      damagedIn: { ...newBatchForm.damagedIn }
    };

    setBatches(prev => [newEntry, ...prev]);
    setIsReceivingModalOpen(false);

    sendNotification({
      title: 'New Stock Batch Logged',
      message: `Successfully received Batch ${newEntry.batchId} (${Object.values(newEntry.totalIn).reduce((a, b) => a + b, 0)} total bars).`,
      priority: 'high',
      channels: ['in-app']
    });

    // Write directly to Google Sheet if authenticated
    if (googleToken) {
      const sheetId = '12F0V0uId2dB9QJsnIqZACVdCjcrmHVO_ra-8q46KKXk';
      
      // Calculate exact formulas for Inventory Tracker tab (Row 6+ onwards)
      const nextRow = batches.length + 6;
      const bRef = `B${nextRow}`;
      
      // Column mapping for each chocolate in Inventory Tracker (TotalInCol, DamagedInCol, GoodRemCol, DamagedRemCol) & Stock Movements Qty Col
      const flavorMap = [
        { totalCol: 'C', damCol: 'D', movCol: 'E', totalIn: newEntry.totalIn.almond, damagedIn: newEntry.damagedIn.almond },
        { totalCol: 'G', damCol: 'H', movCol: 'F', totalIn: newEntry.totalIn.orange, damagedIn: newEntry.damagedIn.orange },
        { totalCol: 'K', damCol: 'L', movCol: 'G', totalIn: newEntry.totalIn.jackfruit, damagedIn: newEntry.damagedIn.jackfruit },
        { totalCol: 'O', damCol: 'P', movCol: 'H', totalIn: newEntry.totalIn.lemon, damagedIn: newEntry.damagedIn.lemon },
        { totalCol: 'S', damCol: 'T', movCol: 'I', totalIn: newEntry.totalIn.mocha, damagedIn: newEntry.damagedIn.mocha },
        { totalCol: 'W', damCol: 'X', movCol: 'J', totalIn: newEntry.totalIn.seaSalt, damagedIn: newEntry.damagedIn.seaSalt },
        { totalCol: 'AA', damCol: 'AB', movCol: 'K', totalIn: newEntry.totalIn.peanuts, damagedIn: newEntry.damagedIn.peanuts }
      ];

      const rowValues: any[] = [newEntry.dateReceived, newEntry.batchId];

      flavorMap.forEach(item => {
        const goodFormula = `=${item.totalCol}${nextRow}-${item.damCol}${nextRow}-SUMIFS('Stock Movements'!${item.movCol}:${item.movCol}, 'Stock Movements'!C:C, ${bRef}, 'Stock Movements'!D:D, "Good")`;
        const damagedFormula = `=${item.damCol}${nextRow}-SUMIFS('Stock Movements'!${item.movCol}:${item.movCol}, 'Stock Movements'!C:C, ${bRef}, 'Stock Movements'!D:D, "Damaged")`;
        rowValues.push(item.totalIn, item.damagedIn, goodFormula, damagedFormula);
      });

      try {
        await GoogleSheetsService.appendSpreadsheetValues(googleToken, sheetId, "'Inventory Tracker'!A6:AD", [rowValues]);
      } catch {
        try {
          await GoogleSheetsService.appendSpreadsheetValues(googleToken, sheetId, "'Stock Summary'!A5:AE", [rowValues]);
        } catch (e) {
          console.warn('Google Sheet batch append error:', e);
        }
      }
    }
  };

  // Save Movement Submission with Smart Multi-Batch Auto-FIFO Option
  const handleAddMovement = async () => {
    const sumQty = Object.values(newMovementForm.flavors).reduce((a, b) => a + b, 0);
    if (sumQty === 0) {
      alert('Please enter at least 1 chocolate quantity to record movement.');
      return;
    }

    const selectedBatch = newMovementForm.batchId || (fifoOldestBatch ? fifoOldestBatch.batchId : 'B-0705');

    // Handle Smart Multi-Batch Auto-FIFO split if user selects AUTO-FIFO
    if (selectedBatch === 'AUTO_FIFO') {
      // Allocate required flavor quantities across active batches in chronological order
      const remainingNeeded: FlavorData = { ...newMovementForm.flavors };
      const createdMovs: StockMovement[] = [];
      const rowsToAppend: any[][] = [];

      // Sort batches ascending by date
      const sortedBatches = [...batchBalances].sort((a, b) => new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime());

      for (const b of sortedBatches) {
        const batchAlloc: FlavorData = { almond: 0, orange: 0, jackfruit: 0, lemon: 0, mocha: 0, seaSalt: 0, peanuts: 0 };
        let allocatedInThisBatch = false;

        FLAVOR_CONFIG.forEach(f => {
          const needed = remainingNeeded[f.key];
          const availableInBatch = newMovementForm.stockType === 'Good' ? b.goodRemaining[f.key] : b.damagedRemaining[f.key];
          if (needed > 0 && availableInBatch > 0) {
            const take = Math.min(needed, availableInBatch);
            batchAlloc[f.key] = take;
            remainingNeeded[f.key] -= take;
            allocatedInThisBatch = true;
          }
        });

        if (allocatedInThisBatch) {
          const mov: StockMovement = {
            id: `MOV-${Date.now().toString().slice(-4)}-${b.batchId}`,
            date: newMovementForm.date,
            reason: newMovementForm.reason,
            batchId: b.batchId,
            stockType: newMovementForm.stockType,
            flavors: batchAlloc
          };
          createdMovs.push(mov);

          rowsToAppend.push([
            mov.date,
            mov.reason,
            mov.batchId,
            mov.stockType,
            mov.flavors.almond,
            mov.flavors.orange,
            mov.flavors.jackfruit,
            mov.flavors.lemon,
            mov.flavors.mocha,
            mov.flavors.seaSalt,
            mov.flavors.peanuts
          ]);
        }

        const totalStillNeeded = Object.values(remainingNeeded).reduce((a, b) => a + b, 0);
        if (totalStillNeeded === 0) break;
      }

      if (createdMovs.length > 0) {
        setMovements(prev => [...createdMovs, ...prev]);
        setIsMovementModalOpen(false);

        sendNotification({
          title: 'Smart Multi-Batch Dispatch Logged',
          message: `Auto-allocated ${sumQty} bars across ${createdMovs.length} FIFO batches.`,
          priority: 'medium',
          channels: ['in-app']
        });

        if (googleToken) {
          const sheetId = '12F0V0uId2dB9QJsnIqZACVdCjcrmHVO_ra-8q46KKXk';
          try {
            await GoogleSheetsService.appendSpreadsheetValues(googleToken, sheetId, "'Stock Movements'!A2:K", rowsToAppend);
          } catch (e) {
            console.warn('Google Sheet movement append error:', e);
          }
        }
      }
      return;
    }

    // Standard Single-Batch Dispatch Validation
    const targetBatch = batchBalances.find(b => b.batchId.toLowerCase() === selectedBatch.toLowerCase());
    if (targetBatch && newMovementForm.stockType === 'Good') {
      const deficits: string[] = [];
      FLAVOR_CONFIG.forEach(f => {
        const req = newMovementForm.flavors[f.key] || 0;
        const avail = targetBatch.goodRemaining[f.key] || 0;
        if (req > avail) {
          deficits.push(`${f.name}: requested ${req}, available ${avail}`);
        }
      });
      if (deficits.length > 0) {
        alert(`Cannot dispatch batch ${selectedBatch}.\nInsufficient Good Stock:\n` + deficits.join('\n') + '\n\nPlease select AUTO-FIFO or adjust requested quantities.');
        return;
      }
    }

    const newMov: StockMovement = {
      id: `MOV-${Date.now().toString().slice(-4)}`,
      date: newMovementForm.date,
      reason: newMovementForm.reason,
      batchId: selectedBatch,
      stockType: newMovementForm.stockType,
      flavors: { ...newMovementForm.flavors }
    };

    setMovements(prev => [newMov, ...prev]);
    setIsMovementModalOpen(false);

    sendNotification({
      title: 'Stock Movement Logged',
      message: `Recorded ${newMov.stockType} stock dispatch (${sumQty} bars) for Batch ${newMov.batchId}.`,
      priority: 'medium',
      channels: ['in-app']
    });

    // Write to Google Sheet 'Stock Movements' tab if authenticated
    if (googleToken) {
      const sheetId = '12F0V0uId2dB9QJsnIqZACVdCjcrmHVO_ra-8q46KKXk';
      const rowValues = [
        newMov.date,
        newMov.reason,
        newMov.batchId,
        newMov.stockType,
        newMov.flavors.almond,
        newMov.flavors.orange,
        newMov.flavors.jackfruit,
        newMov.flavors.lemon,
        newMov.flavors.mocha,
        newMov.flavors.seaSalt,
        newMov.flavors.peanuts
      ];
      try {
        await GoogleSheetsService.appendSpreadsheetValues(googleToken, sheetId, "'Stock Movements'!A2:K", [rowValues]);
      } catch (e) {
        console.warn('Google Sheet movement append error:', e);
      }
    }
  };

  // Repair existing #REF! formulas directly in Google Sheets
  const [isRepairing, setIsRepairing] = useState(false);
  const handleRepairSheetFormulas = async () => {
    if (!googleToken) {
      alert('Please connect your Google Account first to repair sheet formulas.');
      return;
    }
    setIsRepairing(true);
    const sheetId = '12F0V0uId2dB9QJsnIqZACVdCjcrmHVO_ra-8q46KKXk';

    try {
      // Fetch existing rows from row 6 to 50
      const res = await GoogleSheetsService.getSpreadsheetValues(googleToken, sheetId, "'Inventory Tracker'!A6:AD");
      if (!res?.values || res.values.length === 0) {
        alert('No rows found in Inventory Tracker to repair.');
        return;
      }

      const repairedRows: any[][] = [];

      res.values.forEach((row: any[], index: number) => {
        const rowNum = index + 6;
        const dateReceived = row[0] || '';
        const batchId = row[1] || '';
        if (!batchId) return;

        const bRef = `B${rowNum}`;

        const flavorMap = [
          { totalCol: 'C', damCol: 'D', movCol: 'E', totalIn: parseInt(row[2] || '0', 10), damagedIn: parseInt(row[3] || '0', 10) },
          { totalCol: 'G', damCol: 'H', movCol: 'F', totalIn: parseInt(row[6] || '0', 10), damagedIn: parseInt(row[7] || '0', 10) },
          { totalCol: 'K', damCol: 'L', movCol: 'G', totalIn: parseInt(row[10] || '0', 10), damagedIn: parseInt(row[11] || '0', 10) },
          { totalCol: 'O', damCol: 'P', movCol: 'H', totalIn: parseInt(row[14] || '0', 10), damagedIn: parseInt(row[15] || '0', 10) },
          { totalCol: 'S', damCol: 'T', movCol: 'I', totalIn: parseInt(row[18] || '0', 10), damagedIn: parseInt(row[19] || '0', 10) },
          { totalCol: 'W', damCol: 'X', movCol: 'J', totalIn: parseInt(row[22] || '0', 10), damagedIn: parseInt(row[23] || '0', 10) },
          { totalCol: 'AA', damCol: 'AB', movCol: 'K', totalIn: parseInt(row[26] || '0', 10), damagedIn: parseInt(row[27] || '0', 10) }
        ];

        const rowValues: any[] = [dateReceived, batchId];

        flavorMap.forEach(item => {
          const goodFormula = `=${item.totalCol}${rowNum}-${item.damCol}${rowNum}-SUMIFS('Stock Movements'!${item.movCol}:${item.movCol}, 'Stock Movements'!C:C, ${bRef}, 'Stock Movements'!D:D, "Good")`;
          const damagedFormula = `=${item.damCol}${rowNum}-SUMIFS('Stock Movements'!${item.movCol}:${item.movCol}, 'Stock Movements'!C:C, ${bRef}, 'Stock Movements'!D:D, "Damaged")`;
          rowValues.push(item.totalIn, item.damagedIn, goodFormula, damagedFormula);
        });

        repairedRows.push(rowValues);
      });

      const endRow = 5 + repairedRows.length;
      await GoogleSheetsService.updateSpreadsheetValues(
        googleToken,
        sheetId,
        `'Inventory Tracker'!A6:AD${endRow}`,
        repairedRows,
        'USER_ENTERED'
      );

      alert(`Successfully repaired formulas for all ${repairedRows.length} rows in Google Sheets!`);
      await fetchSheetStockData();
    } catch (err: any) {
      console.error('Sheet repair error:', err);
      alert(`Formula repair failed: ${err?.message || err}`);
    } finally {
      setIsRepairing(false);
    }
  };

  // Clear local demo stock data
  const handleClearLocalDemoData = () => {
    if (confirm('Are you sure you want to clear local test data and reset to 0 stock?')) {
      localStorage.removeItem('gud_stock_batches_v1');
      localStorage.removeItem('gud_stock_movements_v1');
      setBatches([]);
      setMovements([]);
    }
  };

  // Filtered Flavor Cards based on Search
  const filteredFlavors = useMemo(() => {
    if (!searchVal) return FLAVOR_CONFIG;
    return FLAVOR_CONFIG.filter(f =>
      f.name.toLowerCase().includes(searchVal.toLowerCase()) ||
      f.shortName.toLowerCase().includes(searchVal.toLowerCase())
    );
  }, [searchVal]);

  return (
    <div className="space-y-6 pb-20">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP DASHBOARD HEADER & QUICK MOBILE LOOKUP */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#1F1F1F] border border-[#2E2E2E] p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[#272727] text-neutral-300 border border-[#383838]">
              Live Stock Engine
            </span>
            <span className="text-xs text-neutral-400 font-medium">7 Gourmet Flavors</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            <span>Chocolate Stock Checker & FIFO Engine</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Real-time batch balances, FIFO stock clearance warnings, sample tracking, and 2-way Google Sheet sync.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {googleToken ? (
            <Button variant="secondary" size="sm" onClick={fetchSheetStockData} disabled={loadingSync} className="text-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingSync ? 'animate-spin' : ''}`} />
              {loadingSync ? 'Syncing...' : 'Sync Sheet'}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={signInWithGoogle} className="text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-neutral-300" />
              Connect Stock Sheet
            </Button>
          )}

          <Button variant="primary" size="sm" onClick={() => setIsReceivingModalOpen(true)} className="text-xs font-semibold">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Receive Stock Batch
          </Button>

          <Button variant="secondary" size="sm" onClick={() => setIsMovementModalOpen(true)} className="text-xs">
            <Truck className="w-3.5 h-3.5 mr-1.5" />
            Dispatch / Move Stock
          </Button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 🚨 PERSISTENT FIFO CLEARANCE WARNING BANNER */}
      {/* ───────────────────────────────────────────────────────────── */}
      {fifoOldestBatch && (
        <div className="bg-[#1F1F1F] border border-[#2E2E2E] border-l-4 border-l-amber-500/80 p-4 rounded-xl shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 bg-[#272727] border border-[#383838] text-amber-400 rounded-lg flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md font-mono uppercase">
                    FIFO Clearance Priority
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    Received {fifoOldestBatch.dateReceived}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white leading-snug">
                  Oldest Batch <span className="text-amber-400 font-mono font-bold">{fifoOldestBatch.batchId}</span> Available for Dispatch
                </h3>

                <p className="text-xs text-neutral-400 leading-relaxed max-w-3xl">
                  This batch contains <span className="text-neutral-200 font-medium">{fifoOldestBatch.totalGoodLeft} good bars</span>. Dispatching from this batch first prevents stock expiration and maintains optimal shelf turnover.
                </p>

                {/* Flavor Breakdown Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {FLAVOR_CONFIG.map(f => {
                    const rem = fifoOldestBatch.goodRemaining[f.key];
                    if (rem === 0) return null;
                    return (
                      <span key={f.key} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#272727] border border-[#383838] text-neutral-300">
                        <span className={`w-1.5 h-1.5 rounded-full ${f.dotColor}`} />
                        <span>{f.shortName}:</span>
                        <span className="font-mono text-white font-semibold">{rem} left</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNewMovementForm(prev => ({ ...prev, batchId: fifoOldestBatch.batchId }));
                setIsMovementModalOpen(true);
              }}
              className="text-xs font-medium whitespace-nowrap self-start lg:self-center px-3.5 py-1.5"
            >
              Dispatch From {fifoOldestBatch.batchId} →
            </Button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* GRAND TOTAL KPI SUMMARY CARDS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-[#1F1F1F] border-[#2E2E2E]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Good Stock Available</p>
              <h4 className="text-2xl font-bold text-white font-mono mt-1">
                {grandTotals.sumGood} <span className="text-xs font-normal text-neutral-400">bars</span>
              </h4>
              <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">Ready for customer orders</p>
            </div>
            <div className="p-2.5 bg-[#272727] text-neutral-300 rounded-lg border border-[#383838]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1F1F1F] border-[#2E2E2E]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Damaged Stock</p>
              <h4 className="text-2xl font-bold text-white font-mono mt-1">
                {grandTotals.sumDamaged} <span className="text-xs font-normal text-neutral-400">bars</span>
              </h4>
              <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">Available for samples / returns</p>
            </div>
            <div className="p-2.5 bg-[#272727] text-neutral-300 rounded-lg border border-[#383838]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1F1F1F] border-[#2E2E2E]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Active Batches</p>
              <h4 className="text-2xl font-bold text-white font-mono mt-1">
                {batchBalances.filter(b => b.totalGoodLeft > 0).length} <span className="text-xs font-normal text-neutral-400">batches</span>
              </h4>
              <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">FIFO prioritized</p>
            </div>
            <div className="p-2.5 bg-[#272727] text-neutral-300 rounded-lg border border-[#383838]">
              <Boxes className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1F1F1F] border-[#2E2E2E]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Movements Logged</p>
              <h4 className="text-2xl font-bold text-white font-mono mt-1">
                {movements.length} <span className="text-xs font-normal text-neutral-400">records</span>
              </h4>
              <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">Dispatches & returns</p>
            </div>
            <div className="p-2.5 bg-[#272727] text-neutral-300 rounded-lg border border-[#383838]">
              <Truck className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 🍫 INSTANT FLAVOR STOCK MATRIX (FOR ON-THE-GO LOOKUP ON PHONE) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Card className="bg-[#1F1F1F] border-[#2E2E2E]">
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2E2E2E]">
          <div>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-neutral-300" />
              <span>Instant Flavor Stock Lookup (7 Chocolates)</span>
            </CardTitle>
            <p className="text-xs text-neutral-400 mt-0.5">
              Real-time available inventory across all 7 artisanal chocolate flavors.
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search flavor..."
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#121212] border border-[#2E2E2E] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredFlavors.map(f => {
              const goodQty = grandTotals.totalGood[f.key];
              const damagedQty = grandTotals.totalDamaged[f.key];
              const isLow = goodQty < 50;

              return (
                <div 
                  key={f.key} 
                  className="p-3.5 rounded-xl border border-[#2E2E2E] bg-[#181818] hover:bg-[#202020] hover:border-[#3E3E3E] transition-all flex flex-col justify-between group"
                >
                  {/* Top Row: Artwork Thumbnail + Flavor Name + Minimal Status Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[#0F0F0F] border border-[#2E2E2E] flex items-center justify-center p-1 flex-shrink-0 group-hover:border-[#444] transition">
                          <img 
                            src={f.image} 
                            alt={f.name} 
                            className="w-full h-full object-contain drop-shadow-sm" 
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${f.dotColor}`} />
                            <h4 className="text-xs font-bold text-white truncate">{f.name}</h4>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-medium block">25g Origin Bar</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full flex-shrink-0 border ${
                        isLow 
                          ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' 
                          : 'bg-[#272727] text-neutral-300 border-[#383838]'
                      }`}>
                        {isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>

                    {/* Stock Numbers */}
                    <div className="mt-3.5 pt-2.5 border-t border-[#262626] flex items-baseline justify-between">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black font-mono text-white tracking-tight">{goodQty}</span>
                          <span className="text-[11px] font-medium text-neutral-400">Good</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-neutral-400">
                          {damagedQty > 0 ? (
                            <span className="text-rose-400/90">{damagedQty}</span>
                          ) : (
                            <span>0</span>
                          )}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">Damaged/Samples</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Micro Footer */}
                  <div className="mt-2.5 pt-2 border-t border-[#222222] flex items-center justify-between text-[10px] text-neutral-400">
                    <span className="flex items-center gap-1">
                      <span className={`w-1 h-1 rounded-full ${f.dotColor}`} />
                      <span>{f.shortName}</span>
                    </span>
                    <span className="font-mono text-neutral-400 font-medium">Ready</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 📋 BATCH LEDGER TABLE (FIFO ORDERED) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Card className="bg-[#1F1F1F] border-[#2E2E2E]">
        <CardHeader className="pb-3 border-b border-[#2E2E2E]">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-300" />
            <span>Batch Ledger & Stock Balances (Google Sheet Sync)</span>
          </CardTitle>
          <p className="text-xs text-neutral-400">
            Per-batch tracking. Oldest batches are listed first to enforce FIFO clearance rules.
          </p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#181818] border-b border-[#2E2E2E] text-neutral-400 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-4">Date Received</th>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4 text-center">Expiry (3 Mo)</th>
                <th className="py-3 px-4 text-center">Almond</th>
                <th className="py-3 px-4 text-center">Orange</th>
                <th className="py-3 px-4 text-center">Jackfruit</th>
                <th className="py-3 px-4 text-center">Lemon</th>
                <th className="py-3 px-4 text-center">Mocha</th>
                <th className="py-3 px-4 text-center">Sea Salt</th>
                <th className="py-3 px-4 text-center">Peanuts</th>
                <th className="py-3 px-4 text-right">Good Left</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626] text-neutral-300">
              {paginatedBatches.map((b: any) => {
                const isFifoOldest = fifoOldestBatch?.batchId === b.batchId;
                return (
                  <tr key={b.batchId} className={`hover:bg-[#272727]/50 transition ${isFifoOldest ? 'bg-amber-950/10' : ''}`}>
                    <td className="py-3 px-4 font-mono text-neutral-400 whitespace-nowrap">
                      {b.dateReceived}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{b.batchId}</span>
                        {isFifoOldest && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-[#272727] text-amber-300 border border-amber-500/30 rounded font-semibold uppercase">
                            FIFO #1
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="font-mono text-[11px] text-neutral-300">{b.expiryDate}</div>
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-semibold rounded-full mt-0.5 border ${
                        b.shelfLifeStatus === 'EXPIRED' ? 'bg-rose-950/40 text-rose-400 border-rose-800/40' :
                        b.shelfLifeStatus === 'CRITICAL' ? 'bg-amber-950/40 text-amber-400 border-amber-800/40' :
                        b.shelfLifeStatus === 'EXPIRING_SOON' ? 'bg-yellow-950/40 text-yellow-400 border-yellow-800/40' :
                        'bg-[#272727] text-neutral-300 border-[#383838]'
                      }`}>
                        {b.shelfLifeStatus === 'EXPIRED' ? 'EXPIRED' :
                         b.shelfLifeStatus === 'CRITICAL' ? `${b.daysRemaining}d Left` :
                         b.shelfLifeStatus === 'EXPIRING_SOON' ? `${b.daysRemaining}d Left` :
                         `${b.daysRemaining}d Left`}
                      </span>
                    </td>

                    {FLAVOR_CONFIG.map(f => {
                      const goodLeft = b.goodRemaining[f.key];
                      const damLeft = b.damagedRemaining[f.key];
                      return (
                        <td key={f.key} className="py-3 px-4 text-center font-mono">
                          <span className="font-semibold text-white">{goodLeft}</span>
                          {damLeft > 0 && <span className="text-[10px] text-rose-400/80 ml-1">({damLeft}d)</span>}
                        </td>
                      );
                    })}

                    <td className="py-3 px-4 text-right font-mono font-bold text-white text-sm">
                      {b.totalGoodLeft}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setNewMovementForm(prev => ({ ...prev, batchId: b.batchId }));
                          setIsMovementModalOpen(true);
                        }}
                        className="text-[11px] px-2.5 py-1"
                      >
                        Dispatch
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>

        {/* Batch Ledger 10-Row Pagination Bar */}
        <div className="p-3 bg-[#181818] border-t border-[#2E2E2E] flex items-center justify-between text-xs text-neutral-400">
          <span>
            Showing {paginatedBatches.length > 0 ? (batchPage - 1) * ROWS_PER_PAGE + 1 : 0} to {Math.min(batchPage * ROWS_PER_PAGE, batchBalances.length)} of {batchBalances.length} batches
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBatchPage(p => Math.max(1, p - 1))}
              disabled={batchPage === 1}
              className="text-xs px-2.5 py-1"
            >
              Previous
            </Button>
            <span className="font-mono font-semibold text-white text-xs px-1">
              Page {batchPage} of {totalBatchPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBatchPage(p => Math.min(totalBatchPages, p + 1))}
              disabled={batchPage >= totalBatchPages}
              className="text-xs px-2.5 py-1"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 🚚 STOCK MOVEMENTS LOG */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Card className="bg-[#1F1F1F] border-[#2E2E2E]">
        <CardHeader className="pb-3 border-b border-[#2E2E2E] flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-neutral-300" />
              <span>Stock Movements & Dispatches Log</span>
            </CardTitle>
            <p className="text-xs text-neutral-400">
              Audit trail of customer dispatches, samples, and supplier returns.
            </p>
          </div>

          <Button variant="primary" size="sm" onClick={() => setIsMovementModalOpen(true)} className="text-xs font-semibold">
            + Record Movement
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#181818] border-b border-[#2E2E2E] text-neutral-400 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Reason / Customer</th>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Items Dispatched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626] text-neutral-300">
              {paginatedMovements.map(m => {
                const totalItems = Object.values(m.flavors).reduce((a, b) => a + b, 0);
                return (
                  <tr key={m.id} className="hover:bg-[#272727]/50">
                    <td className="py-3 px-4 font-mono text-neutral-400 whitespace-nowrap">{m.date}</td>
                    <td className="py-3 px-4 font-medium text-white">{m.reason}</td>
                    <td className="py-3 px-4 font-mono text-neutral-200">{m.batchId}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full border ${
                        m.stockType === 'Good'
                          ? 'bg-[#272727] text-neutral-300 border-[#383838]'
                          : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
                      }`}>
                        {m.stockType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                      {totalItems} bars
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>

        {/* Movements Log 10-Row Pagination Bar */}
        <div className="p-3 bg-[#181818] border-t border-[#2E2E2E] flex items-center justify-between text-xs text-neutral-400">
          <span>
            Showing {paginatedMovements.length > 0 ? (movementPage - 1) * ROWS_PER_PAGE + 1 : 0} to {Math.min(movementPage * ROWS_PER_PAGE, movements.length)} of {movements.length} logs
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMovementPage(p => Math.max(1, p - 1))}
              disabled={movementPage === 1}
              className="text-xs px-2.5 py-1"
            >
              Previous
            </Button>
            <span className="font-mono font-semibold text-white text-xs px-1">
              Page {movementPage} of {totalMovementPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMovementPage(p => Math.min(totalMovementPages, p + 1))}
              disabled={movementPage >= totalMovementPages}
              className="text-xs px-2.5 py-1"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: RECEIVE NEW BATCH FORM */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isReceivingModalOpen && (
        <Modal
          isOpen={isReceivingModalOpen}
          onClose={() => setIsReceivingModalOpen(false)}
          title="Receive New Chocolate Stock Batch"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setIsReceivingModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleAddBatch} className="font-semibold text-xs">
                Save & Push to Sheet
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs text-neutral-200">
            {!googleToken && (
              <div className="p-3 bg-[#272727] border border-[#383838] rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-neutral-300 font-medium">
                  <Sparkles className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  <span>Connect Google Account to sync directly to Google Sheet!</span>
                </div>
                <Button variant="primary" size="sm" onClick={signInWithGoogle} className="text-xs font-semibold whitespace-nowrap">
                  Sign In & Connect
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-300 mb-1">Date Received</label>
                <input
                  type="date"
                  value={newBatchForm.dateReceived}
                  onChange={e => setNewBatchForm(prev => ({ ...prev, dateReceived: e.target.value }))}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg p-2 text-white focus:outline-none focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-300 mb-1">Batch ID</label>
                <input
                  type="text"
                  value={newBatchForm.batchId}
                  onChange={e => setNewBatchForm(prev => ({ ...prev, batchId: e.target.value }))}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg p-2 text-white font-mono uppercase font-bold focus:outline-none focus:border-neutral-400"
                  placeholder="e.g. B-0825"
                />
              </div>
            </div>

            <div className="p-3 bg-[#181818] border border-[#2E2E2E] rounded-xl space-y-2.5">
              <h4 className="font-semibold text-white text-xs">Enter Quantities Received Per Flavor</h4>
              
              {FLAVOR_CONFIG.map(f => (
                <div key={f.key} className="flex items-center justify-between gap-2 p-2 bg-[#121212] rounded-lg border border-[#2E2E2E]">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${f.dotColor}`} />
                    <span className="font-medium text-white text-xs truncate">{f.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="text-[10px] text-neutral-400 block text-right">Total In</span>
                      <input
                        type="number"
                        min="0"
                        value={newBatchForm.totalIn[f.key]}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setNewBatchForm(prev => ({
                            ...prev,
                            totalIn: { ...prev.totalIn, [f.key]: val }
                          }));
                        }}
                        className="w-16 bg-[#1F1F1F] border border-[#2E2E2E] rounded p-1 text-center font-bold text-white font-mono focus:outline-none focus:border-neutral-400"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 block text-right">Damaged</span>
                      <input
                        type="number"
                        min="0"
                        value={newBatchForm.damagedIn[f.key]}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setNewBatchForm(prev => ({
                            ...prev,
                            damagedIn: { ...prev.damagedIn, [f.key]: val }
                          }));
                        }}
                        className="w-14 bg-[#1F1F1F] border border-[#2E2E2E] rounded p-1 text-center font-bold text-rose-400 font-mono focus:outline-none focus:border-neutral-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: RECORD STOCK MOVEMENT FORM */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isMovementModalOpen && (
        <Modal
          isOpen={isMovementModalOpen}
          onClose={() => setIsMovementModalOpen(false)}
          title="Record Stock Movement / Dispatch"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setIsMovementModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleAddMovement} className="font-semibold text-xs">
                Log Dispatch & Sync
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs text-neutral-200">
            {!googleToken && (
              <div className="p-3 bg-[#272727] border border-[#383838] rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-neutral-300 font-medium">
                  <Sparkles className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  <span>Connect Google Account to sync dispatches directly to Google Sheet!</span>
                </div>
                <Button variant="primary" size="sm" onClick={signInWithGoogle} className="text-xs font-semibold whitespace-nowrap">
                  Sign In & Connect
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-300 mb-1">Date</label>
                <input
                  type="date"
                  value={newMovementForm.date}
                  onChange={e => setNewMovementForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg p-2 text-white focus:outline-none focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-300 mb-1">Target Batch ID</label>
                <select
                  value={newMovementForm.batchId}
                  onChange={e => setNewMovementForm(prev => ({ ...prev, batchId: e.target.value }))}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg p-2 text-white font-mono font-bold focus:outline-none focus:border-neutral-400"
                >
                  <option value="AUTO_FIFO">⚡ AUTO-FIFO (Smart Multi-Batch Split across oldest batches)</option>
                  {batchBalances.map(b => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.batchId} ({b.totalGoodLeft} good left) {fifoOldestBatch?.batchId === b.batchId ? '⭐ FIFO Recommended' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-300 mb-1">Reason / Customer</label>
                <input
                  type="text"
                  value={newMovementForm.reason}
                  onChange={e => setNewMovementForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg p-2 text-white focus:outline-none focus:border-neutral-400"
                  placeholder="e.g. Order ORD-0215 or Tasting Sample"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-300 mb-1">Stock Type</label>
                <select
                  value={newMovementForm.stockType}
                  onChange={e => setNewMovementForm(prev => ({ ...prev, stockType: e.target.value as any }))}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg p-2 text-white font-medium focus:outline-none focus:border-neutral-400"
                >
                  <option value="Good">Good Stock (Regular Orders)</option>
                  <option value="Damaged">Damaged Stock (Samples / Supplier Return)</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-[#181818] border border-[#2E2E2E] rounded-xl space-y-2.5">
              <h4 className="font-semibold text-white text-xs">Dispatched Quantity Per Flavor</h4>

              {FLAVOR_CONFIG.map(f => (
                <div key={f.key} className="flex items-center justify-between p-2 bg-[#121212] rounded-lg border border-[#2E2E2E]">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${f.dotColor}`} />
                    <span className="font-medium text-white text-xs truncate">{f.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400">Quantity</span>
                    <input
                      type="number"
                      min="0"
                      value={newMovementForm.flavors[f.key]}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setNewMovementForm(prev => ({
                          ...prev,
                          flavors: { ...prev.flavors, [f.key]: val }
                        }));
                      }}
                      className="w-20 bg-[#1F1F1F] border border-[#2E2E2E] rounded p-1 text-center font-bold text-white font-mono focus:outline-none focus:border-neutral-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StockTracker;
