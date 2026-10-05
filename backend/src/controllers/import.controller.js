import { asyncHandler } from '../utils/asyncHandler.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import { commitImport, previewImport, recentImports } from '../services/import.service.js';
import { getSettings, isPriceMappingConfirmed } from '../services/settings.service.js';
import { getPagination } from '../utils/pagination.js';
import { ImportLog } from '../models/ImportLog.js';
import { logger } from '../utils/logger.js';

/**
 * Upload a workbook and see what would happen, without writing a single product.
 * `confirm` and the column overrides let the owner confirm the selling-price
 * column in the same step, which is what unlocks committing.
 */
export const preview = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendSuccess(res, { fileRequired: true, message: 'Attach a workbook as the "file" field.' });
  }

  const result = await previewImport(req.file, {
    admin: req.admin,
    mappingOverride: {
      sheetName: req.body?.sheetName,
      sellingPriceColumn: req.body?.sellingPriceColumn || undefined,
      originalPriceColumn: req.body?.originalPriceColumn || undefined,
    },
  });

  logger.info('import previewed', {
    by: String(req.admin._id),
    file: req.file.originalname,
    rows: result.summary?.productRows,
    importable: result.importable,
  });

  return sendSuccess(res, result);
});

/** Writes the accepted rows. Requires a confirmed selling-price mapping. */
export const commit = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendSuccess(res, { fileRequired: true, message: 'Attach the same workbook again as the "file" field.' });
  }

  const result = await commitImport({
    file: req.file,
    admin: req.admin,
    options: {
      sheetName: req.body?.sheetName,
      sellingPriceColumn: req.body?.sellingPriceColumn || undefined,
      originalPriceColumn: req.body?.originalPriceColumn || undefined,
      updateExisting: req.body?.updateExisting !== false && req.body?.updateExisting !== 'false',
      includeRows: parseRowList(req.body?.includeRows),
      categories: parseRowList(req.body?.categories),
    },
  });

  logger.info('import committed', {
    by: String(req.admin._id),
    file: req.file.originalname,
    created: result.summary.created,
    updated: result.summary.updated,
    failed: result.summary.failed,
  });

  return sendSuccess(res, result);
});

const parseRowList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

/** Current mapping state, so the UI can show what still needs confirming. */
export const mappingStatus = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const plain = settings.toObject({ virtuals: true });
  return sendSuccess(res, {
    mapping: plain.importPriceMapping,
    confirmed: isPriceMappingConfirmed(settings),
  });
});

export const history = asyncHandler(async (req, res) => {
  const { page, pageSize, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    ImportLog.find({}).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    ImportLog.countDocuments({}),
  ]);
  return sendPaginated(res, items, { page, pageSize, total });
});

export const recent = asyncHandler(async (req, res) => sendSuccess(res, { items: await recentImports(req.query.limit) }));

export const getLog = asyncHandler(async (req, res) => {
  const log = await ImportLog.findById(req.params.id);
  if (!log) return sendSuccess(res, { found: false });
  return sendSuccess(res, { log });
});
