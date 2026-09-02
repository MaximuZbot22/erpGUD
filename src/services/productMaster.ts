import { ProductSKU, SEED_PRODUCTS } from '../types/products';
import { StorageEngine } from './storageEngine';

const STORAGE_KEY = 'gud_product_master_v1';

export class ProductMasterService {
  /**
   * Returns all products from storage or seed defaults
   */
  static getProducts(): ProductSKU[] {
    return StorageEngine.getLocal<ProductSKU[]>(STORAGE_KEY, SEED_PRODUCTS);
  }

  /**
   * Save full products catalog
   */
  static saveProducts(products: ProductSKU[]): boolean {
    return StorageEngine.setLocal(STORAGE_KEY, products);
  }

  /**
   * Add or update a product SKU
   */
  static saveProduct(product: ProductSKU): ProductSKU[] {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === product.id || p.sku.toLowerCase() === product.sku.toLowerCase());
    if (idx >= 0) {
      list[idx] = product;
    } else {
      list.push(product);
    }
    this.saveProducts(list);
    return list;
  }

  /**
   * Find product by SKU or ID
   */
  static findBySku(skuOrId: string): ProductSKU | undefined {
    const list = this.getProducts();
    return list.find(p => p.sku.toLowerCase() === skuOrId.toLowerCase() || p.id.toLowerCase() === skuOrId.toLowerCase());
  }

  /**
   * Get price for specific tier
   */
  static getPriceForTier(product: ProductSKU, tier: 'retail' | 'wholesale' | 'cafeHotel' | 'corporate' | 'custom'): number {
    if (product.priceTiers && product.priceTiers[tier] !== undefined) {
      return product.priceTiers[tier]!;
    }
    return product.sellingPrice;
  }
}
