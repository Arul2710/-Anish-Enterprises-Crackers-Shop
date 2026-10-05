import { env } from '../config/env.js';
import { Settings } from '../models/Settings.js';
import { ApiError } from '../utils/ApiError.js';

/** Reads the singleton settings document, creating it from schema defaults once. */
export const getSettings = async ({ session } = {}) => {
  const existing = await Settings.findOne({ key: 'shop' }).session(session || null);
  if (existing) return existing;
  try {
    return await Settings.create([{ key: 'shop' }], { session });
  } catch {
    // Lost a creation race; re-read the winner.
    const created = await Settings.findOne({ key: 'shop' }).session(session || null);
    if (created) return created;
    throw new Error('Could not load shop settings');
  }
};

export const updateSettings = async (patch, { session } = {}) => {
  const settings = await getSettings({ session });
  settings.set(patch);
  await settings.save({ session });
  return settings;
};

export const publicSettingsView = (settings) => {
  const plain = settings.toObject({ virtuals: true });
  return {
    shopName: plain.shopName,
    logo: plain.logo,
    contact: plain.contact,
    social: plain.social,
    delivery: plain.delivery,
    payments: { enabledMethods: plain.payments.enabledMethods, pricing: plain.payments.pricing },
    minimumOrderAmount: plain.minimumOrderAmount,
    allowEnquiryOnly: plain.allowEnquiryOnly,
    announcement: plain.announcement,
    updatedAt: plain.updatedAt,
  };
};

/** Shop-owner view, which also exposes the import price mapping. */
export const adminSettingsView = (settings) => {
  const plain = settings.toObject({ virtuals: true });
  return { ...plain, importPriceMapping: plain.importPriceMapping };
};

export const importPriceMapping = (settings) => settings.importPriceMapping || {};

export const isPriceMappingConfirmed = (settings) =>
  Boolean(settings?.importPriceMapping?.confirmed && settings.importPriceMapping.sellingPriceColumn);

/**
 * Records the owner's confirmation of which workbook column carries the
 * customer-facing selling price, stamping who confirmed it and when. Nothing
 * else in the codebase is allowed to set `confirmed`.
 */
export const confirmImportPriceMapping = async (mapping, { admin } = {}) => {
  const sellingPriceColumn = String(mapping.sellingPriceColumn || '').trim();
  if (!sellingPriceColumn) {
    throw ApiError.unprocessable('Choose the column that holds the customer-facing selling price.', {
      code: 'selling_price_column_required',
    });
  }

  const settings = await getSettings();
  settings.importPriceMapping = {
    ...(settings.importPriceMapping?.toObject?.() || {}),
    sheetName: mapping.sheetName ?? settings.importPriceMapping?.sheetName,
    nameColumn: mapping.nameColumn ?? settings.importPriceMapping?.nameColumn,
    skuColumn: mapping.skuColumn ?? settings.importPriceMapping?.skuColumn,
    categoryColumn: mapping.categoryColumn ?? settings.importPriceMapping?.categoryColumn,
    packColumn: mapping.packColumn ?? settings.importPriceMapping?.packColumn,
    sellingPriceColumn,
    originalPriceColumn: mapping.originalPriceColumn ?? settings.importPriceMapping?.originalPriceColumn ?? null,
    confirmed: true,
    confirmedBy: admin?._id || null,
    confirmedAt: new Date(),
  };
  await settings.save();
  return settings;
};

export { env };
