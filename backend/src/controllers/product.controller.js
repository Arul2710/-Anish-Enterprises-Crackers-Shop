import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from '../utils/response.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Order } from '../models/Order.js';
import { PRODUCT_SOURCES, PRODUCT_STATUS, PRODUCT_STATUSES } from '../config/constants.js';
import { findProductByIdentifier, listCategories, listFeaturedProducts, listProducts } from '../services/product.service.js';
import { uploadImages } from '../services/storage.service.js';
import { trustedOps } from '../utils/trustedOps.js';

// ------------------------------------------------------------------ public
export const getProducts = asyncHandler(async (req, res) => {
  const { items, total, page, pageSize } = await listProducts(req.query);
  return sendPaginated(res, items, { page, pageSize, total });
});

export const getFeaturedProducts = asyncHandler(async (req, res) =>
  sendSuccess(res, { items: await listFeaturedProducts(req.query.limit) }),
);

export const getProduct = asyncHandler(async (req, res) => {
  const product = await findProductByIdentifier(req.params.id);
  return sendSuccess(res, { product });
});

export const getCategories = asyncHandler(async (req, res) =>
  sendSuccess(res, { items: await listCategories() }),
);

// ------------------------------------------------------------------- admin
export const adminListProducts = asyncHandler(async (req, res) => {
  const { items, total, page, pageSize } = await listProducts(req.query, { includeUnpublished: true });
  return sendPaginated(res, items, { page, pageSize, total });
});

export const adminGetProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('That product could not be found.', { code: 'product_not_found' });
  return sendSuccess(res, { product });
});

/** Splits a raw textarea of lines into clean, unique, non-empty strings. */
const parseLines = (value) => {
  if (Array.isArray(value)) return [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))];
  if (typeof value !== 'string') return [];
  return [...new Set(value.split(/[\r\n,]+/).map((entry) => entry.trim()).filter(Boolean))];
};

export const createProduct = asyncHandler(async (req, res) => {
  const body = req.body;

  if (body.code) {
    const clash = await Product.findOne({ code: body.code });
    if (clash) throw ApiError.conflict(`Product code ${body.code} is already used.`, { code: 'duplicate_product_code' });
  }
  if (body.sku) {
    const clash = await Product.findOne({ sku: body.sku });
    if (clash) throw ApiError.conflict(`SKU ${body.sku} is already used.`, { code: 'duplicate_sku' });
  }

  if (body.category) {
    const category = await Category.findOne({ name: body.category });
    if (!category) throw ApiError.unprocessable(`Category "${body.category}" does not exist.`, { code: 'unknown_category' });
    body.categoryRef = category._id;
  }

  const images = [...(body.images || [])];
  if (req.files?.length) {
    const uploaded = await uploadImages(req.files);
    images.push(...uploaded);
  }

  const [product] = await Product.create([
    {
      name: body.name,
      code: body.code || null,
      sku: body.sku || null,
      category: body.category,
      categoryRef: body.categoryRef || null,
      description: body.description || '',
      packSize: body.packSize || '',
      packQuantity: body.packQuantity ?? null,
      packUnit: body.packUnit || '',
      sellingPrice: body.sellingPrice,
      mrp: body.mrp ?? body.sellingPrice,
      // null means untracked, which is different from 0 (out of stock).
      stock: body.stock === undefined ? null : body.stock,
      lowStockThreshold: body.lowStockThreshold ?? undefined,
      status: body.status || PRODUCT_STATUS.ACTIVE,
      isPublished: body.isPublished ?? true,
      isFeatured: body.isFeatured ?? false,
      tags: parseLines(body.tags),
      images,
      source: PRODUCT_SOURCES.MANUAL,
    },
  ]);

  return sendCreated(res, { product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('That product could not be found.', { code: 'product_not_found' });

  const body = req.body;

  if (body.code && body.code !== product.code) {
    const clash = await Product.findOne({ code: body.code, _id: trustedOps({ $ne: product._id }) });
    if (clash) throw ApiError.conflict(`Product code ${body.code} is already used.`, { code: 'duplicate_product_code' });
  }
  if (body.sku && body.sku !== product.sku) {
    const clash = await Product.findOne({ sku: body.sku, _id: trustedOps({ $ne: product._id }) });
    if (clash) throw ApiError.conflict(`SKU ${body.sku} is already used.`, { code: 'duplicate_sku' });
  }
  if (body.category && body.category !== product.category) {
    const category = await Category.findOne({ name: body.category });
    if (!category) throw ApiError.unprocessable(`Category "${body.category}" does not exist.`, { code: 'unknown_category' });
    body.categoryRef = category._id;
  }

  const editable = [
    'name', 'code', 'sku', 'category', 'categoryRef', 'description', 'packSize', 'packQuantity',
    'packUnit', 'sellingPrice', 'mrp', 'lowStockThreshold', 'status', 'isPublished', 'isFeatured',
  ];
  for (const field of editable) {
    if (body[field] !== undefined) product[field] = body[field];
  }
  // Only overwrite stock when the admin actually sent it, so a form that omits
  // the field cannot wipe the real count.
  if (body.stock !== undefined) product.stock = body.stock;
  if (body.tags !== undefined) product.tags = parseLines(body.tags);
  if (body.images !== undefined) product.images = body.images;

  if (req.files?.length) {
    product.images = [...product.images, ...(await uploadImages(req.files))];
  }

  await product.save();
  return sendSuccess(res, { product });
});

export const setStatus = asyncHandler(async (req, res) => {
  const { status, isPublished, isFeatured } = req.body;
  if (status !== undefined && !PRODUCT_STATUSES.includes(status)) {
    throw ApiError.unprocessable(`Status must be one of: ${PRODUCT_STATUSES.join(', ')}.`, { code: 'invalid_status' });
  }

  const patch = {};
  if (status !== undefined) patch.status = status;
  if (isPublished !== undefined) patch.isPublished = isPublished;
  if (isFeatured !== undefined) patch.isFeatured = isFeatured;

  const product = await Product.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
  if (!product) throw ApiError.notFound('That product could not be found.', { code: 'product_not_found' });
  return sendSuccess(res, { product });
});

/** Targeted stock change used by the admin +/- control. */
export const adjustStock = asyncHandler(async (req, res) => {
  const { stock, adjustBy, reason, lowStockThreshold } = req.body;

  const update = {};
  if (stock !== undefined) update.stock = stock;
  else update.$inc = { stock: adjustBy };
  if (lowStockThreshold !== undefined) update.lowStockThreshold = lowStockThreshold;

  // A relative adjustment must not be allowed to drive stock negative, so the
  // guard lives inside the query rather than in a prior read.
  const guard = stock === undefined ? { stock: trustedOps({ $gte: Math.max(0, -adjustBy) }) } : {};

  const product = await Product.findOneAndUpdate({ _id: req.params.id, ...guard }, update, { new: true, runValidators: true });
  if (!product) {
    throw ApiError.conflict('That adjustment would take stock below zero.', { code: 'insufficient_stock' });
  }

  return sendSuccess(res, { product, reason: reason || '' });
});

/** Bulk activate / deactivate / feature / delete from the admin table. */
export const bulkUpdate = asyncHandler(async (req, res) => {
  const { ids, action } = req.body;
  const inIds = { _id: trustedOps({ $in: ids }) };

  if (action === 'delete') {
    // Products on an order are deactivated rather than deleted.
    const referenced = await Order.distinct('items.product', { 'items.product': trustedOps({ $in: ids }) });
    const safeToDelete = ids.filter((id) => !referenced.map(String).includes(String(id)));
    const blocked = ids.filter((id) => !safeToDelete.includes(id));
    const result = await Product.deleteMany({ _id: trustedOps({ $in: safeToDelete }) });
    if (blocked.length) await Product.updateMany({ _id: trustedOps({ $in: blocked }) }, { status: PRODUCT_STATUS.INACTIVE, isPublished: false });
    return sendSuccess(res, { deleted: result.deletedCount, deactivated: blocked.length });
  }

  const patch = {
    activate: { status: PRODUCT_STATUS.ACTIVE, isPublished: true },
    deactivate: { status: PRODUCT_STATUS.INACTIVE, isPublished: false },
    feature: { isFeatured: true },
    unfeature: { isFeatured: false },
  }[action];

  const result = await Product.updateMany(inIds, patch);
  return sendSuccess(res, { matched: result.matchedCount, modified: result.modifiedCount });
});

export const removeProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('That product could not be found.', { code: 'product_not_found' });

  // A product referenced by an order is deactivated rather than deleted, so
  // historical order lines keep resolving.
  const referenced = await Order.countDocuments({ 'items.product': product._id });
  if (referenced > 0) {
    product.status = PRODUCT_STATUS.INACTIVE;
    product.isPublished = false;
    await product.save();
    return sendSuccess(res, { product, deactivated: true, reason: `referenced by ${referenced} order line(s)` });
  }

  await product.deleteOne();
  return sendNoContent(res);
});

