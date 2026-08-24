import { useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleSheetsService } from '../services/google';
import { useAuth } from '../context/AuthContext';

const getSpreadsheetIdForModule = (modId: string): string => {
  const env = import.meta.env;
  switch (modId) {
    case 'customers':
    case 'sales':
      return env.VITE_GOOGLE_SHEET_CUSTOMERS_ID || '';
    case 'vendors':
      return env.VITE_GOOGLE_SHEET_VENDORS_ID || '';
    case 'legal':
      return env.VITE_GOOGLE_SHEET_LEGAL_ID || '';
    case 'marketing':
      return env.VITE_GOOGLE_SHEET_MARKETING_ID || '';
    case 'operations':
      return env.VITE_GOOGLE_SHEET_OPERATIONS_ID || '';
    case 'procurement':
    case 'production':
      return env.VITE_GOOGLE_SHEET_PROCUREMENT_ID || '';
    case 'packaging':
      return env.VITE_GOOGLE_SHEET_PACKAGING_ID || '';
    case 'finance':
      return env.VITE_GOOGLE_SHEET_FINANCE_ID || '';
    case 'whatsapp':
      return env.VITE_GOOGLE_SHEET_WHATSAPP_ID || '';
    case 'meetings':
      return env.VITE_GOOGLE_SHEET_MEETINGS_ID || '';
    case 'research':
      return env.VITE_GOOGLE_SHEET_RESEARCH_ID || '';
    case 'documents':
      return env.VITE_GOOGLE_SHEET_ASSETS_ID || '';
    case 'products':
      return env.VITE_GOOGLE_SHEET_CORE_REGISTRY_ID || '';
    default:
      return '';
  }
};

export const useSheetsSyncEngine = () => {
  const { googleToken } = useAuth();

  useEffect(() => {
    // Only clients with active Google credentials act as sync brokers
    if (!googleToken) return;

    console.log('[Sync Engine] Active: Listening to Firestore transaction sync queue...');

    const q = query(collection(db, 'sync_queue'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, async (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type === 'added') {
          const transDoc = change.doc;
          const trans = transDoc.data();
          const activeSheetId = getSpreadsheetIdForModule(trans.moduleId);
          
          if (!activeSheetId) {
            console.warn(`[Sync Engine] No sheet ID found for ${trans.moduleId}, skipping...`);
            await deleteDoc(doc(db, 'sync_queue', transDoc.id));
            continue;
          }

          try {
            console.log(`[Sync Engine] Syncing action "${trans.action}" for ${trans.moduleId} (Row ${trans.rowNumber})`);
            
            const endColLetter = String.fromCharCode(65 + Math.min(trans.values.length - 1, 25));
            
            if (trans.action === 'edit') {
              const writeRange = `'${trans.tabName}'!A${trans.rowNumber}:${endColLetter}${trans.rowNumber}`;
              await GoogleSheetsService.updateSpreadsheetValues(
                googleToken,
                activeSheetId,
                writeRange,
                [trans.values]
              );
            } else if (trans.action === 'add') {
              const writeRange = `'${trans.tabName}'!A:${endColLetter}`;
              await GoogleSheetsService.appendSpreadsheetValues(
                googleToken,
                activeSheetId,
                writeRange,
                [trans.values]
              );
            }

            // Sync successful! Remove from transaction queue
            await deleteDoc(doc(db, 'sync_queue', transDoc.id));
            console.log(`[Sync Engine] Synced row ${trans.rowNumber} and removed transaction: ${transDoc.id}`);
          } catch (err) {
            console.error(`[Sync Engine] Failed to write transaction to Google Sheets:`, err);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [googleToken]);
};

export const syncAllSheets = async (googleToken: string) => {
  console.log('[Sync Engine] Starting manual full bidirectional sync...');
  
  // 1. Process any pending transactions in the sync_queue first
  try {
    const q = query(collection(db, 'sync_queue'), orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);
    for (const transDoc of snap.docs) {
      const trans = transDoc.data();
      const activeSheetId = getSpreadsheetIdForModule(trans.moduleId);
      if (activeSheetId) {
        const endColLetter = String.fromCharCode(65 + Math.min(trans.values.length - 1, 25));
        if (trans.action === 'edit') {
          await GoogleSheetsService.updateSpreadsheetValues(
            googleToken,
            activeSheetId,
            `'${trans.tabName}'!A${trans.rowNumber}:${endColLetter}${trans.rowNumber}`,
            [trans.values]
          );
        } else if (trans.action === 'add') {
          await GoogleSheetsService.appendSpreadsheetValues(
            googleToken,
            activeSheetId,
            `'${trans.tabName}'!A:${endColLetter}`,
            [trans.values]
          );
        }
      }
      await deleteDoc(doc(db, 'sync_queue', transDoc.id));
    }
  } catch (err) {
    console.warn('[Sync Engine] Failed to flush sync queue:', err);
  }

  // 2. Fetch latest values for each tab and update Firestore
  const registry = [
    { moduleId: 'customers', tabName: 'Customer Master' },
    { moduleId: 'sales', tabName: 'Sales Pipeline' },
    { moduleId: 'vendors', tabName: 'Vendor Master' },
    { moduleId: 'production', tabName: 'Production Orders' },
    { moduleId: 'procurement', tabName: 'Production Orders' },
    { moduleId: 'packaging', tabName: 'Packaging Master' },
    { moduleId: 'legal', tabName: 'Legal Master' },
    { moduleId: 'finance', tabName: 'Finance Master' },
    { moduleId: 'marketing', tabName: 'Campaign Master' },
    { moduleId: 'whatsapp', tabName: 'WhatsApp Contact Master' },
    { moduleId: 'meetings', tabName: 'Meeting Register' },
    { moduleId: 'research', tabName: 'Research Master' },
    { moduleId: 'documents', tabName: 'Asset Master' },
    { moduleId: 'products', tabName: 'Product Master' },
  ];

  for (const item of registry) {
    try {
      const activeSheetId = getSpreadsheetIdForModule(item.moduleId);
      if (!activeSheetId) continue;

      const safeColName = `sheet_data_${item.moduleId}_${item.tabName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const colRef = collection(db, safeColName);

      const headerResponse = await GoogleSheetsService.getSpreadsheetValues(
        googleToken,
        activeSheetId,
        `'${item.tabName}'!A1:Z1`
      );
      const headerRow = (headerResponse.values && headerResponse.values[0]) || [];
      if (headerRow.length === 0) continue;

      await setDoc(doc(colRef, 'headers'), { values: headerRow });

      const endColLetter = String.fromCharCode(65 + Math.min(headerRow.length - 1, 25));
      const dataResponse = await GoogleSheetsService.getSpreadsheetValues(
        googleToken,
        activeSheetId,
        `'${item.tabName}'!A2:${endColLetter}100`
      );

      if (dataResponse && dataResponse.values) {
        for (let idx = 0; idx < dataResponse.values.length; idx++) {
          const rNum = idx + 2;
          const rowVal = headerRow.map((_, colIdx) => 
            dataResponse.values[idx][colIdx] !== undefined ? String(dataResponse.values[idx][colIdx]) : ''
          );
          await setDoc(doc(colRef, `row_${rNum}`), {
            rowNumber: rNum,
            values: rowVal,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (e) {
      console.warn(`[Sync Engine] Failed to sync registry item for ${item.moduleId}:`, e);
    }
  }
  console.log('[Sync Engine] Full manual sync completed!');
};
