/**
 * Runtime contract check. Verifies that every model field, method, constant and
 * service function the code depends on actually exists with the expected shape.
 * This catches wrong assumptions that a static import check cannot.
 */
import {
  Admin,
  Category,
  Product,
  Customer,
  Cart,
  Order,
  Settings,
  ImportLog,
  hashAccessToken,
} from '../src/models/index.js';
import * as constants from '../src/config/constants.js';
import * as pricing from '../src/services/pricing.service.js';
import * as settings from '../src/services/settings.service.js';
import * as excel from '../src/services/excel.service.js';
import * as pagination from '../src/utils/pagination.js';
import * as money from '../src/utils/money.js';
import * as sanitize from '../src/utils/sanitize.js';
import { ApiError } from '../src/utils/ApiError.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../src/utils/response.js';
import { connectDatabase, disconnectDatabase, mongoCapabilities } from '../src/config/db.js';

const failures = [];
let passed = 0;

/** Async aware: some contracts (mongoose hooks) only settle on the async path. */
const check = async (label, fn) => {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    failures.push(`${label}  ->  ${error.message}`);
  }
};

/** Accepts dotted paths so inline nested objects can be checked too. */
const requireFields = (model, fields) => {
  const missing = fields.filter((field) => !model.schema.path(field));
  if (missing.length) throw new Error(`missing fields: ${missing.join(', ')}`);
};

const requireFns = (module, names) => {
  const missing = names.filter((name) => typeof module[name] !== 'function');
  if (missing.length) throw new Error(`missing functions: ${missing.join(', ')}`);
};

const settingsFixture = (overrides = {}) => ({
  minimumOrderAmount: 0,
  delivery: { isDeliveryAvailable: true, deliveryFee: 50, freeDeliveryAbove: 500 },
  payments: { enabledMethods: [...constants.PAYMENT_METHODS], pricing: { includeTax: false, taxPercent: 0, roundToNearest: 0 } },
  ...overrides,
});

// ---------------------------------------------------------------- models
await check('Product fields', () => requireFields(Product, [
  'name', 'sku', 'code', 'category', 'categoryRef', 'packSize', 'packQuantity', 'packUnit',
  'sellingPrice', 'mrp', 'stock', 'status', 'isPublished', 'isFeatured', 'lowStockThreshold',
  'images', 'source', 'sourceSerial', 'importBatchId',
]));

await check('Product.priceFor() never silently falls back to mrp', () => {
  const doc = new Product({ name: 'x', sellingPrice: 10, mrp: 12 });
  if (doc.priceFor() !== 10) throw new Error(`priceFor() returned ${doc.priceFor()}, expected 10`);
  doc.sellingPrice = 0;
  if (doc.priceFor() !== 0) throw new Error('priceFor() must not fall back to mrp when sellingPrice is 0');
});

await check('Category fields', () => requireFields(Category, [
  'name', 'label', 'slug', 'tone', 'order', 'isActive', 'description', 'createdBy',
]));

await check('Customer fields', () => requireFields(Customer, [
  'name', 'phone', 'email', 'address', 'orderCount', 'totalSpent', 'lastOrderAt',
]));

await check('Cart fields + recalculate() exists', () => {
  requireFields(Cart, ['token', 'items', 'customer', 'lastActivityAt']);
  if (typeof new Cart({ token: 't' }).recalculate !== 'function') throw new Error('recalculate is not a method');
});

await check('Cart.recalculate() drops unavailable and reprices the rest', () => {
  const keepId = new Product({ name: 'Keep', sellingPrice: 25, mrp: 30, status: 'active', isPublished: true })._id;
  const goneId = new Product({ name: 'Gone', sellingPrice: 5, mrp: 5, status: 'inactive', isPublished: true })._id;
  const cart = new Cart({
    token: 't',
    items: [
      { product: keepId, quantity: 2, nameSnapshot: 'stale' },
      { product: goneId, quantity: 1, nameSnapshot: 'Gone' },
    ],
  });
  // recalculate reads priceFor(), so it needs real product documents.
  const keep = new Product({ name: 'Keep', sellingPrice: 25, mrp: 30, status: 'active', isPublished: true });
  const gone = new Product({ name: 'Gone', sellingPrice: 5, mrp: 5, stock: 5, status: 'inactive', isPublished: true });
  const products = new Map([
    [String(keepId), keep],
    [String(goneId), gone],
  ]);
  const outcome = cart.recalculate(products);
  if (cart.items.length !== 1) throw new Error(`expected 1 surviving item, got ${cart.items.length}`);
  if (cart.items[0].quantity !== 2) throw new Error('quantity was not preserved');
  if (outcome.itemCount !== 2) throw new Error(`itemCount should be 2, got ${outcome.itemCount}`);
  if (outcome.unavailable.length !== 1) throw new Error(`unavailable should report 1 item, got ${outcome.unavailable.length}`);
  if (outcome.itemsTotal !== 50) throw new Error(`itemsTotal should be 50, got ${outcome.itemsTotal}`);
  if (outcome.totalSavings !== 10) throw new Error(`totalSavings should be 10, got ${outcome.totalSavings}`);
});

await check('Cart.recalculate() clamps to available stock and flags it', () => {
  const id = new Product({ name: 'Low', sellingPrice: 10, mrp: 10, status: 'active', isPublished: true })._id;
  const cart = new Cart({ token: 't', items: [{ product: id, quantity: 9, nameSnapshot: 'Low' }] });
  const products = new Map([
    [String(id), new Product({ name: 'Low', sellingPrice: 10, mrp: 10, stock: 4, status: 'active', isPublished: true })],
  ]);
  const outcome = cart.recalculate(products);
  if (cart.items[0].quantity !== 4) throw new Error(`quantity should clamp to 4, got ${cart.items[0].quantity}`);
  if (outcome.unavailable[0]?.reason !== 'insufficient-stock') throw new Error(`expected insufficient-stock, got ${outcome.unavailable[0]?.reason}`);
});

await check('Order fields', () => requireFields(Order, [
  'reference', 'customer', 'customerSnapshot.name', 'customerSnapshot.phone', 'deliveryAddress',
  'items', 'itemsTotal', 'mrpTotal', 'deliveryFee', 'discount', 'total', 'totalSavings',
  'paymentMethod', 'paymentStatus', 'paidAmount', 'paymentReference', 'paymentVerifiedAt',
  'status', 'statusUpdatedAt', 'notes', 'internalNotes', 'invoiceNumber', 'accessTokenHash', 'history',
]));

await check('Order item + history subfields', () => {
  const itemMissing = ['product', 'name', 'sku', 'packSize', 'quantity', 'unitPrice', 'lineTotal', 'stockCommitted']
    .filter((f) => !Order.schema.path('items').schema?.path(f));
  if (itemMissing.length) throw new Error(`missing item subfields: ${itemMissing.join(', ')}`);
  const historyMissing = ['at', 'by', 'actorName', 'field', 'from', 'to', 'note']
    .filter((f) => !Order.schema.path('history').schema?.path(f));
  if (historyMissing.length) throw new Error(`missing history subfields: ${historyMissing.join(', ')}`);
});

await check('Order.publicView() hides internal fields', () => {
  const order = new Order({
    reference: 'AE-2026-000001',
    customerSnapshot: { name: 'A', phone: '1' },
    deliveryAddress: {},
    items: [{ name: 'p', quantity: 1, unitPrice: 10, lineTotal: 10 }],
    itemsTotal: 10, mrpTotal: 12, deliveryFee: 0, total: 10,
    accessTokenHash: 'secret-hash', internalNotes: 'internal',
  });
  const view = order.publicView();
  if ('accessTokenHash' in view) throw new Error('publicView leaked accessTokenHash');
  if ('internalNotes' in view) throw new Error('publicView leaked internalNotes');
});

await check('Order model does not re-derive total (pricing.service owns money)', async () => {
  // A quoted total that includes tax/rounding must survive validation intact.
  const order = new Order({
    reference: 'AE-2026-000002',
    customerSnapshot: { name: 'A', phone: '1' },
    deliveryAddress: {},
    items: [{ product: new Product({ name: 'p' })._id, name: 'p', quantity: 1, unitPrice: 100, lineTotal: 100 }],
    itemsTotal: 100, mrpTotal: 120, deliveryFee: 0, discount: 0,
    total: 118, // e.g. 100 + 18% tax
    accessTokenHash: 'hash',
  });
  // Must be the async path: the pre-validate hook is callback style, and
  // validateSync() does not wait for it.
  await order.validate();
  if (order.total !== 118) throw new Error(`total was rewritten to ${order.total}; the model must not re-derive it`);
  if (order.totalSavings !== 20) throw new Error(`totalSavings should be 20, got ${order.totalSavings}`);
});

await check('hashAccessToken deterministic, hidden by default', () => {
  if (hashAccessToken('abc') !== hashAccessToken('abc')) throw new Error('not deterministic');
  if (hashAccessToken('abc') === hashAccessToken('abd')) throw new Error('collides on different input');
  if (Order.schema.path('accessTokenHash').options.select !== false) throw new Error('accessTokenHash should be select:false');
});

await check('Admin fields', () => requireFields(Admin, [
  'name', 'email', 'passwordHash', 'role', 'isActive', 'lastLoginAt', 'lastLoginIp',
  'failedLoginCount', 'lockedUntil', 'tokenVersion', 'sessionRevocations',
]));

await check('Admin secrets stripped from JSON', () => {
  if (Admin.schema.path('passwordHash').options.select !== false) throw new Error('passwordHash should be select:false');
  const json = new Admin({ name: 'A', email: 'a@b.c', passwordHash: 'x' }).toJSON();
  for (const key of ['passwordHash', 'tokenVersion', 'sessionRevocations', 'failedLoginCount', 'lockedUntil']) {
    if (key in json) throw new Error(`toJSON leaked ${key}`);
  }
  if (!Array.isArray(json.permissions)) throw new Error('toJSON should expose permissions');
});

await check('Admin locks only on the 5th failure', () => {
  const admin = new Admin({ name: 'A', email: 'a@b.c' });
  for (let i = 0; i < 4; i += 1) {
    admin.registerFailedLogin();
    if (admin.isLocked()) throw new Error(`locked too early at attempt ${i + 1}`);
  }
  admin.registerFailedLogin();
  if (!admin.isLocked()) throw new Error('should lock on the 5th failure');
  admin.lockedUntil = null;
  admin.registerFailedLogin();
  if (admin.failedLoginCount !== 1) throw new Error('counter should reset after locking');
});

await check('Settings fields', () => requireFields(Settings, [
  'shopName', 'logo', 'contact.supportPhone', 'contact.supportEmail',
  'social.whatsapp', 'social.instagram',
  'delivery.isDeliveryAvailable', 'delivery.deliveryFee', 'delivery.freeDeliveryAbove',
  'payments.enabledMethods', 'payments.pricing.taxPercent', 'minimumOrderAmount',
  'allowEnquiryOnly', 'announcement.enabled', 'announcement.text', 'lowStockThreshold',
  'importPriceMapping.confirmed', 'importPriceMapping.sellingPriceColumn',
  'importPriceMapping.confirmedBy', 'importPriceMapping.confirmedAt',
]));

await check('Settings never pre-confirms the import price column', () => {
  const doc = new Settings({});
  if (doc.importPriceMapping?.confirmed !== false) throw new Error('importPriceMapping.confirmed must default to false');
  if (doc.importPriceMapping?.sellingPriceColumn != null) throw new Error('sellingPriceColumn must not be guessed');
});

await check('ImportLog fields', () => requireFields(ImportLog, [
  'fileName', 'fileHash', 'sheetName', 'status', 'mode',
  'priceMapping.confirmed', 'priceMapping.sellingPriceColumn',
  'detectedColumns', 'detectedCategories', 'summary.created', 'summary.failed', 'rows', 'performedBy', 'durationMs',
]));

await check('ImportLog blocks a second commit of the same workbook', () => {
  const indexes = ImportLog.schema.indexes();
  const unique = indexes.some(
    ([keys, options]) =>
      keys.fileHash === 1 &&
      options.unique === true &&
      JSON.stringify(options.partialFilterExpression) === JSON.stringify({ status: 'committed' }),
  );
  if (!unique) throw new Error(`no unique partial index on fileHash+committed: ${JSON.stringify(indexes)}`);
});

// ---------------------------------------------------------------- constants
await check('constants present', () => requireConsts());
function requireConsts() {
  const names = [
    'ADMIN_ROLE', 'ADMIN_ROLES', 'PERMISSION', 'ROLE_PERMISSIONS', 'roleHasPermission',
    'ORDER_STATUS', 'ORDER_STATUSES', 'ORDER_STATUS_TRANSITIONS', 'OPEN_ORDER_STATUSES', 'CLOSED_ORDER_STATUSES',
    'PAYMENT_METHOD', 'PAYMENT_METHODS', 'PAYMENT_STATUS', 'PAYMENT_STATUSES', 'SETTLED_PAYMENT_STATUSES',
    'PRODUCT_STATUS', 'PRODUCT_STATUSES', 'PRODUCT_SOURCES', 'MAX_CART_QUANTITY',
    'SORTABLE_PRODUCT_FIELDS', 'SORTABLE_ORDER_FIELDS', 'CATEGORY_TONES',
  ];
  const missing = names.filter((name) => constants[name] === undefined);
  if (missing.length) throw new Error(`missing constants: ${missing.join(', ')}`);
}

await check('every order status has a transition entry', () => {
  const missing = constants.ORDER_STATUSES.filter((status) => !constants.ORDER_STATUS_TRANSITIONS[status]);
  if (missing.length) throw new Error(`no transitions defined for: ${missing.join(', ')}`);
});

await check('transitions never move backwards except by reopening a cancel', () => {
  const rank = (status) => constants.ORDER_STATUSES.indexOf(status);
  for (const [from, allowed] of Object.entries(constants.ORDER_STATUS_TRANSITIONS)) {
    for (const to of allowed) {
      // Cancelling is always allowed, and reopening a cancelled order is a
      // deliberate, stock-re-reserving move, so both are exempt.
      if (to === constants.ORDER_STATUS.CANCELLED) continue;
      if (from === constants.ORDER_STATUS.CANCELLED) continue;
      if (rank(to) < rank(from)) throw new Error(`${from} -> ${to} moves backwards`);
    }
  }
  // A cancelled order must never be able to jump straight to a closed state.
  const cancelled = constants.ORDER_STATUS_TRANSITIONS[constants.ORDER_STATUS.CANCELLED] || [];
  for (const to of cancelled) {
    if (constants.CLOSED_ORDER_STATUSES.includes(to) && to !== constants.ORDER_STATUS.CANCELLED) {
      throw new Error(`reopening must not land on a closed status: ${to}`);
    }
  }
});

await check('roleHasPermission is restrictive', () => {
  if (!constants.roleHasPermission('owner', 'products:write')) throw new Error('owner should write products');
  if (constants.roleHasPermission('staff', 'products:write')) throw new Error('staff must not write products');
  if (constants.roleHasPermission('nobody', 'orders:read')) throw new Error('unknown role must have no permissions');
});

await check('MAX_CART_QUANTITY is sane', () => {
  if (!(constants.MAX_CART_QUANTITY > 0 && constants.MAX_CART_QUANTITY <= 1000)) {
    throw new Error(`implausible MAX_CART_QUANTITY: ${constants.MAX_CART_QUANTITY}`);
  }
});

// ---------------------------------------------------------------- pricing
await check('calculateTotals() returns a complete shape', () => {
  const out = pricing.calculateTotals({ items: [{ quantity: 2, unitPrice: 100, mrp: 120 }], settings: settingsFixture() });
  for (const key of ['itemsTotal', 'mrpTotal', 'deliveryFee', 'discount', 'grandTotal', 'totalSavings']) {
    if (typeof out[key] !== 'number' || Number.isNaN(out[key])) throw new Error(`missing/NaN "${key}"`);
  }
  if (out.itemsTotal !== 200) throw new Error(`itemsTotal should be 200, got ${out.itemsTotal}`);
  if (out.totalSavings !== 40) throw new Error(`totalSavings should be 40, got ${out.totalSavings}`);
  if (out.deliveryFee !== 50) throw new Error(`deliveryFee should be 50 below the threshold, got ${out.deliveryFee}`);
  if (out.grandTotal !== 250) throw new Error(`grandTotal should be 250, got ${out.grandTotal}`);
});

await check('FREE DELIVERY keeps grandTotal consistent with deliveryFee', () => {
  const settingsDoc = settingsFixture({ delivery: { isDeliveryAvailable: true, deliveryFee: 50, freeDeliveryAbove: 500 } });
  const below = pricing.calculateTotals({ items: [{ quantity: 1, unitPrice: 400, mrp: 400 }], settings: settingsDoc });
  if (below.deliveryFee !== 50) throw new Error(`below threshold deliveryFee should be 50, got ${below.deliveryFee}`);
  if (below.grandTotal !== below.itemsTotal + below.deliveryFee) {
    throw new Error(`below threshold: grandTotal ${below.grandTotal} != itemsTotal+delivery`);
  }

  const above = pricing.calculateTotals({ items: [{ quantity: 1, unitPrice: 600, mrp: 600 }], settings: settingsDoc });
  if (above.deliveryFee !== 0) throw new Error(`above threshold deliveryFee should be 0, got ${above.deliveryFee}`);
  if (above.grandTotal !== above.itemsTotal) {
    throw new Error(`grandTotal is stale above the threshold: ${above.grandTotal} but itemsTotal=${above.itemsTotal}, deliveryFee=${above.deliveryFee}`);
  }
  if (above.grandTotal !== 600) throw new Error(`grandTotal should be 600, got ${above.grandTotal}`);
});

await check('discount is clamped to the goods value', () => {
  const out = pricing.calculateTotals({ items: [{ quantity: 1, unitPrice: 100, mrp: 100 }], settings: settingsFixture(), discount: 5000 });
  if (out.discount !== 100) throw new Error(`discount should clamp to 100, got ${out.discount}`);
  if (out.grandTotal < 0) throw new Error('grandTotal went negative');
});

await check('tax and rounding are applied when configured', () => {
  const settingsDoc = settingsFixture({
    delivery: { isDeliveryAvailable: true, deliveryFee: 0, freeDeliveryAbove: 0 },
    payments: { enabledMethods: [...constants.PAYMENT_METHODS], pricing: { includeTax: true, taxPercent: 18, roundToNearest: 0 } },
  });
  const out = pricing.calculateTotals({ items: [{ quantity: 1, unitPrice: 100, mrp: 100 }], settings: settingsDoc });
  if (out.grandTotal !== 118) throw new Error(`expected 118 with 18% tax, got ${out.grandTotal}`);
  if (out.taxPercent !== 18) throw new Error(`taxPercent should be 18, got ${out.taxPercent}`);
});

await check('minimum order guard', () => {
  const settingsDoc = settingsFixture({ minimumOrderAmount: 500 });
  let status = null;
  try {
    pricing.assertMinimumOrder(100, settingsDoc);
  } catch (error) {
    status = error.status;
  }
  if (status !== 422) throw new Error(`should reject with 422, got ${status}`);
  pricing.assertMinimumOrder(500, settingsDoc);
});

await check('delivery-unavailable guard', () => {
  const settingsDoc = settingsFixture({ delivery: { isDeliveryAvailable: false, deliveryFee: 0, freeDeliveryAbove: 0 } });
  let status = null;
  try {
    pricing.assertDeliveryAvailable(settingsDoc);
  } catch (error) {
    status = error.status;
  }
  if (status !== 422) throw new Error(`should reject with 422, got ${status}`);
  pricing.assertDeliveryAvailable(settingsFixture());
});

await check('disabled payment method is rejected', () => {
  const settingsDoc = settingsFixture({ payments: { enabledMethods: [], pricing: {} } });
  settingsDoc.payments.enabledMethods = [constants.PAYMENT_METHOD.COD];
  let status = null;
  try {
    pricing.assertPaymentMethodEnabled(constants.PAYMENT_METHOD.UPI, settingsDoc);
  } catch (error) {
    status = error.status;
  }
  if (status !== 422) throw new Error(`should reject a disabled method with 422, got ${status}`);
  pricing.assertPaymentMethodEnabled(constants.PAYMENT_METHOD.COD, settingsDoc);
});

// ---------------------------------------------------------------- settings service
await check('settings service exports', () => requireFns(settings, [
  'getSettings', 'updateSettings', 'publicSettingsView', 'adminSettingsView',
  'isPriceMappingConfirmed', 'confirmImportPriceMapping', 'importPriceMapping',
]));

await check('isPriceMappingConfirmed needs both the flag and a column', () => {
  if (settings.isPriceMappingConfirmed({ importPriceMapping: { confirmed: true, sellingPriceColumn: null } })) {
    throw new Error('a confirmed flag with no column must not count as confirmed');
  }
  if (!settings.isPriceMappingConfirmed({ importPriceMapping: { confirmed: true, sellingPriceColumn: 'RATE' } })) {
    throw new Error('a confirmed mapping with a column should be confirmed');
  }
  if (settings.isPriceMappingConfirmed({})) throw new Error('missing mapping must not be confirmed');
});

// ---------------------------------------------------------------- excel
await check('excel service exports', () => requireFns(excel, [
  'readWorkbook', 'analyseWorkbook', 'categoryLabel', 'categoryTone', 'parsePack', 'hashBuffer',
]));

await check('categoryLabel/categoryTone are total over CATEGORY_TONES', () => {
  for (const name of ['Birthday Candles', 'cake candles', 'Rocket / Fireworks']) {
    if (!excel.categoryLabel(name)) throw new Error(`no label for "${name}"`);
  }
  for (let i = 0; i < constants.CATEGORY_TONES.length + 3; i += 1) {
    if (!constants.CATEGORY_TONES.includes(excel.categoryTone(i))) throw new Error(`categoryTone(${i}) returned a tone outside CATEGORY_TONES`);
  }
});

await check('hashBuffer is stable and collision free', () => {
  if (excel.hashBuffer(Buffer.from('hello')) !== excel.hashBuffer(Buffer.from('hello'))) throw new Error('not stable');
  if (excel.hashBuffer(Buffer.from('hello')) === excel.hashBuffer(Buffer.from('hellp'))) throw new Error('collides');
});

// ---------------------------------------------------------------- utils
await check('pagination bounds and sort allowlist', () => {
  requireFns(pagination, ['getPagination', 'getSort', 'buildPageMeta']);
  const p = pagination.getPagination({ page: '2', pageSize: '10' });
  if (p.page !== 2 || p.pageSize !== 10 || p.skip !== 10) throw new Error(`bad pagination ${JSON.stringify(p)}`);
  if (pagination.getPagination({ pageSize: '100000' }).pageSize > pagination.MAX_PAGE_SIZE) throw new Error('pageSize not capped');
  if (pagination.getPagination({ page: '-5' }).page < 1) throw new Error('negative page not clamped');

  const allowed = pagination.getSort({ sort: '-sellingPrice' }, constants.SORTABLE_PRODUCT_FIELDS, 'createdAt');
  if (allowed.sellingPrice !== -1) throw new Error(`descending sort wrong: ${JSON.stringify(allowed)}`);

  // Injection attempts must be rejected with a 400, never forwarded to Mongo.
  for (const attempt of ['-createdAt; dropDatabase()', '__proto__', 'passwordHash', { $ne: 1 }]) {
    let status = null;
    try {
      pagination.getSort({ sort: attempt }, constants.SORTABLE_PRODUCT_FIELDS, 'createdAt');
    } catch (error) {
      status = error.status;
    }
    if (status !== 400) throw new Error(`sort "${String(attempt)}" should be rejected with 400, got ${status}`);
  }
});

await check('buildPageMeta reports navigation correctly', () => {
  const meta = pagination.buildPageMeta({ page: 2, pageSize: 10 }, 35);
  if (meta.totalPages !== 4) throw new Error(`totalPages should be 4, got ${meta.totalPages}`);
  if (meta.hasNext !== true || meta.hasPrevious !== true) throw new Error('navigation flags wrong on page 2 of 4');
  const last = pagination.buildPageMeta({ page: 4, pageSize: 10 }, 35);
  if (last.hasNext !== false) throw new Error('hasNext should be false on the last page');
});

await check('money.roundMoney rounds to paise', () => {
  if (money.roundMoney(10.005) !== 10.01) throw new Error(`roundMoney(10.005) = ${money.roundMoney(10.005)}`);
  if (money.roundMoney(0.1 + 0.2) !== 0.3) throw new Error('float addition not rounded');
  if (money.roundMoney(2.675) !== 2.68) throw new Error(`classic float case failed: ${money.roundMoney(2.675)}`);
});

await check('sanitize.safePattern escapes metacharacters', () => {
  const pattern = new RegExp(sanitize.safePattern('a.*b'), 'i');
  if (!pattern.test('a.*b')) throw new Error('should match a literal asterisk');
  if (pattern.test('axxxb')) throw new Error('regex metacharacters were not escaped');
});

await check('ApiError statics expose the right statuses', () => {
  const expectations = [
    [ApiError.badRequest, 400], [ApiError.unauthorized, 401], [ApiError.forbidden, 403],
    [ApiError.notFound, 404], [ApiError.conflict, 409], [ApiError.unprocessable, 422], [ApiError.tooMany, 429],
  ];
  for (const [fn, status] of expectations) {
    const error = fn('x');
    if (error.status !== status) throw new Error(`${fn.name} -> status ${error.status}, expected ${status}`);
    if (error.expected !== true) throw new Error(`${fn.name} should be marked expected`);
  }
});

await check('response helpers exist', () => {
  for (const [name, fn] of Object.entries({ sendSuccess, sendCreated, sendNoContent, sendPaginated })) {
    if (typeof fn !== 'function') throw new Error(`missing ${name}`);
  }
});

// ---------------------------------------------------------------- database
let caps = null;
try {
  await connectDatabase();
  caps = mongoCapabilities();
  if (typeof caps?.supportsTransactions !== 'boolean') {
    throw new Error(`supportsTransactions should be a boolean, got ${typeof caps?.supportsTransactions}`);
  }
  passed += 1;
} catch (error) {
  failures.push(`mongoCapabilities() -> ${error.message}`);
} finally {
  await disconnectDatabase();
}

// ---------------------------------------------------------------- report
console.log(`\n${passed} contract checks passed`);
if (failures.length) {
  console.log(`\n${failures.length} FAILED:`);
  for (const failure of failures) console.log(`  x ${failure}`);
  process.exit(1);
}
console.log(`all model, constant and service contracts hold (transactions ${caps.supportsTransactions ? 'available' : 'unavailable -> guarded atomic fallback'})`);
