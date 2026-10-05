/**
 * Query-filter tests for the Mongo layer.
 *
 * `sanitizeFilter` is enabled in `config/db.js` to stop query-selector
 * injection arriving through request parameters. It rewrites any filter value
 * containing a `$`-prefixed key into `{ $eq: <original> }`, which also
 * swallows the operators this codebase builds for itself -- a `{ $in: [...] }`
 * or `{ $gte: ... }` ends up wrapped as a value and can no longer be cast.
 * `trustedOps()` is the supported opt-out for our own values.
 *
 * These assert both halves of that contract: a value that came from a request is
 * still neutralised, and our own operator values are left intact. Only the cast
 * step runs, so no Mongo connection is needed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/anish_enterprises_test';
process.env.JWT_SECRET ||= 'test_only_secret_that_is_definitely_long_enough_32';

const mongoose = (await import('mongoose')).default;

// The same hardening config/db.js applies on boot.
mongoose.set('strictQuery', true);
mongoose.set('sanitizeFilter', true);

const { Product } = await import('../src/models/Product.js');
const { Order } = await import('../src/models/Order.js');
const { Category } = await import('../src/models/Category.js');
const { trustedOps } = await import('../src/utils/trustedOps.js');
const { buildProductFilter } = await import('../src/services/product.service.js');

const objectId = () => new mongoose.Types.ObjectId();

/**
 * Runs the cast step the driver runs before any query, and returns the filter as
 * it stands afterwards. `_castConditions()` is where `sanitizeFilter` is applied.
 */
const afterCast = (Model, filter) => {
  const query = Model.find(filter);
  query._castConditions();
  return query.getFilter();
};

/** True when sanitizeFilter has hidden a value behind $eq, disabling it. */
const neutralised = (filter) => JSON.stringify(filter).includes('"$eq"');

/**
 * The operator keys of a filter value. `Object.entries` skips symbol keys, which
 * is what we want: trustedOps() marks its result with a symbol and that marker
 * is not part of the query sent to Mongo.
 */
const operatorsOf = (value) => Object.fromEntries(Object.entries(value));

test('sanitizeFilter neutralises an operator that came from a request', () => {
  // This is the protection that must not be weakened: a selector smuggled in
  // through a query parameter is rewritten to $eq, so it is compared as a plain
  // value instead of being executed as an operator.
  for (const [Model, filter] of [
    [Order, { status: { $ne: 'Pending' } }],
    [Order, { createdAt: { $gte: new Date() } }],
    [Product, { _id: { $in: [objectId()] } }],
    [Category, { name: { $regex: '.*' } }],
  ]) {
    const result = afterCast(Model, filter);
    assert.ok(neutralised(result), `an untrusted operator was not neutralised: ${JSON.stringify(filter)}`);
  }
});

test('trusted operator values are left intact', () => {
  // $in on a string path, the shape the dashboard counts open orders with.
  const byStatus = afterCast(Order, { status: trustedOps({ $in: ['Pending', 'Confirmed'] }) });
  assert.deepEqual(operatorsOf(byStatus.status), { $in: ['Pending', 'Confirmed'] });

  // Several operators on one numeric path, used for low-stock counts.
  const lowStock = afterCast(Product, { stock: trustedOps({ $ne: null, $gt: 0, $lte: 5 }) });
  assert.deepEqual(operatorsOf(lowStock.stock), { $ne: null, $gt: 0, $lte: 5 });

  // A date range, used for the reporting window.
  const window = afterCast(Order, { createdAt: trustedOps({ $gte: new Date(), $lte: new Date() }) });
  assert.deepEqual(Object.keys(operatorsOf(window.createdAt)).sort(), ['$gte', '$lte']);

  // ObjectId paths, used for bulk product updates and deletes.
  const id = objectId();
  const byId = afterCast(Product, { _id: trustedOps({ $in: [id] }) });
  assert.equal(byId._id.$in[0].toString(), id.toString());
  assert.equal(operatorsOf(afterCast(Product, { _id: trustedOps({ $ne: id }) })._id).$ne.toString(), id.toString());

  // A dotted path, used to find which products an order already references.
  const referenced = afterCast(Order, { 'items.product': trustedOps({ $in: [id] }) });
  assert.equal(referenced['items.product'].$in.length, 1);

  // Mixing a trusted value with plain equality keys in one filter.
  const mixed = afterCast(Product, { status: 'active', isPublished: true, stock: trustedOps({ $lte: 5 }) });
  assert.equal(mixed.status, 'active');
  assert.equal(mixed.isPublished, true);
  assert.deepEqual(operatorsOf(mixed.stock), { $lte: 5 });
  assert.ok(!neutralised(mixed), 'no part of a mixed filter should be rewritten');
});

test('trustedOps marks the value it is given, and leaves plain values alone', () => {
  const marked = trustedOps({ $gte: 1 });
  assert.equal(marked.$gte, 1, 'the operator object must be returned unchanged');
  assert.equal(Object.keys(marked).length, 1, 'no extra enumerable keys may be added to a filter');
  assert.equal(trustedOps('active'), 'active', 'a non-object value passes straight through');
});

test('buildProductFilter survives sanitizeFilter for every operator branch', () => {
  // The catalogue filter is assembled from request parameters, so this is where
  // a missing trustedOps() wrapper surfaces as a query that cannot be cast.
  const cases = [
    { lowStock: 'true' },
    { inStock: 'true' },
    { inStock: 'false' },
    { minPrice: 100 },
    { maxPrice: 500 },
    { minPrice: 100, maxPrice: 500 },
    { search: 'golden rain' },
    { search: 'golden rain', inStock: 'true' },
    { search: 'golden rain', lowStock: 'true' },
    { category: 'FANCY COLOR FOUNTAIN', status: 'active' },
  ];

  for (const query of cases) {
    const filter = buildProductFilter(query);
    const result = afterCast(Product, filter);
    assert.ok(
      !neutralised(result),
      `buildProductFilter(${JSON.stringify(query)}) let sanitizeFilter rewrite it: ${JSON.stringify(result)}`,
    );
  }
});
