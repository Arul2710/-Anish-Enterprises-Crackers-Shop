import crypto from 'node:crypto';
import * as XLSX from 'xlsx';
import { ApiError } from '../utils/ApiError.js';
import { roundMoney } from '../utils/money.js';
import { CATEGORY_TONES, MAX_CART_QUANTITY } from '../config/constants.js';

/**
 * Reads a workbook into a plain array-of-arrays.
 *
 * Array form is used deliberately instead of sheet_to_json's object form: every
 * value is then addressed by column index that this module chose itself, so no
 * attacker-controlled key from the file can ever become an object property.
 */
export const readWorkbook = (buffer) => {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellNF: false, sheetStubs: true });
  } catch (error) {
    throw ApiError.badRequest('That workbook could not be read. Please re-save it as a standard .xlsx file.', {
      code: 'unreadable_workbook',
      cause: error,
    });
  }

  if (!workbook.SheetNames?.length) {
    throw ApiError.badRequest('That workbook has no worksheets.', { code: 'empty_workbook' });
  }

  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '', blankrows: true });
    return { name, rows };
  });

  return { sheetNames: workbook.SheetNames, sheets };
};

export const hashBuffer = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const cellText = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
};

const cellNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = cellText(value).replace(/[₹,\s]/g, '');
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

const isBlankRow = (row) => !Array.isArray(row) || row.every((cell) => cellText(cell) === '');

/** Finds the header row by scoring how many known column words it contains. */
const HEADER_HINTS = [
  'name', 'product', 'item', 'particular', 'description',
  'sku', 'code', 'sr', 'sno', 'serial', 'no',
  'category', 'group', 'type',
  'rate', 'mrp', 'price', 'amount', 'net', 'selling', 'customer',
  'pack', 'qty', 'quantity', 'size', 'unit',
];

const findHeaderRow = (rows) => {
  const limit = Math.min(rows.length, 25);
  let best = { index: 0, score: -1 };
  for (let index = 0; index < limit; index += 1) {
    const row = rows[index] || [];
    const texts = row.map((cell) => cellText(cell).toLowerCase());
    const filled = texts.filter(Boolean).length;
    if (filled < 2) continue;
    const score = texts.reduce((total, text) => (text && HEADER_HINTS.some((hint) => text.includes(hint)) ? total + 1 : total), 0);
    if (score > best.score) best = { index, score };
  }
  return best.score > 0 ? best.index : -1;
};

const normaliseHeader = (value) => cellText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Resolves a configured logical column name to a physical index in the sheet.
 * Matching is tolerant of spacing and punctuation but never fuzzy-guesses a
 * price column: an unresolvable mapping is reported instead of assumed.
 */
const resolveColumn = (headers, wanted) => {
  if (!wanted) return -1;
  const target = normaliseHeader(wanted);
  if (!target) return -1;
  const exact = headers.findIndex((header) => header === target);
  if (exact >= 0) return exact;
  const partial = headers.findIndex((header) => header && (header.includes(target) || target.includes(header)));
  return partial;
};

/** Columns that look like they could carry a price, surfaced for owner review. */
const detectPriceColumns = (headers) =>
  headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => /rate|mrp|price|amount|net|selling|value|cost/.test(header))
    .map(({ header, index }) => ({ index, header }));

/**
 * A category heading in these sheets is a row with text in the leading columns
 * and nothing in the rest. Returns the heading text, or null for a product row.
 */
const readCategoryHeading = (row, nameIndex) => {
  const limit = nameIndex >= 0 ? nameIndex + 1 : row.length;
  const leading = row.slice(0, limit).map((cell) => cellText(cell));
  const trailing = row.slice(limit).map((cell) => cellText(cell));
  const heading = leading.find(Boolean);
  if (!heading) return null;
  if (trailing.some(Boolean)) return null;
  // A lone number is a stray value, not a category.
  if (/^[\d.,]+$/.test(heading)) return null;
  if (heading.length > 120) return null;
  return heading;
};

export const parsePack = (value) => {
  const text = cellText(value);
  if (!text) return { packSize: '1 Box', packQuantity: 1, packUnit: 'Box' };
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
  if (match) {
    const quantity = Number(match[1]);
    const unit = match[2].trim();
    // The sheet is inconsistent about casing ("1 bag" vs "1 Box"); normalise it.
    const packUnit = unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
    return { packSize: text, packQuantity: Number.isFinite(quantity) ? quantity : 1, packUnit };
  }
  return { packSize: text, packQuantity: 1, packUnit: 'Box' };
};

/** Presentation labels for the sheet's known misspellings. */
const LABEL_OVERRIDES = {
  'WALA ITEAM': 'Wala Item',
  'SINGLE FLASH CRACKERS': 'Single Flash Bombs',
  'BOMB VARITIES': 'Bombs',
  'ROCKET VAIETY': 'Rockets',
  'STICK VARITIES': 'Handheld Sticks',
  'CRACKERS GIFT BOX': 'Gift Boxes',
  'NEW ARRIVALS 2026': 'New Arrivals 2026',
  'GROUND CHAKKAR VARITIES': 'Ground Chakkar',
  'TWINKLING STAR': 'Twinkling Stars',
  'FLOWER POT': 'Flower Pots',
  'ROCK N ROLL': 'Rock N Roll',
  'PEACOCK VARITIES': 'Peacocks',
  'LOOSE CRACKERS': 'Loose Crackers',
  'AERIAL FANCY': 'Aerial Fancy',
  'REPEATING SHOTS': 'Repeating Shots',
  'CRACKLING SOUND FOUNTAIN': 'Sound Fountains',
  'FANCY COLOR FOUNTAIN': 'Color Fountains',
  'FANCY CHAKKAR': 'Fancy Chakkar',
  'SKY FANCIES': 'Sky Fancies',
  'KIDS ITEMS': 'Kids Items',
};

export const categoryLabel = (name) => LABEL_OVERRIDES[String(name || '').trim().toUpperCase()] || cellText(name);

export const categoryTone = (index) => CATEGORY_TONES[index % CATEGORY_TONES.length];

/**
 * Turns a workbook into classified rows plus everything the owner needs to
 * confirm the mapping. Performs no writes and creates nothing.
 */
export const analyseWorkbook = (buffer, { sheetName, mapping = {} } = {}) => {
  const { sheets, sheetNames } = readWorkbook(buffer);

  const targetName = sheetName || mapping.sheetName;
  const sheet = sheets.find((entry) => entry.name === targetName) || sheets[0];
  if (!sheet) throw ApiError.badRequest('That workbook has no readable worksheet.', { code: 'empty_workbook' });

  const rows = sheet.rows;
  const headerIndex = findHeaderRow(rows);
  // With no recognisable header the first row is treated as data and column
  // mapping will simply come back unresolved, which the preview reports.
  const headerRow = headerIndex >= 0 ? rows[headerIndex] : [];
  const headers = headerRow.map((cell) => normaliseHeader(cell));
  const dataStart = headerIndex >= 0 ? headerIndex + 1 : 0;

  const nameIndex = resolveColumn(headers, mapping.nameColumn);
  const skuIndex = resolveColumn(headers, mapping.skuColumn);
  const categoryIndex = resolveColumn(headers, mapping.categoryColumn);
  const packIndex = resolveColumn(headers, mapping.packColumn);
  const sellingIndex = resolveColumn(headers, mapping.sellingPriceColumn);
  const originalIndex = resolveColumn(headers, mapping.originalPriceColumn);

  const detectedPriceColumns = detectPriceColumns(headers);
  const unmapped = [];
  if (nameIndex < 0) unmapped.push(mapping.nameColumn || 'name');
  if (sellingIndex < 0) unmapped.push(mapping.sellingPriceColumn || 'sellingPriceColumn');

  const classified = [];
  const categories = [];
  let currentCategory = '';
  const seenSkus = new Map();
  const seenNames = new Map();
  let categoryOrder = 0;

  for (let index = dataStart; index < rows.length; index += 1) {
    const row = rows[index];
    if (isBlankRow(row)) {
      classified.push({ rowNumber: index + 1, kind: 'empty' });
      continue;
    }

    const heading = readCategoryHeading(row, nameIndex >= 0 ? nameIndex : categoryIndex);
    if (heading) {
      if (!categories.includes(heading)) {
        categories.push(heading);
        categoryOrder = categories.length - 1;
      }
      currentCategory = heading;
      classified.push({ rowNumber: index + 1, kind: 'category', category: heading });
      continue;
    }

    // A row that names its own category column wins over the running heading.
    const inlineCategory = categoryIndex >= 0 ? cellText(row[categoryIndex]) : '';
    const category = inlineCategory || currentCategory;
    const name = cellText(row[nameIndex >= 0 ? nameIndex : 0]);
    const rawSku = cellText(row[skuIndex]);

    const errors = [];
    if (!name) errors.push('missing product name');
    if (!category) errors.push('missing category (no heading above this row)');
    if (sellingIndex < 0) errors.push('selling price column is not mapped');
    else if (cellNumber(row[sellingIndex]) === null) errors.push('selling price is blank or not a number');
    if (skuIndex >= 0 && rawSku) {
      const key = rawSku.toLowerCase();
      if (seenSkus.has(key)) errors.push(`duplicate product code "${rawSku}" (also on row ${seenSkus.get(key)})`);
      else seenSkus.set(key, index + 1);
    }
    const nameKey = `${category.toLowerCase()}|${name.toLowerCase()}`;
    if (name) {
      if (seenNames.has(nameKey)) errors.push(`duplicate product "${name}" (also on row ${seenNames.get(nameKey)})`);
      else seenNames.set(nameKey, index + 1);
    }

    const sellingPrice = sellingIndex >= 0 ? cellNumber(row[sellingIndex]) : null;
    const originalPrice = originalIndex >= 0 ? cellNumber(row[originalIndex]) : null;
    if (sellingPrice !== null && originalPrice !== null && originalPrice > 0 && sellingPrice > originalPrice) {
      errors.push(`selling price (${sellingPrice}) is above the original price (${originalPrice})`);
    }

    const pack = parsePack(packIndex >= 0 ? row[packIndex] : '');

    classified.push({
      rowNumber: index + 1,
      kind: 'product',
      category,
      categoryLabel: categoryLabel(category),
      categoryTone: categoryTone(categoryOrder),
      name,
      sku: rawSku || null,
      sourceSerial: cellNumber(skuIndex >= 0 ? row[skuIndex] : null),
      sellingPrice: sellingPrice === null ? null : roundMoney(sellingPrice),
      originalPrice: originalPrice === null ? null : roundMoney(originalPrice),
      packSize: pack.packSize,
      packQuantity: pack.packQuantity,
      packUnit: pack.packUnit,
      valid: errors.length === 0,
      errors,
    });
  }

  const productRows = classified.filter((row) => row.kind === 'product');
  const validRows = productRows.filter((row) => row.valid);
  const invalidRows = productRows.filter((row) => !row.valid);

  return {
    sheetNames,
    sheetName: sheet.name,
    headerRowNumber: headerIndex >= 0 ? headerIndex + 1 : null,
    headers: headers.filter(Boolean),
    columns: {
      name: nameIndex,
      sku: skuIndex,
      category: categoryIndex,
      pack: packIndex,
      sellingPrice: sellingIndex,
      originalPrice: originalIndex,
    },
    detectedPriceColumns,
    unmapped,
    categories,
    categoryCount: categories.length,
    rows: classified,
    summary: {
      totalRows: classified.length,
      productRows: productRows.length,
      categoryRows: classified.filter((row) => row.kind === 'category').length,
      emptyRows: classified.filter((row) => row.kind === 'empty').length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
    },
    readyToImport: unmapped.length === 0 && validRows.length > 0,
  };
};

export { MAX_CART_QUANTITY };
