import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';
import { safePattern } from '../utils/sanitize.js';
import { isValidObjectId } from '../utils/ids.js';
import { trustedOps } from '../utils/trustedOps.js';
import { SORTABLE_PRODUCT_FIELDS, getPagination, getSort } from '../utils/pagination.js';

/** Turns validated query parameters into a Mongo filter. */
export const buildProductFilter = (query = {}, { includeUnpublished = false } = {}) => {
  const filter = {};

  if (query.search) {
    // Escaped so a search term can never act as a regex injection vector.
    const pattern = new RegExp(safePattern(query.search), 'i');
    filter.$or = [{ name: pattern }, { code: pattern }, { sku: pattern }, { category: pattern }, { packSize: pattern }];
  }
  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;
  else if (!includeUnpublished) filter.status = 'active';

  if (!includeUnpublished) filter.isPublished = true;

  if (query.featured === 'true') filter.isFeatured = true;
  if (query.featured === 'false') filter.isFeatured = false;

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.sellingPrice = trustedOps({});
    if (query.minPrice !== undefined) filter.sellingPrice.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.sellingPrice.$lte = query.maxPrice;
  }

  if (query.inStock === 'true') {
    // null means untracked, which counts as available.
    filter.$or = [...(filter.$or || []), { stock: null }, { stock: trustedOps({ $gt: 0 }) }];
  } else if (query.inStock === 'false') {
    filter.stock = 0;
  }

  if (query.lowStock === 'true') {
    filter.stock = trustedOps({ $ne: null, $gt: 0, $lte: 5 });
  }

  return filter;
};

/** Resolves an id that may be an ObjectId, a product code, or a legacy string id. */
export const findProductByIdentifier = async (identifier, { session, includeUnpublished = false } = {}) => {
  const query = isValidObjectId(identifier)
    ? { _id: identifier }
    : { $or: [{ code: identifier }, { sku: identifier }, { sourceSerial: Number(identifier) || -1 }] };

  const filter = { ...query };
  if (!includeUnpublished) filter.isPublished = true;

  const product = await Product.findOne(filter).session(session || null);
  if (!product) throw ApiError.notFound('That product could not be found.', { code: 'product_not_found' });
  return product;
};

/** Loads the products a cart refers to, keyed by id, skipping anything missing. */
export const loadProductsById = async (ids, { session } = {}) => {
  const unique = [...new Set(ids.map(String))].filter(Boolean);
  if (!unique.length) return new Map();
  const products = await Product.find({ _id: trustedOps({ $in: unique }) }).session(session || null);
  return new Map(products.map((product) => [String(product._id), product]));
};

export const listProducts = async (query = {}, { includeUnpublished = false } = {}) => {
  const { page, pageSize, skip } = getPagination(query);
  const filter = buildProductFilter(query, { includeUnpublished });
  const sort = getSort(query, SORTABLE_PRODUCT_FIELDS, 'createdAt');

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(pageSize).lean({ virtuals: true }),
    Product.countDocuments(filter),
  ]);

  return { items, total, page, pageSize };
};

export const listCategories = async ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  return Category.find(filter).sort({ order: 1, name: 1 }).lean();
};

export const listFeaturedProducts = async (limit = 8) => {
  const safeLimit = Math.min(24, Math.max(1, Number(limit) || 8));
  return Product.find({ status: 'active', isPublished: true, isFeatured: true })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean({ virtuals: true });
};

export const lowStockProducts = async (limit = 10) => {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  return Product.find({ status: 'active', isPublished: true, stock: trustedOps({ $ne: null, $lte: 5 }) })
    .sort({ stock: 1 })
    .limit(safeLimit)
    .lean();
};
