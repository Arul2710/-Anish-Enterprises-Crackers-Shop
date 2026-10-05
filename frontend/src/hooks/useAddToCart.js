import { useCallback } from 'react';
import { MAX_CART_QUANTITY } from '../context/CartContext';
import { useCart } from './useCart';

/**
 * Per-row cart state for a catalog listing.
 *
 * The quantity control is the only way a listing enters the cart, so the stepper is
 * cart-authoritative: it shows 0 for a product that is not in the cart and always
 * renders the quantity the cart actually holds. That keeps the row total, the sticky
 * Products/Items/Total summary and the nav badge in agreement at all times.
 *
 *   +  adds one unit            (0 -> 1 puts the product in the cart)
 *   -  removes one unit         (1 -> 0 takes the product back out)
 *
 * Each row calls this hook with its own product, so quantities are fully independent
 * and are keyed by the product id/code.
 */
export function useAddToCart(product) {
  const { addItem, decrement, quantityOf } = useCart();
  const cartQuantity = quantityOf(product.id);

  const increase = useCallback(() => {
    addItem(product, 1);
  }, [addItem, product]);

  const decrease = useCallback(() => {
    decrement(product.id, 1);
  }, [decrement, product.id]);

  return {
    quantity: cartQuantity,
    increase,
    decrease,
    inCart: cartQuantity > 0,
    cartQuantity,
    atMax: cartQuantity >= MAX_CART_QUANTITY,
  };
}
