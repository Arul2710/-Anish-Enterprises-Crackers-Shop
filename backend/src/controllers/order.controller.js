import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sendCreated, sendPaginated, sendSuccess } from '../utils/response.js';
import { Customer } from '../models/Customer.js';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../config/constants.js';
import { CART_COOKIE, findOrCreateCart } from '../services/cart.service.js';
import {
  assertOrderAccess,
  findOrder,
  findOrderByReference,
  listOrders,
  placeOrder,
  updateOrderPayment,
  updateOrderStatus,
} from '../services/order.service.js';
import { getSettings } from '../services/settings.service.js';
import { getPagination } from '../utils/pagination.js';
import { escapeRegExp } from '../utils/ids.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const ORDER_ACCESS_COOKIE = 'ae_order_access';

/**
 * The order access token is stored in an httpOnly cookie scoped to /api/orders
 * so a customer can only read their own order, and the plaintext is never kept
 * server side.
 */
const setAccessCookie = (res, reference, accessToken) => {
  res.cookie(`${ORDER_ACCESS_COOKIE}_${reference}`, accessToken, {
    httpOnly: true,
    secure: env.SECURE_COOKIES,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/api/orders',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });
};

const readAccessToken = (req, reference) =>
  req.cookies?.[`${ORDER_ACCESS_COOKIE}_${reference}`] || req.query?.token || null;

// ------------------------------------------------------------------ public
/** Checkout options the storefront needs before rendering the order form. */
export const getCheckoutOptions = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const plain = settings.toObject({ virtuals: true });
  return sendSuccess(res, {
    options: {
      minimumOrderAmount: plain.minimumOrderAmount,
      allowEnquiryOnly: plain.allowEnquiryOnly,
      delivery: plain.delivery,
      paymentMethods: plain.payments.enabledMethods,
      announcement: plain.announcement,
    },
  });
});

export const placeCustomerOrder = asyncHandler(async (req, res) => {
  const cart = await findOrCreateCart(req.cookies?.[CART_COOKIE]);
  const { order, accessToken } = await placeOrder({ cart, payload: req.body });

  setAccessCookie(res, order.reference, accessToken);
  logger.info('order placed', { reference: order.reference, total: order.total, items: order.items.length });

  return sendCreated(res, {
    order: order.publicView(),
    // Given once, in the body, so the customer can bookmark their order.
    accessToken,
    accessUrl: `/track-order?reference=${order.reference}`,
  });
});

export const getCustomerOrder = asyncHandler(async (req, res) => {
  const order = await findOrderByReference(req.params.reference, { withAccessHash: true });
  assertOrderAccess(order, { accessToken: readAccessToken(req, order.reference), admin: req.admin });
  return sendSuccess(res, { order: order.publicView() });
});

// ------------------------------------------------------------------- admin
export const listAllOrders = asyncHandler(async (req, res) => {
  if (req.query.status && !ORDER_STATUSES.includes(req.query.status)) {
    throw ApiError.badRequest(`Unknown status "${req.query.status}".`, { code: 'invalid_status' });
  }
  if (req.query.paymentStatus && !PAYMENT_STATUSES.includes(req.query.paymentStatus)) {
    throw ApiError.badRequest(`Unknown payment status "${req.query.paymentStatus}".`, { code: 'invalid_payment_status' });
  }
  const { items, total, page, pageSize } = await listOrders(req.query);
  return sendPaginated(res, items, { page, pageSize, total });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id);
  return sendSuccess(res, { order });
});

export const setOrderStatus = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id);
  const updated = await updateOrderStatus(order, { status: req.body.status, note: req.body.note, admin: req.admin });
  logger.info('order status changed', {
    reference: updated.reference,
    to: updated.status,
    by: String(req.admin._id),
  });
  return sendSuccess(res, { order: updated });
});

export const setOrderPayment = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id);
  const updated = await updateOrderPayment(order, { ...req.body, admin: req.admin });
  logger.info('order payment updated', {
    reference: updated.reference,
    to: updated.paymentStatus,
    by: String(req.admin._id),
  });
  return sendSuccess(res, { order: updated });
});

export const listCustomers = asyncHandler(async (req, res) => {
  const { page, pageSize, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.search) {
    const pattern = new RegExp(escapeRegExp(req.query.search), 'i');
    filter.$or = [{ name: pattern }, { phone: pattern }, { email: pattern }];
  }

  const [items, total] = await Promise.all([
    Customer.find(filter).sort({ lastOrderAt: -1, createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    Customer.countDocuments(filter),
  ]);

  return sendPaginated(res, items, { page, pageSize, total });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('That customer could not be found.', { code: 'customer_not_found' });
  const orders = await listOrders({ search: customer.phone, pageSize: 20 });
  return sendSuccess(res, { customer, orders: orders.items });
});

