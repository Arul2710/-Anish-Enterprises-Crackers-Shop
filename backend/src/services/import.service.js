import { ImportLog } from '../models/ImportLog.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify } from '../utils/ids.js';
import { trustedOps } from '../utils/trustedOps.js';
import { PRODUCT_SOURCES, PRODUCT_STATUS } from '../config/constants.js';
import { analyseWorkbook, categoryLabel, categoryTone, hashBuffer } from './excel.service.js';
import { getSettings, isPriceMappingConfirmed } from './settings.service.js';

const currentMapping = (settings) => settings.importPriceMapping?.toObject?.() || {};

/**
 * Parses an uploaded workbook and reports what it found without writing
 * anything. This is the step the owner reviews before committing.
 */
export const previewImport = async (file, { admin, mappingOverride } = {}) => {
  const buffer = file.buffer;
  const settings = await getSettings();
  const fileHash = hashBuffer(buffer);

  // Already committed: refuse a second import of the identical file.
  const existing = await ImportLog.findOne({ fileHash, status: 'committed' });
  if (existing) {
    throw ApiError.conflict(
      `This workbook was already imported on ${new Date(existing.createdAt).toISOString()}. ${existing.summary.created} product(s) were created.`,
      { code: 'duplicate_import', details: { importId: String(existing._id), summary: existing.summary } },
    );
  }

  const mapping = { ...currentMapping(settings), ...(mappingOverride || {}) };
  const analysis = analyseWorkbook(buffer, { sheetName: mapping.sheetName, mapping });

  // The selling price column is never inferred. Committing stays blocked until
  // the owner confirms one, either previously in settings or in this request.
  const overrideColumn = mappingOverride?.sellingPriceColumn || null;
  const confirmedInSettings = isPriceMappingConfirmed(settings);
  const mappingConfirmed = Boolean(overrideColumn || confirmedInSettings) && analysis.readyToImport;
  const effectiveColumn = overrideColumn || mapping.sellingPriceColumn || null;

  const [log] = await ImportLog.create([
    {
      fileName: file.originalname,
      fileHash,
      sheetName: analysis.sheetName,
      status: 'previewed',
      mode: 'preview',
      priceMapping: {
        confirmed: Boolean(mappingConfirmed),
        sellingPriceColumn: effectiveColumn,
        originalPriceColumn: mapping.originalPriceColumn || null,
      },
      detectedColumns: analysis.headers,
      detectedCategories: analysis.categories,
      summary: {
        totalRows: analysis.summary.totalRows,
        validRows: analysis.summary.validRows,
        invalidRows: analysis.summary.invalidRows,
        created: 0,
        updated: 0,
        skipped: analysis.summary.categoryRows + analysis.summary.emptyRows,
        failed: analysis.summary.invalidRows,
      },
      rows: analysis.rows
        .filter((row) => row.kind === 'product')
        .map((row) => ({
          rowNumber: row.rowNumber,
          action: row.valid ? 'valid' : 'invalid',
          reason: row.valid ? 'ready to import' : row.errors.join('; '),
          issues: row.errors,
          snapshot: {
            name: row.name,
            category: row.category,
            sku: row.sku,
            sellingPrice: row.sellingPrice,
            originalPrice: row.originalPrice,
            packSize: row.packSize,
          },
        })),
      performedBy: admin?._id || null,
    },
  ]);

  return {
    importId: String(log._id),
    fileHash,
    sheetNames: analysis.sheetNames,
    sheetName: analysis.sheetName,
    headerRowNumber: analysis.headerRowNumber,
    headers: analysis.headers,
    detectedPriceColumns: analysis.detectedPriceColumns,
    detectedCategories: analysis.categories,
    categoryCount: analysis.categoryCount,
    unmapped: analysis.unmapped,
    summary: analysis.summary,
    rows: analysis.rows,
    priceMapping: {
      confirmed: Boolean(mappingConfirmed),
      sellingPriceColumn: effectiveColumn,
      originalPriceColumn: mapping.originalPriceColumn || null,
      // Tells the UI exactly what to ask the owner for.
      blockedReason: analysis.unmapped.length
        ? `These columns could not be located in the sheet: ${analysis.unmapped.join(', ')}. Choose them from the detected list.`
        : confirmedInSettings || overrideColumn
          ? null
          : 'Confirm which column is the customer-facing selling price before importing.',
    },
    importable: mappingConfirmed,
  };
};

/**
 * Writes the validated rows. Only rows the preview already accepted are written,
 * and only once the owner has confirmed the price mapping.
 */
export const commitImport = async ({ file, admin, options = {} }) => {
  const settings = await getSettings();

  if (!isPriceMappingConfirmed(settings) && !options.sellingPriceColumn) {
    throw ApiError.unprocessable(
      'Confirm which workbook column is the customer-facing selling price before importing.',
      { code: 'price_mapping_unconfirmed' },
    );
  }

  const buffer = file?.buffer;
  if (!buffer) throw ApiError.badRequest('Re-upload the workbook to continue.', { code: 'file_required' });

  const fileHash = hashBuffer(buffer);
  const duplicate = await ImportLog.findOne({ fileHash, status: 'committed' });
  if (duplicate) {
    throw ApiError.conflict('This workbook has already been imported.', {
      code: 'duplicate_import',
      details: { importId: String(duplicate._id) },
    });
  }

  const mapping = { ...currentMapping(settings), ...options };
  const started = Date.now();
  const analysis = analyseWorkbook(buffer, { sheetName: mapping.sheetName, mapping });

  if (!analysis.readyToImport) {
    throw ApiError.unprocessable('The workbook still has unmapped columns. Review the preview and confirm the mapping.', {
      code: 'import_not_ready',
      details: { unmapped: analysis.unmapped, invalidRows: analysis.summary.invalidRows },
    });
  }

  const included = options.includeRows?.length ? new Set(options.includeRows) : null;
  const allowedCategories = options.categories?.length ? new Set(options.categories) : null;

  // Categories first, so every product can reference one.
  const categoryDocs = await syncCategories(analysis.categories, admin);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const rowResults = [];
  const touchedProductIds = [];

  for (const row of analysis.rows) {
    if (row.kind !== 'product') {
      skipped += 1;
      continue;
    }
    if (!row.valid) {
      failed += 1;
      rowResults.push({ rowNumber: row.rowNumber, action: 'failed', reason: row.errors.join('; '), issues: row.errors });
      continue;
    }
    if (included && !included.has(row.rowNumber)) {
      skipped += 1;
      rowResults.push({ rowNumber: row.rowNumber, action: 'skipped', reason: 'not selected for import' });
      continue;
    }
    if (allowedCategories && !allowedCategories.has(row.category)) {
      skipped += 1;
      rowResults.push({ rowNumber: row.rowNumber, action: 'skipped', reason: 'category not selected' });
      continue;
    }

    const categoryDoc = categoryDocs.get(row.category);
    try {
      const payload = {
        name: row.name,
        sku: row.sku,
        code: row.sku ? `SS26-${String(row.sku).padStart(3, '0')}` : null,
        category: row.category,
        categoryRef: categoryDoc?._id || null,
        sellingPrice: row.sellingPrice,
        mrp: row.originalPrice && row.originalPrice > 0 ? row.originalPrice : row.sellingPrice,
        packSize: row.packSize,
        packQuantity: row.packQuantity,
        packUnit: row.packUnit,
        source: PRODUCT_SOURCES.EXCEL,
        sourceSerial: Number.isFinite(row.sourceSerial) ? row.sourceSerial : null,
        // The sheet carries no reliable stock figure, so it is left untracked
        // rather than invented as a number the shop would have to correct.
        stock: null,
        status: PRODUCT_STATUS.ACTIVE,
        isPublished: true,
      };

      const lookup = row.sku
        ? { $or: [{ sku: row.sku }, ...(payload.sourceSerial !== null ? [{ sourceSerial: payload.sourceSerial }] : [])] }
        : { name: row.name, category: row.category };

      const existing = await Product.findOne(lookup);

      if (existing) {
        if (options.updateExisting === false) {
          skipped += 1;
          rowResults.push({ rowNumber: row.rowNumber, action: 'skipped', reason: 'already exists and updates are disabled', productId: String(existing._id) });
          continue;
        }
        // Price and description are refreshed; stock and publish state are the
        // shop's own data and are deliberately left alone.
        existing.set({
          name: payload.name,
          category: payload.category,
          categoryRef: payload.categoryRef,
          sellingPrice: payload.sellingPrice,
          mrp: payload.mrp,
          packSize: payload.packSize,
          packQuantity: payload.packQuantity,
          packUnit: payload.packUnit,
          source: PRODUCT_SOURCES.EXCEL,
        });
        await existing.save();
        updated += 1;
        touchedProductIds.push(existing._id);
        rowResults.push({ rowNumber: row.rowNumber, action: 'updated', productId: String(existing._id), snapshot: payload });
      } else {
        const [doc] = await Product.create([payload]);
        created += 1;
        touchedProductIds.push(doc._id);
        rowResults.push({ rowNumber: row.rowNumber, action: 'created', productId: String(doc._id), snapshot: payload });
      }
    } catch (error) {
      // One bad row must not abandon the rest of the batch.
      failed += 1;
      rowResults.push({ rowNumber: row.rowNumber, action: 'failed', reason: error.message, issues: [error.message] });
    }
  }

  const [log] = await ImportLog.create([
    {
      fileName: file.originalname,
      fileHash,
      sheetName: analysis.sheetName,
      status: 'committed',
      mode: 'commit',
      priceMapping: {
        confirmed: true,
        sellingPriceColumn: mapping.sellingPriceColumn || null,
        originalPriceColumn: mapping.originalPriceColumn || null,
      },
      detectedColumns: analysis.headers,
      detectedCategories: analysis.categories,
      summary: {
        totalRows: analysis.summary.totalRows,
        validRows: analysis.summary.validRows,
        invalidRows: analysis.summary.invalidRows,
        created,
        updated,
        skipped,
        failed,
      },
      rows: rowResults,
      performedBy: admin?._id || null,
      durationMs: Date.now() - started,
    },
  ]);

  // Stamp the batch id only on the rows this run actually wrote.
  if (touchedProductIds.length) {
    await Product.updateMany({ _id: trustedOps({ $in: touchedProductIds }) }, { $set: { importBatchId: log._id } });
  }

  return {
    importId: String(log._id),
    summary: {
      totalRows: analysis.summary.totalRows,
      validRows: analysis.summary.validRows,
      invalidRows: analysis.summary.invalidRows,
      created,
      updated,
      skipped,
      failed,
    },
    sheetName: analysis.sheetName,
    categories: analysis.categories.length,
    rows: rowResults,
    durationMs: Date.now() - started,
  };
};

/** Creates any category the workbook mentions but the catalogue does not have. */
const syncCategories = async (categoryNames, admin) => {
  const map = new Map();
  const existing = await Category.find({ name: trustedOps({ $in: categoryNames }) });
  for (const doc of existing) map.set(doc.name, doc);

  for (const [index, name] of categoryNames.entries()) {
    if (map.has(name)) continue;
    // slug is required and unique, so it has to be derived here.
    const slug = slugify(name);
    const [created] = await Category.create([
      {
        name,
        slug,
        label: categoryLabel(name),
        tone: categoryTone(index),
        order: index,
        isActive: true,
        createdBy: admin?._id || null,
      },
    ]);
    map.set(name, created);
  }

  return map;
};

export const recentImports = async (limit = 10) => {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  return ImportLog.find({}).sort({ createdAt: -1 }).limit(safeLimit).lean();
};
