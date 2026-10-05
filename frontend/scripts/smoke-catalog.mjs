import assert from 'node:assert/strict';

const store = new Map();
const localStorageStub = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};
globalThis.window = { localStorage: localStorageStub, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
globalThis.localStorage = localStorageStub;

const records = await import('../src/data/productRecords.js');
const packs = await import('../src/data/packRecords.js');
const { buildCatalog } = await import('../src/data/catalog.js');
const { comboTiles, GIFT_BOX_IDENTITY_VERSION } = await import('../src/data/comboGift.js');
const siteContent = await import('../src/data/siteContent.js');

const results = [];
const check = (name, run) => {
  try {
    run();
    results.push(`PASS  ${name}`);
  } catch (error) {
    results.push(`FAIL  ${name}: ${error.message}`);
  }
};

const products = records.seedProductRecords();
const categories = records.seedCategoryRecords();
const catalog = buildCatalog(products, categories);

check('the seeded catalog covers the supplied sheet', () => {
  assert.ok(products.length > 150, `expected the full product list, got ${products.length}`);
  assert.ok(categories.length > 15, 'the category list is complete');
  assert.equal(catalog.CATALOG_TOTAL, products.length);
});

check('every product has a price, a code and a category', () => {
  for (const product of products) {
    assert.ok(product.name, 'a product needs a name');
    assert.ok(product.code.startsWith(`${records.CODE_PREFIX}-`), `${product.id} has a shop code`);
    assert.ok(product.sellingPrice > 0, `${product.id} has a selling price`);
    assert.ok(product.mrp >= product.sellingPrice, `${product.id} is not priced above its MRP`);
    assert.ok(categories.some((category) => category.name === product.category), `${product.id} sits in a known category`);
  }
});

check('stock distinguishes untracked from empty', () => {
  const untracked = products.filter((product) => product.stock === null).length;
  const stocked = products.filter((product) => typeof product.stock === 'number').length;
  assert.equal(untracked + stocked, products.length, 'every product has one or the other');
  const outOfStock = catalog.catalogProducts.filter((product) => product.stock === 0);
  assert.ok(outOfStock.length < products.length, 'not everything is out of stock');
});

check('category counts match the products in each category', () => {
  for (const category of catalog.catalogCategories) {
    const actual = products.filter((product) => product.category === category.name).length;
    assert.equal(category.count, actual, `${category.name} count is right`);
  }
});

check('the category filter narrows the product list', () => {
  const target = catalog.catalogCategories[0];
  const filtered = catalog.filterCatalog({ category: target.name, search: '' });
  assert.ok(filtered.length > 0, 'the first category has products');
  assert.ok(filtered.every((product) => product.category === target.name), 'only that category comes back');
});

check('search matches a name and a code', () => {
  const target = products[3];
  const byName = catalog.filterCatalog({ search: target.name.slice(0, 6) });
  assert.ok(byName.some((product) => product.id === target.id), 'a partial name finds the product');
  const byCode = catalog.filterCatalog({ search: target.code });
  assert.equal(byCode.length, 1, 'a full code finds exactly one product');
});

check('an unknown category slug or product id resolves to nothing rather than throwing', () => {
  assert.equal(catalog.getCatalogCategory('no-such-category'), null);
  assert.equal(catalog.getCatalogProduct('no-such-product'), null);
});

check('sorting by price really orders the list', () => {
  const ascending = catalog.sortCatalog(catalog.catalogProducts, 'price-low').map((product) => product.price);
  const descending = catalog.sortCatalog(catalog.catalogProducts, 'price-high').map((product) => product.price);
  assert.deepEqual(ascending, [...ascending].sort((a, b) => a - b), 'low to high');
  assert.deepEqual(descending, [...descending].sort((a, b) => b - a), 'high to low');
});

check('pack records seed from the original packs and carry their own pricing', () => {
  const packRecords = packs.seedPackRecords();
  assert.equal(packRecords.length, comboTiles.length, 'every original pack is represented');
  for (const pack of packRecords) {
    assert.ok(pack.name, `${pack.id} has a name`);
    assert.ok(pack.price > 0, `${pack.id} has a price`);
    assert.ok(Array.isArray(pack.items), `${pack.id} lists its items`);
    assert.equal(pack.source, 'seed', `${pack.id} is marked as a seed record`);
  }
});

check('a pack converts into a storefront tile', () => {
  const [pack] = packs.seedPackRecords();
  const tile = packs.packToTile(pack);
  assert.equal(tile.id, pack.id);
  assert.equal(tile.name, pack.name);
  assert.equal(tile.price, pack.price);
  assert.equal(tile.kind, pack.kind, 'the tile says whether it is a combo or a gift box');
  assert.ok(tile.itemCount >= 1, 'the tile states how many items are inside');
});

check('a normalizer repairs junk instead of storing it', () => {
  const repaired = records.normalizeProductRecord({
    name: '  Rocket Shower  ',
    category: categories[0].name,
    sellingPrice: '250',
    mrp: '300',
    stock: 'not a number',
    status: 'nonsense',
  });
  assert.equal(repaired.name, 'Rocket Shower', 'the name is trimmed');
  assert.equal(repaired.sellingPrice, 250, 'a numeric string becomes a number');
  assert.equal(repaired.stock, null, 'an unreadable stock count becomes untracked, not zero');
  assert.equal(repaired.status, 'active', 'an unknown status falls back to active');
});

check('a category normalizer keeps its order and always has a name', () => {
  const category = records.normalizeCategoryRecord({ name: 'Test Category', order: 3, active: 'yes' });
  assert.equal(category.name, 'Test Category');
  assert.equal(category.order, 3);
  assert.equal(category.active, true);
  assert.ok(category.id, 'an id is generated when one is missing');
  assert.equal(records.normalizeCategoryRecord({ name: '   ' }), null, 'a blank name is rejected');
});

check('a price of zero is not silently replaced by the MRP', () => {
  const free = records.normalizeProductRecord({ name: 'Free Sample', category: categories[0].name, sellingPrice: 0, mrp: 0 });
  assert.equal(free.sellingPrice, 0);
  assert.equal(free.mrp, 0);
});

check('a published social handle becomes a real link on its own platform', () => {
  assert.equal(siteContent.normalizeSocialUrl('instagram', '@anishenterprises'), 'https://www.instagram.com/anishenterprises');
  assert.equal(siteContent.normalizeSocialUrl('facebook', 'https://facebook.com/anish.ent'), 'https://facebook.com/anish.ent');
  assert.equal(siteContent.normalizeSocialUrl('youtube', 'instagram.com/shop'), 'https://instagram.com/shop', 'a bare domain regains its scheme');
  // Without the @ and with no dot, the value can only be a handle. Completing it as a
  // domain would give a dead https://anishenterprises link.
  assert.equal(siteContent.normalizeSocialUrl('youtube', 'anishenterprises'), 'https://www.youtube.com/@anishenterprises');
  assert.equal(siteContent.normalizeSocialUrl('instagram', 'anishenterprises'), 'https://www.instagram.com/anishenterprises');
  // A dot is deliberately read as a domain, not a handle: Instagram permits dots in a
  // username, so "anish.enterprises" is genuinely ambiguous and a pasted domain must not
  // be rewritten into a profile path. The admin field hint asks for @handle or a full link.
  assert.equal(siteContent.normalizeSocialUrl('instagram', 'anish.enterprises'), 'https://anish.enterprises');
  assert.equal(siteContent.normalizeSocialUrl('whatsapp', '9442521144'), 'https://wa.me/9442521144', 'a bare number becomes a wa.me link, digits kept exactly as typed');
  assert.equal(siteContent.normalizeSocialUrl('whatsapp', '+91 94425 21144'), 'https://wa.me/919442521144', 'a formatted number has its spacing stripped');
});

check('a social value with an unsafe scheme never becomes a link', () => {
  // Left as-is it would render as https://javascript:alert(1), which still looks like a
  // working social link in the admin panel and the footer.
  assert.equal(siteContent.normalizeSocialUrl('instagram', 'javascript:alert(1)'), '');
  assert.equal(siteContent.normalizeSocialUrl('facebook', 'data:text/html,<script>'), '');
  assert.equal(siteContent.normalizeSocialUrl('youtube', 'vbscript:msgbox'), '');
  // ...and the icon falls back to the platform rather than disappearing.
  assert.equal(siteContent.socialLinkFor('instagram', 'javascript:alert(1)'), siteContent.socialPlatformHomeUrls.instagram);
});

check('a social icon always resolves to a link even with no handle published', () => {
  for (const key of ['instagram', 'facebook', 'youtube']) {
    const href = siteContent.socialLinkFor(key, '');
    assert.ok(href.startsWith('https://'), `${key} opens a real https page, got "${href}"`);
    assert.equal(siteContent.socialLinkFor(key, '@handle'), siteContent.normalizeSocialUrl(key, '@handle'), `${key} prefers the published handle`);
  }
});

check('the footer social icons use the exact published links', () => {
  const expected = {
    facebook: 'https://www.facebook.com/share/1AjwdKkQQx/',
    instagram: 'https://www.instagram.com/anishenterprisescrackers?stkn=MXV6c29xMnoza3NiYw==',
    youtube: 'https://youtube.com/@anishenterprisescrackers?si=tBZtvWu7Bwgg_ZyV',
  };
  const { social } = siteContent.siteContentDefaults;
  for (const [key, url] of Object.entries(expected)) {
    assert.equal(social[key], url, `${key} is stored exactly as published`);
    // A full link is used as written, so the tracking tokens survive intact.
    assert.equal(siteContent.socialLinkFor(key, social[key]), url, `${key} opens the published link`);
  }
});

check('the WhatsApp chat number and the website contact number are kept apart', () => {
  const { contact, social } = siteContent.siteContentDefaults;
  // Two different numbers on purpose. Swapping them would send customers to the wrong line.
  assert.equal(siteContent.socialLinkFor('whatsapp', social.whatsapp), 'https://wa.me/919442521144');
  assert.equal(contact.phone, '9488821144');
  assert.notEqual(contact.phone, '9442521144');
});

check('both published phone numbers are listed, the new one first', () => {
  const { contactPhoneLines } = siteContent;
  const lines = contactPhoneLines(siteContent.siteContentDefaults.contact);
  assert.equal(lines.length, 2, 'neither number is dropped');
  assert.equal(lines[0].value, '9442521144', 'the new number is listed above the existing one');
  assert.equal(lines[1].value, '9488821144', 'the existing number is still published');
  // A blank or duplicated value must not print as an empty or repeated row.
  assert.deepEqual(
    contactPhoneLines({ phoneAlt: '9442521144', phone: '9442521144' }).map((line) => line.value),
    ['9442521144'],
    'the same number in both fields is only listed once',
  );
  assert.deepEqual(contactPhoneLines({ phoneAlt: '', phone: '9488821144' }).map((line) => line.value), ['9488821144']);
  assert.deepEqual(contactPhoneLines({}), []);
  assert.ok(siteContent.hasContactDetail({ phoneAlt: '9442521144' }), 'a copy with only the new number still counts as having contact details');
});

check('a copy saved before the second number existed picks it up', () => {
  const merged = siteContent.mergeSiteContent({ detailsVersion: 3, contact: { phone: '9488821144', city: 'Sivakasi' } });
  assert.equal(merged.contact.phoneAlt, '9442521144', 'the newer number is re-seeded into an older copy');
  assert.equal(merged.contact.city, 'Sivakasi', 'an unrelated saved field is left alone');
  // An edit made after the bump survives the next read.
  const kept = siteContent.mergeSiteContent({ detailsVersion: siteContent.siteContentVersion, contact: { phoneAlt: '9000000000' } });
  assert.equal(kept.contact.phoneAlt, '9000000000', 'a later admin edit is not overwritten');
});

check('a gift box card shows a readable title, not the raw sheet row', () => {
  for (const tile of comboTiles.filter((item) => item.kind === 'gift-box')) {
    assert.ok(!/\d+\s*items?\s*\(?\s*1\s*case/i.test(tile.name), `${tile.id} keeps the case count out of the title`);
    assert.ok(!/\(\s*1\s*case/i.test(tile.name), `${tile.id} has no leftover case bracket in the title`);
    assert.match(tile.packNote || '', /\d+\s*box/i, `${tile.id} keeps the case count as a pack note`);
    assert.ok(tile.sheetName, `${tile.id} still records the original sheet name`);
  }
});

check('a gift box re-seeded from an old copy is cleaned up without losing admin edits', () => {
  const seed = packs.seedPackRecords().find((pack) => pack.kind === 'gift-box');
  const stored = packs.normalizePackRecord({
    ...seed,
    name: '20 items MINI          (1case = 36 Box)',
    sheetName: '',
    packNote: '',
    identityVersion: 0,
    price: 999,
    stock: 7,
    image: '/images/combos/combos 1.jpeg',
    active: false,
  });
  assert.match(stored.name, /1case/i, 'the old raw sheet row is what was stored');

  const [refreshed] = packs.refreshStaleGiftBoxIdentity([stored]);
  assert.equal(refreshed.name, seed.name, 'the title is refreshed from the seed');
  assert.equal(refreshed.packNote, seed.packNote, 'the case count moves to the pack note');
  assert.equal(refreshed.sheetName, seed.sheetName, 'the sheet name is restored');
  assert.equal(refreshed.identityVersion, GIFT_BOX_IDENTITY_VERSION, 'the record is marked current');
  assert.equal(refreshed.price, 999, 'the shop price survives');
  assert.equal(refreshed.stock, 7, 'the shop stock survives');
  assert.equal(refreshed.image, '/images/combos/combos 1.jpeg', 'the chosen photo survives');
  assert.equal(refreshed.active, false, 'a pack the shop hid stays hidden');
});

check('a pack the shop created itself is never dropped or renamed', () => {
  const manual = packs.normalizePackRecord({
    id: 'admin-made-pack',
    name: 'Diwali Special Combo',
    kind: 'combo',
    price: 999,
    stock: 12,
    source: 'manual',
  });
  const seed = packs.seedPackRecords()[0];
  const stale = { ...seed, name: '20 items MINI          (1case = 36 Box)', identityVersion: 0 };
  const refreshed = packs.refreshStaleGiftBoxIdentity([stale, manual]);
  assert.equal(refreshed.length, 2, 'both packs come back');
  assert.equal(refreshed[1].id, 'admin-made-pack', 'the manual pack is still there');
  assert.equal(refreshed[1].name, 'Diwali Special Combo', 'its name is untouched');
  assert.equal(refreshed[1].stock, 12, 'its stock is untouched');
});

check('a pack already on the current version is left exactly as it is', () => {
  const seed = packs.seedPackRecords()[0];
  const current = packs.normalizePackRecord({ ...seed, name: 'Renamed by the shop' });
  const [untouched] = packs.refreshStaleGiftBoxIdentity([current]);
  assert.equal(untouched, current, 'nothing is rewritten once the record is current');
});

console.log(results.join('\n'));
const failed = results.filter((line) => line.startsWith('FAIL'));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
