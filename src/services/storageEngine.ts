/**
 * Unified Storage Engine & Source-of-Truth Manager
 * Prevents localStorage vs. Google Sheets / Firestore conflicts
 */

export interface StorageConfig<T> {
  key: string;
  defaultData: T;
  version?: string;
}

export class StorageEngine {
  /**
   * Safely fetches data from localStorage with fallbacks
   */
  static getLocal<T>(key: string, defaultValue: T): T {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return defaultValue;
      return JSON.parse(saved) as T;
    } catch (e) {
      console.warn(`[StorageEngine] Read error for key ${key}, using default fallback:`, e);
      return defaultValue;
    }
  }

  /**
   * Safely updates data in localStorage
   */
  static setLocal<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[StorageEngine] Write error for key ${key}:`, e);
      return false;
    }
  }

  /**
   * Clears a key or array of keys
   */
  static removeLocal(keys: string | string[]): void {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (e) {
        console.warn(`[StorageEngine] Remove error for key ${k}:`, e);
      }
    });
  }
}
