import { ArrowRight, ShoppingCart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MAX_CART_QUANTITY } from '../../context/CartContext';
import { useCart } from '../../hooks/useCart';
import { formatCurrency } from '../../utils/format';
import { QuantityControl } from './QuantityControl';

function CartLine({ item, onUpdate, onRemove }) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <Link to={`/products/${item.id}`} className="line-clamp-1 text-xs font-bold text-navy transition hover:text-royal">
          {item.name}
        </Link>
        <p className="mt-0.5 text-[0.62rem] font-semibold text-navyMute">
          {item.code || item.categoryLabel} · {item.packSize}
        </p>
      </div>
      <QuantityControl value={item.quantity} onChange={(next) => onUpdate(item.id, next)} size="sm" label={`Quantity for ${item.name}`} />
      <span className="catalog-total w-20 shrink-0 text-right text-xs">{formatCurrency(item.price * item.quantity)}</span>
      <button type="button" onClick={() => onRemove(item.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-navyMute transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${item.name}`}>
        <Trash2 size={13} />
      </button>
    </li>
  );
}

/**
 * Live cart panel. Rendered inside the catalog sidebar on desktop and as a fixed
 * bar on small screens.
 */
export function CartSummary({ layout = 'panel', className = '' }) {
  const { items, itemCount, subtotal, totalSavings, updateQuantity, removeItem, clearItems } = useCart();

  if (!items.length) {
    if (layout === 'bar') return null;
    return (
      <div className={`catalog-panel p-5 ${className}`}>
        <div className="flex items-center gap-2 text-sm font-extrabold text-navy">
          <ShoppingCart size={16} className="text-royal" strokeWidth={2.2} /> Your cart
        </div>
        <p className="mt-3 text-xs leading-5 text-navyMute">
          Nothing here yet. Use the quantity stepper on any listing, then add it to your cart.
        </p>
        <Link to="/products" className="catalog-btn catalog-btn-ghost mt-4 w-full">
          Browse the catalog
        </Link>
      </div>
    );
  }

  if (layout === 'bar') {
    return (
      <div className="catalog-sticky-bar">
        <div className="mx-auto flex w-[min(100%-1.5rem,1240px)] items-center gap-3 py-2.5">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-royalSoft text-royal">
            <ShoppingCart size={16} strokeWidth={2.2} />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-royal px-1 text-[0.55rem] font-extrabold text-white">
              {itemCount}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-navyMute">Cart total</p>
            <p className="catalog-total truncate text-base">{formatCurrency(subtotal)}</p>
          </div>
          <Link to="/cart" className="catalog-btn catalog-btn-primary shrink-0">
            View cart <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`catalog-panel overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-royal" strokeWidth={2.2} />
          <h2 className="text-sm font-extrabold text-navy">Your cart</h2>
        </div>
        <span className="rounded-full bg-royalSoft px-2 py-0.5 text-[0.62rem] font-extrabold text-royal">{itemCount} items</span>
      </div>

      <ul className="max-h-64 overflow-y-auto px-4">
        {items.map((item) => (
          <CartLine key={item.id} item={item} onUpdate={updateQuantity} onRemove={removeItem} />
        ))}
      </ul>

      <div className="border-t border-line bg-panel px-4 py-3.5">
        {totalSavings > 0 && (
          <div className="mb-2 flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-[0.08em] text-success">
            <span>You save</span>
            <span>{formatCurrency(totalSavings)}</span>
          </div>
        )}
        <div className="flex items-end justify-between gap-3">
          <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-navyMute">Cart total</span>
          <span className="catalog-total text-xl">{formatCurrency(subtotal)}</span>
        </div>
        <p className="mt-1.5 text-[0.6rem] leading-4 text-navyMute">Indicative pricing. Final rates are confirmed by our team.</p>

        <div className="mt-3.5 flex items-center gap-2">
          <Link to="/cart" className="catalog-btn catalog-btn-primary flex-1">
            View cart <ArrowRight size={13} />
          </Link>
          <button type="button" onClick={clearItems} className="catalog-btn catalog-btn-ghost shrink-0" aria-label="Empty cart">
            <Trash2 size={13} />
          </button>
        </div>
        <p className="mt-2 text-center text-[0.55rem] font-bold uppercase tracking-[0.1em] text-navyMute">
          Max {MAX_CART_QUANTITY} per listing
        </p>
      </div>
    </div>
  );
}
