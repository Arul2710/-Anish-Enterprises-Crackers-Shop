import { getProductById } from '../data/products';
import { comboTiles } from '../data/comboGift';
import { readArray, writeStorage } from '../utils/storage';

export const orderStorageKey = 'spark-shine-orders';
export const orderMigrationStorageKey = 'spark-shine-orders-migrated';

const ordersChangedEvent = 'spark-shine-orders-changed';

export const GIFT_BOX_CATEGORY = 'CRACKERS GIFT BOX';
export const COMBO_CATEGORY = 'COMBO PACK';

/** Pipeline every real order moves through. Enquiries land as Pending. */
export const orderStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export const orderStatusLabels = {
  Pending: 'Pending',
  Confirmed: 'Confirmed',
  Processing: 'Processing',
  Shipped: 'Shipped',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
};

export const orderStatusTone = {
  Pending: 'blue',
  Confirmed: 'royal',
  Processing: 'orange',
  Shipped: 'amber',
  Delivered: 'green',
  Cancelled: 'red',
};

export const orderStatusHelp = {
  Pending: 'Enquiry received. Rate and availability are being confirmed.',
  Confirmed: 'Customer confirmed the rate and quantity.',
  Processing: 'Being packed and checked.',
  Shipped: 'Handed to the courier or transporter.',
  Delivered: 'Delivered and closed.',
  Cancelled: 'Cancelled by the customer or the shop.',
};

/** Statuses reachable from a given status, in pipeline order. */
export const nextOrderStatuses = (status) => {
  const flow = orderStatuses.filter((value) => value !== 'Cancelled');
  const index = flow.indexOf(status);
  if (status === 'Cancelled') return ['Pending', 'Confirmed'];
  if (index < 0) return flow;
  return flow.slice(index + 1).concat('Cancelled');
};

export const paymentStatuses = ['Unpaid', 'Paid', 'Partial', 'Refunded'];

export const paymentStatusTone = {
  Unpaid: 'red',
  Partial: 'amber',
  Paid: 'green',
  Refunded: 'slate',
};

/** Statuses whose goods have left the shop; used by reports and the progress ring. */
export const closedOrderStatuses = ['Delivered', 'Cancelled'];

export const isOrderClosed = (order) => closedOrderStatuses.includes(order?.status);
export const isRevenueOrder = (order) => order?.status !== 'Cancelled' && order?.paymentStatus !== 'Refunded';

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const lineTotalOf = (line) => {
  const explicit = Number(line?.lineTotal);
  if (Number.isFinite(explicit) && explicit > 0) return roundMoney(explicit);
  return roundMoney((Number(line?.unitPrice) || 0) * (Number(line?.quantity) || 0));
};

export const resolveLineKind = (id = '', category = '') => {
  const value = String(id);
  if (value.startsWith('combo') || value.startsWith('pack-')) return 'Combo pack';
  if (category === GIFT_BOX_CATEGORY) return 'Gift box';
  if (category === COMBO_CATEGORY) return 'Combo pack';
  return 'Product';
};

let catalogLookup = (id) => getProductById(id);
let packLookup = (id) => lookupPackSeed(id);

/**
 * The panel resolves cart lines against the live catalog, which the admin can edit,
 * while a stored order must always keep the price it was placed at. The storefront
 * registers its live lookups here so a freshly created line is priced from the same
 * records the shop shows; if nothing is registered the supplied sheet is used instead.
 */
export const setOrderCatalogLookup = (product, pack) => {
  catalogLookup = typeof product === 'function' ? product : (id) => getProductById(id);
  packLookup = typeof pack === 'function' ? pack : (id) => lookupPackSeed(id);
};

const lookupProduct = (id) => {
  try {
    return catalogLookup(id) || getProductById(id) || null;
  } catch {
    return getProductById(id) || null;
  }
};

const lookupPack = (id) => {
  try {
    return packLookup(id) || lookupPackSeed(id) || null;
  } catch {
    return lookupPackSeed(id) || null;
  }
};

const lookupPackSeed = (id) => comboTiles.find((tile) => tile.id === id) || null;

export const catalogLine = (id, quantity = 1) => {
  const product = lookupProduct(id);
  const unitPrice = Number(product?.price ?? product?.netRate ?? 0) || 0;
  const qty = Math.max(1, Number(quantity) || 1);
  return {
    id: String(id),
    name: product ? product.name : `Catalog item ${id}`,
    category: product ? product.category : '',
    kind: resolveLineKind(id, product?.category),
    packSize: product ? product.packSize : '1 Box',
    quantity: qty,
    unitPrice,
    lineTotal: roundMoney(unitPrice * qty),
  };
};

export const comboLine = (id, quantity = 1) => {
  const pack = lookupPack(id);
  const qty = Math.max(1, Number(quantity) || 1);
  const unitPrice = Number(pack?.price || 0) || 0;
  return {
    id: String(id),
    name: pack ? pack.name : String(id),
    category: COMBO_CATEGORY,
    kind: 'Combo pack',
    packSize: pack ? `${pack.itemCount || (pack.comboItems || []).length} items` : 'Combo pack',
    quantity: qty,
    unitPrice,
    lineTotal: roundMoney(unitPrice * qty),
  };
};

export const computeOrderTotals = (items, { delivery = 0, discount = 0 } = {}) => {
  const lines = Array.isArray(items) ? items : [];
  const itemsTotal = roundMoney(lines.reduce((sum, line) => sum + lineTotalOf(line), 0));
  const deliveryFee = roundMoney(delivery);
  const orderDiscount = roundMoney(discount);
  return {
    itemsTotal,
    delivery: deliveryFee,
    discount: orderDiscount,
    grandTotal: roundMoney(Math.max(0, itemsTotal + deliveryFee - orderDiscount)),
  };
};

/** Missing prices and labels on a cart line are filled in from the live catalog. */
const catalogFallback = (id) => {
  if (!id) return null;
  if (resolveLineKind(id) === 'Combo pack') return lookupPack(id) ? comboLine(id, 1) : null;
  return lookupProduct(id) ? catalogLine(id, 1) : null;
};

const sanitizeLine = (line) => {
  if (!line || typeof line !== 'object') return null;
  const name = String(line.name || '').trim();
  const id = String(line.id || '').trim();
  if (!name && !id) return null;
  const category = String(line.category || '');
  const fallback = catalogFallback(id);
  const quantity = Math.max(1, Number(line.quantity) || 1);
  const unitPrice = roundMoney(line.unitPrice) || Number(fallback?.unitPrice || 0);
  return {
    id,
    name: name || fallback?.name || '',
    category: category || fallback?.category || '',
    kind: String(line.kind || fallback?.kind || resolveLineKind(id, category)),
    packSize: String(line.packSize || fallback?.packSize || ''),
    quantity,
    unitPrice,
    lineTotal: roundMoney(unitPrice * quantity),
  };
};

const sanitizeCustomer = (value) => {
  const customer = value && typeof value === 'object' ? value : {};
  return {
    name: String(customer.name || '').trim(),
    mobile: String(customer.mobile || '').trim(),
    email: String(customer.email || '').trim(),
    address: String(customer.address || '').trim(),
    city: String(customer.city || '').trim(),
    state: String(customer.state || '').trim(),
    pin: String(customer.pin || '').trim(),
    occasion: String(customer.occasion || ''),
    preferredContact: String(customer.preferredContact || ''),
    notes: String(customer.notes || ''),
  };
};

const migrateStatus = (value) => {
  if (value === 'New') return 'Pending';
  if (value === 'Completed') return 'Delivered';
  return orderStatuses.includes(value) ? value : 'Pending';
};

const migratePaymentStatus = (value, paidAmount, grandTotal) => {
  if (paymentStatuses.includes(value)) return value;
  if (Number(paidAmount) > 0) return Number(paidAmount) >= Number(grandTotal) ? 'Paid' : 'Partial';
  return 'Unpaid';
};

/**
 * Keeps the payment status honest against the amount received. A refund stays a
 * refund whatever was paid, otherwise a settled order is Paid, a part payment is
 * Partial, and nothing received is Unpaid. Without this a record can claim to be
 * part-paid while the money column already shows the full total.
 */
const settlePaymentStatus = (grandTotal, paidAmount, requested) => {
  if (requested === 'Refunded') return 'Refunded';
  const total = roundMoney(grandTotal);
  const paid = roundMoney(paidAmount);
  if (total > 0 && paid >= total) return 'Paid';
  if (paid > 0) return 'Partial';
  return 'Unpaid';
};

const sanitizeOrder = (value) => {
  if (!value || typeof value !== 'object' || !value.reference) return null;
  // Demo rows shipped with the earlier prototype are never real orders, so they are
  // dropped here rather than shown alongside genuine business records.
  if (value.sample) return null;
  const createdAt = value.createdAt || new Date().toISOString();
  const items = (Array.isArray(value.items) ? value.items : []).map(sanitizeLine).filter(Boolean);
  const totals = computeOrderTotals(items, { delivery: value.deliveryFee, discount: value.discount });
  const status = migrateStatus(value.status);
  return {
    reference: String(value.reference),
    createdAt,
    updatedAt: value.updatedAt || createdAt,
    status,
    paymentStatus: migratePaymentStatus(value.paymentStatus, value.paidAmount, totals.grandTotal),
    paidAmount: roundMoney(value.paidAmount),
    channel: String(value.channel || 'Storefront enquiry'),
    paymentMode: String(value.paymentMode || 'Enquiry - confirm by phone'),
    invoiceNumber: String(value.invoiceNumber || ''),
    notes: String(value.notes || ''),
    internalNotes: String(value.internalNotes || ''),
    sourceEnquiry: String(value.sourceEnquiry || ''),
    customer: sanitizeCustomer(value.customer),
    items,
    deliveryFee: totals.delivery,
    discount: totals.discount,
    totals,
    history: Array.isArray(value.history) ? value.history : [],
  };
};

const sortNewestFirst = (orders) =>
  [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

/**
 * Orders written by an earlier build are brought forward on first read: demo rows are
 * dropped, retired statuses are mapped onto the current pipeline and payment state is
 * derived. Nothing is invented - an order either has real lines or it is not an order.
 */
const migrateStoredOrders = () => {
  const stored = readArray(orderStorageKey);
  const orders = sortNewestFirst(stored.map(sanitizeOrder).filter(Boolean));
  const changed = JSON.stringify(stored) !== JSON.stringify(orders);
  if (changed) writeStorage(orderStorageKey, orders);
  return orders;
};

export const listOrders = () => migrateStoredOrders();

export const getOrder = (reference) => listOrders().find((order) => order.reference === reference) || null;

export const createOrderReference = () => {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `ORD-${stamp}${suffix}`;
};

export const nextInvoiceNumber = (orders) => {
  const year = new Date().getFullYear();
  const highest = (Array.isArray(orders) ? orders : []).reduce((max, order) => {
    const match = String(order?.invoiceNumber || '').match(/(\d+)\s*$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `INV-${year}-${String(highest + 1).padStart(4, '0')}`;
};

export const orderUnitCount = (order) =>
  (order?.items || []).reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

export const orderLineKinds = (order) => {
  const kinds = new Set((order?.items || []).map((line) => line.kind));
  return ['Combo pack', 'Gift box'].filter((kind) => kinds.has(kind));
};

/** Progress 0-4 through Pending, Confirmed, Processing, Shipped, Delivered. */
export const orderProgress = (order) => {
  const flow = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
  if (order?.status === 'Cancelled') return 0;
  const index = flow.indexOf(order?.status);
  return index < 0 ? 0 : index;
};

export const outstandingAmount = (order) => {
  if (!order || !isRevenueOrder(order)) return 0;
  if (order.paymentStatus === 'Paid') return 0;
  return roundMoney(Math.max(0, order.totals.grandTotal - (Number(order.paidAmount) || 0)));
};

const persist = (orders) => {
  writeStorage(orderStorageKey, orders);
  const saved = listOrders();
  // Same-tab listeners are told directly; other tabs pick it up through the
  // browser storage event, so both ends refresh without a reload.
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ordersChangedEvent, { detail: saved }));
  return saved;
};

export const onOrdersChanged = (handler) => {
  if (typeof window === 'undefined') return () => {};
  const fromOtherTab = (event) => {
    if (!event.key || event.key === orderStorageKey) handler(migrateStoredOrders());
  };
  const fromThisTab = (event) => handler(event.detail);
  window.addEventListener('storage', fromOtherTab);
  window.addEventListener(ordersChangedEvent, fromThisTab);
  return () => {
    window.removeEventListener('storage', fromOtherTab);
    window.removeEventListener(ordersChangedEvent, fromThisTab);
  };
};

export const createOrder = (payload) => {
  const existing = listOrders();
  const order = sanitizeOrder({
    ...payload,
    reference: payload?.reference || createOrderReference(),
    invoiceNumber: payload?.invoiceNumber || nextInvoiceNumber(existing),
    createdAt: payload?.createdAt || new Date().toISOString(),
    status: migrateStatus(payload?.status),
    paymentStatus: payload?.paymentStatus || 'Unpaid',
    history: [
      {
        at: payload?.createdAt || new Date().toISOString(),
        to: migrateStatus(payload?.status),
        note: 'Order created',
      },
    ],
  });
  if (!order) throw new Error('Order details are incomplete.');
  return persist([order, ...existing]).find((entry) => entry.reference === order.reference) || order;
};

export const createOrderFromEnquiry = (enquiry) => {
  if (!enquiry) return null;
  return createOrder({
    createdAt: enquiry.createdAt || new Date().toISOString(),
    status: 'Pending',
    paymentStatus: 'Unpaid',
    channel: 'Storefront enquiry',
    paymentMode: enquiry.preferredContact ? `Confirm on ${String(enquiry.preferredContact).toLowerCase()}` : 'Enquiry - confirm by phone',
    notes: enquiry.notes || '',
    sourceEnquiry: enquiry.reference || '',
    customer: {
      name: enquiry.name,
      mobile: enquiry.mobile,
      email: enquiry.email,
      address: enquiry.address,
      city: enquiry.city,
      pin: enquiry.pin,
      occasion: enquiry.occasion,
      preferredContact: enquiry.preferredContact,
    },
    items: (enquiry.items || []).map((line) => ({
      id: line.id,
      name: line.name,
      category: line.category,
      kind: resolveLineKind(line.id, line.category),
      packSize: line.packSize,
      quantity: line.quantity,
      unitPrice: line.customerPrice ?? line.unitPrice,
    })),
  });
};

/**
 * Applies a change to one order and returns that order, so a screen can update from
 * the result without reading the whole list back. Returns null when the reference is
 * no longer on record.
 */
const persistOrder = (reference, update) => {
  let updated = null;
  const next = listOrders().map((order) => {
    if (order.reference !== reference) return order;
    updated = update(order);
    return updated;
  });
  if (!updated) return null;
  persist(next);
  return updated;
};

export const updateOrderStatus = (reference, status, note = '') => {
  const at = new Date().toISOString();
  return persistOrder(reference, (order) => ({
    ...order,
    status: migrateStatus(status),
    updatedAt: at,
    history: [
      ...order.history,
      { at, from: order.status, to: migrateStatus(status), note: String(note || '') },
    ],
  }));
};

export const updateOrderPayment = (reference, { paymentStatus, paidAmount } = {}) =>
  persistOrder(reference, (order) => {
    const next = { ...order, updatedAt: new Date().toISOString() };
    if (paymentStatus && paymentStatuses.includes(paymentStatus)) next.paymentStatus = paymentStatus;
    if (paidAmount !== undefined) next.paidAmount = roundMoney(paidAmount);
    // The amount is the fact the operator typed, so the status follows it rather than
    // leaving the record claiming a part payment that has actually been settled.
    next.paymentStatus = settlePaymentStatus(next.totals.grandTotal, next.paidAmount, next.paymentStatus);
    next.totals = computeOrderTotals(next.items, { delivery: next.deliveryFee, discount: next.discount });
    next.paymentStatus = settlePaymentStatus(next.totals.grandTotal, next.paidAmount, next.paymentStatus);
    return next;
  });

export const updateOrderDetails = (reference, patch = {}) =>
  persistOrder(reference, (order) => {
    const items = Array.isArray(patch.items) ? patch.items.map(sanitizeLine).filter(Boolean) : order.items;
    const deliveryFee = patch.deliveryFee ?? order.deliveryFee;
    const discount = patch.discount ?? order.discount;
    return {
      ...order,
      ...patch,
      items,
      deliveryFee: roundMoney(deliveryFee),
      discount: roundMoney(discount),
      totals: computeOrderTotals(items, { delivery: deliveryFee, discount }),
      updatedAt: new Date().toISOString(),
    };
  });

export const deleteOrder = (reference) => persist(listOrders().filter((order) => order.reference !== reference));

/* ------------------------------------------------------------------ analytics */

export const dateRange = (preset = 'all', reference = new Date()) => {
  const end = new Date(reference);
  const start = new Date(end);
  if (preset === 'today') start.setHours(0, 0, 0, 0);
  else if (preset === '7d') start.setDate(start.getDate() - 6);
  else if (preset === '30d') start.setDate(start.getDate() - 29);
  else if (preset === '90d') start.setDate(start.getDate() - 89);
  else if (preset === 'month') start.setDate(1);
  else if (preset === 'year') start.setMonth(0, 1);
  else return { preset, from: null, to: null };
  start.setHours(0, 0, 0, 0);
  return { preset, from: start, to: end };
};

export const filterOrders = (orders, range) => {
  const list = Array.isArray(orders) ? orders : [];
  if (!range || !range.from) return list;
  const from = new Date(range.from).getTime();
  const to = range.to ? new Date(range.to).getTime() : Date.now();
  return list.filter((order) => {
    const at = new Date(order.createdAt).getTime();
    return at >= from && at <= to;
  });
};

export const getOrderStats = (orders) => {
  const list = Array.isArray(orders) ? orders : [];
  const revenueOrders = list.filter(isRevenueOrder);
  const revenue = revenueOrders.reduce((sum, order) => sum + order.totals.grandTotal, 0);
  const openValue = list
    .filter((order) => !isOrderClosed(order))
    .reduce((sum, order) => sum + order.totals.grandTotal, 0);
  const delivered = list.filter((order) => order.status === 'Delivered');
  const byStatus = orderStatuses.reduce((acc, status) => ({ ...acc, [status]: list.filter((order) => order.status === status).length }), {});
  const byPayment = paymentStatuses.reduce((acc, status) => ({ ...acc, [status]: list.filter((order) => order.paymentStatus === status).length }), {});
  return {
    total: list.length,
    revenue: roundMoney(revenue),
    openValue: roundMoney(openValue),
    outstanding: roundMoney(revenueOrders.reduce((sum, order) => sum + outstandingAmount(order), 0)),
    units: list.reduce((sum, order) => sum + orderUnitCount(order), 0),
    average: revenueOrders.length ? roundMoney(revenue / revenueOrders.length) : 0,
    customers: listCustomers(list).length,
    byStatus,
    byPayment,
    delivered: delivered.length,
    cancelled: byStatus.Cancelled,
    pending: byStatus.Pending,
  };
};

const normaliseKey = (value) => String(value || '').replace(/\D/g, '');

/**
 * The customer directory is not a separate list to maintain. It is the set of people
 * who have actually placed an order, matched on mobile number and email.
 */
export const listCustomers = (orders) => {
  const list = Array.isArray(orders) ? orders : [];
  const map = new Map();
  list.forEach((order) => {
    const customer = order.customer || {};
    const key = normaliseKey(customer.mobile) || String(customer.email || '').toLowerCase() || customer.name;
    if (!key) return;
    const existing = map.get(key);
    const total = isRevenueOrder(order) ? order.totals.grandTotal : 0;
    if (!existing) {
      map.set(key, {
        key,
        name: customer.name || 'Unnamed customer',
        mobile: customer.mobile || '',
        email: customer.email || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        pin: customer.pin || '',
        orders: 1,
        units: orderUnitCount(order),
        revenue: total,
        outstanding: outstandingAmount(order),
        firstOrderAt: order.createdAt,
        lastOrderAt: order.createdAt,
        lastStatus: order.status,
        occasions: [customer.occasion].filter(Boolean),
        references: [order.reference],
      });
      return;
    }
    if (customer.address) existing.address = customer.address;
    if (customer.city) existing.city = customer.city;
    if (customer.pin) existing.pin = customer.pin;
    if (customer.occasion && !existing.occasions.includes(customer.occasion)) existing.occasions.push(customer.occasion);
    existing.orders += 1;
    existing.units += orderUnitCount(order);
    existing.revenue = roundMoney(existing.revenue + total);
    existing.outstanding = roundMoney(existing.outstanding + outstandingAmount(order));
    existing.references.push(order.reference);
    if (new Date(order.createdAt) < new Date(existing.firstOrderAt)) existing.firstOrderAt = order.createdAt;
    if (new Date(order.createdAt) > new Date(existing.lastOrderAt)) {
      existing.lastOrderAt = order.createdAt;
      existing.lastStatus = order.status;
    }
  });
  return [...map.values()].sort((a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt));
};

export const getCustomerOrders = (orders, customerKey) =>
  (Array.isArray(orders) ? orders : []).filter((order) => {
    const customer = order.customer || {};
    const key = normaliseKey(customer.mobile) || String(customer.email || '').toLowerCase() || customer.name;
    return key === customerKey;
  });

const dayKey = (value) => new Date(value).toISOString().slice(0, 10);

export const getSalesByDay = (orders, days = 30) => {
  const list = (Array.isArray(orders) ? orders : []).filter(isRevenueOrder);
  const buckets = new Map();
  const today = new Date();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    buckets.set(dayKey(date), { date: dayKey(date), revenue: 0, orders: 0, units: 0 });
  }
  list.forEach((order) => {
    const key = dayKey(order.createdAt);
    if (!buckets.has(key)) return;
    const bucket = buckets.get(key);
    bucket.revenue = roundMoney(bucket.revenue + order.totals.grandTotal);
    bucket.orders += 1;
    bucket.units += orderUnitCount(order);
  });
  return [...buckets.values()];
};

export const getSalesByCategory = (orders) => {
  const totals = new Map();
  (Array.isArray(orders) ? orders : []).filter(isRevenueOrder).forEach((order) => {
    order.items.forEach((line) => {
      const key = line.category || 'Uncategorised';
      const current = totals.get(key) || { category: key, revenue: 0, units: 0, lines: 0 };
      current.revenue = roundMoney(current.revenue + lineTotalOf(line));
      current.units += Number(line.quantity) || 0;
      current.lines += 1;
      totals.set(key, current);
    });
  });
  return [...totals.values()].sort((a, b) => b.revenue - a.revenue);
};

export const getTopProducts = (orders, limit = 8) => {
  const totals = new Map();
  (Array.isArray(orders) ? orders : []).filter(isRevenueOrder).forEach((order) => {
    order.items.forEach((line) => {
      const current = totals.get(line.id) || { id: line.id, name: line.name, category: line.category, units: 0, revenue: 0 };
      current.units += Number(line.quantity) || 0;
      current.revenue = roundMoney(current.revenue + lineTotalOf(line));
      totals.set(line.id, current);
    });
  });
  return [...totals.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, limit);
};

export const getPaymentBreakdown = (orders) =>
  paymentStatuses.map((status) => {
    const matching = (Array.isArray(orders) ? orders : []).filter((order) => order.paymentStatus === status);
    return {
      status,
      tone: paymentStatusTone[status],
      count: matching.length,
      value: roundMoney(matching.reduce((sum, order) => sum + order.totals.grandTotal, 0)),
    };
  });

export const getStatusBreakdown = (orders) =>
  orderStatuses.map((status) => {
    const matching = (Array.isArray(orders) ? orders : []).filter((order) => order.status === status);
    return {
      status,
      tone: orderStatusTone[status],
      help: orderStatusHelp[status],
      count: matching.length,
      value: roundMoney(matching.reduce((sum, order) => sum + order.totals.grandTotal, 0)),
    };
  });

export const getReportSummary = (orders) => {
  const list = Array.isArray(orders) ? orders : [];
  const stats = getOrderStats(list);
  const best = list
    .filter(isRevenueOrder)
    .reduce((top, order) => (order.totals.grandTotal > (top?.totals.grandTotal ?? 0) ? order : top), null);
  return {
    ...stats,
    bestOrder: best,
    salesByDay: getSalesByDay(list, 30),
    salesByCategory: getSalesByCategory(list),
    topProducts: getTopProducts(list),
    payments: getPaymentBreakdown(list),
    statuses: getStatusBreakdown(list),
  };
};
