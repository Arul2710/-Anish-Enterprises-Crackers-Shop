import { categoryDetails, products as sheetProducts } from './products';
import { slugify } from '../utils/format';

export const CODE_PREFIX = 'SS26';

export const productStatuses = ['active', 'inactive'];

export const productStatusLabels = { active: 'Active', inactive: 'Inactive' };

/**
 * The supplied sheet misspells a few category labels. Presentation copy is fixed here
 * so the imported rows in products.js stay exactly as they were received.
 */
const LABEL_OVERRIDES = {
  'WALA ITEAM': 'Wala Item',
  'SINGLE FLASH CRACKERS': 'Single Flash Bombs',
  'BOMB VARITIES': 'Bombs',
  'ROCKET VAIETY': 'Rockets',
  'STICK VARITIES': 'Handheld Sticks',
  'CRACKERS GIFT BOX': 'Gift Boxes',
  'NEW ARRIVALS 2026': 'New Arrivals 2026',
};

export const codeFor = (serial) => `${CODE_PREFIX}-${String(serial).padStart(3, '0')}`;

export const normalizeCategoryRecord = (value, index = 0) => {
  if (!value || typeof value !== 'object') return null;
  const name = String(value.name || '').trim();
  if (!name) return null;
  const label = String(value.label || LABEL_OVERRIDES[name] || name).trim();
  return {
    id: String(value.id || `cat-${slugify(name)}`),
    name,
    label,
    description: String(value.description || ''),
    image: String(value.image || ''),
    tone: String(value.tone || 'amber'),
    slug: slugify(name),
    order: Number.isFinite(Number(value.order)) ? Number(value.order) : index,
    active: value.active !== false,
    createdAt: value.createdAt || new Date().toISOString(),
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
};

export const normalizeProductRecord = (value) => {
  if (!value || typeof value !== 'object') return null;
  const name = String(value.name || '').trim();
  if (!name) return null;
  const category = String(value.category || '').trim();
  if (!category) return null;
  const sellingPrice = Math.max(0, Number(value.sellingPrice ?? value.netRate) || 0);
  const mrp = Math.max(0, Number(value.mrp ?? value.rate) || 0);
  const stockRaw = value.stock;
  // An unreadable count is treated as untracked rather than zero. Reading junk as 0
  // would quietly mark a product as out of stock and hide it from the shop.
  const stockNumber = Number(stockRaw);
  const stock = stockRaw === null || stockRaw === undefined || stockRaw === '' || !Number.isFinite(stockNumber)
    ? null
    : Math.max(0, stockNumber);
  return {
    id: String(value.id || `product-${Date.now().toString(36)}`),
    code: String(value.code || codeFor(value.sourceSerial || Date.now())),
    name,
    category,
    packSize: String(value.packSize || '1 Box'),
    sellingPrice,
    mrp: mrp || sellingPrice,
    stock,
    status: productStatuses.includes(value.status) ? value.status : 'active',
    image: String(value.image || ''),
    description: String(value.description || ''),
    sourceSerial: Number(value.sourceSerial) || 0,
    source: value.source === 'manual' ? 'manual' : 'excel',
    createdAt: value.createdAt || new Date().toISOString(),
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
};

/** The catalog exactly as supplied by Order Crackers 2026.xlsx, in admin-record shape. */
export const seedCategoryRecords = () =>
  categoryDetails.map((category, index) =>
    normalizeCategoryRecord(
      {
        id: `cat-${slugify(category.name)}`,
        name: category.name,
        label: category.label,
        description: category.description,
        tone: category.tone,
        order: index,
        active: true,
      },
      index,
    ),
  );

export const seedProductRecords = () =>
  sheetProducts.map((product) =>
    normalizeProductRecord({
      id: product.id,
      code: codeFor(product.sourceSerial),
      name: product.name,
      category: product.category,
      packSize: product.packSize,
      sellingPrice: product.netRate,
      mrp: product.rate,
      stock: null,
      status: 'active',
      image: '',
      description: product.description,
      sourceSerial: product.sourceSerial,
      source: 'excel',
    }),
  );

export const isOutOfStock = (product) => product.stock === 0;
