import { Router } from 'express';
import { addItem, emptyCart, getCart, mergeLegacyCart, removeItem, updateItem } from '../controllers/cart.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { writeLimiter } from '../middleware/rateLimit.middleware.js';
import { addCartItemSchema, cartItemParamSchema, updateCartItemSchema } from '../validators/order.validator.js';

const router = Router();

/**
 * No authentication: the cart belongs to whoever holds the opaque
 * ae_cart_token httpOnly cookie, which the browser sends automatically.
 */
router.get('/', getCart);

router.post('/items', writeLimiter, validate(addCartItemSchema), addItem);

router.patch('/items/:itemId', writeLimiter, validate(updateCartItemSchema), updateItem);

router.delete('/items/:itemId', writeLimiter, validate(cartItemParamSchema, 'params'), removeItem);

router.delete('/', writeLimiter, emptyCart);

// One-time migration from the pre-backend localStorage cart.
router.post('/merge', writeLimiter, mergeLegacyCart);

export default router;
