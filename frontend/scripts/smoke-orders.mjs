import assert from 'node:assert/strict';

// Node 22 already exposes globalThis.crypto.subtle, which is what the auth service
// prefers, so nothing needs to be injected for hashing here.
assert.ok(globalThis.crypto?.subtle, 'a Web Crypto implementation is required');

const store = new Map();
const localStorageStub = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};
globalThis.window = {
  localStorage: localStorageStub,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
};
globalThis.localStorage = localStorageStub;
globalThis.document = { documentElement: { style: {} } };

const { readStorage, writeStorage } = await import('../src/utils/storage.js');
const orders = await import('../src/services/orders.js');
const { seedProductRecords, seedCategoryRecords, normalizeProductRecord } = await import('../src/data/productRecords.js');
const { seedPackRecords, packToTile } = await import('../src/data/packRecords.js');
const { buildCatalog } = await import('../src/data/catalog.js');
const { comboTiles } = await import('../src/data/comboGift.js');
const { buildPrintDocument } = await import('../src/utils/documents.js');

const business = {
  name: 'Anish Enterprises',
  tagline: 'Wholesale crackers',
  address: 'Kamak Road, Near Kamavar Kalyanamandapam',
  phone: '9488821144',
  email: 'anishenterprisessvk@gmail.com',
};

const results = [];
const check = (name, run) => {
  try {
    run();
    results.push(`PASS  ${name}`);
  } catch (error) {
    results.push(`FAIL  ${name}: ${error.message}`);
  }
};

const products = seedProductRecords();
const categories = seedCategoryRecords();
const packs = seedPackRecords();
const catalog = buildCatalog(products, categories);
const tiles = packs.map(packToTile);

orders.setOrderCatalogLookup(catalog.getCatalogProduct, (id) => tiles.find((tile) => tile.id === id));

check('catalog builds with prices and category counts', () => {
  assert.ok(catalog.catalogProducts.length > 100, 'expected a full product list');
  assert.ok(catalog.catalogProducts.every((product) => product.price > 0), 'every product needs a price');
  assert.equal(catalog.catalogCategories.length, categories.length);
  assert.ok(catalog.categoryOptions.length > 0, 'category options are exposed to the filters');
  assert.ok(catalog.getCatalogProduct(products[0].id), 'a product can be looked up by id');
});

check('every pack tile resolves to a live price', () => {
  assert.equal(tiles.length, comboTiles.length, 'all seeded packs should be present');
  assert.ok(tiles.every((tile) => tile.price > 0), 'every pack needs a price');
});

check('stored sample orders are dropped on migration', () => {
  writeStorage(orders.orderStorageKey, [
    { reference: 'ORD-SAMPLE1', sample: true, status: 'New', createdAt: '2026-01-05', customer: { name: 'Demo' }, items: [] },
    { reference: 'ORD-SAMPLE2', sample: true, status: 'Completed', createdAt: '2026-01-06', customer: { name: 'Demo' }, items: [] },
  ]);
  const stored = orders.listOrders();
  assert.equal(stored.length, 0, `expected sample rows to be removed, found ${stored.length}`);
  assert.equal(readStorage(orders.orderStorageKey, null).length, 0, 'storage should be rewritten without samples');
});

check('legacy New and Completed statuses migrate to the current pipeline', () => {
  writeStorage(orders.orderStorageKey, [
    { reference: 'ORD-LEGACY1', status: 'New', createdAt: '2026-02-01T10:00:00.000Z', customer: { name: 'Ravi', mobile: '9000000001' }, items: [{ id: products[0].id, name: products[0].name, quantity: 2, unitPrice: 100 }] },
    { reference: 'ORD-LEGACY2', status: 'Completed', createdAt: '2026-02-02T10:00:00.000Z', customer: { name: 'Sita', mobile: '9000000002' }, items: [{ id: products[1].id, name: products[1].name, quantity: 1, unitPrice: 250 }], paidAmount: 250 },
  ]);
  const stored = orders.listOrders();
  assert.equal(stored.length, 2);
  assert.equal(stored.find((order) => order.reference === 'ORD-LEGACY1').status, 'Pending');
  assert.equal(stored.find((order) => order.reference === 'ORD-LEGACY2').status, 'Delivered');
  assert.equal(stored.find((order) => order.reference === 'ORD-LEGACY2').paymentStatus, 'Paid');
});

let enquiryReference = '';

check('an enquiry becomes a priced order with an invoice number', () => {
  const order = orders.createOrderFromEnquiry({
    reference: 'ENQ-TEST1',
    createdAt: new Date().toISOString(),
    customer: { name: 'Kavya', mobile: '9000000003', email: 'kavya@example.com', city: 'Sivakasi' },
    items: [
      orders.catalogLine(products[0].id, 2),
      orders.comboLine(comboTiles[0].id, 1),
    ],
    deliveryFee: 40,
  });
  enquiryReference = order.reference;
  assert.match(order.reference, /^ORD-/, 'the order gets its own reference');
  assert.equal(order.sourceEnquiry, 'ENQ-TEST1', 'the enquiry it came from is recorded');
  assert.match(order.invoiceNumber, /^INV-\d{4}-\d{4}$/);
  assert.equal(order.status, 'Pending');
  assert.equal(order.paymentStatus, 'Unpaid');
  assert.equal(order.channel, 'Storefront enquiry');
  assert.ok(order.totals.grandTotal > 0, 'grand total must be positive');
  assert.equal(order.items.length, 2);
  assert.ok(order.items[1].kind === 'Combo pack', 'the combo line keeps its kind');
  assert.ok(order.history.length >= 1, 'history records the creation');
});

check('a manually created order keeps the customer details typed into the form', () => {
  const manual = orders.createOrder({
    customer: {
      name: '  Anita Raghavan  ',
      mobile: '9000000010',
      email: 'anita.raghavan@example.com',
      address: '12 Mill Street',
      city: 'Rajapalayam',
    },
    channel: 'Phone call',
    paymentMode: 'Cash on delivery',
    notes: 'Call before delivery.',
    items: [{ id: 'sparklers-10', name: 'Sparklers', quantity: 2, unitPrice: 40 }],
    status: 'Pending',
    paymentStatus: 'Unpaid',
  });
  assert.equal(manual.customer.name, 'Anita Raghavan', 'the customer name is saved, not dropped');
  assert.equal(manual.customer.mobile, '9000000010');
  assert.equal(manual.customer.email, 'anita.raghavan@example.com');
  assert.equal(manual.customer.address, '12 Mill Street');
  assert.equal(manual.customer.city, 'Rajapalayam');
  assert.equal(manual.notes, 'Call before delivery.', 'the order note is kept');
  assert.equal(manual.channel, 'Phone call');
  assert.equal(manual.paymentMode, 'Cash on delivery');
  const printed = buildPrintDocument(manual, business);
  assert.ok(printed.includes('Anita Raghavan'), 'the name reaches the print sheet');
  assert.ok(printed.includes('9000000010'), 'the phone number reaches the print sheet');
  assert.ok(printed.includes('12 Mill Street'), 'the address reaches the print sheet');
  assert.ok(!printed.includes('Not recorded'), 'a filled order prints no placeholder values');
});

check('order status moves through the pipeline and is recorded in history', () => {
  const updated = orders.updateOrderStatus(enquiryReference, 'Shipped', 'Handed to courier');
  assert.equal(updated.status, 'Shipped');
  assert.equal(updated.history.at(-1).to, 'Shipped');
  assert.equal(updated.history.at(-1).note, 'Handed to courier');
  assert.equal(orders.orderProgress(updated), 3);
});

check('payment updates recompute what is still due', () => {
  const order = orders.getOrder(enquiryReference);
  const half = Math.round(order.totals.grandTotal / 2);
  const part = orders.updateOrderPayment(enquiryReference, { paidAmount: half, paymentStatus: 'Partial' });
  assert.equal(part.paidAmount, half, 'paid amount is stored');
  assert.equal(part.paymentStatus, 'Partial');
  assert.ok(orders.outstandingAmount(part) > 0, 'a part payment still leaves a balance');
  const settled = orders.updateOrderPayment(enquiryReference, { paidAmount: order.totals.grandTotal, paymentStatus: 'Paid' });
  assert.equal(settled.paymentStatus, 'Paid');
  assert.equal(orders.outstandingAmount(settled), 0, 'a settled order owes nothing');
  const overpaid = orders.updateOrderPayment(enquiryReference, { paidAmount: order.totals.grandTotal + 100, paymentStatus: 'Partial' });
  assert.equal(overpaid.paymentStatus, 'Paid', 'a full payment is never left showing as part-paid');
  const refunded = orders.updateOrderPayment(enquiryReference, { paymentStatus: 'Refunded', paidAmount: 0 });
  assert.equal(refunded.paymentStatus, 'Refunded', 'a refund survives the amount check');
  assert.equal(orders.updateOrderStatus('ORD-DOES-NOT-EXIST', 'Shipped'), null, 'an unknown reference changes nothing');
});

check('cancelled orders stop counting as revenue', () => {
  // A fresh order keeps this independent of the payment states set above.
  const fresh = orders.createOrder({ customer: { name: 'Cancel Test', mobile: '9000000009' }, items: [orders.catalogLine(products[4].id, 2)] });
  const before = orders.getOrderStats(orders.listOrders());
  assert.ok(before.revenue >= fresh.totals.grandTotal, 'a live order counts towards revenue');
  orders.updateOrderStatus(fresh.reference, 'Cancelled', 'Customer changed their mind');
  const after = orders.getOrderStats(orders.listOrders());
  assert.equal(after.total, before.total, 'the order is still on record');
  assert.equal(after.revenue, before.revenue - fresh.totals.grandTotal, 'a cancelled order earns nothing');
  assert.equal(after.byStatus.Cancelled, 1);
  assert.equal(orders.outstandingAmount(orders.getOrder(fresh.reference)), 0, 'a cancelled order owes nothing');
});

check('editing items recalculates every total', () => {
  const edited = orders.updateOrderDetails('ORD-LEGACY1', {
    items: [{ id: products[2].id, name: products[2].name, quantity: 3, unitPrice: 120 }],
    deliveryFee: 50,
    discount: 10,
  });
  assert.equal(edited.totals.itemsTotal, 360);
  assert.equal(edited.totals.delivery, 50);
  assert.equal(edited.totals.discount, 10);
  assert.equal(edited.totals.grandTotal, 400);
});

check('a stored line missing a price is filled from the live catalog', () => {
  writeStorage(orders.orderStorageKey, [
    { reference: 'ORD-PRICE1', createdAt: new Date().toISOString(), customer: { name: 'Mohan', mobile: '9000000004' }, items: [{ id: products[3].id, name: products[3].name, quantity: 1 }] },
  ]);
  const [order] = orders.listOrders();
  assert.ok(order.items[0].unitPrice > 0, 'price comes from the catalog record');
  assert.ok(order.items[0].packSize, 'pack size is filled in too');
});

check('a pack line picks up an edited pack price', () => {
  const editedPack = { ...packs[0], price: 1234, mrp: 1500 };
  orders.setOrderCatalogLookup(catalog.getCatalogProduct, (id) => (id === editedPack.id ? packToTile(editedPack) : null));
  const line = orders.comboLine(editedPack.id, 1);
  assert.equal(line.unitPrice, 1234, 'the new price is used immediately');
  orders.setOrderCatalogLookup(catalog.getCatalogProduct, (id) => tiles.find((tile) => tile.id === id));
});

check('customers are derived from real orders only', () => {
  writeStorage(orders.orderStorageKey, []);
  orders.createOrder({ reference: 'ORD-C1', customer: { name: 'Lakshmi', mobile: '9111111111', city: 'Tenkasi' }, items: [orders.catalogLine(products[0].id, 1)] });
  orders.createOrder({ reference: 'ORD-C2', customer: { name: 'Lakshmi', mobile: '9111111111', city: 'Tenkasi' }, items: [orders.catalogLine(products[1].id, 2)] });
  const customers = orders.listCustomers(orders.listOrders());
  assert.equal(customers.length, 1, 'the same phone number is one customer');
  assert.equal(customers[0].orders, 2);
  assert.equal(customers[0].units, 3);
  assert.ok(customers[0].revenue > 0);
  assert.equal(orders.getCustomerOrders(orders.listOrders(), customers[0].key).length, 2);
});

check('date ranges cover month and year without invalid dates', () => {
  const now = new Date();
  const month = orders.dateRange('month', now);
  const year = orders.dateRange('year', now);
  assert.ok(!Number.isNaN(new Date(month.from).getTime()), 'month start is a real date');
  assert.ok(!Number.isNaN(new Date(year.from).getTime()), 'year start is a real date');
  assert.equal(month.from.getDate(), 1);
  assert.equal(year.from.getMonth(), 0);
  assert.equal(orders.dateRange('all', now).from, null);
  const scoped = orders.filterOrders(orders.listOrders(), orders.dateRange('month', now));
  assert.ok(Array.isArray(scoped));
});

check('report summary totals match the order list', () => {
  const list = orders.listOrders();
  const summary = orders.getReportSummary(list);
  assert.equal(summary.total, list.length);
  const summed = summary.salesByCategory.reduce((total, row) => total + row.revenue, 0);
  assert.ok(Math.abs(summed - summary.revenue) < 1, 'category revenue adds up to the total');
  const byStatus = summary.statuses.reduce((total, row) => total + row.count, 0);
  assert.equal(byStatus, list.length, 'every order appears in exactly one status row');
  const byPayment = summary.payments.reduce((total, row) => total + row.count, 0);
  assert.equal(byPayment, list.length, 'every order appears in exactly one payment row');
});

check('a normalizer rejects a product without a name or category', () => {
  assert.equal(normalizeProductRecord({ name: '', category: '' }), null);
  const manual = normalizeProductRecord({ name: 'Test Rocket', category: categories[0].name, price: 99, mrp: 120 });
  assert.ok(manual.id, 'a manual product is given an id');
  assert.ok(manual.code.startsWith('SS26-'), `a manual product gets a shop code, got ${manual.code}`);
  assert.equal(manual.stock, null, 'a new product starts with untracked stock rather than a fake count');
  assert.equal(manual.status, 'active');
});

console.log(results.join('\n'));
const failed = results.filter((line) => line.startsWith('FAIL'));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
