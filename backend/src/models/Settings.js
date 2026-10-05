import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { PAYMENT_METHODS } from '../config/constants.js';

const { Schema, model } = mongoose;

const logoSchema = new Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    publicId: { type: String, default: '', maxlength: 200 },
    alt: { type: String, default: '', maxlength: 200 },
  },
  { _id: false },
);

const settingsSchema = new Schema(
  {
    // Single-document collection: exactly one row, keyed by this value.
    key: { type: String, default: 'shop', unique: true, immutable: true },

    shopName: { type: String, required: true, trim: true, maxlength: 160, default: env.SHOP_NAME },
    logo: { type: logoSchema, default: null },

    contact: {
      supportPhone: { type: String, default: env.SHOP_SUPPORT_PHONE, trim: true, maxlength: 32 },
      supportEmail: { type: String, default: env.SHOP_SUPPORT_EMAIL, lowercase: true, trim: true, maxlength: 254 },
      addressLine1: { type: String, default: 'Kamak Road, Near Kamavar Kalyanamandapam', trim: true, maxlength: 250 },
      addressLine2: { type: String, default: '', trim: true, maxlength: 250 },
      city: { type: String, default: '', trim: true, maxlength: 120 },
      state: { type: String, default: '', trim: true, maxlength: 120 },
      pincode: { type: String, default: '', trim: true, maxlength: 12 },
      businessHours: { type: String, default: '', trim: true, maxlength: 200 },
      mapUrl: { type: String, default: '', trim: true, maxlength: 2048 },
      mapEmbedUrl: { type: String, default: '', trim: true, maxlength: 2048 },
    },

    social: {
      whatsapp: { type: String, default: '', trim: true, maxlength: 2048 },
      instagram: { type: String, default: '', trim: true, maxlength: 2048 },
      facebook: { type: String, default: '', trim: true, maxlength: 2048 },
      youtube: { type: String, default: '', trim: true, maxlength: 2048 },
    },

    delivery: {
      // The shop currently runs enquiry-based ordering, so delivery is offered
      // but not yet dispatched automatically.
      isDeliveryAvailable: { type: Boolean, default: true },
      deliveryFee: { type: Number, default: 0, min: 0 },
      freeDeliveryAbove: { type: Number, default: 0, min: 0 },
      estimatedDays: { type: String, default: '3 to 5 working days', trim: true, maxlength: 120 },
      shippingNote: { type: String, default: '', trim: true, maxlength: 500 },
    },

    payments: {
      enabledMethods: { type: [String], default: () => [...PAYMENT_METHODS], enum: PAYMENT_METHODS },
      // Prices, taxes and rounding all live here so no controller hardcodes them.
      pricing: {
        includeTax: { type: Boolean, default: false },
        taxPercent: { type: Number, default: 0, min: 0, max: 100 },
        roundToNearest: { type: Number, default: 0, min: 0 },
        // GST breakup is optional and only surfaced when the shop sets it.
        gstNumber: { type: String, default: '', trim: true, maxlength: 40 },
        gstPercent: { type: Number, default: 0, min: 0, max: 100 },
      },
    },

    minimumOrderAmount: { type: Number, default: env.MINIMUM_ORDER_AMOUNT, min: 0 },
    allowEnquiryOnly: { type: Boolean, default: true },
    announcement: {
      enabled: { type: Boolean, default: true },
      text: { type: String, default: 'Enquiry based ordering · Availability confirmed by our team', trim: true, maxlength: 300 },
    },
    lowStockThreshold: { type: Number, default: 5, min: 0 },

    /**
     * The column the owner has confirmed carries the customer-facing selling
     * price. Left null until confirmed, which is what keeps the Excel import
     * from guessing.
     */
    importPriceMapping: {
      confirmed: { type: Boolean, default: false },
      sellingPriceColumn: { type: String, default: null, maxlength: 80 },
      originalPriceColumn: { type: String, default: null, maxlength: 80 },
      sheetName: { type: String, default: env.IMPORT_SHEET_NAME, maxlength: 80 },
      nameColumn: { type: String, default: env.IMPORT_NAME_COLUMN, maxlength: 80 },
      skuColumn: { type: String, default: env.IMPORT_SKU_COLUMN, maxlength: 80 },
      categoryColumn: { type: String, default: env.IMPORT_CATEGORY_COLUMN, maxlength: 80 },
      packColumn: { type: String, default: env.IMPORT_PACK_COLUMN, maxlength: 80 },
      confirmedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
      confirmedAt: { type: Date, default: null },
    },
  },
  { timestamps: true, versionKey: false },
);

settingsSchema.set('toJSON', { virtuals: true });
settingsSchema.set('toObject', { virtuals: true });

export const Settings = model('Settings', settingsSchema);
export { logoSchema };
export default Settings;
