import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { roundMoney } from '../utils/money.js';
import { trustedOps } from '../utils/trustedOps.js';
import { OPEN_ORDER_STATUSES, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, SETTLED_PAYMENT_STATUSES } from '../config/constants.js';
import { isSettled } from './order.service.js';

const startOfDay = (reference = new Date()) => {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Dashboard figures only count orders whose payment is actually settled, so
 * unpaid enquiries never inflate revenue.
 */
export const getDashboard = async ({ days = 30 } = {}) => {
  const windowDays = Math.min(365, Math.max(1, Number(days) || 30));
  const since = startOfDay();
  since.setDate(since.getDate() - (windowDays - 1));

  const [totalProducts, activeProducts, totalCustomers, openOrders, lowStock, recentOrders, settledOrders, paidUnverified] =
    await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ status: 'active', isPublished: true }),
      Customer.countDocuments({}),
      Order.countDocuments({ status: trustedOps({ $in: OPEN_ORDER_STATUSES }) }),
      Product.find({ status: 'active', isPublished: true, stock: trustedOps({ $ne: null, $lte: 5 }) })
        .sort({ stock: 1 })
        .limit(10)
        .lean(),
      Order.find({}).sort({ createdAt: -1 }).limit(10).lean({ virtuals: true }),
      Order.find({ createdAt: trustedOps({ $gte: since }), paymentStatus: trustedOps({ $in: SETTLED_PAYMENT_STATUSES }) })
        .select('total totalSavings itemsTotal deliveryFee discount paymentStatus createdAt customerSnapshot reference')
        .lean(),
      Order.countDocuments({ paymentStatus: PAYMENT_STATUS.PAID, paymentVerifiedAt: null }),
    ]);

  const windowOrders = await Order.find({ createdAt: trustedOps({ $gte: since }) })
    .select('status total paymentStatus createdAt')
    .lean();

  const today = startOfDay();
  const inWindow = (date) => new Date(date) >= since;

  const revenue = settledOrders.reduce((sum, order) => sum + order.total, 0);
  const savings = settledOrders.reduce((sum, order) => sum + (order.totalSavings || 0), 0);

  const todayOrders = windowOrders.filter((order) => new Date(order.createdAt) >= today);
  const todaySettled = await Order.find({
    createdAt: trustedOps({ $gte: today }),
    paymentStatus: trustedOps({ $in: SETTLED_PAYMENT_STATUSES }),
  }).select('total');

  const statusCounts = Object.values(ORDER_STATUS).reduce((acc, status) => {
    acc[status] = windowOrders.filter((order) => order.status === status).length;
    return acc;
  }, {});

  const byDay = new Map();
  for (let offset = 0; offset < windowDays; offset += 1) {
    const day = new Date(since);
    day.setDate(since.getDate() + offset);
    byDay.set(day.toISOString().slice(0, 10), { date: day.toISOString().slice(0, 10), orders: 0, revenue: 0 });
  }
  for (const order of settledOrders) {
    if (!inWindow(order.createdAt)) continue;
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.orders += 1;
    bucket.revenue = roundMoney(bucket.revenue + order.total);
  }

  const methodCounts = await Order.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$paymentMethod', count: { $sum: 1 }, value: { $sum: '$total' } } },
  ]);

  return {
    window: { days: windowDays, from: since, to: new Date() },
    totals: {
      revenue: roundMoney(revenue),
      savings: roundMoney(savings),
      orders: windowOrders.length,
      settledOrders: settledOrders.length,
      pendingPayment: windowOrders.filter((order) => !SETTLED_PAYMENT_STATUSES.includes(order.paymentStatus)).length,
      openOrders,
      totalProducts,
      activeProducts,
      totalCustomers,
      averageOrderValue: settledOrders.length ? roundMoney(revenue / settledOrders.length) : 0,
    },
    today: {
      orders: todayOrders.length,
      revenue: roundMoney(todaySettled.reduce((sum, order) => sum + order.total, 0)),
    },
    statusCounts,
    paymentMethods: methodCounts.map((row) => ({
      method: row._id || PAYMENT_METHOD.ENQUIRY_CONFIRM,
      count: row.count,
      value: roundMoney(row.value),
    })),
    lowStock: lowStock.map((product) => ({
      id: String(product._id),
      name: product.name,
      code: product.code,
      stock: product.stock,
      sellingPrice: product.sellingPrice,
    })),
    recentOrders: recentOrders.map((order) => ({
      id: String(order._id),
      reference: order.reference,
      customerName: order.customerSnapshot?.name || '',
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
    })),
    alerts: {
      lowStockCount: lowStock.length,
      // Surfaced so the owner is never shown revenue they have not confirmed.
      paidButUnverified: paidUnverified,
    },
  };
};

export const salesReport = async ({ from, to } = {}) => {
  const start = from ? new Date(from) : startOfDay();
  const end = to ? new Date(to) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { orders: [], totals: { revenue: 0, orders: 0 } };
  }

  const orders = await Order.find({
    createdAt: trustedOps({ $gte: start, $lte: end }),
    paymentStatus: trustedOps({ $in: SETTLED_PAYMENT_STATUSES }),
  })
    .select('reference createdAt total totalSavings paymentMethod paymentStatus items')
    .sort({ createdAt: 1 })
    .lean();

  const totals = orders.reduce(
    (acc, order) => {
      acc.revenue = roundMoney(acc.revenue + order.total);
      acc.savings = roundMoney(acc.savings + (order.totalSavings || 0));
      acc.units += order.items.reduce((sum, item) => sum + item.quantity, 0);
      acc.orders += 1;
      return acc;
    },
    { revenue: 0, savings: 0, units: 0, orders: 0 },
  );

  return {
    orders: orders.map((order) => ({
      id: String(order._id),
      reference: order.reference,
      createdAt: order.createdAt,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      units: order.items.reduce((sum, item) => sum + item.quantity, 0),
    })),
    totals,
  };
};

export { isSettled };
