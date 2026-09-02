export interface ProductSKU {
  id: string; // e.g. 'PROD-ALM-25G'
  sku: string;
  name: string;
  flavor: string;
  variantSize: string; // e.g. '25g', '8g'
  unit: string; // e.g. 'bar', 'piece', 'box'
  costPrice: number;
  sellingPrice: number;
  gstRate: number; // e.g. 18 or 5
  active: boolean;
  batchTrackingRequired: boolean;
  expiryTrackingRequired: boolean;
  category: 'Chocolate Bar' | 'Box Set' | 'Loose Pieces' | 'Packaging' | 'Component';
  priceTiers?: {
    retail: number;
    wholesale: number;
    cafeHotel: number;
    corporate: number;
    custom?: number;
  };
}

export const SEED_PRODUCTS: ProductSKU[] = [
  {
    id: 'PROD-ALM-25G',
    sku: 'SKU-ALMOND-25G',
    name: 'Almond Noir 25g',
    flavor: 'Almond Noir',
    variantSize: '25g',
    unit: 'bar',
    costPrice: 65,
    sellingPrice: 130,
    gstRate: 18,
    active: true,
    batchTrackingRequired: true,
    expiryTrackingRequired: true,
    category: 'Chocolate Bar',
    priceTiers: { retail: 130, wholesale: 95, cafeHotel: 100, corporate: 110 }
  },
  {
    id: 'PROD-ORG-25G',
    sku: 'SKU-ORANGE-25G',
    name: 'Orange Sunset 25g',
    flavor: 'Orange Sunset',
    variantSize: '25g',
    unit: 'bar',
    costPrice: 65,
    sellingPrice: 130,
    gstRate: 18,
    active: true,
    batchTrackingRequired: true,
    expiryTrackingRequired: true,
    category: 'Chocolate Bar',
    priceTiers: { retail: 130, wholesale: 95, cafeHotel: 100, corporate: 110 }
  },
  {
    id: 'PROD-JCK-25G',
    sku: 'SKU-JACKFRUIT-25G',
    name: 'Malabar Jackfruit 25g',
    flavor: 'Malabar Jackfruit',
    variantSize: '25g',
    unit: 'bar',
    costPrice: 70,
    sellingPrice: 140,
    gstRate: 18,
    active: true,
    batchTrackingRequired: true,
    expiryTrackingRequired: true,
    category: 'Chocolate Bar',
    priceTiers: { retail: 140, wholesale: 100, cafeHotel: 105, corporate: 115 }
  },
  {
    id: 'PROD-LMN-25G',
    sku: 'SKU-LEMON-25G',
    name: 'Sun-Kissed Lemon 25g',
    flavor: 'Sun-Kissed Lemon',
    variantSize: '25g',
    unit: 'bar',
    costPrice: 65,
    sellingPrice: 130,
    gstRate: 18,
    active: true,
    batchTrackingRequired: true,
    expiryTrackingRequired: true,
    category: 'Chocolate Bar',
    priceTiers: { retail: 130, wholesale: 95, cafeHotel: 100, corporate: 110 }
  },
  {
    id: 'PROD-MCH-25G',
    sku: 'SKU-MOCHA-25G',
    name: 'Midnight Mocha 25g',
    flavor: 'Midnight Mocha',
    variantSize: '25g',
    unit: 'bar',
    costPrice: 68,
    sellingPrice: 135,
    gstRate: 18,
    active: true,
    batchTrackingRequired: true,
    expiryTrackingRequired: true,
    category: 'Chocolate Bar',
    priceTiers: { retail: 135, wholesale: 98, cafeHotel: 102, corporate: 112 }
  },
  {
    id: 'PROD-SLT-25G',
    sku: 'SKU-SEASALT-25G',
    name: 'Indian Sea Salt 25g',
    flavor: 'Indian Sea Salt',
    variantSize: '25g',
    unit: 'bar',
    costPrice: 65,
    sellingPrice: 130,
    gstRate: 18,
    active: true,
    batchTrackingRequired: true,
    expiryTrackingRequired: true,
    category: 'Chocolate Bar',
    priceTiers: { retail: 130, wholesale: 95, cafeHotel: 100, corporate: 110 }
  },
  {
    id: 'PROD-PNT-25G',
    sku: 'SKU-PEANUT-25G',
    name: 'Peanut Royale 25g',
    flavor: 'Peanut Royale',
    variantSize: '25g',
    unit: 'bar',
    costPrice: 60,
    sellingPrice: 120,
    gstRate: 18,
    active: true,
    batchTrackingRequired: true,
    expiryTrackingRequired: true,
    category: 'Chocolate Bar',
    priceTiers: { retail: 120, wholesale: 88, cafeHotel: 92, corporate: 100 }
  }
];
