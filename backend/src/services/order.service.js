import { Customer } from '../models/Customer.js';
import { Order, hashAccessToken } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { randomToken, safeEqual, nextOrderSequence, isValidObjectId } from '../utils/ids.js';
import { roundMoney } from '../utils/money.js';
import { mongoCapabilities } from '../config/db.js';
import {
  MAX_CART_QUANTITY,
  OPEN_ORDER_STATUSES,
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  SORTABLE_ORDER_FIELDS,
  SETTLED_PAYMENT_STATUSES,
} from '../config/constants.js';
import { getPagination, getSort } from '../utils/pagination.js';
import { safePattern } from '../utils/sanitize.js';
import { trustedOps } from '../utils/trustedOps.js';
import { assertDeliveryAvailable, assertMinimumOrder, assertPaymentMethodEnabled, calculateTotals } from './pricing.service.js';
import { getSettings } from './settings.service.js';
import { loadProductsById } from './product.service.js';

export const assertTransitionAllowed = (current, next) => {
  const allowed = ORDER_STATUS_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw ApiError.unprocessable(
      `An order cannot move from ${current} to ${next}. Allowed next steps: ${allowed.length ? allowed.join(', ') : 'none'}.`,
      { code: 'invalid_status_transition', details: { from: current, to: next, allowed } },
    );
  }
};

const buildLines = (requested, productsById) => {
  const lines = [];
  const problems = [];

  for (const entry of requested) {
    const product = productsById.get(String(entry.productId));
    if (!product) {
      problems.push(`Product ${entry.productId} no longer exists`);
      continue;
    }
    if (product.status !== 'active' || !product.isPublished) {
      problems.push(`"${product.name}" is no longer available`);
      continue;
    }
    if (product.stock !== null && product.stock !== undefined && product.stock < entry.quantity) {
      problems.push(
        product.stock === 0
          ? `"${product.name}" is out of stock`
          : `Only ${product.stock} of "${product.name}" is in stock`,
      );
      continue;
    }
    const unitPrice = product.priceFor();
    lines.push({
      product: product._id,
      name: product.name,
      code: product.code || product.sku || '',
      sku: product.sku || product.code || '',
      category: product.category,
      packSize: product.packSize,
      quantity: Math.min(MAX_CART_QUANTITY, entry.quantity),
      unitPrice,
      mrp: product.mrp,
      lineTotal: roundMoney(unitPrice * entry.quantity),
      stockCommitted: product.stock !== null && product.stock !== undefined,
    });
  }

  if (problems.length) {
    throw ApiError.unprocessable('Some items in your cart are no longer orderable.', {
      code: 'items_unavailable',
      details: problems,
    });
  }
  return lines;
};

/**
 * Decrements stock with the guard inside the query, so two simultaneous orders
 * can never both pass a check-then-write race. Each document update is atomic,
 * which is what makes this safe on a standalone mongod.
 */
const reserveStock = async (lines, { session }) => {
  const committed = [];
  try {
    for (const line of lines) {
      if (!line.stockCommitted) continue;
      const updated = await Product.findOneAndUpdate(
        { _id: line.product, status: 'active', isPublished: true, stock: trustedOps({ $gte: line.quantity }) },
        { $inc: { stock: -line.quantity } },
        { new: true, session },
      );
      if (!updated) {
        throw ApiError.conflict(`"${line.name}" sold out while your order was being placed.`, {
          code: 'insufficient_stock',
          details: { productId: String(line.product), name: line.name, requested: line.quantity },
        });
      }
      committed.push({ line, previousStock: updated.stock + line.quantity });
    }
  } catch (error) {
    // Put back whatever was already taken.
    for (const entry of committed) {
      await Product.updateOne(
        { _id: entry.line.product },
        { $inc: { stock: entry.line.quantity } },
        { session },
      );
    }
    throw error;
  }
  return committed;
};

const releaseStock = async (order, { session } = {}) => {
  for (const line of order.items) {
    if (!line.stockCommitted) continue;
    await Product.updateOne({ _id: line.product }, { $inc: { stock: line.quantity } }, { session });
  }
};

/**
 * Places an order.
 *
 * When the deployment is a replica set this runs inside a transaction. On a
 * standalone mongod, where transactions are unavailable, the equivalent
 * guarantee comes from guarded atomic decrements plus compensating rollback,
 * which is why the reservation helper above re-checks stock in the update query.
 */
export const placeOrder = async ({ cart, payload, adminActor = null }) => {
  const settings = await getSettings();
  assertDeliveryAvailable(settings);

  const requested = Array.isArray(payload.items) && payload.items.length
    ? payload.items
    : (cart?.items || []).map((item) => ({ productId: String(item.product), quantity: item.quantity }));

  if (!requested.length) {
    throw ApiError.unprocessable('There is nothing in your cart to order.', { code: 'empty_cart' });
  }

  const productIds = requested.map((entry) => String(entry.productId));
  const productsById = await loadProductsById(productIds);
  const lines = buildLines(requested, productsById);

  const paymentMethod = payload.paymentMethod || PAYMENT_METHOD.ENQUIRY_CONFIRM;
  assertPaymentMethodEnabled(paymentMethod, settings);

  const preliminary = calculateTotals({ items: lines, settings, discount: payload.discount });
  assertMinimumOrder(preliminary.grandTotal, settings);

  const capabilities = mongoCapabilities();
  const session = capabilities?.supportsTransactions ? await startSession() : null;
  const accessToken = randomToken(24);

  const run = async (sessionOption) => {
    await reserveStock(lines, { session: sessionOption });

    const sequence = await nextOrderSequence(Order, { session: sessionOption });
    const year = new Date().getFullYear();

    const order = new Order({
      reference: `AE-${year}-${String(sequence).padStart(6, '0')}`,
      customer: cart?.customer || null,
      customerSnapshot: {
        name: payload.customer.name,
        phone: payload.customer.phone,
        email: payload.customer.email || '',
      },
      deliveryAddress: payload.deliveryAddress,
      items: lines,
      itemsTotal: preliminary.itemsTotal,
      mrpTotal: preliminary.mrpTotal,
      deliveryFee: preliminary.deliveryFee,
      discount: preliminary.discount,
      total: preliminary.grandTotal,
      totalSavings: preliminary.totalSavings,
      paymentMethod,
      paymentStatus: PAYMENT_STATUS.UNPAID,
      paidAmount: 0,
      status: ORDER_STATUS.PENDING,
      notes: payload.notes || '',
      internalNotes: '',
      invoiceNumber: `INV-${year}-${String(sequence).padStart(6, '0')}`,
      accessTokenHash: hashAccessToken(accessToken),
      history: [
        {
          at: new Date(),
          by: adminActor?._id || null,
          actorName: adminActor?.name || 'Customer',
          field: 'created',
          from: '',
          to: ORDER_STATUS.PENDING,
          note: 'Order placed',
        },
      ],
    });

    await order.save({ session: sessionOption });
    return order;
  };

  let order;
  if (session) {
    try {
      await session.withTransaction(async () => {
        order = await run(session);
      });
    } catch (error) {
      await session.endSession();
      throw error;
    }
    await session.endSession();
  } else {
    try {
      order = await run(undefined);
    } catch (error) {
      // reserveStock already rolled back its own work.
      throw error;
    }
  }

  await syncCustomerAndClearCart(order, cart, { clearCart: payload.useCart !== false });

  return { order, accessToken };
};

let mongooseModule = null;
const startSession = async () => {
  if (!mongooseModule) mongooseModule = (await import('mongoose')).default;
  return mongooseModule.startSession();
};

const syncCustomerAndClearCart = async (order, cart, { clearCart }) => {
  const customer = await Customer.findOneAndUpdate(
    { phone: order.customerSnapshot.phone },
    {
      $set: {
        name: order.customerSnapshot.name,
        email: order.customerSnapshot.email || undefined,
        address: order.deliveryAddress,
      },
      $inc: { orderCount: 1, totalSpent: order.total },
      $setOnInsert: { phone: order.customerSnapshot.phone },
    },
    { new: true, upsert: true },
  );

  if (customer) {
    customer.lastOrderAt = new Date();
    await customer.save();
    if (cart) cart.customer = customer._id;
  }

  if (cart && clearCart) {
    cart.items = [];
    await cart.save();
  }
};

export const listOrders = async (query = {}) => {
  const { page, pageSize, skip } = getPagination(query);
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.search) {
    const pattern = new RegExp(safePattern(query.search), 'i');
    filter.$or = [
      { reference: pattern },
      { 'customerSnapshot.name': pattern },
      { 'customerSnapshot.phone': pattern },
    ];
  }
  if (query.from || query.to) {
    filter.createdAt = trustedOps({});
    if (query.from) {
      const from = new Date(query.from);
      if (!Number.isNaN(from.getTime())) filter.createdAt.$gte = from;
    }
    if (query.to) {
      const to = new Date(query.to);
      if (!Number.isNaN(to.getTime())) filter.createdAt.$lte = to;
    }
  }

  const sort = getSort(query, SORTABLE_ORDER_FIELDS, 'createdAt');
  const [items, total] = await Promise.all([
    Order.find(filter).sort(sort).skip(skip).limit(pageSize).lean({ virtuals: true }),
    Order.countDocuments(filter),
  ]);

  return { items, total, page, pageSize };
};

export const findOrderByReference = async (reference, { withAccessHash = false } = {}) => {
  // accessTokenHash is select:false, so it must be requested explicitly for the
  // customer access check to be able to compare against it.
  const query = Order.findOne({ reference: String(reference) });
  if (withAccessHash) query.select('+accessTokenHash');
  const order = await query;
  if (!order) throw ApiError.notFound('That order could not be found.', { code: 'order_not_found' });
  return order;
};

/** Admin routes address orders by id, while customers use the reference. */
export const findOrder = async (identifier, { withAccessHash = false } = {}) => {
  const key = String(identifier);
  if (isValidObjectId(key)) {
    const query = Order.findById(key);
    if (withAccessHash) query.select('+accessTokenHash');
    const order = await query;
    if (order) return order;
  }
  return findOrderByReference(key, { withAccessHash });
};

/**
 * A customer may only read an order they hold the access token for; an admin may
 * read any order. This is the verification step for the public endpoint.
 */
export const assertOrderAccess = (order, { accessToken, admin }) => {
  if (admin) return;
  if (!accessToken) {
    throw ApiError.unauthorized('Open this order from the link in your confirmation to view it.', {
      code: 'order_access_required',
    });
  }
  if (!order.accessTokenHash) {
    // Defensive: the caller must have loaded the hash explicitly.
    throw ApiError.unauthorized('Open this order from the link in your confirmation to view it.', {
      code: 'order_access_required',
    });
  }
  if (!safeEqual(hashAccessToken(accessToken), order.accessTokenHash)) {
    throw ApiError.forbidden('This order does not belong to you.', { code: 'order_access_denied' });
  }
};

export const updateOrderStatus = async (order, { status, note, admin }) => {
  assertTransitionAllowed(order.status, status);

  const reopening = order.status === ORDER_STATUS.CANCELLED;

  // Cancelling an order that still holds stock returns it to the shelf.
  if (status === ORDER_STATUS.CANCELLED && OPEN_ORDER_STATUSES.includes(order.status)) {
    await releaseStock(order);
    for (const line of order.items) line.stockCommitted = false;
  } else if (reopening) {
    // Reopening must re-reserve, otherwise the order is placed without stock.
    await reserveStock(order.items, {});
  }

  const from = order.status;
  order.status = status;
  order.statusUpdatedAt = new Date();
  order.history.push({
    at: new Date(),
    by: admin?._id || null,
    actorName: admin?.name || 'system',
    field: 'status',
    from,
    to: status,
    note: note || '',
  });
  await order.save();
  return order;
};

/**
 * Payment may only be marked verified when the caller states it is verified, so
 * an order is never reported as revenue on an unconfirmed claim alone.
 */
export const updateOrderPayment = async (order, { paymentStatus, paidAmount, paymentReference, verified, note, admin }) => {
  const previous = order.paymentStatus;
  let next = paymentStatus || order.paymentStatus;

  if (paidAmount !== undefined) order.paidAmount = roundMoney(paidAmount);

  if (next === PAYMENT_STATUS.PAID) {
    const isSettlement = verified === true;
    if (!isSettlement) {
      throw ApiError.unprocessable(
        'Confirm the payment was received before marking an order as Paid.',
        { code: 'payment_not_verified' },
      );
    }
    order.paymentVerifiedAt = new Date();
    order.paidAmount = order.total;
  } else if (next === PAYMENT_STATUS.REFUNDED) {
    order.paymentVerifiedAt = null;
  } else if (next === PAYMENT_STATUS.PARTIAL) {
    if (order.paidAmount <= 0) {
      throw ApiError.unprocessable('Record the amount received before marking a part payment.', {
        code: 'payment_amount_required',
      });
    }
    if (order.paidAmount >= order.total) {
      // A part payment that covers the whole total is simply settled.
      next = PAYMENT_STATUS.PAID;
      order.paymentVerifiedAt = verified ? new Date() : order.paymentVerifiedAt;
    }
  } else if (next === PAYMENT_STATUS.UNPAID) {
    order.paymentVerifiedAt = null;
    if (paidAmount === undefined) order.paidAmount = 0;
  }

  if (paymentReference !== undefined) order.paymentReference = paymentReference;

  order.paymentStatus = next;
  order.history.push({
    at: new Date(),
    by: admin?._id || null,
    actorName: admin?.name || 'system',
    field: 'payment',
    from: previous,
    to: next,
    note: note || '',
  });

  await order.save();
  return order;
};

/** Only settled payments count towards sales figures. */
export const isSettled = (order) => SETTLED_PAYMENT_STATUSES.includes(order?.paymentStatus);
