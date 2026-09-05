import { StorageEngine } from './storageEngine';
import { GoogleSheetsService } from './google';

export interface HamperCatalogItem {
  id: string;
  category: 'Tins' | 'Chocolates' | 'Souvenir' | 'Packaging' | 'Chocolate Box' | 'Other';
  description: string;
  defaultQty: number;
  ourUnitCost: number;
  clientUnitCost?: number;
  gstRate: 5 | 18;
  shelfLife?: string;
  inStockQty?: number;
}

export const SPREADSHEET_ID = '1bymKSeyIeSCInLlo6d3IBdr4fuoSV6iL6MDjHMtcmYU';
export const CSV_SYNC_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv`;
const STORAGE_KEY = 'gud_master_hamper_catalog_v1';

export const SEED_HAMPER_CATALOG: HamperCatalogItem[] = [
  { id: 'CAT-01', category: 'Tins', description: 'Banana chips, Sweet banana chips, Sharkaravarti (along with the design file)', defaultQty: 1, ourUnitCost: 41, gstRate: 18 },
  { id: 'CAT-02', category: 'Chocolates', description: 'Indian Seasalt, Malabar Jackfruit , Almond Noir, Orange Sunset , Mocha (25g)', defaultQty: 1, ourUnitCost: 55, gstRate: 5 },
  { id: 'CAT-03', category: 'Souvenir', description: 'Kathakali Face Figurine', defaultQty: 1, ourUnitCost: 33, gstRate: 18 },
  { id: 'CAT-04', category: 'Souvenir', description: 'Visiri - Traditional Fan', defaultQty: 1, ourUnitCost: 35, gstRate: 18 },
  { id: 'CAT-05', category: 'Packaging', description: 'Onam Note Card', defaultQty: 1, ourUnitCost: 23, gstRate: 18 },
  { id: 'CAT-06', category: 'Packaging', description: 'Shredded Paper Per Box', defaultQty: 1, ourUnitCost: 15.36, gstRate: 18 },
  { id: 'CAT-07', category: 'Chocolate Box', description: '8 Piece Box (64g)', defaultQty: 1, ourUnitCost: 250, gstRate: 5 },
  { id: 'CAT-08', category: 'Souvenir', description: 'House Boat Wooden', defaultQty: 1, ourUnitCost: 45, gstRate: 18 },
  { id: 'CAT-09', category: 'Packaging', description: 'Coconut Shell With Spoon', defaultQty: 1, ourUnitCost: 105, gstRate: 18 },
  { id: 'CAT-10', category: 'Souvenir', description: 'Coconut Candle', defaultQty: 1, ourUnitCost: 140, gstRate: 18 },
  { id: 'CAT-11', category: 'Packaging', description: '10*12 Box Hamper Box', defaultQty: 1, ourUnitCost: 169.49, gstRate: 18 },
  { id: 'CAT-12', category: 'Packaging', description: 'Nethipatta Bag', defaultQty: 1, ourUnitCost: 92, gstRate: 18 },
  { id: 'CAT-13', category: 'Souvenir', description: 'Kathakali Hanging (Red)', defaultQty: 1, ourUnitCost: 35, gstRate: 18 },
  { id: 'CAT-14', category: 'Packaging', description: 'Pouch with Stickers', defaultQty: 1, ourUnitCost: 6, gstRate: 18 },
  { id: 'CAT-15', category: 'Packaging', description: 'Taj logo card', defaultQty: 1, ourUnitCost: 20, gstRate: 18 },
  { id: 'CAT-16', category: 'Packaging', description: '8*8 Box', defaultQty: 1, ourUnitCost: 250, gstRate: 18 },
  { id: 'CAT-17', category: 'Chocolate Box', description: '6 Piece Box (48g)', defaultQty: 1, ourUnitCost: 288, gstRate: 5 }
];

export class HamperCatalogService {
  /**
   * Get all master catalog items
   */
  static getCatalog(): HamperCatalogItem[] {
    return StorageEngine.getLocal<HamperCatalogItem[]>(STORAGE_KEY, SEED_HAMPER_CATALOG);
  }

  /**
   * Save catalog items
   */
  static saveCatalog(items: HamperCatalogItem[]): boolean {
    return StorageEngine.setLocal(STORAGE_KEY, items);
  }

  /**
   * Add or update an item locally
   */
  static saveItem(item: HamperCatalogItem): HamperCatalogItem[] {
    const list = this.getCatalog();
    const idx = list.findIndex(i => i.id === item.id || i.description.toLowerCase() === item.description.toLowerCase());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.push(item);
    }
    this.saveCatalog(list);
    return list;
  }

  /**
   * Add a new item locally and append directly to Google Sheet 'items' tab
   */
  static async addNewItemWithSheetSync(
    item: HamperCatalogItem,
    googleToken: string | null
  ): Promise<{ items: HamperCatalogItem[]; syncedToGoogle: boolean }> {
    // 1. Save locally first (instant UI update)
    const updated = this.saveItem(item);

    // 2. If Google token exists, append to 'items' tab in Google Sheets
    let syncedToGoogle = false;
    if (googleToken) {
      try {
        // Tab columns: ['Category', 'Item Description', 'Qty', 'Our Per unit Cost', 'gst', 'Shelf Life', 'In Stock Qty']
        const rowData = [
          item.category,
          item.description,
          String(item.defaultQty || 1),
          `₹${item.ourUnitCost}`,
          `${item.gstRate}%`,
          item.shelfLife || (item.category === 'Chocolates' || item.category === 'Chocolate Box' ? '6 Months' : 'N/A (Non-perishable)'),
          String(item.inStockQty || 0)
        ];

        await GoogleSheetsService.appendSpreadsheetValues(
          googleToken,
          SPREADSHEET_ID,
          "'items'!A:G",
          [rowData]
        );
        syncedToGoogle = true;
        console.log('[HamperCatalogService] Appended new item to Google Sheet successfully:', item.description);
      } catch (err) {
        console.warn('[HamperCatalogService] Failed to append to Google Sheet directly (saved locally):', err);
      }
    }

    return { items: updated, syncedToGoogle };
  }

  /**
   * Sync catalog live from Google Sheet CSV stream
   */
  static async syncWithGoogleSheet(): Promise<HamperCatalogItem[]> {
    try {
      const res = await fetch(CSV_SYNC_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      // Simple CSV Line Parsing
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) return this.getCatalog();

      const existing = this.getCatalog();
      const updatedList: HamperCatalogItem[] = [...existing];

      for (let i = 1; i < lines.length; i++) {
        // Regex to split CSV with quotes
        const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!matches || matches.length < 4) continue;

        const catStr = matches[0].replace(/"/g, '').trim();
        const descStr = matches[1].replace(/"/g, '').trim();
        const qtyStr = matches[2].replace(/"/g, '').trim();
        const costStr = matches[3].replace(/"/g, '').replace(/[^0-9.]/g, '').trim();

        if (!descStr) continue;

        const cost = parseFloat(costStr) || 0;
        const category = (['Tins', 'Chocolates', 'Souvenir', 'Packaging', 'Chocolate Box'].includes(catStr) ? catStr : 'Other') as any;
        const gstRate = (category === 'Chocolates' || category === 'Chocolate Box') ? 5 : 18;

        const existingIdx = updatedList.findIndex(x => x.description.toLowerCase() === descStr.toLowerCase());
        if (existingIdx >= 0) {
          updatedList[existingIdx].ourUnitCost = cost;
          updatedList[existingIdx].category = category;
        } else {
          updatedList.push({
            id: `CAT-${Date.now().toString().slice(-4)}-${i}`,
            category,
            description: descStr,
            defaultQty: 1,
            ourUnitCost: cost,
            gstRate
          });
        }
      }

      this.saveCatalog(updatedList);
      return updatedList;
    } catch (e) {
      console.warn('[HamperCatalogService] Google Sheet CSV Sync error:', e);
      return this.getCatalog();
    }
  }
}
