import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

const productsSource = read('../src/data/products.js');

const productRows = [...productsSource.matchAll(/\{ serial: (\d+), name: (?:'([^']*)'|"([^"]*)"), category: '([^']*)'/g)].map(([, serial, single, double, category]) => ({
  id: `excel-${serial}`,
  name: single ?? double,
  category,
}));

const categoryBlock = productsSource.slice(productsSource.indexOf('export const categoryDetails'));
const categories = [...categoryBlock.matchAll(/\{ name: '([^']*)', label: '([^']*)'/g)].map(([, name, label]) => ({ name, label }));

/**
 * The Combo & Gift cards are the sheet's own gift boxes, shown smallest assortment
 * first. The order is read out of the catalog rather than hard-coded, so "combos 1"
 * keeps meaning the first card on the page even if the sheet rows are reordered.
 */
const GIFT_BOX_CATEGORY = 'CRACKERS GIFT BOX';
const serialOf = (id) => Number(String(id).replace('excel-', ''));
const combos = productRows
  .filter((row) => row.category === GIFT_BOX_CATEGORY)
  .map((row) => ({ ...row, itemCount: Number(/(\d+)\s*items?/i.exec(row.name || '')?.[1] ?? 0) }))
  .sort((first, second) => first.itemCount - second.itemCount || serialOf(first.id) - serialOf(second.id))
  .map(({ itemCount, ...row }) => row);

/**
 * Combo photos arrive numbered, "combos 1.jpeg" through "combos 7.jpeg", and the
 * number is the card's position on the page. Recording card id -> file means each card
 * finds its own photo, and a photo numbered past the last card maps to nothing, so an
 * extra file never gets published as a key no component asks for.
 */
const comboKeyFor = (base) => {
  const match = /^combos?[-_ ]?(\d+)$/i.exec(base.trim());
  if (!match) return null;
  const card = combos[Number(match[1]) - 1];
  return card ? card.id : null;
};

const imagesDir = fileURLToPath(new URL('../public/images/', import.meta.url));
const bgDir = new URL('../public/bg/', import.meta.url).pathname.replace(/^\//, '');

function scanFolder(folder, keyFor = (base) => base) {
  const dir = join(imagesDir, folder);
  if (!existsSync(dir)) return {};
  const found = {};
  for (const entry of readdirSync(dir)) {
    const match = IMAGE_EXTENSIONS.map((extension) => `${folder}/${entry.replace(/\.[^.]+$/, '')}.${extension}`)
      .find((candidate) => existsSync(join(imagesDir, candidate)));
    if (!match) continue;
    // A file with no slot to land in is left out rather than published as a key no
    // component asks for, so the manifest only ever lists reachable artwork.
    const key = keyFor(entry.replace(/\.[^.]+$/, ''));
    if (key) found[key] = `/images/${match}`;
  }
  return found;
}

/**
 * Product photos arrive numbered, one file per sheet serial ("product 7.jpeg",
 * "product7.jpg", "excel-7.png"). The number is the product number shown on the card
 * and the id the catalog looks up, so the manifest records product id -> file and a
 * card finds its own photo by number instead of guessing file names at runtime.
 *
 * A number that is not in the sheet maps to nothing, so that photo is skipped and the
 * card keeps its placeholder rather than borrowing a picture that belongs elsewhere.
 */
const knownSerials = new Set(productRows.map((row) => Number(row.id.slice('excel-'.length))));
const productKeyFor = (base) => {
  const match = /^(?:product|img|image|excel)?[-_ ]?(\d+)$/i.exec(base.trim());
  if (!match) return null;
  const serial = Number(match[1]);
  return knownSerials.has(serial) ? `excel-${serial}` : null;
};

const heroFolder = readdirSync(imagesDir).filter((entry) => /^hero\./.test(entry) && statSync(join(imagesDir, entry)).isFile());
const hero = heroFolder.length ? `/images/${heroFolder[0]}` : null;

// Hero background: prefer public/bg/hero.*, fall back to public/images/bg/hero.*
const pickHeroBg = (dir, prefix) =>
  existsSync(dir) ? readdirSync(dir).find((entry) => new RegExp(`^${prefix}\\.[a-z0-9]+$`, 'i').test(entry) && IMAGE_EXTENSIONS.includes(entry.split('.').pop().toLowerCase())) : undefined;

const heroBgEntry = pickHeroBg(bgDir, 'hero') || pickHeroBg(join(imagesDir, 'bg'), 'hero');
const heroBgDir = pickHeroBg(bgDir, 'hero') ? '/bg' : '/images/bg';
const heroBg = heroBgEntry ? `${heroBgDir}/${heroBgEntry}` : null;

const manifest = {
  hero,
  heroBg,
  products: scanFolder('products', productKeyFor),
  categories: scanFolder('categories'),
  combos: scanFolder('combos', comboKeyFor),
};

// The index is written into src/data rather than public/ on purpose: it is a build
// input, and the app imports it so every card knows its photo on the first paint.
// Anything under public/ is served as an immutable static asset, so an index kept
// there could not be imported without the page breaking whenever the file changed.
const indexPath = new URL('../src/data/imageManifest.json', import.meta.url);
writeFileSync(indexPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const found = (group) => Object.keys(manifest[group]).length;
const total = found('products') + found('categories') + found('combos') + (manifest.hero ? 1 : 0) + (manifest.heroBg ? 1 : 0);

const lines = [
  'SPARK AND SHINE - IMAGE DROP-IN CHECKLIST',
  '',
  '1. Copy your image files into the matching folder listed below.',
  '2. Accepted extensions: .jpg  .jpeg  .png  .webp  .avif',
  '3. Run "npm run dev" (or "npm run build") - the image index regenerates',
  '   automatically on startup, so no extra step is needed.',
  '',
  'This index means the site makes ONE request per image. If a file is',
  'missing, that card shows the styled placeholder instead. You can add',
  'images gradually without anything breaking.',
  '',
  `CURRENTLY FOUND: ${total} image(s)  (hero ${manifest.hero ? 'yes' : 'no'}, products ${found('products')}, categories ${found('categories')}, combos ${found('combos')})`,
  '',
  '=== HERO BACKGROUND (homepage) =================================',
  'public/bg/hero.jpg',
  '',
  `=== CATEGORY CARDS (${categories.length}) ============`,
  ...categories.map((category) => `public/images/categories/${slugify(category.name)}.jpg`.padEnd(58) + category.label),
  '',
  `=== COMBO PACK CARDS (${combos.length}) ====================`,
  '# a photo is matched to a card by its position on the page, so any of these',
  '#   public/images/combos/combos<number>.<ext>   (the "combos 1" spacing is fine too)',
  `# ${found('combos')}/${combos.length} combo photo(s) already in place`,
  ...combos.map((combo, index) => {
    const mapped = manifest.combos[combo.id];
    const name = (combo.name || '').replace(/\s+/g, ' ').trim();
    return `${name.padEnd(40)}${(mapped ? mapped.replace('/images/', 'public/images/') : '(no photo yet)').padEnd(46)}# combos ${index + 1} = ${combo.id}`;
  }),
  '',
  `=== PRODUCT CARDS + PRODUCT DETAIL PAGE (${productRows.length}) ===`,
  '# a photo is matched to a card by product number, so any of these',
  '#   public/images/products/product<number>.<ext>   (the "product 7" spacing is fine too)',
  `# ${found('products')}/${productRows.length} product photo(s) already in place`,
  ...productRows.map((product) => {
    const mapped = manifest.products[product.id];
    const name = product.name || '';
    return `${name.padEnd(40)}${(mapped ? mapped.replace('/images/', 'public/images/') : '(no photo yet)').padEnd(46)}# ${product.id}`;
  }),
  '',
];

writeFileSync(join(imagesDir, 'CHECKLIST.txt'), lines.join('\n'), 'utf8');
console.log(`src/data/imageManifest.json + CHECKLIST.txt written - ${total} image(s) found: products ${found('products')}/${productRows.length}, categories ${found('categories')}/${categories.length}, combos ${found('combos')}/${combos.length}, hero bg ${manifest.heroBg ? 'yes' : 'no'}`);
