import { Router } from 'express';
import {
  adminGetProduct,
  adminListProducts,
  adjustStock,
  bulkUpdate,
  createProduct,
  getProduct,
  getProducts,
  removeProduct,
  setStatus,
  updateProduct,
} from '../controllers/product.controller.js';
import { requireAuth, requirePermission } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { handleUpload, imageUpload } from '../middleware/upload.middleware.js';
import { writeLimiter } from '../middleware/rateLimit.middleware.js';
import { PERMISSION } from '../config/constants.js';
import {
  bulkSchema,
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
  updateStatusSchema,
  updateStockSchema,
} from '../validators/product.validator.js';

const router = Router();

/**
 * `/admin/...` is declared before the public `/:id` patterns so an admin path
 * can never be swallowed by the public id route.
 */

// ------------------------------------------------------------------- admin
router.get(
  '/admin',
  requireAuth,
  requirePermission(PERMISSION.PRODUCTS_VIEW),
  validate(listProductsQuerySchema),
  adminListProducts,
);

router.post(
  '/bulk',
  requireAuth,
  requirePermission(PERMISSION.PRODUCTS_WRITE),
  writeLimiter,
  validate(bulkSchema),
  bulkUpdate,
);

router.get(
  '/admin/:id',
  requireAuth,
  requirePermission(PERMISSION.PRODUCTS_VIEW),
  validate(productIdParamSchema),
  adminGetProduct,
);

router.post(
  '/',
  requireAuth,
  requirePermission(PERMISSION.PRODUCTS_WRITE),
  writeLimiter,
  validate(createProductSchema),
  handleUpload(imageUpload),
  createProduct,
);

router.patch(
  '/:id/status',
  requireAuth,
  requirePermission(PERMISSION.PRODUCTS_WRITE),
  writeLimiter,
  validate(updateStatusSchema),
  setStatus,
);

router.patch(
  '/:id/stock',
  requireAuth,
  requirePermission(PERMISSION.INVENTORY_WRITE),
  writeLimiter,
  validate(updateStockSchema),
  adjustStock,
);

router.patch(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.PRODUCTS_WRITE),
  writeLimiter,
  validate(updateProductSchema),
  handleUpload(imageUpload),
  updateProduct,
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.PRODUCTS_WRITE),
  writeLimiter,
  validate(productIdParamSchema),
  removeProduct,
);

// ------------------------------------------------------------------ public
router.get('/', validate(listProductsQuerySchema), getProducts);
router.get('/:id', validate(productIdParamSchema), getProduct);

export default router;
