import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import { getDashboard, salesReport } from '../services/dashboard.service.js';
import { listProducts, lowStockProducts } from '../services/product.service.js';
import { Customer } from '../models/Customer.js';
import { listOrders } from '../services/order.service.js';
import { getPagination } from '../utils/pagination.js';

export const summary = asyncHandler(async (req, res) => sendSuccess(res, { dashboard: await getDashboard({ days: req.query.days }) }));

export const report = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (from && Number.isNaN(new Date(from).getTime())) throw ApiError.badRequest('"from" is not a valid date.', { code: 'invalid_date' });
  if (to && Number.isNaN(new Date(to).getTime())) throw ApiError.badRequest('"to" is not a valid date.', { code: 'invalid_date' });
  return sendSuccess(res, await salesReport({ from, to }));
});

export const stock = asyncHandler(async (req, res) => sendSuccess(res, { items: await lowStockProducts(req.query.limit) }));

export const catalogue = asyncHandler(async (req, res) => {
  const { items, total, page, pageSize } = await listProducts(req.query, { includeUnpublished: true });
  return sendPaginated(res, items, { page, pageSize, total });
});

export const orders = asyncHandler(async (req, res) => {
  const { items, total, page, pageSize } = await listOrders(req.query);
  return sendPaginated(res, items, { page, pageSize, total });
});

export const customers = asyncHandler(async (req, res) => {
  const { page, pageSize, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    Customer.find({}).sort({ lastOrderAt: -1, createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    Customer.countDocuments({}),
  ]);
  return sendPaginated(res, items, { page, pageSize, total });
});
