import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildOrderNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  onNotificationsChanged,
  readNotificationState,
  syncOrderNotifications,
} from '../services/notifications';
import { updateOrderStatus } from '../services/orders';
import { useOrders } from './useOrders';

const OrderNotificationsContext = createContext(null);

/**
 * One subscription to the order list for the whole panel, and one answer to "is this
 * order new and has the operator seen it". The header bell, the dashboard alert and the
 * notifications screen all read from here, so the badge can never disagree with the
 * card underneath it.
 */
export function OrderNotificationsProvider({ children }) {
  const [orders] = useOrders();
  const [state, setState] = useState(() => readNotificationState());
  const [arrivedReferences, setArrivedReferences] = useState([]);
  const [busyReference, setBusyReference] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  // A second click inside the same tick would otherwise slip past the state guard below.
  const confirming = useRef(new Set());

  useEffect(() => onNotificationsChanged(setState), []);

  useEffect(() => {
    const arrivals = syncOrderNotifications(orders);
    if (!arrivals.length) return;
    setArrivedReferences((current) => [...current, ...arrivals.map((order) => order.reference)]);
    setState(readNotificationState());
  }, [orders]);

  const notifications = useMemo(() => buildOrderNotifications(orders, state), [orders, state]);
  const unread = useMemo(() => notifications.filter((entry) => !entry.read), [notifications]);

  // An order confirmed from anywhere else stops being an outstanding alert on its own.
  useEffect(() => {
    const settled = orders
      .filter((order) => order.status !== 'Pending' && state.known.includes(order.reference) && !state.read.includes(order.reference))
      .map((order) => order.reference);
    if (settled.length) markNotificationsRead(settled);
  }, [orders, state]);

  // Resolved from the live list every render, so confirming, cancelling or deleting an
  // order drops its alert without any extra bookkeeping.
  const arrivals = useMemo(
    () =>
      arrivedReferences
        .map((reference) => orders.find((order) => order.reference === reference))
        .filter((order) => order && order.status === 'Pending')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [arrivedReferences, orders],
  );

  const markRead = useCallback((reference) => {
    if (reference) markNotificationsRead([reference]);
  }, []);

  const markAllRead = useCallback(() => {
    markAllNotificationsRead();
  }, []);

  const dismissArrival = useCallback((reference) => {
    setArrivedReferences((current) => current.filter((entry) => entry !== reference));
  }, []);

  const confirmOrder = useCallback(
    (reference, note = 'Confirmed from the dashboard') => {
      if (!reference) return { ok: false, error: 'That order is not on record.' };
      if (confirming.current.has(reference)) return { ok: false, error: 'This order is already being confirmed.' };
      const order = orders.find((entry) => entry.reference === reference);
      if (!order) return { ok: false, error: 'That order is not on record.' };
      if (order.status !== 'Pending') return { ok: false, error: `This order is already ${order.status.toLowerCase()}.` };

      confirming.current.add(reference);
      setBusyReference(reference);
      try {
        const updated = updateOrderStatus(reference, 'Confirmed', note);
        if (!updated) return { ok: false, error: 'That order could not be updated.' };
        markNotificationsRead([reference]);
        const customer = updated.customer?.name?.trim();
        const message = customer
          ? `${reference} confirmed. ${customer} has moved to the confirmed list.`
          : `${reference} confirmed and moved to the confirmed list.`;
        setConfirmation({ message, tone: 'success', reference });
        return { ok: true, order: updated, message };
      } catch (error) {
        return { ok: false, error: error?.message || 'That order could not be confirmed.' };
      } finally {
        confirming.current.delete(reference);
        setBusyReference('');
      }
    },
    [orders],
  );

  const value = useMemo(
    () => ({
      orders,
      notifications,
      unread,
      unreadCount: unread.length,
      arrivals,
      busyReference,
      confirmation,
      clearConfirmation: () => setConfirmation(null),
      markRead,
      markAllRead,
      dismissArrival,
      confirmOrder,
    }),
    [orders, notifications, unread, arrivals, busyReference, confirmation, markRead, markAllRead, dismissArrival, confirmOrder],
  );

  return <OrderNotificationsContext.Provider value={value}>{children}</OrderNotificationsContext.Provider>;
}

export function useOrderNotifications() {
  const context = useContext(OrderNotificationsContext);
  if (!context) throw new Error('useOrderNotifications must be used inside the admin panel.');
  return context;
}
