import { Router } from 'express';
import {
  adminGetCategories,
  createCategory,
  getCategories,
  removeCategory,
  updateCategory,
} from '../controllers/category.controller.js';
import { requireAuth, requirePermission } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { handleUpload, imageUpload } from '../middleware/upload.middleware.js';
import { writeLimiter } from '../middleware/rateLimit.middleware.js';
import { PERMISSION } from '../config/constants.js';
import { productIdParamSchema, createCategorySchema, updateCategorySchema } from '../validators/product.validator.js';

const router = Router();

router.get('/', getCategories);

router.get('/admin', requireAuth, requirePermission(PERMISSION.PRODUCTS_VIEW), adminGetCategories);

router.post('/', requireAuth, requirePermission(PERMISSION.PRODUCTS_WRITE), writeLimiter, validate(createCategorySchema), createCategory);

router.patch(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.PRODUCTS_WRITE),
  writeLimiter,
  validate(productIdParamSchema, 'params'),
  validate(updateCategorySchema),
  handleUpload(imageUpload),
  updateCategory,
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.PRODUCTS_WRITE),
  writeLimiter,
  validate(productIdParamSchema, 'params'),
  removeCategory,
);

export default router;
