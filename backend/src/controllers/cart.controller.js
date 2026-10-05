import { asyncHandler } from '../utils/asyncHandler.js';
import { sendNoContent, sendSuccess } from '../utils/response.js';
import { CART_COOKIE, addCartItem, clearCart, findOrCreateCart, priceCart, removeCartItem, updateCartItem } from '../services/cart.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

/**
 * The guest cart is identified by an opaque httpOnly cookie rather than anything
 * the browser script supplies, so one visitor cannot read or alter another's cart
 * by editing storage.
 */
const setCartCookie = (res, cart) => {
  res.cookie(CART_COOKIE, cart.token, {
    httpOnly: true,
    secure: env.SECURE_COOKIES,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });
};

export const loadCart = asyncHandler(async (req, res) => {
  const cart = await findOrCreateCart(req.cookies?.[CART_COOKIE]);
  setCartCookie(res, cart);
  return sendSuccess(res, { cart: await priceCart(cart) });
});

export const getCart = loadCart;

export const addItem = asyncHandler(async (req, res) => {
  const cart = await findOrCreateCart(req.cookies?.[CART_COOKIE]);
  const updated = await addCartItem(cart, req.body);
  setCartCookie(res, updated);
  const priced = await priceCart(updated);
  return sendSuccess(res, { cart: priced });
});

export const updateItem = asyncHandler(async (req, res) => {
  const cart = await findOrCreateCart(req.cookies?.[CART_COOKIE]);
  const { cart: updated } = await updateCartItem(cart, req.params.itemId, req.body.quantity);
  setCartCookie(res, updated);
  return sendSuccess(res, { cart: await priceCart(updated) });
});

export const removeItem = asyncHandler(async (req, res) => {
  const cart = await findOrCreateCart(req.cookies?.[CART_COOKIE]);
  const updated = await removeCartItem(cart, req.params.itemId);
  setCartCookie(res, updated);
  return sendSuccess(res, { cart: await priceCart(updated) });
});

export const emptyCart = asyncHandler(async (req, res) => {
  const cart = await findOrCreateCart(req.cookies?.[CART_COOKIE]);
  await clearCart(cart);
  return sendNoContent(res);
});

/**
 * Accepts a cart that the browser kept in localStorage before the backend was
 * connected, merging it into the server cart exactly once. Safe to call
 * repeatedly: an empty payload changes nothing.
 */
export const mergeLegacyCart = asyncHandler(async (req, res) => {
  const legacy = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!legacy.length) {
    const cart = await findOrCreateCart(req.cookies?.[CART_COOKIE]);
    setCartCookie(res, cart);
    return sendSuccess(res, { cart: await priceCart(cart), merged: 0, skipped: [] });
  }

  const cart = await findOrCreateCart(req.cookies?.[CART_COOKIE]);
  const skipped = [];
  let merged = 0;

  for (const entry of legacy.slice(0, 50)) {
    try {
      await addCartItem(cart, { productId: entry.productId, quantity: entry.quantity });
      merged += 1;
    } catch (error) {
      // A stale local cart must never block the shopper; report and move on.
      skipped.push({ productId: entry.productId, reason: error.message });
      logger.info('legacy cart line skipped', { productId: entry.productId, code: error.code });
    }
  }

  setCartCookie(res, cart);
  return sendSuccess(res, { cart: await priceCart(cart), merged, skipped });
});

