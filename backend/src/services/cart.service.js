import { Cart } from '../models/Cart.js';
import { ApiError } from '../utils/ApiError.js';
import { MAX_CART_QUANTITY } from '../config/constants.js';
import { loadProductsById } from './product.service.js';
import { getSettings } from './settings.service.js';
import { calculateTotals } from './pricing.service.js';
import { randomToken } from '../utils/ids.js';

export const CART_COOKIE = 'ae_cart_token';

export const findOrCreateCart = async (token, { session } = {}) => {
  if (token) {
    const existing = await Cart.findOne({ token }).session(session || null);
    if (existing) {
      existing.lastActivityAt = new Date();
      await existing.save({ session });
      return existing;
    }
  }
  const cart = await Cart.create([{ token: randomToken(24) }], { session });
  return cart[0];
};

/**
 * Returns the cart with every line priced from the live product document.
 * Client-supplied prices are never read.
 */
export const priceCart = async (cart, { settings } = {}) => {
  const products = await loadProductsById(cart.items.map((item) => item.product));
  const outcome = cart.recalculate(products);
  const resolvedSettings = settings || (await getSettings());

  const totals = calculateTotals({
    items: cart.items.map((item) => {
      const product = products.get(String(item.product));
      return {
        quantity: item.quantity,
        unitPrice: product ? product.priceFor() : 0,
        mrp: product ? product.mrp : 0,
      };
    }),
    settings: resolvedSettings,
  });

  return {
    id: String(cart._id),
    token: cart.token,
    items: cart.items.map((item) => {
      const product = products.get(String(item.product));
      const unitPrice = product ? product.priceFor() : 0;
      return {
        id: String(item._id),
        productId: String(item.product),
        name: product?.name || item.nameSnapshot,
        code: product?.code || product?.sku || item.codeSnapshot,
        category: product?.category || '',
        packSize: product?.packSize || item.packSnapshot,
        image: product?.images?.[0]?.url || '',
        unitPrice,
        mrp: product?.mrp || 0,
        quantity: item.quantity,
        lineTotal: Math.round(unitPrice * item.quantity * 100) / 100,
        // Surfaced so the storefront can explain why a line changed.
        stock: product?.stock ?? null,
        availableQuantity: product?.stock ?? null,
      };
    }),
    itemCount: outcome.itemCount,
    totals: {
      itemsTotal: totals.itemsTotal,
      delivery: totals.deliveryFee,
      discount: totals.discount,
      grandTotal: totals.grandTotal,
      totalSavings: totals.totalSavings,
    },
    minimumOrderAmount: resolvedSettings.minimumOrderAmount || 0,
    unavailable: outcome.unavailable,
    updatedAt: cart.updatedAt,
  };
};

export const addCartItem = async (cart, { productId, quantity = 1 }) => {
  const products = await loadProductsById([productId]);
  const product = products.get(String(productId));
  if (!product) throw ApiError.notFound('That product could not be found.', { code: 'product_not_found' });
  if (product.status !== 'active' || !product.isPublished) {
    throw ApiError.unprocessable('That product is not available right now.', { code: 'product_unavailable' });
  }

  const existing = cart.items.find((item) => String(item.product) === String(productId));
  const desired = (existing?.quantity || 0) + quantity;

  if (desired > MAX_CART_QUANTITY) {
    throw ApiError.unprocessable(`You can order at most ${MAX_CART_QUANTITY} of a single item.`, {
      code: 'quantity_exceeded',
      details: { max: MAX_CART_QUANTITY, requested: desired },
    });
  }

  // null stock is untracked and therefore not a limit.
  if (product.stock !== null && product.stock !== undefined && desired > product.stock) {
    throw ApiError.unprocessable(
      product.stock === 0
        ? 'That product is out of stock.'
        : `Only ${product.stock} of that product is in stock.`,
      { code: 'insufficient_stock', details: { available: product.stock, requested: desired } },
    );
  }

  if (existing) existing.quantity = desired;
  else {
    cart.items.push({
      product: product._id,
      quantity,
      nameSnapshot: product.name,
      codeSnapshot: product.code || product.sku || '',
      packSnapshot: product.packSize,
    });
  }

  await cart.save();
  return cart;
};

export const updateCartItem = async (cart, itemId, quantity) => {
  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound('That item is not in your cart.', { code: 'cart_item_not_found' });

  if (quantity <= 0) {
    cart.items.pull(itemId);
    await cart.save();
    return { cart, removed: true };
  }

  if (quantity > MAX_CART_QUANTITY) {
    throw ApiError.unprocessable(`You can order at most ${MAX_CART_QUANTITY} of a single item.`, {
      code: 'quantity_exceeded',
    });
  }

  const products = await loadProductsById([item.product]);
  const product = products.get(String(item.product));
  if (product && product.stock !== null && product.stock !== undefined && quantity > product.stock) {
    throw ApiError.unprocessable(
      product.stock === 0 ? 'That product is out of stock.' : `Only ${product.stock} of that product is in stock.`,
      { code: 'insufficient_stock', details: { available: product.stock, requested: quantity } },
    );
  }

  item.quantity = quantity;
  await cart.save();
  return { cart, removed: false };
};

export const removeCartItem = async (cart, itemId) => {
  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound('That item is not in your cart.', { code: 'cart_item_not_found' });
  cart.items.pull(itemId);
  await cart.save();
  return cart;
};

export const clearCart = async (cart) => {
  cart.items = [];
  await cart.save();
  return cart;
};
