import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../firebase';
import { StorageEngine } from './storageEngine';
import { auditLogService } from './audit';

export interface GstInvoiceRecord {
  id: string; // Document ID (usually invoiceNo or unique key)
  invoiceNo: string; // e.g. "Invoice-1153-GUD-2026-IntegratedDesig"
  date: string; // DD/MM/YYYY or YYYY-MM-DD
  yearMonth?: string; // e.g. "2026-09"
  party: string; // e.g. "Moby (Integrated Design)"
  partyGstin?: string; // e.g. "32A..."
  taxableValue: number; // e.g. 742.86
  cgst: number; // e.g. 18.57
  sgst: number; // e.g. 18.57
  totalGst?: number; // e.g. 37.14
  total?: number; // e.g. 780.00
  chocolateQuantity: string; // e.g. "6 bars", "300 units (250 bars + 50 boxes)", "30 Hampers"
  items?: Array<{
    name: string;
    description: string;
    rate: number;
    qty: number;
    unit: string;
  }>;
  entity?: string;
  notes?: string;
  source?: 'invoice_generator' | 'manual_entry' | 'imported';
  createdAt?: number;
}

// Baseline August 2026 Invoices extracted from the verified August 2026 Audit Pack
export const BASE_AUGUST_INVOICES: GstInvoiceRecord[] = [
  {
    id: "Invoice-1153-GUD-2026-IntegratedDesig",
    invoiceNo: "Invoice-1153-GUD-2026-IntegratedDesig",
    date: "01/08/2026",
    party: "Moby (Integrated Design)",
    partyGstin: "",
    taxableValue: 742.86,
    cgst: 18.57,
    sgst: 18.57,
    totalGst: 37.14,
    total: 780.00,
    chocolateQuantity: "6 bars",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1154-GUD-2026-Naveen",
    invoiceNo: "Invoice-1154-GUD-2026-Naveen",
    date: "01/08/2026",
    party: "Naveen",
    partyGstin: "",
    taxableValue: 866.67,
    cgst: 21.67,
    sgst: 21.67,
    totalGst: 43.34,
    total: 910.01,
    chocolateQuantity: "7 bars",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1155-GUD-2026-JJDentalClinic",
    invoiceNo: "Invoice-1155-GUD-2026-JJDentalClinic",
    date: "31/07/2026",
    party: "Abin Abraham (J J Dental Clinic)",
    partyGstin: "",
    taxableValue: 371.43,
    cgst: 9.29,
    sgst: 9.29,
    totalGst: 18.58,
    total: 390.01,
    chocolateQuantity: "3 bars",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1156-GUD-2026-Royal Enfield Street",
    invoiceNo: "Invoice-1156-GUD-2026-Royal Enfield Street",
    date: "08/08/2026",
    party: "Royal Enfield Street",
    partyGstin: "",
    taxableValue: 6142.86,
    cgst: 153.57,
    sgst: 153.57,
    totalGst: 307.14,
    total: 6450.00,
    chocolateQuantity: "43 bars",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1157-GUD-2026-Dr faraz",
    invoiceNo: "Invoice-1157-GUD-2026-Dr faraz",
    date: "05/08/2026",
    party: "Dr faraz",
    partyGstin: "",
    taxableValue: 742.86,
    cgst: 18.57,
    sgst: 18.57,
    totalGst: 37.14,
    total: 780.00,
    chocolateQuantity: "6 bars",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1158-GUD-2026-Praveen",
    invoiceNo: "Invoice-1158-GUD-2026-Praveen",
    date: "05/08/2026",
    party: "Praveen",
    partyGstin: "",
    taxableValue: 247.62,
    cgst: 6.19,
    sgst: 6.19,
    totalGst: 12.38,
    total: 260.00,
    chocolateQuantity: "2 bars",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1159-GUD-2026-Kannan Michael",
    invoiceNo: "Invoice-1159-GUD-2026-Kannan Michael",
    date: "05/08/2026",
    party: "Kannan Michael",
    partyGstin: "",
    taxableValue: 247.62,
    cgst: 6.19,
    sgst: 6.19,
    totalGst: 12.38,
    total: 260.00,
    chocolateQuantity: "2 bars",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1160-GUD-2026-Capt Mohanlal",
    invoiceNo: "Invoice-1160-GUD-2026-Capt Mohanlal",
    date: "05/08/2026",
    party: "Capt Mohanlal",
    partyGstin: "",
    taxableValue: 371.43,
    cgst: 9.29,
    sgst: 9.29,
    totalGst: 18.58,
    total: 390.01,
    chocolateQuantity: "3 bars",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1161-GUD-2026-Mani Kuttan",
    invoiceNo: "Invoice-1161-GUD-2026-Mani Kuttan",
    date: "05/08/2026",
    party: "Mani Kuttan",
    partyGstin: "",
    taxableValue: 742.86,
    cgst: 18.57,
    sgst: 18.57,
    totalGst: 37.14,
    total: 780.00,
    chocolateQuantity: "6 bars",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1162-GUD-2026-Dinil",
    invoiceNo: "Invoice-1162-GUD-2026-Dinil",
    date: "05/08/2026",
    party: "Dinil",
    partyGstin: "",
    taxableValue: 1238.10,
    cgst: 30.95,
    sgst: 30.95,
    totalGst: 61.90,
    total: 1300.00,
    chocolateQuantity: "10 bars",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1163-GUD-2026-Zlan Creations Private Limited",
    invoiceNo: "Invoice-1163-GUD-2026-Zlan Creations Private Limited",
    date: "19/08/2026",
    party: "Zlan Creations Private Limited",
    partyGstin: "32AACCZ1710D1ZZ",
    taxableValue: 833.33,
    cgst: 20.83,
    sgst: 20.83,
    totalGst: 41.66,
    total: 874.99,
    chocolateQuantity: "7 bars",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "1164-GUD-2025-TAJ MALABAR RESORT & SPA",
    invoiceNo: "1164-GUD-2025-TAJ MALABAR RESORT & SPA",
    date: "17/08/2026",
    party: "TAJ MALABAR RESORT & SPA",
    partyGstin: "",
    taxableValue: 111200.00,
    cgst: 7115.50,
    sgst: 7115.50,
    totalGst: 14231.00,
    total: 125431.00,
    chocolateQuantity: "300 units (250 bars + 50 boxes)",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1165-GUD-2026-Sreekumar C",
    invoiceNo: "Invoice-1165-GUD-2026-Sreekumar C",
    date: "21/08/2026",
    party: "Sreekumar C",
    partyGstin: "",
    taxableValue: 1389.00,
    cgst: 40.51,
    sgst: 40.51,
    totalGst: 81.02,
    total: 1470.02,
    chocolateQuantity: "1 Hamper",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1166-GUD-2026-Anand Sagar",
    invoiceNo: "Invoice-1166-GUD-2026-Anand Sagar",
    date: "21/08/2026",
    party: "Anand Sagar",
    partyGstin: "",
    taxableValue: 476.19,
    cgst: 11.90,
    sgst: 11.90,
    totalGst: 23.80,
    total: 499.99,
    chocolateQuantity: "4 bars",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1168-GUD-2026-Nihara Resort & Spa",
    invoiceNo: "Invoice-1168-GUD-2026-Nihara Resort & Spa",
    date: "24/08/2026",
    party: "Nihara Resort & Spa",
    partyGstin: "32AAGCB0650E1ZC",
    taxableValue: 7760.00,
    cgst: 194.00,
    sgst: 194.00,
    totalGst: 388.00,
    total: 8148.00,
    chocolateQuantity: "80 bars",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1169-GUD-2026-Divyanshi",
    invoiceNo: "Invoice-1169-GUD-2026-Divyanshi",
    date: "24/08/2026",
    party: "Divyanshi",
    partyGstin: "",
    taxableValue: 1998.00,
    cgst: 49.95,
    sgst: 49.95,
    totalGst: 99.90,
    total: 2097.90,
    chocolateQuantity: "2 Hampers",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1170-GUD-2026-Ansal",
    invoiceNo: "Invoice-1170-GUD-2026-Ansal",
    date: "24/08/2026",
    party: "Ansal (RABAH International)",
    partyGstin: "",
    taxableValue: 1700.00,
    cgst: 42.50,
    sgst: 42.50,
    totalGst: 85.00,
    total: 1785.00,
    chocolateQuantity: "2 Hampers",
    entity: "Goodoria Food Innovations",
    source: "imported"
  },
  {
    id: "Invoice-1171-GUD-2026-Naveen",
    invoiceNo: "Invoice-1171-GUD-2026-Naveen",
    date: "29/08/2026",
    party: "Naveen Kumar",
    partyGstin: "",
    taxableValue: 60000.00,
    cgst: 1500.00,
    sgst: 1500.00,
    totalGst: 3000.00,
    total: 63000.00,
    chocolateQuantity: "30 Hampers",
    entity: "Goodoria Food Innovations",
    source: "imported"
  }
];

const STORAGE_KEY = 'gud_invoices_registry';

export class InvoiceService {
  /**
   * Helper to normalize a date string into YYYY-MM (Strictly follows Indian DD/MM/YYYY ordering)
   */
  static extractYearMonth(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const trimmed = dateStr.trim();
      // 1. DD/MM/YYYY or DD-MM-YYYY
      const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (dmy) {
        return `${dmy[3]}-${dmy[2].padStart(2, '0')}`;
      }
      // 2. YYYY-MM-DD
      const ymd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (ymd) {
        return `${ymd[1]}-${ymd[2].padStart(2, '0')}`;
      }
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${d.getFullYear()}-${m}`;
      }
    } catch {
      // ignore
    }
    return '';
  }

  /**
   * Normalizes date to display format DD/MM/YYYY
   */
  static formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const trimmed = dateStr.trim();
      // 1. DD/MM/YYYY or DD-MM-YYYY
      const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (dmy) {
        return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
      }
      // 2. YYYY-MM-DD
      const ymd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (ymd) {
        return `${ymd[3].padStart(2, '0')}/${ymd[2].padStart(2, '0')}/${ymd[1]}`;
      }
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}/${d.getFullYear()}`;
      }
    } catch {
      // ignore
    }
    return dateStr;
  }

  /**
   * Merges baseline invoices with Firestore/localStorage list
   */
  private static mergeWithBaselines(customInvoices: GstInvoiceRecord[]): GstInvoiceRecord[] {
    const map = new Map<string, GstInvoiceRecord>();

    // 1. Load baseline August invoices
    BASE_AUGUST_INVOICES.forEach(inv => {
      map.set(inv.invoiceNo, inv);
    });

    // 2. Overlay / append custom and newly created invoices
    customInvoices.forEach(inv => {
      map.set(inv.invoiceNo, inv);
    });

    return Array.from(map.values());
  }

  /**
   * Fetch all invoices from LocalStorage (Instant zero-latency cache)
   */
  static getLocalInvoices(): GstInvoiceRecord[] {
    const cached = StorageEngine.getLocal<GstInvoiceRecord[]>(STORAGE_KEY, []);
    return this.mergeWithBaselines(cached);
  }

  /**
   * Real-time subscription to invoices in Firestore
   * Automatically merges with baseline data & caches in LocalStorage
   */
  static subscribeToInvoices(callback: (invoices: GstInvoiceRecord[]) => void): () => void {
    // Deliver local cache first immediately
    const initial = this.getLocalInvoices();
    callback(initial);

    try {
      const invoicesColl = collection(db, 'invoices');
      const q = query(invoicesColl, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const firestoreInvoices: GstInvoiceRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as GstInvoiceRecord;
            firestoreInvoices.push({
              ...data,
              id: docSnap.id,
              date: this.formatDateDisplay(data.date)
            });
          });

          // Cache in local storage
          StorageEngine.setLocal(STORAGE_KEY, firestoreInvoices);

          // Merge with baselines
          const merged = this.mergeWithBaselines(firestoreInvoices);
          callback(merged);
        },
        (error) => {
          console.warn('[InvoiceService] Firestore listener warning, falling back to cached invoices:', error);
          callback(this.getLocalInvoices());
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('[InvoiceService] Could not establish Firestore listener:', err);
      return () => {};
    }
  }

  /**
   * Saves or updates an invoice in Firestore & LocalStorage
   */
  static async saveInvoice(invoice: Partial<GstInvoiceRecord> & { invoiceNo: string; date: string; party: string }): Promise<GstInvoiceRecord> {
    const cleanId = invoice.invoiceNo.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const formattedDate = this.formatDateDisplay(invoice.date);

    const record: GstInvoiceRecord = {
      id: cleanId,
      invoiceNo: invoice.invoiceNo,
      date: formattedDate,
      party: invoice.party,
      partyGstin: invoice.partyGstin || '',
      taxableValue: Number(Number(invoice.taxableValue || 0).toFixed(2)),
      cgst: Number(Number(invoice.cgst || 0).toFixed(2)),
      sgst: Number(Number(invoice.sgst || 0).toFixed(2)),
      totalGst: Number(Number(invoice.totalGst || (Number(invoice.cgst || 0) + Number(invoice.sgst || 0))).toFixed(2)),
      total: Number(Number(invoice.total || (Number(invoice.taxableValue || 0) + Number(invoice.cgst || 0) + Number(invoice.sgst || 0))).toFixed(2)),
      chocolateQuantity: invoice.chocolateQuantity || '1 order',
      items: invoice.items || [],
      notes: invoice.notes || '',
      entity: invoice.entity || 'Goodoria Food Innovations',
      source: invoice.source || 'invoice_generator',
      createdAt: invoice.createdAt || Date.now()
    };

    // 1. Update local cache immediately
    const current = StorageEngine.getLocal<GstInvoiceRecord[]>(STORAGE_KEY, []);
    const updated = [record, ...current.filter(i => i.invoiceNo !== record.invoiceNo)];
    StorageEngine.setLocal(STORAGE_KEY, updated);

    // 2. Persist to Firestore
    try {
      const docRef = doc(db, 'invoices', cleanId);
      await setDoc(docRef, record, { merge: true });

      // Audit log
      await auditLogService.logActivity(
        { uid: 'current_user', email: 'system@goodoria.com', displayName: 'ERP System' },
        `Saved Invoice ${record.invoiceNo}`,
        'finance',
        `Party: ${record.party} | Taxable: ₹${record.taxableValue} | Total: ₹${record.total}`
      );
    } catch (err) {
      console.warn('[InvoiceService] Firestore persistence failed (local cache preserved):', err);
    }

    return record;
  }

  /**
   * Deletes an invoice from Firestore and LocalStorage
   */
  static async deleteInvoice(invoiceNo: string): Promise<void> {
    const cleanId = invoiceNo.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

    // 1. Remove from local storage
    const current = StorageEngine.getLocal<GstInvoiceRecord[]>(STORAGE_KEY, []);
    const updated = current.filter(i => i.invoiceNo !== invoiceNo);
    StorageEngine.setLocal(STORAGE_KEY, updated);

    // 2. Remove from Firestore
    try {
      await deleteDoc(doc(db, 'invoices', cleanId));
      await auditLogService.logActivity(
        { uid: 'current_user', email: 'system@goodoria.com', displayName: 'ERP System' },
        `Deleted Invoice ${invoiceNo}`,
        'finance'
      );
    } catch (err) {
      console.warn('[InvoiceService] Firestore delete failed:', err);
    }
  }

  /**
   * Generates a clean chocolate quantity summary string
   */
  static formatChocolateQuantity(params: {
    hamperQty?: number;
    totalBarsQty?: number;
    box6Qty?: number;
    box8Qty?: number;
  }): string {
    const parts: string[] = [];

    if (params.hamperQty && params.hamperQty > 0) {
      parts.push(`${params.hamperQty} ${params.hamperQty === 1 ? 'Hamper' : 'Hampers'}`);
    }

    if (params.totalBarsQty && params.totalBarsQty > 0) {
      parts.push(`${params.totalBarsQty} bars`);
    }

    const totalBoxes = (params.box6Qty || 0) + (params.box8Qty || 0);
    if (totalBoxes > 0) {
      parts.push(`${totalBoxes} ${totalBoxes === 1 ? 'box' : 'boxes'}`);
    }

    if (parts.length === 0) return '1 order';
    return parts.join(' + ');
  }

  /**
   * Exports invoices directly to a CSV file matching the EXACT 7 COLUMNS:
   * Invoice No. | Date | Party | Taxable Value | CGST | SGST | Chocolate Quantity
   */
  static exportToExact7ColumnCsv(invoices: GstInvoiceRecord[], periodTitle: string): void {
    const headers = [
      'Invoice No.',
      'Date',
      'Party',
      'Taxable Value',
      'CGST',
      'SGST',
      'Chocolate Quantity'
    ];

    const escape = (val: any) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const lines: string[] = [];
    lines.push(headers.map(escape).join(','));

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;

    invoices.forEach(inv => {
      totalTaxable += inv.taxableValue || 0;
      totalCgst += inv.cgst || 0;
      totalSgst += inv.sgst || 0;

      lines.push([
        escape(inv.invoiceNo),
        escape(inv.date),
        escape(inv.party),
        Number((inv.taxableValue || 0).toFixed(2)),
        Number((inv.cgst || 0).toFixed(2)),
        Number((inv.sgst || 0).toFixed(2)),
        escape(inv.chocolateQuantity || '')
      ].join(','));
    });

    // Summary Total Row
    lines.push([
      escape('Total'),
      escape(''),
      escape(''),
      Number(totalTaxable.toFixed(2)),
      Number(totalCgst.toFixed(2)),
      Number(totalSgst.toFixed(2)),
      escape(`${invoices.length} invoices`)
    ].join(','));

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanPeriod = (periodTitle || 'GST_Report').replace(/\s+/g, '_');
    link.download = `GST_Sales_Summary_${cleanPeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
