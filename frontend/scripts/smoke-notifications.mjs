import assert from 'node:assert/strict';

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

const orders = await import('../src/services/orders.js');
const notifications = await import('../src/services/notifications.js');
const { seedProductRecords, seedCategoryRecords, normalizeProductRecord } = await import('../src/data/productRecords.js');
const { seedPackRecords, packToTile } = await import('../src/data/packRecords.js');
const { buildCatalog } = await import('../src/data/catalog.js');

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
orders.setOrderCatalogLookup(catalog.getCatalogProduct, (id) => packs.map(packToTile).find((tile) => tile.id === id));

const line = (id, quantity) => ({ id, name: id, category: 'SPARKLERS', quantity, unitPrice: 100 });

const placeOrder = (name, mobile) =>
  orders.createOrder({
    customer: { name, mobile },
    items: [line(products[0].id, 2), line(products[1].id, 1)],
  });

const unreadOf = (list) => notifications.buildOrderNotifications(list).filter((entry) => !entry.read);

const first = placeOrder('Asha Menon', '9876500011');
const second = placeOrder('Ravi Kumar', '9876500022');
let third = null;
let fourth = null;

check('the first run adopts the orders already on record', () => {
  const arrivals = notifications.syncOrderNotifications(orders.listOrders());
  assert.deepEqual(arrivals, [], 'existing history must not be announced as new');
  const state = notifications.readNotificationState();
  assert.equal(state.seeded, true);
  assert.equal(state.known.length, 2);
  assert.equal(state.read.length, 2, 'adopted orders count as already seen');
  assert.deepEqual(unreadOf(orders.listOrders()), [], 'adopted orders are not unread alerts');
});

check('a new order raises exactly one notification', () => {
  third = placeOrder('Meera Nair', '9876500033');
  const arrivals = notifications.syncOrderNotifications(orders.listOrders());
  assert.equal(arrivals.length, 1);
  assert.equal(arrivals[0].reference, third.reference);
  const unread = unreadOf(orders.listOrders());
  assert.equal(unread.length, 1, 'only the arrival is unread, not the seeded history');
  assert.equal(unread[0].reference, third.reference);
  assert.equal(unread[0].read, false);
});

check('a notification carries the real order details', () => {
  const entry = notifications.buildOrderNotifications(orders.listOrders()).find((item) => item.reference === third.reference);
  const order = orders.getOrder(third.reference);
  assert.ok(entry, 'the new order has a notification');
  assert.equal(entry.reference, order.reference);
  assert.equal(entry.customerName, 'Meera Nair');
  assert.equal(entry.amount, order.totals.grandTotal);
  assert.equal(entry.createdAt, order.createdAt);
  assert.equal(entry.status, 'Pending');
  assert.equal(entry.awaitingConfirmation, true, 'a pending order is awaiting confirmation');
});

check('notifications stay newest first', () => {
  const list = notifications.buildOrderNotifications(orders.listOrders());
  const times = list.map((entry) => new Date(entry.createdAt).getTime());
  assert.deepEqual(times, [...times].sort((a, b) => b - a));
});

check('reading one notification leaves the rest alone', () => {
  notifications.markNotificationsRead([third.reference]);
  assert.equal(unreadOf(orders.listOrders()).length, 0, 'the badge drops to zero');
  assert.equal(notifications.readNotificationState().read.length, 3);
});

check('an unread order stays pending until it is confirmed', () => {
  fourth = placeOrder('Suresh Iyer', '9876500044');
  notifications.syncOrderNotifications(orders.listOrders());
  assert.equal(unreadOf(orders.listOrders()).length, 1, 'a new order is unread again');

  const before = orders.getOrder(fourth.reference);
  assert.equal(before.status, 'Pending');

  orders.updateOrderStatus(fourth.reference, 'Confirmed', 'Confirmed in the smoke test');
  const after = orders.getOrder(fourth.reference);
  assert.equal(after.status, 'Confirmed', 'confirming writes through to the order record');
  assert.equal(after.history.at(-1).to, 'Confirmed');

  // The panel marks a settled order read, which is what empties the badge and clears the alert.
  notifications.markNotificationsRead([fourth.reference]);
  assert.equal(unreadOf(orders.listOrders()).length, 0, 'a confirmed order stops being an alert');
  const entry = notifications.buildOrderNotifications(orders.listOrders()).find((item) => item.reference === fourth.reference);
  assert.equal(entry.status, 'Confirmed');
  assert.equal(entry.awaitingConfirmation, false, 'it is no longer awaiting confirmation');
  assert.equal(entry.read, true);
});

check('a confirmed order is no longer an actionable alert', () => {
  // The panel refuses a second confirmation on this condition, so the order cannot be
  // confirmed twice and the alert cannot reappear.
  const confirmed = orders.getOrder(fourth.reference);
  assert.notEqual(confirmed.status, 'Pending', 'the guard reads this before writing');
  const entry = notifications.buildOrderNotifications(orders.listOrders()).find((item) => item.reference === fourth.reference);
  assert.equal(entry.awaitingConfirmation, false);
  assert.equal(unreadOf(orders.listOrders()).filter((item) => item.reference === fourth.reference).length, 0);
});

check('mark all read empties the badge', () => {
  placeOrder('Kavya Rao', '9876500055');
  notifications.syncOrderNotifications(orders.listOrders());
  assert.equal(unreadOf(orders.listOrders()).length, 1);
  notifications.markAllNotificationsRead();
  assert.equal(unreadOf(orders.listOrders()).length, 0);
  assert.equal(notifications.readNotificationState().read.length, notifications.readNotificationState().known.length);
});

check('a deleted order takes its notification with it', () => {
  const doomed = placeOrder('Vikram Shah', '9876500066');
  notifications.syncOrderNotifications(orders.listOrders());
  assert.ok(notifications.buildOrderNotifications(orders.listOrders()).some((entry) => entry.reference === doomed.reference));

  orders.deleteOrder(doomed.reference);
  notifications.syncOrderNotifications(orders.listOrders());
  const state = notifications.readNotificationState();
  assert.equal(state.known.includes(doomed.reference), false, 'the reference is forgotten');
  assert.equal(state.read.includes(doomed.reference), false);
  assert.equal(
    notifications.buildOrderNotifications(orders.listOrders()).some((entry) => entry.reference === doomed.reference),
    false,
    'nothing is invented for an order that no longer exists',
  );
});

check('every notification points at an order that is really on record', () => {
  const live = new Set(orders.listOrders().map((order) => order.reference));
  const list = notifications.buildOrderNotifications(orders.listOrders());
  assert.ok(list.length > 0, 'there is a feed to check');
  assert.ok(
    list.every((entry) => live.has(entry.reference)),
    'no notification may reference a missing order',
  );
});

check('notification amounts always match the order they describe', () => {
  orders
    .listOrders()
    .forEach((order) => {
      const entry = notifications.buildOrderNotifications([order])[0];
      assert.equal(entry.amount, order.totals.grandTotal, `${order.reference} amount drifted`);
    });
});

check('relative time reads sensibly for a real order', () => {
  const justNow = notifications.relativeTime(new Date().toISOString());
  assert.equal(justNow, 'Just now');
  const earlier = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  assert.match(notifications.relativeTime(earlier), /min ago/);
  const older = new Date(Date.now() - 5 * 86400000).toISOString();
  assert.match(notifications.relativeTime(older), /days ago/);
  assert.equal(notifications.relativeTime('not-a-date'), 'Not recorded');
});

check('a cleared panel starts over without announcing history', () => {
  store.clear();
  const fresh = orders.createOrder({ customer: { name: 'Latha Pillai' }, items: [line(products[0].id, 1)] });
  const arrivals = notifications.syncOrderNotifications(orders.listOrders());
  assert.deepEqual(arrivals, [], 'the first run after a reset is quiet');
  assert.deepEqual(unreadOf(orders.listOrders()), []);
  assert.ok(fresh.reference, 'the order itself is unaffected');
});

console.log(results.join('\n'));
const failed = results.filter((line) => line.startsWith('FAIL'));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
