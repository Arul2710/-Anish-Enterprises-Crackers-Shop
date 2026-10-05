import {
  comboTiles,
  COMBO_CATEGORY_LABEL,
  COMBO_TONE,
  GIFT_BOX_CATEGORY,
  GIFT_BOX_IDENTITY_VERSION,
} from './comboGift';

export const packKinds = ['combo', 'gift-box'];

export const packKindLabels = { combo: 'Combo pack', 'gift-box': 'Gift box' };

export const normalizePackRecord = (value) => {
  if (!value || typeof value !== 'object') return null;
  const name = String(value.name || '').trim();
  if (!name) return null;
  const price = Math.max(0, Number(value.price) || 0);
  const mrp = Math.max(0, Number(value.mrp) || 0);
  const stockRaw = value.stock;
  // An unreadable count is untracked, never zero, so a typo cannot mark a pack as
  // sold out and remove it from the storefront.
  const stockNumber = Number(stockRaw);
  const stock = stockRaw === null || stockRaw === undefined || stockRaw === '' || !Number.isFinite(stockNumber)
    ? null
    : Math.max(0, stockNumber);
  const items = (Array.isArray(value.items) ? value.items : [])
    .map((item) => ({
      productId: String(item.productId || ''),
      name: String(item.name || '').trim(),
      qty: Math.max(1, Number(item.qty) || 1),
    }))
    .filter((item) => item.name);

  return {
    id: String(value.id || `pack-${Date.now().toString(36)}`),
    code: String(value.code || ''),
    name,
    kind: value.kind === 'gift-box' ? 'gift-box' : 'combo',
    badge: String(value.badge || ''),
    // The sheet's own raw name and its case count. The card shows the readable title
    // in `name` and the case count in `packNote`; these two keep the original export
    // value available so a pack can always be traced back to its row in the sheet.
    sheetName: String(value.sheetName || '').trim(),
    packNote: String(value.packNote || '').trim(),
    identityVersion: Number(value.identityVersion) || 0,
    description: String(value.description || ''),
    price,
    mrp: mrp || price,
    stock,
    active: value.active !== false,
    image: String(value.image || ''),
    packSize: String(value.packSize || '1 Combo Box'),
    category: GIFT_BOX_CATEGORY,
    categoryLabel: COMBO_CATEGORY_LABEL,
    categoryTone: COMBO_TONE,
    sourceSerial: Number(value.sourceSerial) || 0,
    items,
    itemCount: items.length,
    source: value.source === 'manual' ? 'manual' : 'seed',
    createdAt: value.createdAt || new Date().toISOString(),
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
};

/**
 * Seeds the pack manager from the Combo & Gift view that already ships with the site,
 * so the existing gift boxes carry over instead of disappearing.
 * Each pack keeps its own price and MRP from that point on, which is what the admin
 * pack editor writes to.
 */
export const seedPackRecords = () =>
  comboTiles.map((tile) =>
    normalizePackRecord({
      identityVersion: GIFT_BOX_IDENTITY_VERSION,
      id: tile.id,
      code: tile.code,
      name: tile.name,
      kind: tile.kind === 'gift-box' ? 'gift-box' : 'combo',
      description: tile.description,
      sheetName: tile.sheetName || '',
      packNote: tile.packNote || '',
      price: tile.price,
      mrp: tile.mrp,
      stock: null,
      active: true,
      image: tile.image || '',
      packSize: tile.packSize,
      sourceSerial: tile.sourceSerial,
      items: (tile.comboItems || []).map((item) => ({
        productId: item.productId,
        name: item.name,
        qty: item.qty || 1,
      })),
      source: 'seed',
    }),
  );

/**
 * A seeded gift box keeps its name from the sheet unless that sheet value has since been
 * cleaned up for display. A stored copy written before the current identity version is
 * therefore re-seeded for its title and case note only - everything the shop changed in
 * the admin panel (price, stock, image, items, active flag) is carried over, and a pack
 * the shop renamed itself is left alone.
 */
export const refreshStaleGiftBoxIdentity = (packs) => {
  const seeds = new Map(seedPackRecords().map((seed) => [seed.id, seed]));
  return packs.map((pack) => {
    const seed = seeds.get(pack.id);
    if (!seed || pack.identityVersion >= GIFT_BOX_IDENTITY_VERSION) return pack;
    return { ...pack, name: seed.name, sheetName: seed.sheetName, packNote: seed.packNote, identityVersion: GIFT_BOX_IDENTITY_VERSION };
  });
};

/** Turns a stored pack into the tile shape the storefront ComboTile renders. */
export const packToTile = (pack) => {
  const price = Number(pack.price) || 0;
  const mrp = Number(pack.mrp) || 0;
  const discountPercent = mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
  return {
    id: pack.id,
    code: pack.code,
    name: pack.name,
    kind: pack.kind,
    displayName: pack.name,
    sheetName: pack.sheetName,
    packNote: pack.packNote,
    label: pack.categoryLabel,
    category: pack.category,
    categoryLabel: pack.categoryLabel,
    categoryTone: pack.categoryTone,
    packSize: pack.packSize,
    sourceSerial: pack.sourceSerial,
    image: pack.image,
    stock: pack.stock,
    isOutOfStock: pack.stock === 0,
    itemCount: pack.itemCount,
    description: pack.description,
    price,
    mrp,
    discountPercent,
    savings: Math.max(0, mrp - price),
    hasDiscount: discountPercent > 0,
    comboItems: pack.items.map((item) => ({ productId: item.productId, name: item.name, qty: item.qty })),
  };
};
