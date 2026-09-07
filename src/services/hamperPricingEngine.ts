import { HamperCatalogItem } from './hamperCatalog';
import { getAssetUrl } from '../utils/assetPath';

export interface BoxCapacitySpec {
  id: string;
  name: string;
  dimensions: string; // e.g. '10"x12"x4"'
  maxVolumeUnits: number; // e.g. 10 units
  ourCost: number;
  gstRate: 18;
}

export const STANDARD_BOX_SPECS: BoxCapacitySpec[] = [
  { id: 'BOX-1012', name: '10*12 Hamper Box (Rigid Premium)', dimensions: '12"x10"x4"', maxVolumeUnits: 10, ourCost: 169.49, gstRate: 18 },
  { id: 'BOX-88', name: '8*8 Box (Square Classic)', dimensions: '8"x8"x3.5"', maxVolumeUnits: 6, ourCost: 250, gstRate: 18 },
  { id: 'BAG-NETHI', name: 'Nethipatta Bag (Jute / Fabric)', dimensions: '10"x8"', maxVolumeUnits: 4, ourCost: 92, gstRate: 18 },
  { id: 'POUCH-KRAFT', name: 'Artisan Stand-Up Kraft Pouch (Zipper/Window)', dimensions: '8"x5"x2.5"', maxVolumeUnits: 3, ourCost: 12, gstRate: 18 },
  { id: 'POUCH-GOLD', name: 'Golden Artisanal Pouch Set with Ribbon', dimensions: 'Compact', maxVolumeUnits: 3, ourCost: 10, gstRate: 18 },
  { id: 'POUCH-SATIN', name: 'Festive Satin Drawstring Pouch', dimensions: '9"x6"', maxVolumeUnits: 4, ourCost: 24, gstRate: 18 },
  { id: 'POUCH-STICKER', name: 'GUD Branded Pouch with Seal Sticker', dimensions: '7"x5"', maxVolumeUnits: 3, ourCost: 6, gstRate: 18 }
];

export interface CuratedTierRecipe {
  tier: 'Pouch' | 'Basic' | 'Better' | 'Premium';
  tierName: string;
  tagline: string;
  recommendedBox: BoxCapacitySpec;
  lineItems: {
    catalogItem: HamperCatalogItem;
    qty: number;
    volumeUnits: number;
  }[];
  totalVolumeUnits: number;
  capacityUtilizationPercent: number;
  ourBOMGoodsCost: number; // Excl GST
  ourBOMTotalWithGst: number;
  clientQuoteExclGst: number;
  clientQuoteInclGst: number;
  netProfit: number;
  grossMarginPercent: number;
  badge: string;
  image?: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    accent: string;
  };
}

export interface BudgetRecommendationResult {
  targetBudgetInclGst: number;
  quantity: number;
  tiers: {
    pouch: CuratedTierRecipe;
    basic: CuratedTierRecipe;
    better: CuratedTierRecipe;
    premium: CuratedTierRecipe;
  };
}

/**
 * Assign volumetric units to catalog items for box fit calculations
 */
export function getItemVolumeUnits(item: HamperCatalogItem): number {
  const desc = item.description.toLowerCase();
  const cat = item.category;

  if (cat === 'Packaging') {
    if (desc.includes('box')) return 0; // The box itself is the container
    if (desc.includes('shredded') || desc.includes('paper')) return 1;
    return 0.5; // Cards, pouches, stickers
  }
  if (cat === 'Chocolate Box') {
    if (desc.includes('8 piece') || desc.includes('8-piece')) return 4;
    if (desc.includes('6 piece') || desc.includes('6-piece')) return 3;
    return 3;
  }
  if (cat === 'Tins') {
    return 2.5;
  }
  if (cat === 'Chocolates') {
    return 1; // Single bars (25g-50g)
  }
  if (cat === 'Souvenir') {
    if (desc.includes('house boat') || desc.includes('houseboat')) return 3;
    if (desc.includes('candle') || desc.includes('coconut')) return 2;
    return 1.5; // Figurines, fans, hangings
  }
  return 1;
}

export class HamperPricingEngine {
  /**
   * Reverse-engineer 3 curated tiers based on client target budget incl GST
   */
  static generateTiersForBudget(
    targetBudgetInclGst: number,
    quantity: number,
    catalog: HamperCatalogItem[],
    absorbedExpensesPerHamper: number = 0, // e.g. Travel/Courier split per hamper
    customBarSelection?: { description: string; qty: number }[]
  ): BudgetRecommendationResult {
    // 1. Calculate Target Pre-GST Base assuming blended GST (~12-14% average)
    const effectiveGstMultiplier = 1.12; 
    const baseClientBudget = Math.max(targetBudgetInclGst / effectiveGstMultiplier, 100);

    // Helpers to find catalog SKUs
    const findItem = (pattern: string) => 
      catalog.find(i => i.description.toLowerCase().includes(pattern.toLowerCase()));

    // Resolve chocolate bar items: either user custom selection or default 25g bars
    const resolveChocolateBars = (defaultQty: number) => {
      if (customBarSelection && customBarSelection.length > 0) {
        return customBarSelection.map(bar => {
          const catItem = catalog.find(i => i.description.toLowerCase() === bar.description.toLowerCase()) ||
            catalog.find(i => i.description.toLowerCase().includes(bar.description.toLowerCase())) ||
            findItem('25 grm bar') ||
            findItem('Indian Sea Salt') ||
            catalog.find(i => i.category === 'Chocolates') ||
            catalog[1];
          return { catalogItem: catItem, qty: bar.qty, volumeUnits: 1 };
        });
      }
      const defaultBar = findItem('Indian Sea Salt') || findItem('25 grm bar') || catalog.find(i => i.category === 'Chocolates') || catalog[1];
      return [{ catalogItem: defaultBar, qty: defaultQty, volumeUnits: 1 }];
    };

    // 1. Build TIER 0: POUCH PACK (Eco, High Volume, ~58-65% Margin)
    const pouchBox = STANDARD_BOX_SPECS.find(b => b.id === 'POUCH-KRAFT') || STANDARD_BOX_SPECS.find(b => b.id === 'POUCH-GOLD') || STANDARD_BOX_SPECS[3];
    const pouchCatalog = findItem('Pouch with Stickers') || findItem('Pouch') || catalog[0];
    const pouchBars = resolveChocolateBars(2);
    const pouchSnack = findItem('Banana chips') || catalog.find(i => i.category === 'Tins') || catalog[0];
    const pouchCard = findItem('Onam Note Card') || findItem('Taj logo card') || catalog[4];

    const pouchItems = [
      { catalogItem: pouchCatalog, qty: 1, volumeUnits: 0 },
      ...pouchBars,
      { catalogItem: pouchSnack, qty: 1, volumeUnits: 1 },
      { catalogItem: pouchCard, qty: 1, volumeUnits: 0 }
    ];

    const pouchTier = this.calculateTierMetrics(
      'Pouch',
      'Artisan Stand-Up Pouch Pack',
      'Eco-conscious high-volume gifting: Artisanal stand-up pouch with confections & chips',
      pouchBox,
      pouchItems,
      Math.max(Math.round(targetBudgetInclGst * 0.50), 380),
      absorbedExpensesPerHamper,
      'Pouch Pack (~60% Margin)',
      getAssetUrl('/images/brand/prod_real_ppan0887.jpg'),
      {
        bg: 'bg-[#181818]',
        border: 'border-[#2e2e2e]',
        text: 'text-zinc-300',
        accent: 'bg-[#222222]'
      }
    );

    // 2. Build TIER 1: BASIC / ESSENTIAL (Budget-Friendly, High Margin ~45-50%)
    // Aim: 75% - 85% of target budget, smart compact gifting
    const basicBox = STANDARD_BOX_SPECS.find(b => b.id === 'BAG-NETHI') || STANDARD_BOX_SPECS[2];
    const basicCatalogBox = findItem('Nethipatta') || findItem('Pouch with Stickers') || catalog[0];
    const basicBars = resolveChocolateBars(2);
    const basicSnack = findItem('Banana chips') || catalog.find(i => i.category === 'Tins') || catalog[0];
    const basicCard = findItem('Onam Note Card') || findItem('Company logo') || catalog[4];

    const basicItems = [
      { catalogItem: basicCatalogBox, qty: 1, volumeUnits: 0 },
      ...basicBars,
      { catalogItem: basicSnack, qty: 1, volumeUnits: 2 },
      { catalogItem: basicCard, qty: 1, volumeUnits: 0 }
    ];

    const basicTier = this.calculateTierMetrics(
      'Basic',
      'Essential Confectionery Bag',
      'High-margin crowd pleaser with artisan confections & traditional handcrafted bag',
      basicBox,
      basicItems,
      targetBudgetInclGst * 0.75, // Target 75% of budget
      absorbedExpensesPerHamper,
      'Value Pick (~45% Margin)',
      getAssetUrl('/images/brand/prod_real_ppan1026.jpg'),
      {
        bg: 'bg-[#1f1f1f]',
        border: 'border-[#2e2e2e]',
        text: 'text-[#aaaaaa]',
        accent: 'bg-[#272727]'
      }
    );

    // 3. Build TIER 2: BETTER / SIGNATURE (Balanced Corporate Gifting, Sweet Spot ~38-42%)
    // Aim: 95% - 100% of target budget, full rigid box + chocolates + snack + souvenir
    const betterBox = STANDARD_BOX_SPECS.find(b => b.id === 'BOX-1012') || STANDARD_BOX_SPECS[0];
    const betterCatalogBox = findItem('10*12') || findItem('8*8 Box') || catalog[6];
    const betterChocBox = findItem('6 Piece Box') || findItem('8 Piece Box') || catalog[1];
    const betterSnack = findItem('Banana chips') || findItem('Tins') || catalog[0];
    const betterSouvenir = findItem('Visiri') || findItem('Kathakali Face Figurine') || catalog[3];
    const betterFiller = findItem('Shredded Paper') || catalog[5];
    const betterCard = findItem('Onam Note Card') || catalog[4];

    const betterItems = [
      { catalogItem: betterCatalogBox, qty: 1, volumeUnits: 0 },
      { catalogItem: betterChocBox, qty: 1, volumeUnits: 3 },
      { catalogItem: betterSnack, qty: 1, volumeUnits: 2.5 },
      { catalogItem: betterSouvenir, qty: 1, volumeUnits: 1.5 },
      { catalogItem: betterFiller, qty: 1, volumeUnits: 1 },
      { catalogItem: betterCard, qty: 1, volumeUnits: 0 }
    ];

    const betterTier = this.calculateTierMetrics(
      'Better',
      'Signature Heritage Rigid Box',
      'The executive standard: Luxury rigid box, assorted confections, and handcrafted Kerala souvenir',
      betterBox,
      betterItems,
      targetBudgetInclGst, // Exact client target
      absorbedExpensesPerHamper,
      'Most Popular (Balanced)',
      getAssetUrl('/images/brand/prod_gift_8.jpg'),
      {
        bg: 'bg-[#212121]',
        border: 'border-[#3f3f3f]',
        text: 'text-white',
        accent: 'bg-white'
      }
    );

    // 4. Build TIER 3: PREMIUM / CONNOISSEUR (Luxury VIP Showcase ~30-35%)
    // Aim: 125% - 140% of target budget, top shelf showcase
    const premiumBox = STANDARD_BOX_SPECS.find(b => b.id === 'BOX-1012') || STANDARD_BOX_SPECS[0];
    const premiumCatalogBox = findItem('10*12') || findItem('8*8 Box') || catalog[6];
    const premiumChocBox = findItem('8 Piece Box') || findItem('Artisanal Jaggery') || catalog[6];
    const premiumBars = resolveChocolateBars(2);
    const premiumSnack = findItem('Banana chips') || catalog[0];
    const premiumSouvenir = findItem('House Boat Wooden') || findItem('Coconut Candle') || catalog[7];
    const premiumFiller = findItem('Shredded Paper') || catalog[5];
    const premiumCard = findItem('Onam Note Card') || catalog[4];

    const premiumItems = [
      { catalogItem: premiumCatalogBox, qty: 1, volumeUnits: 0 },
      { catalogItem: premiumChocBox, qty: 1, volumeUnits: 4 },
      ...premiumBars,
      { catalogItem: premiumSnack, qty: 1, volumeUnits: 2.5 },
      { catalogItem: premiumSouvenir, qty: 1, volumeUnits: 3 },
      { catalogItem: premiumFiller, qty: 1, volumeUnits: 1 },
      { catalogItem: premiumCard, qty: 1, volumeUnits: 0 }
    ];

    const premiumTier = this.calculateTierMetrics(
      'Premium',
      'Connoisseur Royal VIP Hamper',
      'VIP Tier: 8-Piece Luxury Box, Rosewood Houseboat, Gourmet Tins & Bespoke Handcrafted Presentation',
      premiumBox,
      premiumItems,
      Math.max(targetBudgetInclGst * 1.35, 1250), // 35% upsell tier
      absorbedExpensesPerHamper,
      'VIP Luxury Upgrade',
      getAssetUrl('/images/brand/kerala_heritage_hamper.jpg'),
      {
        bg: 'bg-[#1f1f1f]',
        border: 'border-[#2e2e2e]',
        text: 'text-zinc-200',
        accent: 'bg-[#272727]'
      }
    );

    return {
      targetBudgetInclGst,
      quantity,
      tiers: {
        pouch: pouchTier,
        basic: basicTier,
        better: betterTier,
        premium: premiumTier
      }
    };
  }

  private static calculateTierMetrics(
    tier: 'Pouch' | 'Basic' | 'Better' | 'Premium',
    tierName: string,
    tagline: string,
    box: BoxCapacitySpec,
    items: { catalogItem: HamperCatalogItem; qty: number; volumeUnits: number }[],
    suggestedClientQuoteInclGst: number,
    absorbedExpenses: number,
    badge: string,
    image: string,
    colorScheme: { bg: string; border: string; text: string; accent: string }
  ): CuratedTierRecipe {
    let ourBOMGoodsCost = 0;
    let ourBOMTotalWithGst = 0;
    let totalVolumeUnits = 0;

    items.forEach(it => {
      const lineCost = it.catalogItem.ourUnitCost * it.qty;
      const gst = (lineCost * it.catalogItem.gstRate) / 100;
      ourBOMGoodsCost += lineCost;
      ourBOMTotalWithGst += (lineCost + gst);
      totalVolumeUnits += (it.volumeUnits * it.qty);
    });

    const capacityPercent = Math.min(Math.round((totalVolumeUnits / box.maxVolumeUnits) * 100), 120);

    const clientQuoteExclGst = Math.round((suggestedClientQuoteInclGst / 1.12) * 100) / 100;
    const clientQuoteInclGst = Math.round(suggestedClientQuoteInclGst);

    const netProfit = Math.round((clientQuoteInclGst - ourBOMTotalWithGst - absorbedExpenses) * 100) / 100;
    const grossMarginPercent = clientQuoteInclGst > 0 
      ? Math.round((netProfit / clientQuoteInclGst) * 10000) / 100 
      : 0;

    return {
      tier,
      tierName,
      tagline,
      recommendedBox: box,
      lineItems: items,
      totalVolumeUnits,
      capacityUtilizationPercent: capacityPercent,
      ourBOMGoodsCost: Math.round(ourBOMGoodsCost * 100) / 100,
      ourBOMTotalWithGst: Math.round(ourBOMTotalWithGst * 100) / 100,
      clientQuoteExclGst,
      clientQuoteInclGst,
      netProfit,
      grossMarginPercent,
      badge,
      image,
      colorScheme
    };
  }
}
