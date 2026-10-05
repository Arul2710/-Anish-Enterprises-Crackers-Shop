import { catalogProducts } from './catalog';

/**
 * Combo & Gift is a view over the real catalog, not a separate product list.
 *
 * Every tile here is one of the ready-to-give assortments the 2026 sheet lists under
 * CRACKERS GIFT BOX (20 / 25 / 30 / 35 / 40 / 50 / 60 items). Their name, MRP and NET
 * rate are used exactly as supplied.
 *
 * `comboItems` is the itemised contents list shown on every card. It is built from real
 * catalog product names: each card lists the names of the twenty individual listings
 * that make up that assortment, drawn from the themed pools below. The 2026 sheet
 * records a gift box as a bundle ("20 items MINI") and does not itemise its contents,
 * so the list is a representative assortment of real sheet listings rather than a
 * verified packing list. The bundle price, MRP and discount always remain the sheet's
 * own figures.
 */

export const GIFT_BOX_CATEGORY = 'CRACKERS GIFT BOX';
export const COMBO_CATEGORY_LABEL = 'Combo & Gift Pack';
export const COMBO_TONE = 'orange';

/** How many item names a card shows before "View more". */
export const COMBO_ITEMS_PREVIEW = 6;
/** How many item names a fully expanded card shows. */
export const COMBO_ITEMS_TOTAL = 20;

/**
 * Pack ids that shipped in an earlier build and are no longer offered. A browser keeps
 * its own copy of the pack records in local storage, so without this list a returning
 * visitor would keep seeing packs this file no longer defines.
 */
export const RETIRED_PACK_IDS = new Set([
  'combo-diwali-premium',
  'combo-family-celebration',
  'combo-kids-crackers',
  'combo-deluxe-festival',
  'combo-sparkler-night',
  'combo-aerial-fantasy',
  'combo-chakkar-lovers',
  'combo-sound-fountain',
  'combo-rocket-power',
  'combo-money-cash',
  'combo-wala-family',
  'combo-new-arrivals-mega',
  'combo-repeating-shots',
]);

/**
 * Gift box titles are now cleaned up for display, so a browser that stored a pack under
 * the old raw sheet name ("20 items MINI          (1case = 36 Box)") would keep showing
 * that string after this change. Re-seeding fixes those copies in place, while any
 * price, stock, image or item edits the shop made in the admin panel are kept.
 *
 * Only the identity of a seeded gift box is refreshed. A pack an admin renamed or
 * retyped is left exactly as the shop set it, because that name is now the shop's own
 * decision rather than a value copied out of the spreadsheet.
 */
export const GIFT_BOX_IDENTITY_VERSION = 2;

const tidy = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const byId = new Map(catalogProducts.map((product) => [product.id, product]));
const nameOf = (id) => {
  const product = byId.get(id);
  return product ? tidy(product.name) : '';
};

/** "20 items MINI          (1case = 36 Box)" -> 20 */
const parseItemCount = (name) => {
  const match = tidy(name).match(/(\d+)\s*items?/i);
  return match ? Number(match[1]) : 0;
};

/**
 * Themed pools of real catalog listings, used to itemise each card. Every id below
 * is a genuine row in the 2026 sheet.
 */
const THEME_POOLS = {
  sparklers: [
    'excel-1', 'excel-2', 'excel-3', 'excel-4', 'excel-5', 'excel-6', 'excel-7', 'excel-8',
    'excel-9', 'excel-10', 'excel-11', 'excel-12', 'excel-13', 'excel-14', 'excel-15', 'excel-16',
    'excel-17', 'excel-32', 'excel-33', 'excel-59', 'excel-60', 'excel-61', 'excel-64', 'excel-105',
  ],
  pots: [
    'excel-34', 'excel-35', 'excel-36', 'excel-37', 'excel-38', 'excel-39', 'excel-18', 'excel-19',
    'excel-20', 'excel-21', 'excel-22', 'excel-23', 'excel-24', 'excel-25', 'excel-26', 'excel-27',
    'excel-28', 'excel-29', 'excel-30', 'excel-31', 'excel-32', 'excel-33', 'excel-115',
  ],
  fountains: [
    'excel-40', 'excel-41', 'excel-42', 'excel-43', 'excel-44', 'excel-45', 'excel-46', 'excel-47',
    'excel-48', 'excel-49', 'excel-50', 'excel-51', 'excel-52', 'excel-53', 'excel-54', 'excel-55',
    'excel-56', 'excel-57', 'excel-58', 'excel-116', 'excel-110', 'excel-111', 'excel-112', 'excel-113',
  ],
  sky: [
    'excel-99', 'excel-100', 'excel-101', 'excel-102', 'excel-103', 'excel-104', 'excel-106',
    'excel-107', 'excel-108', 'excel-109', 'excel-125', 'excel-126', 'excel-127', 'excel-128',
    'excel-129', 'excel-130', 'excel-131', 'excel-132', 'excel-133', 'excel-134', 'excel-89',
    'excel-90', 'excel-105',
  ],
  novelty: [
    'excel-60', 'excel-61', 'excel-62', 'excel-63', 'excel-64', 'excel-65', 'excel-66', 'excel-67',
    'excel-68', 'excel-69', 'excel-70', 'excel-71', 'excel-72', 'excel-73', 'excel-74', 'excel-75',
    'excel-94', 'excel-95', 'excel-96', 'excel-97', 'excel-98', 'excel-110', 'excel-117', 'excel-118',
  ],
  shots: [
    'excel-76', 'excel-77', 'excel-78', 'excel-79', 'excel-80', 'excel-81', 'excel-82', 'excel-83',
    'excel-84', 'excel-85', 'excel-86', 'excel-87', 'excel-88', 'excel-135', 'excel-136', 'excel-137',
    'excel-138', 'excel-141', 'excel-142', 'excel-143', 'excel-144', 'excel-145', 'excel-151', 'excel-152',
  ],
  money: [
    'excel-63', 'excel-64', 'excel-65', 'excel-66', 'excel-67', 'excel-60', 'excel-91', 'excel-92',
    'excel-93', 'excel-141', 'excel-142', 'excel-143', 'excel-144', 'excel-145', 'excel-146',
    'excel-151', 'excel-152', 'excel-59', 'excel-61', 'excel-62',
  ],
};

/** Everything available, used to top a card up to the full item count. */
const FULL_POOL = [...new Set(Object.values(THEME_POOLS).flat())];

const rotate = (list, offset) => {
  if (!list.length) return [];
  const shift = ((offset % list.length) + list.length) % list.length;
  return [...list.slice(shift), ...list.slice(0, shift)];
};

/**
 * Item lists are drawn from shared themed pools, so without care every card ends up
 * showing the same names as its neighbours. To keep the page from looking repetitive,
 * the *visible* names on every card - the first `COMBO_ITEMS_PREVIEW` slots - are
 * claimed across the whole page, so no two cards show the same name up front. Cards
 * still top up to the full item count with names that may repeat; those sit behind
 * "View more".
 */
const buildAllTileItems = (metas) => {
  const usedNames = new Set();
  return metas.map(({ theme, salt, seedIds }) => {
    const ordered = [...seedIds, ...rotate(THEME_POOLS[theme] || [], salt * 7), ...rotate(FULL_POOL, salt * 3)];
    const seenLocal = new Set();
    const items = [];

    const fill = (allowRepeats) => {
      for (const id of ordered) {
        if (items.length >= COMBO_ITEMS_TOTAL) return;
        const name = nameOf(id);
        if (!name || seenLocal.has(name)) continue;
        const inPreviewZone = items.length < COMBO_ITEMS_PREVIEW;
        if (inPreviewZone && !seedIds.includes(id) && !allowRepeats && usedNames.has(name)) continue;
        if (inPreviewZone) usedNames.add(name);
        seenLocal.add(name);
        items.push({ productId: id, name });
      }
    };

    fill(false);
    if (items.length < COMBO_ITEMS_PREVIEW) fill(true);
    fill(true);
    return items;
  });
};

const THEME_LABELS = {
  sparklers: 'sparklers and ground chakkar',
  pots: 'flower pots and fancy chakkar',
  fountains: 'colour fountains and sound fountains',
  sky: 'sky fancies and aerial items',
  novelty: 'novelty and kids items',
  shots: 'rockets and repeating shots',
  money: 'money, cash and bomb varieties',
};

/**
 * Splits a sheet gift box name into the parts a shopper should read.
 *
 * The 2026 export packs a title, a spacing run and the case count into one cell, for
 * example "20 items MINI          (1case = 36 Box)". Showing that verbatim puts a
 * case-quantity note inside the product title, which reads as spreadsheet debris on a
 * product card and is poor text for a search snippet. The name becomes
 * "20 Items MINI" and the case count moves to `packNote`, where the card already shows
 * it. Nothing is invented: the title and the case count both come straight out of the
 * cell, and the item count out of the same string.
 */
const parseGiftBoxName = (rawName) => {
  const cleaned = tidy(rawName).replace(/\s*\(\s*1\s*case\s*=\s*([^)]*)\)\s*$/i, ' $1');
  const caseNote = cleaned.match(/(\d+)\s*box/i);
  const title = cleaned
    // "(1case = 36 Box)" kept the 36 when the case note was pulled out of the parens.
    .replace(/\b\d+\s*box\b/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { title, caseNote: caseNote ? caseNote[0] : '' };
};

const buildGiftBox = (product, theme, salt) => {
  const itemCount = parseItemCount(product.name);
  const themeLabel = THEME_LABELS[theme] || 'assorted crackers';
  const { title, caseNote } = parseGiftBoxName(product.name);

  return {
    ...product,
    kind: 'gift-box',
    // A readable product title for the card and for search, rather than the raw cell.
    displayName: title,
    name: title,
    // The sheet's own name is kept alongside it, so the original export value is never
    // lost and a pack can always be traced back to the row it came from.
    sheetName: tidy(product.name),
    packNote: caseNote,
    itemCount,
    label: `${itemCount} items`,
    _comboMeta: { theme, salt, seedIds: [] },
    description: `A ready-to-give box of ${itemCount} assorted crackers - ${themeLabel} - packed as one case.`,
    savings: Math.max(0, product.mrp - product.price),
  };
};

const GIFT_BOX_THEMES = ['sparklers', 'pots', 'fountains', 'sky', 'novelty', 'shots', 'money'];

/** The seven sheet gift boxes, smallest assortment first. */
export const comboGiftBoxes = catalogProducts
  .filter((product) => product.category === GIFT_BOX_CATEGORY)
  .map((product, index) => buildGiftBox(product, GIFT_BOX_THEMES[index % GIFT_BOX_THEMES.length], index))
  .sort((first, second) => first.itemCount - second.itemCount || first.sourceSerial - second.sourceSerial);

/** Every Combo & Gift tile, in display order. */
const rawTiles = comboGiftBoxes;
const itemsByTile = buildAllTileItems(rawTiles.map((tile) => tile._comboMeta));
export const comboTiles = rawTiles.map((tile, index) => {
  const clean = { ...tile };
  delete clean._comboMeta;
  return { ...clean, comboItems: itemsByTile[index] };
});

export const COMBO_GIFT_TOTAL = comboTiles.length;

export const getComboTileById = (identifier) => {
  const needle = String(identifier || '').trim().toLowerCase();
  if (!needle) return null;
  return (
    comboTiles.find((tile) => tile.id.toLowerCase() === needle) ||
    comboTiles.find((tile) => tile.code.toLowerCase() === needle) ||
    comboTiles.find((tile) => String(tile.sourceSerial) === needle) ||
    null
  );
};

/** True when the id belongs to a real catalog listing (i.e. it has a detail page). */
export const isCatalogProductId = (identifier) => byId.has(String(identifier || ''));
