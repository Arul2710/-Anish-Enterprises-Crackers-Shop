import { useEffect, useState } from 'react';
import { listOrders, onOrdersChanged } from '../services/orders';

/**
 * Keeps a screen's order list in step with every change, whether the order was
 * created in this tab (a phone order, or an enquiry arriving from the shop) or in
 * another tab. The panel therefore never shows a stale count on screen.
 */
export function useOrders() {
  const [orders, setOrders] = useState(() => listOrders());

  useEffect(() => onOrdersChanged(setOrders), []);

  return [orders, setOrders];
}
