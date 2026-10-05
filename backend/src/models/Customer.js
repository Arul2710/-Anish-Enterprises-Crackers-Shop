import mongoose from 'mongoose';
import { cleanEmail, cleanPhone, cleanString } from '../utils/sanitize.js';

const { Schema, model } = mongoose;

const addressSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 32 },
    email: { type: String, default: '', lowercase: true, trim: true, maxlength: 254 },
    line1: { type: String, required: true, trim: true, maxlength: 250 },
    line2: { type: String, default: '', trim: true, maxlength: 250 },
    city: { type: String, default: '', trim: true, maxlength: 120 },
    state: { type: String, default: '', trim: true, maxlength: 120 },
    pincode: { type: String, default: '', trim: true, maxlength: 12 },
    landmark: { type: String, default: '', trim: true, maxlength: 200 },
  },
  { _id: false },
);

const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, index: true },
    // A phone number is the only identifier an enquiry-based shop reliably has,
    // so it doubles as the natural key and is unique.
    phone: { type: String, required: true, unique: true, trim: true, maxlength: 32 },
    // Indexed by the customerSchema.index({ email: 1 }) below.
    email: { type: String, default: '', lowercase: true, trim: true, maxlength: 254 },
    address: { type: addressSchema, default: null },
    notes: { type: String, default: '', trim: true, maxlength: 2000 },
    orderCount: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    lastOrderAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

customerSchema.index({ email: 1 });

customerSchema.pre('validate', function normaliseCustomer(next) {
  this.name = cleanString(this.name, { max: 120 });
  this.phone = cleanPhone(this.phone) || this.phone;
  this.email = cleanEmail(this.email) || '';
  next();
});

customerSchema.set('toJSON', { virtuals: true });
customerSchema.set('toObject', { virtuals: true });

export const Customer = model('Customer', customerSchema);
export { addressSchema };
export default Customer;
