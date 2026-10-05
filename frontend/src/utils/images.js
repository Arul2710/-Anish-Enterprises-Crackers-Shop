// The image index is generated before every dev and build run by scripts/image-manifest.mjs.
// Importing it puts the product -> photo mapping in the bundle, so a card knows its own
// photo on the very first paint: one request per image, no placeholder that gets swapped
// out a moment later, and the photos still work if a photo file is later moved or renamed.
import shippedManifest from '../data/imageManifest.json';

export const IMAGE_ROOT = '/images';
export const BG_ROOT = '/bg';

// Only used as a manual fallback when the index has not listed the slot.
const FALLBACK_EXTENSIONS = ['jpg', 'png'];

const manifest = shippedManifest && typeof shippedManifest === 'object' ? shippedManifest : {};

/** The image index. Available immediately - it ships inside the bundle. */
export function getImageManifest() {
  return manifest;
}

function mappedPath(group, key) {
  return manifest?.[group]?.[key] ?? null;
}

function candidates(group, folder, key) {
  if (!key) return [];
  const mapped = mappedPath(group, key);
  if (mapped) return [mapped];
  // Category and pack artwork is optional and small in number, so a slot the manifest
  // has not listed is probed by its conventional name rather than left blank.
  return FALLBACK_EXTENSIONS.map((extension) => `${IMAGE_ROOT}/${folder}/${key}.${extension}`);
}

/**
 * The image a product's own record carries, if it has one.
 *
 * `image` is the storefront slot a product record can be given directly, and `images`
 * is the shape the database stores (a list of { url, alt }), so a photo attached to the
 * product data is used as-is with no file-name convention involved. This is what makes a
 * newly added product show its own picture: the picture comes from the product data, not
 * from a list of file names the frontend has to be told about.
 */
function recordImageCandidates(product) {
  const single = String(product?.image ?? '').trim();
  if (single) return [single];
  const list = Array.isArray(product?.images) ? product.images : [];
  return list
    .map((entry) => String(typeof entry === 'string' ? entry : entry?.url ?? '').trim())
    .filter(Boolean);
}

/**
 * The photo for a product: whatever its own record carries, otherwise the one file the
 * generated index mapped to this product id, which is the file named after the product
 * number.
 *
 * Every card therefore requests exactly one real photo, and a product the index does not
 * list has no path at all - which is what keeps it on its own placeholder instead of
 * borrowing another product's picture.
 */
export function productImageCandidates(product) {
  if (!product) return [];
  const fromRecord = recordImageCandidates(product);
  if (fromRecord.length) return fromRecord;
  const key = product.id;
  if (!key) return [];
  const mapped = mappedPath('products', key);
  if (mapped) return [mapped];
  // The seven gift boxes are sheet listings and combo cards at the same time, and their
  // photographs are filed under the combo artwork ("combos 1" is the 20 item box, which
  // is Product 220). Those seven ids are the only keys in the combo index, so a lookup
  // here resolves a gift box and nothing else.
  const giftBoxArtwork = mappedPath('combos', key);
  return giftBoxArtwork ? [giftBoxArtwork] : [];
}

export function categoryImageCandidates(categoryName) {
  const slug = (categoryName ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return candidates('categories', 'categories', slug);
}

/**
 * A pack prefers artwork of its own, in this order:
 *
 *   1. an image on the pack record - what the admin panel or a data row supplies
 *   2. the combo photo filed for this card - "combos 1.jpeg" is the first card
 *   3. the pack's own catalog photo, for a gift box that is itself a sheet listing
 *
 * A pack never borrows a photo from an item inside it. That photo belongs to another
 * card, and on a page of seven packs it would put the same picture on two tiles, so a
 * pack with no artwork of its own keeps the placeholder instead.
 */
export function comboImageCandidates(pack) {
  if (!pack?.id) return [];
  const record = recordImageCandidates(pack);
  const mapped = candidates('combos', 'combos', pack.id);
  const seen = [...record, ...mapped];
  const own = seen.length ? [] : productImageCandidates(pack);
  return [...seen, ...own.filter((path) => !seen.includes(path))];
}

export function heroImageCandidates() {
  if (!manifest) return [];
  return manifest.hero ? [manifest.hero] : [];
}

export function heroBgImageCandidates() {
  const mapped = manifest?.heroBg;
  if (mapped) return [mapped];
  return FALLBACK_EXTENSIONS.map((extension) => `${BG_ROOT}/hero.${extension}`);
}
