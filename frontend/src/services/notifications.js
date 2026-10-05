import { formatDate } from '../utils/format';
import { readStorage, writeStorage } from '../utils/storage';

/**
 * Panel notifications. There is no notification table anywhere: every item here is
 * projected from a real order, so the bell can never show something the order list
 * does not have. The only thing stored here is which orders the panel has already
 * accounted for and which the operator has read.
 */
export const notificationStorageKey = 'spark-shine-admin-notifications';

const notificationsChangedEvent = 'spark-shine-admin-notifications-changed';

const toReferenceList = (value) => (Array.isArray(value) ? value.map(String).filter(Boolean) : []);

const emptyState = { seeded: false, known: [], read: [] };

export const readNotificationState = () => {
  const stored = readStorage(notificationStorageKey, null);
  if (!stored || typeof stored !== 'object') return { ...emptyState };
  return {
    seeded: Boolean(stored.seeded),
    known: toReferenceList(stored.known),
    read: toReferenceList(stored.read),
  };
};

const writeNotificationState = (state) => {
  writeStorage(notificationStorageKey, state);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(notificationsChangedEvent, { detail: state }));
  return state;
};

export const onNotificationsChanged = (handler) => {
  if (typeof window === 'undefined') return () => {};
  const fromOtherTab = (event) => {
    if (!event.key || event.key === notificationStorageKey) handler(readNotificationState());
  };
  const fromThisTab = (event) => handler(event.detail);
  window.addEventListener('storage', fromOtherTab);
  window.addEventListener(notificationsChangedEvent, fromThisTab);
  return () => {
    window.removeEventListener('storage', fromOtherTab);
    window.removeEventListener(notificationsChangedEvent, fromThisTab);
  };
};

/**
 * Compares the live order list against the references the panel has already seen and
 * returns the orders that arrived since. The very first run adopts whatever is already
 * on record instead of announcing it, so opening the panel on a busy day does not
 * produce a wall of alerts for history the operator has obviously already seen. Only
 * references still on record are kept, so a deleted order takes its alert with it.
 */
export const syncOrderNotifications = (orders) => {
  const list = (Array.isArray(orders) ? orders : []).filter((order) => order?.reference);
  const state = readNotificationState();
  const live = new Set(list.map((order) => order.reference));

  if (!state.seeded) {
    // Both lists start complete: the orders on record are treated as already seen, so
    // the first open is quiet instead of announcing the shop's whole history.
    writeNotificationState({ seeded: true, known: [...live], read: [...live] });
    return [];
  }

  const known = new Set(state.known);
  const arrivals = list.filter((order) => !known.has(order.reference));
  const nextKnown = [...new Set([...state.known, ...arrivals.map((order) => order.reference)])].filter((reference) => live.has(reference));
  const nextRead = state.read.filter((reference) => live.has(reference));
  const changed = arrivals.length > 0 || nextKnown.length !== state.known.length || nextRead.length !== state.read.length;
  if (!changed) return [];
  writeNotificationState({ seeded: true, known: nextKnown, read: nextRead });
  return arrivals;
};

/** Every notification is built from the order it points at, so it cannot drift from it. */
export const buildOrderNotifications = (orders, state = readNotificationState()) => {
  const known = new Set(state.known);
  const read = new Set(state.read);
  return (Array.isArray(orders) ? orders : [])
    .filter((order) => order?.reference && known.has(order.reference))
    .map((order) => ({
      id: `order-${order.reference}`,
      reference: order.reference,
      customerName: order.customer?.name || 'Not recorded',
      amount: Number(order.totals?.grandTotal) || 0,
      createdAt: order.createdAt,
      status: order.status,
      awaitingConfirmation: order.status === 'Pending',
      read: read.has(order.reference),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const markNotificationsRead = (references) => {
  const state = readNotificationState();
  const wanted = (Array.isArray(references) ? references : [references]).map(String).filter(Boolean);
  const next = [...new Set([...state.read, ...wanted])];
  if (next.length === state.read.length) return state;
  return writeNotificationState({ ...state, read: next });
};

export const markAllNotificationsRead = () => {
  const state = readNotificationState();
  if (!state.known.length || state.read.length === state.known.length) return state;
  return writeNotificationState({ ...state, read: [...state.known] });
};

/** Compact age for a notification line: "Just now", "12 min ago", "3 days ago". */
export const relativeTime = (value) => {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'Not recorded';
  const seconds = Math.round((Date.now() - time) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(value);
};
