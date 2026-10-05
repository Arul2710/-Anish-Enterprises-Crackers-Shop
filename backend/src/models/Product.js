import mongoose from 'mongoose';
import { PRODUCT_SOURCES, PRODUCT_STATUS, PRODUCT_STATUSES } from '../config/constants.js';
import { roundMoney } from '../utils/money.js';

const { Schema, model } = mongoose;

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 300, index: true },
    // Storefront product code, e.g. "SS26-042". Unique when present.
    // No `index: true` here: the unique partial index below already covers it.
    code: { type: String, default: null, trim: true, maxlength: 64 },
    sku: { type: String, default: null, trim: true, maxlength: 64 },
    // Denormalised category name so catalogue queries need no join, plus a
    // reference kept for referential integrity and admin editing.
    category: { type: String, required: true, trim: true, maxlength: 120, index: true },
    categoryRef: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    description: { type: String, default: '', trim: true, maxlength: 5000 },

    images: {
      type: [{ url: { type: String, required: true, trim: true, maxlength: 2048 }, alt: { type: String, default: '', trim: true, maxlength: 200 } }],
      default: [],
      validate: [(value) => value.length <= 8, 'A product may hold at most 8 images'],
    },

    packSize: { type: String, default: '1 Box', trim: true, maxlength: 120 },
    packQuantity: { type: Number, default: 1, min: 0 },
    packUnit: { type: String, default: 'Box', trim: true, maxlength: 40 },

    // Customer-facing price. The catalogue currently quotes NET RAT.
    sellingPrice: { type: Number, required: true, min: 0 },
    // MRP / RATE, used to show savings.
    mrp: { type: Number, required: true, min: 0 },

    // null means "not tracked" and is deliberately different from 0. The
    // storefront treats null as unknown stock rather than out of stock so a
    // product is never hidden because a count is missing.
    stock: { type: Number, default: null, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },

    status: { type: String, enum: PRODUCT_STATUSES, default: PRODUCT_STATUS.ACTIVE, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: true, index: true },

    // Spreadsheet serial, preserved so a re-import can match a row reliably.
    sourceSerial: { type: Number, default: null },
    source: { type: String, enum: Object.values(PRODUCT_SOURCES), default: PRODUCT_SOURCES.MANUAL, index: true },
    importBatchId: { type: Schema.Types.ObjectId, ref: 'ImportLog', default: null, index: true },

    searchText: { type: String, default: '', index: 'text', select: false },
  },
  { timestamps: true, versionKey: false },
);

// A code is unique only when it exists, so manual rows without one still work.
productSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { code: { $type: 'string' } } });
productSchema.index({ sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: 'string' } } });
productSchema.index({ sourceSerial: 1 }, { unique: true, partialFilterExpression: { sourceSerial: { $type: 'number' } } });
productSchema.index({ status: 1, isPublished: 1, category: 1 });
productSchema.index({ name: 'text', code: 'text', searchText: 'text' });

productSchema.pre('validate', function normaliseProduct(next) {
  this.sellingPrice = roundMoney(this.sellingPrice);
  this.mrp = roundMoney(this.mrp ?? this.sellingPrice);
  // Selling above MRP would render as negative savings.
  if (this.mrp < this.sellingPrice) this.mrp = this.sellingPrice;

  const code = this.code || null;
  this.code = code === '' ? null : code;
  const sku = this.sku || null;
  this.sku = sku === '' ? null : sku;

  // Zero is a meaningful stock count; an empty string is not.
  if (this.stock === '' || this.stock === undefined) this.stock = null;
  if (typeof this.stock === 'number') this.stock = Math.max(0, Math.round(this.stock));

  this.searchText = [this.name, this.code, this.sku, this.category, this.packSize].filter(Boolean).join(' ').slice(0, 500);
  next();
});

/** Server-side truth used by the cart and order services. */
productSchema.methods.priceFor = function priceFor() {
  return roundMoney(this.sellingPrice);
};

productSchema.methods.isAvailable = function isAvailable(quantity = 1) {
  if (this.status !== PRODUCT_STATUS.ACTIVE || !this.isPublished) return false;
  if (this.stock === null || this.stock === undefined) return true;
  return this.stock >= quantity;
};

productSchema.virtual('savings').get(function savings() {
  return roundMoney(Math.max(0, this.mrp - this.sellingPrice));
});

productSchema.virtual('isOutOfStock').get(function isOutOfStock() {
  return this.stock === 0;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

export const Product = model('Product', productSchema);
export default Product;
