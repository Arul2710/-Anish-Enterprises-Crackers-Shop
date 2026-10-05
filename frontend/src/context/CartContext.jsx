import { useCallback, useEffect, useMemo, useState } from 'react';
import { readArray, writeStorage } from '../utils/storage';
import { CartContext } from './CartContextValue';

export const cartStorageKey = 'spark-shine-cart';
// Earlier builds stored the same list under the enquiry key. It is read once so an
// existing selection survives the upgrade, then superseded by the cart key.
export const legacyCartStorageKey = 'spark-shine-enquiry-items';

export const MAX_CART_QUANTITY = 99;

const sanitizeItem = (item) => {
  if (!item || typeof item !== 'object' || !item.id || !item.name) return null;
  return {
    id: String(item.id),
    name: String(item.name),
    code: String(item.code || ''),
    category: String(item.category || ''),
    categoryLabel: String(item.categoryLabel || ''),
    categoryTone: String(item.categoryTone || 'amber'),
    packSize: String(item.packSize || ''),
    price: Number(item.price ?? item.customerPrice) || 0,
    mrp: Number(item.mrp ?? item.rate) || 0,
    rate: Number(item.rate) || 0,
    sourceSerial: Number(item.sourceSerial) || 0,
    quantity: Math.min(MAX_CART_QUANTITY, Math.max(1, Number(item.quantity) || 1)),
  };
};

const readCartItems = () => {
  const stored = readArray(cartStorageKey);
  if (stored.length) return stored.map(sanitizeItem).filter(Boolean);
  return readArray(legacyCartStorageKey).map(sanitizeItem).filter(Boolean);
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCartItems);

  useEffect(() => {
    writeStorage(cartStorageKey, items);
  }, [items]);

  const addItem = useCallback((product, quantity = 1) => {
    const amount = Math.min(MAX_CART_QUANTITY, Math.max(1, Number(quantity) || 1));
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, item.quantity + amount) } : item,
        );
      }
      const next = sanitizeItem({ ...product, quantity: amount });
      return next ? [...current, next] : current;
    });
  }, []);

  const addItems = useCallback((list, quantity = 1) => {
    const amount = Math.min(MAX_CART_QUANTITY, Math.max(1, Number(quantity) || 1));
    setItems((current) => {
      const next = [...current];
      list.forEach((product) => {
        const index = next.findIndex((item) => item.id === product.id);
        if (index >= 0) next[index] = { ...next[index], quantity: Math.min(MAX_CART_QUANTITY, next[index].quantity + amount) };
        else {
          const sanitized = sanitizeItem({ ...product, quantity: amount });
          if (sanitized) next.push(sanitized);
        }
      });
      return next;
    });
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    const amount = Number(quantity) || 0;
    setItems((current) =>
      amount <= 0
        ? current.filter((item) => item.id !== id)
        : current.map((item) =>
            item.id === id ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, amount) } : item,
          ),
    );
  }, []);

  const increment = useCallback((id, step = 1) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, item.quantity + step) }
          : item,
      ),
    );
  }, []);

  const decrement = useCallback((id, step = 1) => {
    setItems((current) =>
      current
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity - step } : item))
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearItems = useCallback(() => setItems([]), []);

  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);
  const indicativeTotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );
  const totalSavings = useMemo(
    () => items.reduce((total, item) => total + Math.max(0, item.mrp - item.price) * item.quantity, 0),
    [items],
  );
  const quantityOf = useCallback(
    (id) => items.find((item) => item.id === id)?.quantity || 0,
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal: indicativeTotal,
      indicativeTotal,
      totalSavings,
      addItem,
      addItems,
      updateQuantity,
      increment,
      decrement,
      removeItem,
      clearItems,
      quantityOf,
      isEmpty: items.length === 0,
    }),
    [items, itemCount, indicativeTotal, totalSavings, addItem, addItems, updateQuantity, increment, decrement, removeItem, clearItems, quantityOf],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
