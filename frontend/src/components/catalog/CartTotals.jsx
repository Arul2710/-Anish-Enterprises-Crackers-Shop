import { IndianRupee, Package, ShoppingBag } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { formatCurrency } from '../../utils/format';

const STATS = [
  { key: 'products', label: 'Products', Icon: Package, surface: 'bg-slate-100', text: 'text-navy', value: (cart) => cart.items.length },
  { key: 'items', label: 'Items', Icon: ShoppingBag, surface: 'bg-royalSoft', text: 'text-royal', value: (cart) => cart.itemCount },
  { key: 'total', label: 'Total', Icon: IndianRupee, surface: 'bg-successSoft', text: 'text-success', value: (cart) => formatCurrency(cart.subtotal) },
];

/**
 * Live cart readout: distinct products, total units and cart value. Every figure
 * reads straight from the cart store, so it updates on the same render as the row
 * that caused the change.
 *
 * The three tiles are a fixed set that must never wrap, so the row itself carries
 * min-w-0 and the icon shrinks away on the narrowest phones. Without that the row's
 * min-content width - three icons plus their labels - pushes the toolbar past the
 * viewport on a 320px screen and the whole page scrolls sideways.
 */
export function CartTotals({ className = '' }) {
  const cart = useCart();

  return (
    <dl className={`flex min-w-0 items-center gap-2 ${className}`}>
      {STATS.map(({ key, label, Icon, surface, text, value }) => (
        <div key={key} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2 lg:flex-none">
          <span className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg min-[360px]:flex ${surface} ${text}`}>
            <Icon size={16} strokeWidth={2.2} />
          </span>
          <span className="min-w-0 leading-tight">
            <dt className="truncate text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-navyMute">{label}</dt>
            <dd className={`truncate text-sm font-extrabold tabular-nums ${key === 'total' ? 'text-success' : 'text-navy'}`}>{value(cart)}</dd>
          </span>
        </div>
      ))}
    </dl>
  );
}
