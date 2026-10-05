import mongoose from 'mongoose';
import { MAX_CART_QUANTITY } from '../config/constants.js';
import { roundMoney } from '../utils/money.js';

const { Schema, model } = mongoose;

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    quantity: { type: Number, required: true, min: 1, max: MAX_CART_QUANTITY },
    // Snapshots are display only. Pricing always re-reads the product document.
    nameSnapshot: { type: String, default: '', maxlength: 300 },
    codeSnapshot: { type: String, default: '', maxlength: 64 },
    packSnapshot: { type: String, default: '', maxlength: 120 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const cartSchema = new Schema(
  {
    // Opaque, signed cookie value identifying a guest cart.
    token: { type: String, required: true, unique: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    items: { type: [cartItemSchema], default: [] },
    currency: { type: String, default: 'INR' },
    lastActivityAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, versionKey: false },
);

/**
 * Re-prices the cart from live product documents. The caller must pass products
 * it has already loaded; a missing product is reported rather than priced at 0.
 */
cartSchema.methods.recalculate = function recalculate(productById, { removed = [] } = {}) {
  const lines = [];
  const unavailable = [];

  for (const item of this.items) {
    const id = String(item.product);
    const product = productById.get(id);
    if (!product || product.status !== 'active' || !product.isPublished) {
      unavailable.push({ productId: id, name: item.nameSnapshot, reason: 'no-longer-available' });
      continue;
    }
    const stock = product.stock;
    if (stock !== null && stock !== undefined && stock < item.quantity) {
      unavailable.push({
        productId: id,
        name: product.name,
        reason: stock === 0 ? 'out-of-stock' : 'insufficient-stock',
        availableQuantity: stock,
        requestedQuantity: item.quantity,
      });
      if (stock > 0) {
        lines.push({
          product: item.product,
          quantity: stock,
          nameSnapshot: product.name,
          codeSnapshot: product.code || product.sku || '',
          packSnapshot: product.packSize,
          addedAt: item.addedAt,
        });
      }
      continue;
    }
    lines.push({
      product: item.product,
      quantity: item.quantity,
      nameSnapshot: product.name,
      codeSnapshot: product.code || product.sku || '',
      packSnapshot: product.packSize,
      addedAt: item.addedAt,
    });
  }

  this.items = lines;

  const itemCount = lines.reduce((total, item) => total + item.quantity, 0);
  const itemsTotal = roundMoney(
    lines.reduce((total, item) => {
      const product = productById.get(String(item.product));
      return total + (product ? product.priceFor() * item.quantity : 0);
    }, 0),
  );
  const mrpTotal = roundMoney(
    lines.reduce((total, item) => {
      const product = productById.get(String(item.product));
      return total + (product ? product.mrp * item.quantity : 0);
    }, 0),
  );

  return {
    itemCount,
    itemsTotal,
    mrpTotal,
    totalSavings: roundMoney(Math.max(0, mrpTotal - itemsTotal)),
    unavailable,
    removed: [...removed, ...unavailable.map((entry) => entry.productId)],
  };
};

cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

export const Cart = model('Cart', cartSchema);
export { cartItemSchema };
export default Cart;
