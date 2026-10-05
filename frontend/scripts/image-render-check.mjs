import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createElement } from 'react';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });

const [{ ProductArtwork }, images] = await Promise.all([
  server.ssrLoadModule('/src/components/ProductArtwork.jsx'),
  server.ssrLoadModule('/src/utils/images.js'),
]);
const { products, categoryDetails } = await server.ssrLoadModule('/src/data/products.js');
const { seedPackRecords } = await server.ssrLoadModule('/src/data/packRecords.js');
const comboPacks = seedPackRecords().map((pack) => ({ ...pack, id: pack.id, name: pack.name }));

let failures = 0;
const check = (label, condition, detail = '') => {
  if (condition) console.log(`PASS  ${label}`);
  else {
    failures += 1;
    console.log(`FAIL  ${label} ${detail}`);
  }
};

// The index ships inside the bundle, so a card knows its photo on the first render.
const product = products[0];
const html = renderToStaticMarkup(createElement(ProductArtwork, { product, className: 'min-h-[13.5rem]' }));
const firstCandidate = images.productImageCandidates(product)[0];
const shipped = images.getImageManifest();

check('the image index is available without any fetch', shipped && typeof shipped === 'object' && Object.keys(shipped.products || {}).length > 0, JSON.stringify(Object.keys(shipped || {})));
check('ProductArtwork renders an img', html.includes('<img'), html.slice(0, 160));
check('asks for the photo numbered for the product', /\/images\/products\/product ?1\.(jpeg|jpg|png|webp|avif)$/.test(firstCandidate), firstCandidate);
check('the img src is that photo', html.includes(`src="${firstCandidate}"`), html.slice(0, 200));
check('one request per image, not a chain of guesses', images.productImageCandidates(product).length === 1, JSON.stringify(images.productImageCandidates(product)));
check('img carries the product name as alt', /alt="7 cm Electric"/.test(html));
check('img is lazy by default', /loading="lazy"/.test(html));
check('placeholder hidden while an image can load', !html.includes('product-art-mark') && !html.includes('product-art-label'));
check('eager flag switches loading', /loading="eager"/.test(renderToStaticMarkup(createElement(ProductArtwork, { product, eager: true }))));
check('hero is empty while no hero photo is indexed', images.heroImageCandidates().length === 0);

// An image carried by the product's own record is used as-is, with no filename guessing.
check('a record image wins over the indexed photo', images.productImageCandidates({ id: 'excel-1', image: '/images/products/product 1.jpeg' })[0] === '/images/products/product 1.jpeg');
check('a record image list is honoured', images.productImageCandidates({ id: 'excel-1', images: [{ url: 'https://cdn.example/a.jpg' }] })[0] === 'https://cdn.example/a.jpg');
check('a blank record image falls through to the indexed photo', images.productImageCandidates({ id: 'excel-1', image: '   ' })[0] === firstCandidate);
check('an id with no photo resolves nothing', images.productImageCandidates({ id: 'not-a-product' }).length === 0);
check('a product with no id yields nothing', images.productImageCandidates({ name: 'x' }).length === 0);

check('category slug matches checklist', images.categoryImageCandidates('GROUND CHAKKAR VARITIES')[0] === '/images/categories/ground-chakkar-varities.jpg', images.categoryImageCandidates('GROUND CHAKKAR VARITIES')[0]);
check('category slug handles digits', images.categoryImageCandidates('NEW ARRIVALS 2026')[0] === '/images/categories/new-arrivals-2026.jpg');
// A pack shows its own artwork. It must never borrow a photo from an item inside it,
// because on a page of packs that would put the same picture on two cards.
const firstPack = comboPacks[0];
const comboChain = images.comboImageCandidates(firstPack);
const firstItemId = firstPack.items?.[0]?.productId;
const firstItemImage = firstItemId ? images.productImageCandidates({ id: firstItemId })[0] : null;
check('combo chain has no duplicate paths', new Set(comboChain).size === comboChain.length, JSON.stringify(comboChain));
check('combo does not borrow an item photo', !comboChain.includes(firstItemImage) || firstItemImage === comboChain[0], `${JSON.stringify(comboChain)} vs ${firstItemImage}`);
check('a pack image on the record wins', images.comboImageCandidates({ ...firstPack, image: '/images/combos/test.jpg' })[0] === '/images/combos/test.jpg');
check('every combo card resolves exactly one photo', comboPacks.every((pack) => images.comboImageCandidates(pack).length >= 1));
check('no photo is shared by two combo cards', new Set(comboPacks.map((pack) => images.comboImageCandidates(pack)[0])).size === comboPacks.length, comboPacks.map((pack) => images.comboImageCandidates(pack)[0]).join(' '));
// Card order on the page is the pack order, so combo photo N belongs to the Nth card.
check('combo photos are numbered in card order', comboPacks.every((pack, index) => images.comboImageCandidates(pack)[0] === `/images/combos/combos ${index + 1}.jpeg`), comboPacks.map((pack, index) => `${index + 1}:${images.comboImageCandidates(pack)[0]}`).join(' '));
check('every combo photo is a real file', comboPacks.every((pack) => existsSync(new URL(`../public${images.comboImageCandidates(pack)[0]}`, import.meta.url))));
check('every category resolves a path', categoryDetails.every((item) => images.categoryImageCandidates(item.name).length > 0));
check('missing product yields no candidates', images.productImageCandidates({}).length === 0 && images.productImageCandidates(null).length === 0);

// Now the real manifest that the build actually ships.
const manifest = JSON.parse(readFileSync(new URL('../src/data/imageManifest.json', import.meta.url), 'utf8'));
check('the image index has the 4 groups', ['hero', 'products', 'categories', 'combos'].every((key) => key in manifest), Object.keys(manifest).join(','));
check('manifest hero is null while absent', manifest.hero === null || manifest.hero === undefined);
check('manifest product keys are all valid ids', Object.keys(manifest.products).every((key) => products.some((item) => item.id === key)));
check('manifest paths are absolute from /images', Object.values(manifest.products).every((path) => path.startsWith('/images/products/')));
check('no manifest path points at a missing file', [...Object.values(manifest.products), ...Object.values(manifest.categories), ...Object.values(manifest.combos), manifest.hero].filter(Boolean).every((path) => existsSync(new URL(`../public${path}`, import.meta.url))));

// The bundle must carry the index the build wrote, or the first paint would resolve
// photos against a stale or absent copy of it.
check('the bundled index is the index on disk', JSON.stringify(shipped.products) === JSON.stringify(manifest.products), `${Object.keys(shipped.products || {}).length} bundled vs ${Object.keys(manifest.products).length} shipped`);

// Photos are dropped in numbered, and every card has to land on the photo carrying its
// own number: the file name is the product number, never a neighbouring one.
const serialOf = (product) => Number(product.id.replace(/^excel-/, ''));
// A photo file carries the number it was filed under: "product 7.jpeg" for a sheet
// serial, "combos 2.jpeg" for the second card on the Combo & Gift page.
const numberIn = (path) => Number(/\/(?:product|combos?)\s*(\d+)\./i.exec(path)?.[1]);
const mapped = products.filter((product) => manifest.products[product.id]);
const mismatched = mapped.filter((product) => numberIn(manifest.products[product.id]) !== serialOf(product));
check('every mapped card uses the photo with its own product number', mismatched.length === 0, mismatched.map((p) => `${p.id} -> ${manifest.products[p.id]}`).join(', '));
check('no photo is shared by two cards', new Set(Object.values(manifest.products)).size === mapped.length, `${new Set(Object.values(manifest.products)).size} paths for ${mapped.length} cards`);

// A product with no photo of its own keeps the placeholder instead of borrowing one.
const unmapped = products.filter((product) => !manifest.products[product.id]);
check('a card without a matching photo has no image path', unmapped.every((product) => !manifest.products[product.id]), unmapped.map((p) => p.id).join(', '));
check('products.js serials are matched 1:1 by the photos', mapped.length + unmapped.length === products.length);

// The lookup the catalog actually uses, resolved straight from the bundled index.
const resolved = products.map((product) => ({ product, paths: images.productImageCandidates(product) }));
check('a card with a photo resolves exactly that photo', resolved.filter((row) => manifest.products[row.product.id]).every((row) => row.paths.length === 1 && row.paths[0] === manifest.products[row.product.id]), resolved.filter((row) => row.paths.length !== 1 || (manifest.products[row.product.id] && row.paths[0] !== manifest.products[row.product.id])).map((row) => `${row.product.id}:${row.paths}`).join(', '));
// A gift box reaches the storefront through the combo artwork rather than a product
// photo, so it is set apart here. Every other product without a photo of its own must
// resolve nothing at all, which is what keeps a card on its placeholder.
const isGiftBox = (id) => Boolean(manifest.combos[id]);
check('a card with no photo resolves no path at all', resolved.filter((row) => !manifest.products[row.product.id] && !isGiftBox(row.product.id)).every((row) => row.paths.length === 0), resolved.filter((row) => !manifest.products[row.product.id] && !isGiftBox(row.product.id) && row.paths.length).map((row) => `${row.product.id}:${row.paths}`).join(', '));
check('the resolved path is a real file numbered for that card', resolved.filter((row) => row.paths.length && !isGiftBox(row.product.id)).every((row) => row.paths.length === 1 && numberIn(row.paths[0]) === serialOf(row.product) && existsSync(new URL(`../public${row.paths[0]}`, import.meta.url))), resolved.filter((row) => row.paths.length && !isGiftBox(row.product.id) && (row.paths.length !== 1 || numberIn(row.paths[0]) !== serialOf(row.product))).map((row) => `${row.product.id}:${row.paths}`).join(', '));

// The seven gift box cards on the Products page, in the order the sheet lists them.
const giftBoxCards = comboPacks.map((pack, index) => ({ id: pack.id, name: pack.name, position: index + 1, paths: images.productImageCandidates({ id: pack.id }) }));
check('every gift box product resolves its own photo', giftBoxCards.length === 7 && giftBoxCards.every((row) => row.paths.length === 1), giftBoxCards.map((row) => `${row.id}:${row.paths}`).join(' '));
// A gift box photo is filed under its own product number ("product 220.jpeg"), with the
// combo artwork as the second copy of the same picture, so either number is correct.
check('gift box photo is numbered for its own card', giftBoxCards.every((row) => {
  const own = `/images/products/product ${serialOf({ id: row.id })}.jpeg`;
  const combo = `/images/combos/combos ${row.position}.jpeg`;
  return row.paths[0] === own || row.paths[0] === combo;
}), giftBoxCards.map((row) => `${row.id}:${row.paths[0]}`).join(' '));
check('no gift box photo is shared', new Set(giftBoxCards.map((row) => row.paths[0])).size === giftBoxCards.length, giftBoxCards.map((row) => row.paths[0]).join(' '));
check('every gift box photo file exists', giftBoxCards.every((row) => existsSync(new URL(`../public${row.paths[0]}`, import.meta.url))));
check('a gift box photo never leaks onto a non-gift-box card', resolved.filter((row) => !isGiftBox(row.product.id)).every((row) => !row.paths[0]?.startsWith('/images/combos/')), resolved.filter((row) => !isGiftBox(row.product.id) && row.paths[0]?.startsWith('/images/combos/')).map((row) => `${row.product.id}:${row.paths}`).join(' '));

// The catalog card renders the photo the detail page does, both off the same lookup.
const [{ ProductMedia }] = await Promise.all([server.ssrLoadModule('/src/components/catalog/ProductMedia.jsx')]);
const cardHtml = renderToStaticMarkup(createElement(ProductMedia, { product }));
check('the catalog card renders the product photo', cardHtml.includes(`src="${firstCandidate}"`), cardHtml.slice(0, 200));
check('the catalog card asks for exactly one image', (cardHtml.match(/<img/g) || []).length === 1, cardHtml.slice(0, 200));
const photoless = unmapped[0];
const photolessHtml = renderToStaticMarkup(createElement(ProductMedia, { product: photoless }));
check('a card with no photo shows the placeholder, not a borrowed image', !photolessHtml.includes('<img'), photolessHtml.slice(0, 200));
check('the placeholder is the one already used for that product', photolessHtml.includes(`grid-${photoless.id}`));

check('checklist lists every product', (() => {
  const text = readFileSync(new URL('../public/images/CHECKLIST.txt', import.meta.url), 'utf8');
  return products.every((item) => text.includes(item.id));
})());
check('checklist records the numbered drop-in convention', (() => {
  const text = readFileSync(new URL('../public/images/CHECKLIST.txt', import.meta.url), 'utf8');
  return text.includes('product<number>');
})());

// Prove a dropped file is picked up and produces a single-candidate path. The probe uses
// a real product number that currently has no photo, so it also covers the numbering rule.
const probeSerial = products.find((product) => !manifest.products[product.id]).sourceSerial;
const probeId = `excel-${probeSerial}`;
const probeFile = new URL(`../public/images/products/product ${probeSerial}.jpg`, import.meta.url);
writeFileSync(probeFile, 'probe');
const regenerate = () => execFileSync(process.execPath, [new URL('./image-manifest.mjs', import.meta.url).pathname.replace(/^\//, '')], { stdio: 'ignore' });
try {
  regenerate();
  const rebuilt = JSON.parse(readFileSync(new URL('../src/data/imageManifest.json', import.meta.url), 'utf8'));
  check('dropped file appears in manifest', rebuilt.products[probeId] === `/images/products/product ${probeSerial}.jpg`, JSON.stringify(rebuilt.products[probeId]));
} finally {
  unlinkSync(probeFile);
  regenerate();
}
const afterProbe = JSON.parse(readFileSync(new URL('../src/data/imageManifest.json', import.meta.url), 'utf8'));
check('manifest is clean after probe removal', !(probeId in afterProbe.products));
check('manifest is back to the shipped set of cards', Object.keys(afterProbe.products).length === mapped.length);

await server.close();
console.log(failures === 0 ? '\nImage wiring verified.' : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
