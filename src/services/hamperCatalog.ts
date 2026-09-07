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
  imageUrl?: string;
}

export interface SourcedDiscoveryItem {
  id: string;
  category: 'Tins' | 'Chocolates' | 'Souvenir' | 'Packaging' | 'Chocolate Box' | 'Other';
  description: string;
  vendorLead: string;
  estUnitCost: number;
  gstRate: number;
  landedUnitCost: number;
  sampleMoq: number;
  status: 'Approved' | 'Under Review' | 'Sample Ordered' | 'Rejected';
  drivePhotoLink?: string;
  readyForCatalog: boolean;
  notes?: string;
}

export const SEED_DISCOVERY_ITEMS: SourcedDiscoveryItem[] = [
  {
    id: 'DISC-01',
    category: 'Packaging',
    description: 'Golden Pouch Bags (1 Big, 1 Small)',
    vendorLead: 'Local Craft Market',
    estUnitCost: 10.00,
    gstRate: 18,
    landedUnitCost: 11.80,
    sampleMoq: 100,
    status: 'Under Review',
    readyForCatalog: false,
    notes: 'Sourced for mini hampers; cost under trial'
  },
  {
    id: 'DISC-02',
    category: 'Chocolates',
    description: 'Artisanal Jaggery Chocolates (GUD 70%)',
    vendorLead: 'GUD Artisanal',
    estUnitCost: 400.00,
    gstRate: 5,
    landedUnitCost: 420.00,
    sampleMoq: 50,
    status: 'Approved',
    readyForCatalog: true,
    notes: '8-piece artisanal chocolate gift box'
  },
  {
    id: 'DISC-03',
    category: 'Packaging',
    description: 'Green Gift Box (12"x10"x4") with Gold Ribbon',
    vendorLead: 'Deluxe Box Makers',
    estUnitCost: 300.00,
    gstRate: 18,
    landedUnitCost: 354.00,
    sampleMoq: 50,
    status: 'Under Review',
    readyForCatalog: false,
    notes: 'Green box theme for premium Onam corporate hamper'
  },
  {
    id: 'DISC-04',
    category: 'Tins',
    description: 'Banana Chips Kraft Pouches (Sweet & Salted)',
    vendorLead: 'Kerala Delights',
    estUnitCost: 41.00,
    gstRate: 18,
    landedUnitCost: 48.38,
    sampleMoq: 150,
    status: 'Approved',
    readyForCatalog: true,
    notes: 'Pouch alternative to tins for lightweight hamper'
  },
  {
    id: 'DISC-05',
    category: 'Souvenir',
    description: 'Traditional Vishari Hand Fan (Bamboo)',
    vendorLead: 'Kottayam Artisans',
    estUnitCost: 50.00,
    gstRate: 18,
    landedUnitCost: 59.00,
    sampleMoq: 50,
    status: 'Approved',
    readyForCatalog: true,
    notes: 'Handcrafted eco-friendly fan souvenir'
  },
  {
    id: 'DISC-06',
    category: 'Souvenir',
    description: 'Kathakali Face Figurine (Green Theme)',
    vendorLead: 'Heritage Crafts',
    estUnitCost: 50.00,
    gstRate: 18,
    landedUnitCost: 59.00,
    sampleMoq: 50,
    status: 'Under Review',
    readyForCatalog: false,
    notes: 'Color matched to green festive hamper collection'
  },
  {
    id: 'DISC-07',
    category: 'Souvenir',
    description: 'Kerala Wooden Houseboat Miniature',
    vendorLead: 'Alleppey Woodworks',
    estUnitCost: 60.00,
    gstRate: 18,
    landedUnitCost: 70.80,
    sampleMoq: 30,
    status: 'Approved',
    readyForCatalog: true,
    notes: 'Polished rosewood finish sample approved'
  },
  {
    id: 'DISC-08',
    category: 'Packaging',
    description: 'Onam Note Card (Floral Design Prints)',
    vendorLead: 'Fine Prints Studio',
    estUnitCost: 14.80,
    gstRate: 18,
    landedUnitCost: 17.46,
    sampleMoq: 100,
    status: 'Sample Ordered',
    readyForCatalog: false,
    notes: 'High GSM textured card with festive gold foil'
  },
  {
    id: 'DISC-09',
    category: 'Packaging',
    description: 'Yellow Hamper Box (10"x8"x4")',
    vendorLead: 'CraftBox Packaging',
    estUnitCost: 225.00,
    gstRate: 18,
    landedUnitCost: 265.50,
    sampleMoq: 50,
    status: 'Sample Ordered',
    readyForCatalog: false,
    notes: 'Yellow festive box sample evaluation'
  },
  {
    id: 'DISC-10',
    category: 'Packaging',
    description: 'Shredded Paper Filler (Golden Yellow)',
    vendorLead: 'EcoPack Supplies',
    estUnitCost: 18.00,
    gstRate: 0,
    landedUnitCost: 18.00,
    sampleMoq: 50,
    status: 'Rejected',
    readyForCatalog: false,
    notes: 'Dusty texture; stick with natural kraft shredded paper'
  }
];

export const SPREADSHEET_ID = '1bymKSeyIeSCInLlo6d3IBdr4fuoSV6iL6MDjHMtcmYU';
export const CSV_SYNC_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv`;
const STORAGE_KEY = 'gud_master_hamper_catalog_v1';
const SOURCING_STORAGE_KEY = 'gud_hamper_sourcing_pipeline_v1';

export const SEED_HAMPER_CATALOG: HamperCatalogItem[] = [
  { id: 'CAT-01', category: 'Tins', description: 'Banana chips, Sweet banana chips, Sharkaravarti (along with the design file)', defaultQty: 1, ourUnitCost: 41, gstRate: 18 },
  { id: 'CAT-02-SEASALT', category: 'Chocolates', description: 'Indian Sea Salt (25g)', defaultQty: 1, ourUnitCost: 55, clientUnitCost: 99, gstRate: 5 },
  { id: 'CAT-02-JACKFRUIT', category: 'Chocolates', description: 'Malabar Jackfruit (25g)', defaultQty: 1, ourUnitCost: 55, clientUnitCost: 99, gstRate: 5 },
  { id: 'CAT-02-ALMOND', category: 'Chocolates', description: 'Almond Noir (25g)', defaultQty: 1, ourUnitCost: 55, clientUnitCost: 99, gstRate: 5 },
  { id: 'CAT-02-ORANGE', category: 'Chocolates', description: 'Orange Sunset (25g)', defaultQty: 1, ourUnitCost: 55, clientUnitCost: 99, gstRate: 5 },
  { id: 'CAT-02-MOCHA', category: 'Chocolates', description: 'Mocha (25g)', defaultQty: 1, ourUnitCost: 55, clientUnitCost: 99, gstRate: 5 },
  { id: 'CAT-02-LEMON', category: 'Chocolates', description: 'Sun-Kissed Lemon (25g)', defaultQty: 1, ourUnitCost: 55, clientUnitCost: 99, gstRate: 5 },
  { id: 'CAT-02-PEANUT', category: 'Chocolates', description: 'Peanut Royale (25g)', defaultQty: 1, ourUnitCost: 55, clientUnitCost: 99, gstRate: 5 },
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
    let items = StorageEngine.getLocal<HamperCatalogItem[]>(STORAGE_KEY, SEED_HAMPER_CATALOG);
    let dirty = false;

    // Filter out generic '25 grm bar' and legacy composite strings
    const cleaned = items.filter(it => {
      const d = it.description.toLowerCase();
      if (d === '25 grm bar' || d === '25g bar') {
        dirty = true;
        return false;
      }
      if (d.includes('indian seasalt') && d.includes('malabar jackfruit')) {
        dirty = true;
        return false;
      }
      return true;
    });

    items = cleaned;

    // Ensure all individual 25g flavor SKUs are present
    for (const seedItem of SEED_HAMPER_CATALOG) {
      if (seedItem.id.startsWith('CAT-02-') && !items.some(i => i.id === seedItem.id || i.description.toLowerCase() === seedItem.description.toLowerCase())) {
        items.push(seedItem);
        dirty = true;
      }
    }

    if (dirty) {
      StorageEngine.setLocal(STORAGE_KEY, items);
    }
    return items;
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

        if (descStr.toLowerCase() === '25 grm bar' || descStr.toLowerCase() === '25g bar') {
          // Update unit cost for all individual 25g flavors
          updatedList.forEach(item => {
            if (item.id.startsWith('CAT-02-')) {
              item.ourUnitCost = cost;
            }
          });
          continue;
        }

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

  /**
   * Get all scouted/sourcing pipeline items
   */
  static getSourcingPipeline(): SourcedDiscoveryItem[] {
    return StorageEngine.getLocal<SourcedDiscoveryItem[]>(SOURCING_STORAGE_KEY, SEED_DISCOVERY_ITEMS);
  }

  /**
   * Save sourcing pipeline items
   */
  static saveSourcingPipeline(items: SourcedDiscoveryItem[]): boolean {
    return StorageEngine.setLocal(SOURCING_STORAGE_KEY, items);
  }

  /**
   * Promote an approved sourced item directly into the active production catalog
   */
  static async promoteSourcedItemToCatalog(
    sourced: SourcedDiscoveryItem,
    initialStock: number = 25,
    googleToken: string | null = null
  ): Promise<{ updatedCatalog: HamperCatalogItem[]; updatedPipeline: SourcedDiscoveryItem[] }> {
    // 1. Create new HamperCatalogItem
    const newItem: HamperCatalogItem = {
      id: `CAT-${Date.now().toString().slice(-4)}`,
      category: sourced.category,
      description: sourced.description,
      defaultQty: 1,
      ourUnitCost: sourced.landedUnitCost || sourced.estUnitCost,
      clientUnitCost: Math.round((sourced.landedUnitCost || sourced.estUnitCost) * 1.8),
      gstRate: sourced.gstRate as 5 | 18,
      shelfLife: (sourced.category === 'Chocolates' || sourced.category === 'Chocolate Box') ? '6 Months' : 'N/A (Non-perishable)',
      inStockQty: initialStock
    };

    // 2. Save into active catalog with optional sheet sync
    const res = await this.addNewItemWithSheetSync(newItem, googleToken);

    // 3. Mark sourced item as inducted / ready in pipeline
    const pipeline = this.getSourcingPipeline();
    const pIdx = pipeline.findIndex(p => p.id === sourced.id || p.description.toLowerCase() === sourced.description.toLowerCase());
    if (pIdx >= 0) {
      pipeline[pIdx] = { ...pipeline[pIdx], status: 'Approved', readyForCatalog: true };
    }
    this.saveSourcingPipeline(pipeline);

    return { updatedCatalog: res.items, updatedPipeline: pipeline };
  }
}

