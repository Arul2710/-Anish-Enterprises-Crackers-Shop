import { ApiError } from './ApiError.js';
import { SORTABLE_ORDER_FIELDS, SORTABLE_PRODUCT_FIELDS } from '../config/constants.js';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Reads page/pageSize from the query string. Values are coerced and bounded so a
 * caller cannot request an unbounded result set.
 */
export const getPagination = (query = {}) => {
  const page = toPositiveInt(query.page, 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, toPositiveInt(query.limit ?? query.pageSize, DEFAULT_PAGE_SIZE));
  return { page, pageSize, skip: (page - 1) * pageSize };
};

/**
 * Whitelists a sort field against a known list. An unknown field is rejected
 * rather than passed through, which keeps untrusted input out of the query.
 */
export const getSort = (query = {}, allowedFields = SORTABLE_PRODUCT_FIELDS, fallback = 'createdAt') => {
  const requested = String(query.sort || '').trim();
  const direction = String(query.order || query.direction || 'desc').toLowerCase() === 'asc' ? 1 : -1;

  if (!requested) return { [fallback]: direction };

  const normalized = requested.startsWith('-') ? requested.slice(1) : requested.replace(/^\+/, '');
  const descending = requested.startsWith('-') ? -1 : direction;
  if (!allowedFields.includes(normalized)) {
    throw ApiError.badRequest(`Cannot sort by "${normalized}". Allowed fields: ${allowedFields.join(', ')}.`);
  }
  return { [normalized]: descending };
};

/** Builds the `meta` block that accompanies a paginated list response. */
export const buildPageMeta = ({ page, pageSize }, total) => ({
  page,
  pageSize,
  total,
  totalPages: pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1,
  hasNext: page * pageSize < total,
  hasPrevious: page > 1,
});

export { SORTABLE_ORDER_FIELDS, SORTABLE_PRODUCT_FIELDS };
