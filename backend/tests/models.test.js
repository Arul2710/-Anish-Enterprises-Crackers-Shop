/**
 * Schema-level tests for the database layer.
 *
 * These assert the things a schema is supposed to guarantee before any query
 * runs: required fields, enums, price and stock rules, the indexes that back
 * the catalogue and order lookups, and the query-time helpers. They never open
 * a Mongo connection, so `npm test` stays fast and works on a fresh clone.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// Set before the models are loaded: config/env.js validates on import and a
// missing .env must not be the reason a schema test fails.
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/anish_enterprises_test';
process.env.JWT_SECRET ||= 'test_only_secret_that_is_definitely_long_enough_32';
process.env.SEED_ADMIN_PASSWORD ||= 'TestOnlyPassword123';

const { Admin } = await import('../src/models/Admin.js');
const { Product } = await import('../src/models/Product.js');
const { Category } = await import('../src/models/Category.js');
const { Customer } = await import('../src/models/Customer.js');
const { Cart } = await import('../src/models/Cart.js');
const { Order, hashAccessToken } = await import('../src/models/Order.js');
const { Settings } = await import('../src/models/Settings.js');
const { ImportLog } = await import('../src/models/ImportLog.js');
const { isValidPrice, isValidQuantity } = await import('../src/utils/money.js');

const indexKeys = (Model) => Model.schema.indexes().map(([fields, options]) => ({ fields, ...options }));
const hasIndex = (Model, matcher) =>
  indexKeys(Model).some((index) => Object.entries(matcher).every(([key, value]) => index.fields[key] === value));

const validProduct = (overrides = {}) => ({
  name: 'GOLDEN RAIN 25 SHOT',
  category: 'FANCY COLOR FOUNTAIN',
  sellingPrice: 240,
  mrp: 300,
  ...overrides,
});

const validOrder = (overrides = {}) => ({
  reference: 'AE-20260927-4F2A',
  customerSnapshot: { name: 'Asha', phone: '9442521144' },
  items: [
    {
      product: new Product(validProduct())._id,
      name: 'GOLDEN RAIN 25 SHOT',
      quantity: 2,
      unitPrice: 240,
      lineTotal: 480,
    },
  ],
  itemsTotal: 480,
  total: 480,
  accessTokenHash: hashAccessToken('a-token'),
  ...overrides,
});

test('every collection is registered and uses timestamps', () => {
  for (const Model of [Admin, Product, Category, Customer, Cart, Order, Settings, ImportLog]) {
    assert.equal(typeof Model.create, 'function', `${Model.modelName} is not a model`);
    assert.ok(Model.schema.path('createdAt'), `${Model.modelName} is missing createdAt`);
    assert.ok(Model.schema.path('updatedAt'), `${Model.modelName} is missing updatedAt`);
  }
});

test('Product: name and category are required, and a valid product passes', async () => {
  await assert.rejects(() => new Product({}).validate(), /required/);
  await assert.rejects(() => new Product({ category: 'Y', sellingPrice: 10, mrp: 20 }).validate(), /required/);
  await assert.doesNotReject(() => new Product(validProduct()).validate());
});

test('Product: a negative selling price is rejected outright', async () => {
  await assert.rejects(() => new Product(validProduct({ sellingPrice: -1 })).validate(), /less than minimum/);
});

test('Product: a nonsensical MRP is repaired rather than rejected', async () => {
  // The pre-validate hook raises a low MRP to the selling price, because an MRP
  // below the selling price would render as negative savings.
  const low = new Product(validProduct({ sellingPrice: 10, mrp: -5 }));
  await low.validate();
  assert.equal(low.mrp, 10);

  const high = new Product(validProduct({ sellingPrice: 10, mrp: 999 }));
  await high.validate();
  assert.equal(high.mrp, 999, 'a genuine MRP above the selling price is kept');
});

test('Product: an omitted price normalises to 0, so the API layer is the real guard', async () => {
  // Worth pinning deliberately: roundMoney() maps a non-number to 0, which means
  // `required` on the price paths never fires. isValidPrice() in utils/money.js
  // and the zod schemas in src/validators are what actually reject a bad price.
  const priceless = new Product({ name: 'X', category: 'Y' });
  await assert.doesNotReject(() => priceless.validate());
  assert.equal(priceless.sellingPrice, 0);
  assert.equal(priceless.mrp, 0);

  assert.equal(isValidPrice(0), true);
  assert.equal(isValidPrice(-1), false);
  assert.equal(isValidPrice('abc'), false);
  assert.equal(isValidPrice(undefined), false);
});

test('Product: MRP is raised to the selling price so savings are never negative', async () => {
  const product = new Product(validProduct({ sellingPrice: 300, mrp: 100 }));
  await product.validate();
  assert.equal(product.mrp, 300);
  assert.equal(product.savings, 0);
});

test('Product: negative stock clamps to zero and blank means untracked', async () => {
  const negative = new Product(validProduct({ stock: -3 }));
  await negative.validate();
  assert.equal(negative.stock, 0, 'a negative count is repaired to zero, not stored');

  const blank = new Product(validProduct({ stock: '' }));
  await blank.validate();
  assert.equal(blank.stock, null, 'a blank stock count must mean "not tracked", not 0');

  const zero = new Product(validProduct({ stock: 0 }));
  await zero.validate();
  assert.equal(zero.stock, 0, 'a real zero count must survive');
});

test('Product: blank code and sku normalise to null so partial unique indexes do not collide', async () => {
  const product = new Product(validProduct({ code: '', sku: '' }));
  await product.validate();
  assert.equal(product.code, null);
  assert.equal(product.sku, null);
});

test('Product: isAvailable respects publish state and stock', () => {
  const active = new Product(validProduct({ stock: 5 }));
  assert.equal(active.isAvailable(1), true);
  assert.equal(active.isAvailable(9), false);

  const untracked = new Product(validProduct({ stock: null }));
  assert.equal(untracked.isAvailable(999), true, 'untracked stock must not hide a product');

  const unpublished = new Product(validProduct({ stock: 5, isPublished: false }));
  assert.equal(unpublished.isAvailable(1), false);
});

test('Product: SKU, code and source serial are uniquely indexed', () => {
  for (const field of ['sku', 'code', 'sourceSerial']) {
    const index = indexKeys(Product).find((entry) => entry.fields[field] === 1);
    assert.ok(index, `products is missing an index on ${field}`);
    assert.equal(index.unique, true, `${field} index must be unique`);
    assert.ok(index.partialFilterExpression, `${field} index must be partial so many blanks are allowed`);
  }
});

test('Product: catalogue lookup indexes exist', () => {
  assert.ok(hasIndex(Product, { name: 1 }), 'missing name index');
  assert.ok(hasIndex(Product, { category: 1 }), 'missing category index');
  assert.ok(hasIndex(Product, { categoryRef: 1 }), 'missing category reference index');
  assert.ok(hasIndex(Product, { status: 1, isPublished: 1, category: 1 }), 'missing storefront filter index');
  assert.ok(
    indexKeys(Product).some((index) => index.fields.name === 'text' || index.fields.searchText === 'text'),
    'missing full text search index',
  );
});

test('Category: slug is derived from the name and both are unique', async () => {
  const category = new Category({ name: 'Flower Pot' });
  await category.validate();
  assert.equal(category.slug, 'flower-pot');

  for (const field of ['name', 'slug']) {
    const index = indexKeys(Category).find((entry) => entry.fields[field] === 1);
    assert.ok(index && index.unique, `categories.${field} must be uniquely indexed`);
  }
});

test('Customer: phone is the natural key and email stays optional', async () => {
  await assert.rejects(() => new Customer({ name: 'Asha' }).validate(), /required/);

  const customer = new Customer({ name: '  Asha  ', phone: '94425 2114 4' });
  await customer.validate();
  assert.equal(customer.name, 'Asha');
  assert.ok(customer.phone.replace(/\D/g, '').endsWith('9442521144'), `phone was not cleaned: ${customer.phone}`);

  const index = indexKeys(Customer).find((entry) => entry.fields.phone === 1);
  assert.ok(index && index.unique, 'customers.phone must be unique');
  assert.ok(hasIndex(Customer, { email: 1 }), 'missing customer email lookup index');
});

test('Cart: guest token is unique and items must reference a product', async () => {
  const index = indexKeys(Cart).find((entry) => entry.fields.token === 1);
  assert.ok(index && index.unique, 'carts.token must be unique');

  await assert.rejects(() => new Cart({ token: 'abc', items: [{ quantity: 1 }] }).validate(), /required/);
  await assert.rejects(
    () => new Cart({ token: 'abc', items: [{ product: new Product(validProduct())._id, quantity: 0 }] }).validate(),
    /min|quantity/i,
  );
});

test('Cart: recalculate re-prices from the live product and drops unavailable lines', () => {
  const live = new Product(validProduct({ stock: 10, sellingPrice: 240, mrp: 300 }));
  const gone = new Product(validProduct({ name: 'DELISTED', isPublished: false, stock: 10 }));
  const short = new Product(validProduct({ name: 'LOW STOCK', stock: 1 }));

  const cart = new Cart({
    token: 'abc',
    items: [
      { product: live._id, quantity: 2, nameSnapshot: 'stale name' },
      { product: gone._id, quantity: 1 },
      { product: short._id, quantity: 5 },
    ],
  });

  const byId = new Map([[String(live._id), live], [String(gone._id), gone], [String(short._id), short]]);
  const result = cart.recalculate(byId);

  assert.equal(result.itemCount, 3, 'two of the live product plus the clamped short-stock line');
  assert.equal(result.itemsTotal, 240 * 2 + 240 * 1);
  assert.equal(result.unavailable.length, 2, 'the delisted and the over-requested line must be reported');
  assert.ok(result.unavailable.some((entry) => entry.reason === 'no-longer-available'));
  assert.ok(result.unavailable.some((entry) => entry.reason === 'insufficient-stock'));
  assert.equal(
    cart.items[0].nameSnapshot,
    'GOLDEN RAIN 25 SHOT',
    'a cart snapshot must be refreshed from the product document',
  );
});

test('Order: reference is unique and indexed for status, payment and date lookups', () => {
  const reference = indexKeys(Order).find((entry) => entry.fields.reference === 1);
  assert.ok(reference && reference.unique, 'orders.reference must be unique');
  assert.ok(hasIndex(Order, { createdAt: -1 }), 'missing order date index');
  assert.ok(hasIndex(Order, { status: 1, createdAt: -1 }), 'missing order status index');
  assert.ok(hasIndex(Order, { paymentStatus: 1, createdAt: -1 }), 'missing payment status index');
  assert.ok(hasIndex(Order, { 'customerSnapshot.phone': 1, createdAt: -1 }), 'missing customer phone lookup index');
});

test('Order: an order needs at least one line and a valid quantity', async () => {
  await assert.rejects(() => new Order(validOrder({ items: [] })).validate(), /at least one line/);

  const tooMany = validOrder();
  tooMany.items[0].quantity = 0;
  await assert.rejects(() => new Order(tooMany).validate(), /min|quantity/i);
});

test('Order: a negative total clamps to zero and savings are derived', async () => {
  const negative = new Order(validOrder({ total: -1 }));
  await negative.validate();
  assert.equal(negative.total, 0, 'a negative total is repaired by the pre-validate hook');

  const order = new Order(validOrder({ itemsTotal: 480, mrpTotal: 700, discount: 0 }));
  await order.validate();
  assert.equal(order.totalSavings, 220);
});

test('Order: the customer snapshot is required so history survives a later edit', async () => {
  const order = validOrder();
  delete order.customerSnapshot.phone;
  await assert.rejects(() => new Order(order).validate(), /required/);
});

test('Order: publicView never leaks internal notes or the access secret', async () => {
  const order = new Order(validOrder({ internalNotes: 'customer is a bot', notes: 'call before 6' }));
  await order.validate();
  const view = order.publicView();
  assert.equal(view.internalNotes, undefined);
  assert.equal(view.accessTokenHash, undefined);
  assert.equal(view.notes, 'call before 6', 'customer facing notes must survive');
});

test('Order: the access token is stored only as a hash', async () => {
  const order = new Order(validOrder());
  await order.validate();
  assert.notEqual(order.accessTokenHash, 'a-token');
  assert.equal(order.accessTokenHash.length, 64, 'expected a sha256 hex digest');
  assert.equal(Order.schema.path('accessTokenHash').options.select, false, 'the hash must be excluded by default');
});

test('Admin: the password hash is excluded by default and never returned as JSON', async () => {
  const admin = new Admin({ name: 'Owner', email: 'OWNER@Example.com ', passwordHash: 'x' });
  await admin.validate();
  assert.equal(admin.email, 'owner@example.com', 'email must be lowercased and trimmed');

  const json = admin.toJSON();
  assert.equal(json.passwordHash, undefined);
  assert.ok(Array.isArray(json.permissions) && json.permissions.length > 0, 'an owner must carry permissions');

  const index = indexKeys(Admin).find((entry) => entry.fields.email === 1);
  assert.ok(index && index.unique, 'admins.email must be unique');
});

test('Admin: passwords are bcrypt hashed and verify in both directions', async () => {
  const hash = await Admin.hashPassword('CorrectHorseBattery9');
  assert.match(hash, /^\$2[aby]\$/, 'expected a bcrypt hash, never a plaintext password');
  assert.ok(await Admin.prototype.verifyPassword.call({ passwordHash: hash }, 'CorrectHorseBattery9'));
  assert.equal(await Admin.prototype.verifyPassword.call({ passwordHash: hash }, 'wrong-password'), false);
});

test('Admin: repeated failures lock the account', () => {
  const admin = new Admin({ name: 'Owner', email: 'owner@example.com', passwordHash: 'x' });
  assert.equal(admin.isLocked(), false);
  for (let attempt = 0; attempt < 5; attempt += 1) admin.registerFailedLogin();
  assert.ok(admin.lockedUntil > new Date(), 'the account must lock after five failures');
  assert.equal(admin.isLocked(), true);
});

test('Settings: a single shop document, with the price mapping unconfirmed until the owner says so', async () => {
  const settings = new Settings({});
  await settings.validate();
  assert.equal(settings.key, 'shop');
  assert.equal(settings.importPriceMapping.confirmed, false, 'the selling price column must never default to confirmed');
  assert.equal(settings.importPriceMapping.sellingPriceColumn, null);

  const index = indexKeys(Settings).find((entry) => entry.fields.key === 1);
  assert.ok(index && index.unique, 'settings.key must be unique so only one shop document can exist');
});

test('ImportLog: one committed batch per file hash blocks a duplicate import', () => {
  const index = indexKeys(ImportLog).find(
    (entry) => entry.fields.fileHash === 1 && entry.fields.status === 1,
  );
  assert.ok(index, 'missing the {fileHash, status} index');
  assert.equal(index.unique, true);
  assert.deepEqual(index.partialFilterExpression, { status: 'committed' });
  assert.ok(hasIndex(ImportLog, { fileHash: 1 }), 'missing file hash lookup index');
});

test('ImportLog: a row records why it was skipped instead of failing silently', async () => {
  const log = new ImportLog({
    fileName: 'Order Crackers 2026.xlsx',
    fileHash: 'a'.repeat(64),
    rows: [{ rowNumber: 4, action: 'skipped', reason: 'category heading', issues: [] }],
  });
  await log.validate();
  assert.equal(log.rows[0].action, 'skipped');
  assert.equal(log.rows[0].reason, 'category heading');
});
