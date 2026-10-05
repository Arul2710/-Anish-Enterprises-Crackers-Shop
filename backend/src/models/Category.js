import mongoose from 'mongoose';
import { CATEGORY_TONES, PRODUCT_STATUS, PRODUCT_STATUSES } from '../config/constants.js';
import { slugify } from '../utils/ids.js';

const { Schema, model } = mongoose;

const categorySchema = new Schema(
  {
    // Spreadsheet heading exactly as supplied, e.g. "FANCY COLOR FOUNTAIN".
    name: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
    // Presentation label with the sheet's misspellings corrected.
    label: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    image: { type: String, default: '', trim: true, maxlength: 2048 },
    tone: { type: String, enum: CATEGORY_TONES, default: 'amber' },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    // Set when the category was created by the Excel import rather than by hand.
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true, versionKey: false },
);

categorySchema.pre('validate', function normaliseSlug(next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  if (!this.label && this.name) this.label = this.name;
  next();
});

categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

export const Category = model('Category', categorySchema);
export { PRODUCT_STATUS, PRODUCT_STATUSES };
export default Category;
