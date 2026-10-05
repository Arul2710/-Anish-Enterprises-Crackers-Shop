import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { adminSettingsView, confirmImportPriceMapping, getSettings, publicSettingsView, updateSettings } from '../services/settings.service.js';
import { storageStatus, uploadImages } from '../services/storage.service.js';
import { logger } from '../utils/logger.js';

export const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  return sendSuccess(res, { settings: publicSettingsView(settings) });
});

export const getAdminSettings = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  return sendSuccess(res, { settings: adminSettingsView(settings), storage: storageStatus() });
});

/**
 * Partial update. Only the groups actually present in the body are touched, so
 * a form that submits one field cannot blank out the rest of the shop profile.
 */
export const patchSettings = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const patch = {};
  const assign = (key, value) => {
    if (value !== undefined) patch[key] = value;
  };

  assign('shopName', body.shopName);
  assign('allowEnquiryOnly', body.allowEnquiryOnly);
  assign('minimumOrderAmount', body.minimumOrderAmount);
  assign('lowStockThreshold', body.lowStockThreshold);

  for (const group of ['contact', 'social', 'delivery', 'announcement']) {
    if (body[group] && typeof body[group] === 'object') {
      const nested = {};
      for (const [key, value] of Object.entries(body[group])) {
        if (value !== undefined) nested[key] = value;
      }
      if (Object.keys(nested).length) patch[group] = nested;
    }
  }

  if (body.payments && typeof body.payments === 'object') {
    const nested = {};
    if (body.payments.enabledMethods !== undefined) nested.enabledMethods = body.payments.enabledMethods;
    if (body.payments.pricing && typeof body.payments.pricing === 'object') nested.pricing = body.payments.pricing;
    if (Object.keys(nested).length) patch.payments = nested;
  }

  if (req.files?.length) {
    const [uploaded] = await uploadImages(req.files);
    patch.logo = { url: uploaded.url, publicId: uploaded.publicId, alt: body.logoAlt || '' };
  } else if (body.logoUrl) {
    // The form submits a URL and alt text; the model stores them together.
    patch.logo = { url: body.logoUrl, publicId: '', alt: body.logoAlt || '' };
  } else if (body.logo === null) {
    patch.logo = null;
  }

  const settings = await updateSettings(patch);
  logger.info('shop settings updated', { by: String(req.admin._id), fields: Object.keys(patch) });
  return sendSuccess(res, { settings: adminSettingsView(settings) });
});

/** The owner's explicit confirmation of the Excel selling-price column. */
export const confirmPriceMapping = asyncHandler(async (req, res) => {
  const settings = await confirmImportPriceMapping(req.body, { admin: req.admin });
  logger.info('import price mapping confirmed', {
    by: String(req.admin._id),
    sellingPriceColumn: settings.importPriceMapping.sellingPriceColumn,
  });
  return sendSuccess(res, { mapping: settings.importPriceMapping, settings: adminSettingsView(settings) });
});
