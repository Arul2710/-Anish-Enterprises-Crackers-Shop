import { Router } from 'express';
import {
  confirmPriceMapping,
  getAdminSettings,
  getPublicSettings,
  patchSettings,
} from '../controllers/settings.controller.js';
import { requireAuth, requirePermission } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { handleUpload, imageUpload } from '../middleware/upload.middleware.js';
import { writeLimiter } from '../middleware/rateLimit.middleware.js';
import { PERMISSION } from '../config/constants.js';
import { priceMappingSchema, updateSettingsSchema } from '../validators/settings.validator.js';

const router = Router();

// The storefront needs shop details to render contact and delivery copy.
router.get('/', getPublicSettings);

router.patch(
  '/',
  requireAuth,
  requirePermission(PERMISSION.SETTINGS_WRITE),
  writeLimiter,
  validate(updateSettingsSchema),
  handleUpload(imageUpload),
  patchSettings,
);

router.get('/admin', requireAuth, requirePermission(PERMISSION.SETTINGS_VIEW), getAdminSettings);

/** The owner states which workbook column is the selling price. Nothing infers it. */
router.post(
  '/import-price-mapping',
  requireAuth,
  requirePermission(PERMISSION.SETTINGS_WRITE),
  writeLimiter,
  validate(priceMappingSchema),
  confirmPriceMapping,
);

export default router;
