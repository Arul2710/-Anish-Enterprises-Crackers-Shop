import { useCart } from './useCart';

/**
 * The cart replaced the enquiry list, so the old hook name is kept as an alias to
 * avoid churning every consumer. Prefer `useCart` in new code.
 */
export function useEnquiry() {
  return useCart();
}
