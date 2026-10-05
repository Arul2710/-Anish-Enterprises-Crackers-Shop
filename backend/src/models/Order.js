import mongoose from 'mongoose';
import {
  MAX_CART_QUANTITY,
  ORDER_STATUS,
  ORDER_STATUSES,
  PAYMENT_METHOD,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  PAYMENT_STATUSES,
} from '../config/constants.js';
import { roundMoney } from '../utils/money.js';
import { sha256 } from '../utils/ids.js';

const { Schema, model } = mongoose;

/** Delivery address as captured at order time, independent of any later edit. */
const deliveryAddressSchema = new Schema(
  {
    fullName: { type: String, default: '', maxlength: 120 },
    phone: { type: String, default: '', maxlength: 32 },
    email: { type: String, default: '', maxlength: 254 },
    line1: { type: String, default: '', maxlength: 250 },
    line2: { type: String, default: '', maxlength: 250 },
    city: { type: String, default: '', maxlength: 120 },
    state: { type: String, default: '', maxlength: 120 },
    pincode: { type: String, default: '', maxlength: 12 },
    landmark: { type: String, default: '', maxlength: 200 },
  },
  { _id: false },
);

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    // Immutable snapshots: an order must still read correctly after the
    // catalogue is renamed or repriced.
    name: { type: String, required: true, maxlength: 300 },
    code: { type: String, default: '', maxlength: 64 },
    sku: { type: String, default: '', maxlength: 64 },
    category: { type: String, default: '', maxlength: 120 },
    packSize: { type: String, default: '', maxlength: 120 },
    quantity: { type: Number, required: true, min: 1, max: MAX_CART_QUANTITY },
    unitPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    // Set once the goods leave the shop; used to decide whether cancelling an
    // order should return stock.
    stockCommitted: { type: Boolean, default: false },
  },
  { _id: true },
);

const orderHistorySchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    actorName: { type: String, default: 'system' },
    field: { type: String, required: true, maxlength: 40 },
    from: { type: String, default: '' },
    to: { type: String, default: '' },
    note: { type: String, default: '', maxlength: 500 },
  },
  { _id: true },
);

const orderSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    // Kept inline so an order survives even if the customer record is edited.
    customerSnapshot: {
      name: { type: String, required: true, maxlength: 120 },
      phone: { type: String, required: true, maxlength: 32 },
      email: { type: String, default: '', maxlength: 254 },
    },
    deliveryAddress: { type: deliveryAddressSchema, default: null },

    items: { type: [orderItemSchema], default: [], validate: [(value) => value.length > 0, 'An order needs at least one line'] },

    itemsTotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    mrpTotal: { type: Number, default: 0, min: 0 },
    totalSavings: { type: Number, default: 0, min: 0 },

    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: PAYMENT_METHOD.ENQUIRY_CONFIRM },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: PAYMENT_STATUS.UNPAID, index: true },
    paidAmount: { type: Number, default: 0, min: 0 },
    // Only an owner or admin may set this; a verified external payment.
    paymentVerifiedAt: { type: Date, default: null },
    paymentReference: { type: String, default: '', maxlength: 120 },

    status: { type: String, enum: ORDER_STATUSES, default: ORDER_STATUS.PENDING, index: true },
    statusUpdatedAt: { type: Date, default: Date.now },
    channel: { type: String, default: 'Storefront enquiry' },
    invoiceNumber: { type: String, default: '', maxlength: 60 },
    notes: { type: String, default: '', maxlength: 2000 },
    internalNotes: { type: String, default: '', maxlength: 2000, select: false },

    // Customer-facing lookup secret. The plaintext is handed out once at
    // placement and stored in a cookie; only its hash is persisted.
    accessTokenHash: { type: String, required: true, select: false },

    history: { type: [orderHistorySchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ 'customerSnapshot.phone': 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

orderSchema.pre('validate', function normaliseOrder(next) {
  this.itemsTotal = roundMoney(this.itemsTotal);
  this.deliveryFee = roundMoney(this.deliveryFee);
  this.discount = roundMoney(this.discount);
  this.mrpTotal = roundMoney(this.mrpTotal);
  this.paidAmount = roundMoney(Math.max(0, this.paidAmount));
  this.totalSavings = roundMoney(Math.max(0, this.mrpTotal - this.itemsTotal));

  // `total` is deliberately not recomputed here. pricing.service.js is the one
  // place money is derived, and it also applies tax and rounding. Re-deriving it
  // in the model would silently drop those and let a stored order disagree with
  // the total the customer was quoted. It is only normalised.
  this.total = roundMoney(Math.max(0, this.total));
  next();
});

orderSchema.methods.publicView = function publicView() {
  const plain = this.toObject({ virtuals: true });
  // Customer-facing reads never expose internal notes or the access secret.
  delete plain.internalNotes;
  delete plain.accessTokenHash;
  return plain;
};

orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

/**
 * The public order link carries this token in a cookie. Only the hash is
 * stored, so a database leak cannot be used to read customer orders.
 */
export const hashAccessToken = (token) => sha256(token);

export { orderItemSchema, orderHistorySchema, deliveryAddressSchema };
export const Order = model('Order', orderSchema);
export default Order;
