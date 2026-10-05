import { z } from 'zod';
import {
  CATEGORY_TONES,
  MAX_CART_QUANTITY,
  PRODUCT_SOURCES,
  PRODUCT_STATUSES,
} from '../config/constants.js';
import { identifier, money, requiredText, trimmed } from './common.validator.js';

/** null and '' both mean "not tracked", matching the storefront. */
const stockValue = z
  .union([z.coerce.number().int().min(0), z.null(), z.literal('')])
  .optional()
  .transform((value) => (value === '' || value === undefined ? null : value));

const imageSchema = z.object({
  url: z.string().trim().url('Enter a valid image URL').max(2048),
  alt: trimmed(200).optional().default(''),
});

const baseProduct = {
  name: requiredText(300, 'Product name'),
  code: trimmed(64).optional().nullable(),
  sku: trimmed(64).optional().nullable(),
  category: requiredText(120, 'Category'),
  description: trimmed(5000).optional().default(''),
  images: z.array(imageSchema).max(8, 'A product may hold at most 8 images').optional().default([]),
  packSize: trimmed(120).optional().default('1 Box'),
  packQuantity: z.coerce.number().min(0).optional().default(1),
  packUnit: trimmed(40).optional().default('Box'),
  sellingPrice: money,
  mrp: money.optional(),
  stock: stockValue,
  lowStockThreshold: z.coerce.number().int().min(0).optional().default(5),
  status: z.enum(PRODUCT_STATUSES).optional(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  sourceSerial: z.coerce.number().int().min(0).optional().nullable(),
  source: z.enum(Object.values(PRODUCT_SOURCES)).optional(),
};

export const createProductSchema = z.object({
  body: z
    .object(baseProduct)
    .refine((value) => !value.mrp || value.mrp >= value.sellingPrice, {
      message: 'The original price cannot be lower than the selling price',
      path: ['mrp'],
    }),
});

export const updateProductSchema = z.object({
  body: z
    .object({ ...baseProduct, sellingPrice: money.optional(), name: trimmed(300).min(1, 'Product name is required').optional(), category: trimmed(120).min(1, 'Category is required').optional() })
    .partial()
    .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' }),
});

export const listProductsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: trimmed(120).optional(),
    category: trimmed(120).optional(),
    status: z.enum(PRODUCT_STATUSES).optional(),
    featured: z.enum(['true', 'false']).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    lowStock: z.enum(['true']).optional(),
    sort: trimmed(40).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  }),
});

export const productIdParamSchema = z.object({ id: identifier });

export const updateStockSchema = z.object({
  body: z.object({
    // Absolute set, or a relative adjustment. Exactly one must be supplied.
    stock: z.coerce.number().int().min(0).optional(),
    adjustBy: z.coerce.number().int().min(-100000).max(100000).optional(),
    lowStockThreshold: z.coerce.number().int().min(0).optional(),
    reason: trimmed(300).optional(),
  })
    .refine((value) => (value.stock === undefined) !== (value.adjustBy === undefined), {
      message: 'Provide either stock or adjustBy',
    }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(PRODUCT_STATUSES).optional(),
    isPublished: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  })
    .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
      message: 'Provide status, isPublished or isFeatured',
    }),
});

export const createCategorySchema = z.object({
  body: z.object({
    name: requiredText(120, 'Category name'),
    label: trimmed(120).optional(),
    description: trimmed(2000).optional().default(''),
    image: trimmed(2048).optional().default(''),
    tone: z.enum(CATEGORY_TONES).optional(),
    order: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateCategorySchema = z.object({
  body: z
    .object({
      // A rename is allowed and is cascaded to the products that carry the
      // denormalised category name.
      name: trimmed(120).min(1, 'Category name is required').optional(),
      slug: trimmed(120).optional(),
      label: trimmed(120).optional(),
      description: trimmed(2000).optional(),
      image: trimmed(2048).optional(),
      tone: z.enum(CATEGORY_TONES).optional(),
      order: z.coerce.number().int().min(0).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' }),
});

export const bulkSchema = z.object({
  body: z.object({
    ids: z.array(identifier).min(1, 'Select at least one product').max(MAX_CART_QUANTITY * 10),
    action: z.enum(['activate', 'deactivate', 'feature', 'unfeature', 'delete']),
  }),
});

export { money };
