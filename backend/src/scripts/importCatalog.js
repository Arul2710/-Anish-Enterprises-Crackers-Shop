/**
 * Repeatable catalogue import from a workbook, from the command line.
 *
 * Everything here is a thin wrapper around the same service the admin UI uses
 * (services/import.service.js), so a CLI import and a browser import cannot
 * drift apart in how they parse, validate or de-duplicate.
 *
 * Safety rules this script will not break:
 *  - It previews by default and writes nothing. Writes need an explicit --commit.
 *  - It never guesses the selling-price column. Without a confirmed column it
 *    prints the price-like columns it detected and stops.
 *  - Re-running the same workbook is refused by the duplicate-file check.
 *
 * Usage:
 *   npm run import:catalog -- "Order Crackers 2026.xlsx"
 *   npm run import:catalog -- "Order Crackers 2026.xlsx" --commit
 *   npm run import:catalog -- "Order Crackers 2026.xlsx" --commit --selling-price-column "NET RATE"
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { Admin } from '../models/Admin.js';
import { commitImport, previewImport } from '../services/import.service.js';
import { logger } from '../utils/logger.js';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[index + 1] : null;
};

const positional = argv.filter((entry, index) => {
  if (entry.startsWith('--')) return false;
  // Skip a value that belongs to the preceding option.
  const previous = argv[index - 1];
  return !(previous && ['--selling-price-column', '--original-price-column', '--sheet', '--admin'].includes(previous));
});

const USAGE = [
  'Usage: npm run import:catalog -- <workbook.xlsx> [options]',
  '',
  '  --commit                       write the rows (default is preview only)',
  '  --sheet <name>                 worksheet to read (default: the configured sheet)',
  '  --selling-price-column <hdr>   confirm the customer-facing price column',
  '  --original-price-column <hdr>  confirm the MRP / original price column',
  '  --no-update                    skip products that already exist instead of updating them',
  '  --admin <email>                stamp the import with an existing admin account',
].join('\n');

const printSummary = (title, summary, extra = {}) => {
  logger.info(title, {
    ...summary,
    ...extra,
  });
};

const fail = (message, meta) => {
  logger.error(message, meta);
  process.exitCode = 1;
};

const run = async () => {
  const filePath = positional[0];

  if (flag('--help') || flag('-h') || !filePath) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  const resolved = path.resolve(filePath);
  let buffer;
  try {
    buffer = await fs.readFile(resolved);
  } catch (error) {
    throw new Error(`Could not read ${resolved}: ${error.message}`);
  }

  const file = { buffer, originalname: path.basename(resolved), mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };

  const sellingPriceColumn = option('--selling-price-column');
  const originalPriceColumn = option('--original-price-column');
  const sheetName = option('--sheet');
  const mappingOverride = {
    ...(sellingPriceColumn ? { sellingPriceColumn } : {}),
    ...(originalPriceColumn ? { originalPriceColumn } : {}),
    ...(sheetName ? { sheetName } : {}),
  };

  await connectDatabase();

  let admin = null;
  const adminEmail = option('--admin');
  if (adminEmail) {
    admin = await Admin.findOne({ email: adminEmail.toLowerCase().trim() });
    if (!admin) throw new Error(`No admin account found for ${adminEmail}.`);
  }

  const preview = await previewImport(file, { admin, mappingOverride });

  logger.info('workbook analysed', {
    file: file.originalname,
    sheet: preview.sheetName,
    sheetsAvailable: preview.sheetNames,
    headerRow: preview.headerRowNumber,
    categoriesDetected: preview.categoryCount,
    columnsDetected: preview.headers,
    priceLikeColumns: preview.detectedPriceColumns.map((column) => column.header),
    columnsNotFound: preview.unmapped,
  });
  printSummary('row summary (nothing has been written)', preview.summary, {
    categoryHeadingRowsSkipped: preview.summary.categoryRows,
    blankRowsSkipped: preview.summary.emptyRows,
  });

  if (!preview.importable) {
    fail('this import is not ready to commit', {
      reason: preview.priceMapping.blockedReason,
      sellingPriceColumnUsed: preview.priceMapping.sellingPriceColumn,
      hint: 're-run with --selling-price-column "<exact header text>" once the owner confirms which column is the customer-facing price',
    });
    return;
  }

  if (!flag('--commit')) {
    logger.info('preview only. nothing was written.', {
      next: 're-run the same command with --commit to write these rows',
      sellingPriceColumn: preview.priceMapping.sellingPriceColumn,
      originalPriceColumn: preview.priceMapping.originalPriceColumn,
    });
    return;
  }

  const result = await commitImport({
    file,
    admin,
    options: {
      ...mappingOverride,
      sellingPriceColumn: preview.priceMapping.sellingPriceColumn,
      originalPriceColumn: preview.priceMapping.originalPriceColumn,
      updateExisting: flag('--no-update') ? false : true,
    },
  });

  printSummary('import committed', result.summary, {
    importId: result.importId,
    sheet: result.sheetName,
    categories: result.categories,
    durationMs: result.durationMs,
  });

  const failedRows = result.rows.filter((row) => row.action === 'failed');
  if (failedRows.length) {
    logger.warn('rows that were not written', {
      count: failedRows.length,
      firstFew: failedRows.slice(0, 10).map((row) => ({ row: row.rowNumber, reason: row.reason })),
    });
  }
};

run()
  .catch((error) => {
    fail(error.message, { code: error.code, details: error.details });
  })
  .finally(async () => {
    await disconnectDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  });
