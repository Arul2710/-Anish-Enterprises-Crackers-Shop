import { ArrowRight, Plus, ShieldCheck, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductMedia } from '../components/catalog/ProductMedia';
import { QuantityControl } from '../components/catalog/QuantityControl';
import { useCart } from '../hooks/useCart';
import { useCatalog } from '../hooks/useCatalog';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatCurrency } from '../utils/format';

export function CartPage() {
  useDocumentTitle('Your cart');
  const { items, itemCount, subtotal, totalSavings, updateQuantity, removeItem, clearItems } = useCart();

  if (!items.length) return <EmptyCart />;

  return (
    <div className="catalog-shell">
      <section className="border-b border-line bg-white">
        <div className="container-shell py-8 sm:py-11">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-navyMute">
            <span>Home</span>
            <span aria-hidden="true">/</span>
            <span className="text-navy">Cart</span>
          </nav>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-navy sm:text-[2.6rem]">Your cart</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-navySoft">
                {itemCount} {itemCount === 1 ? 'unit' : 'units'} across {items.length} {items.length === 1 ? 'listing' : 'listings'}. Nothing is ordered or paid here.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/products" className="catalog-btn catalog-btn-ghost">
                Add more
              </Link>
              <button type="button" onClick={clearItems} className="catalog-btn catalog-btn-ghost">
                <Trash2 size={13} /> Empty cart
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell grid gap-6 py-7 lg:grid-cols-[1fr_21rem] lg:gap-8 lg:py-10">
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <CartRow key={item.id} item={item} onUpdate={updateQuantity} onRemove={removeItem} />
          ))}
        </ul>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="catalog-panel overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-sm font-extrabold text-navy">Order summary</h2>
            </div>
            <dl className="flex flex-col gap-3 px-5 py-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-navyMute">Listings</dt>
                <dd className="font-bold text-navy">{items.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-navyMute">Units</dt>
                <dd className="font-bold text-navy">{itemCount}</dd>
              </div>
              {totalSavings > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-navyMute">Sheet savings</dt>
                  <dd className="font-bold text-success">{formatCurrency(totalSavings)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-navyMute">Delivery</dt>
                <dd className="font-bold text-navy">Confirmed by our team</dd>
              </div>
            </dl>
            <div className="border-t border-line bg-panel px-5 py-4">
              <div className="flex items-end justify-between gap-3">
                <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-navyMute">Cart total</span>
                <span className="catalog-total text-2xl">{formatCurrency(subtotal)}</span>
              </div>
              <p className="mt-2 text-[0.62rem] leading-5 text-navyMute">
                Based on the NET RAT column of the supplied order sheet. Final pricing, pack composition and availability are confirmed in our reply.
              </p>
              <Link to="/enquiry/form" className="catalog-btn catalog-btn-primary mt-4 w-full">
                Send this cart as an enquiry <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          <ul className="mt-4 flex flex-col gap-2.5">
            <TrustNote Icon={ShieldCheck}>No payment is taken on this site</TrustNote>
            <TrustNote Icon={Truck}>Delivery confirmed with your enquiry</TrustNote>
          </ul>
        </aside>
      </section>
    </div>
  );
}

function TrustNote({ Icon, children }) {
  return (
    <li className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3 text-xs font-semibold text-navySoft">
      <Icon size={15} className="shrink-0 text-success" strokeWidth={2} />
      {children}
    </li>
  );
}

function CartRow({ item, onUpdate, onRemove }) {
  // Combo tiles are built from several listings, so they have no single detail page:
  // send those lines back to the Combo & Gift page instead of a missing product.
  const { catalog, tiles } = useCatalog();
  const href = catalog.getCatalogProduct(item.id) ? `/products/${item.id}` : tiles.some((tile) => tile.id === item.id) ? '/combo-packs' : '/products';

  return (
    <li className="catalog-row p-3.5 sm:p-4">
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex min-w-0 flex-1 gap-3.5">
          <Link to={href} className="shrink-0" aria-label={`View ${item.name}`}>
            <ProductMedia product={item} className="h-20 w-20 sm:h-24 sm:w-24" sizes="96px" />
          </Link>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-navy">
              <Link to={href} className="transition hover:text-royal">
                {item.name}
              </Link>
            </h3>
            <p className="mt-1 text-[0.68rem] font-semibold text-navyMute">
              {item.code || item.categoryLabel} · {item.packSize}
            </p>
            <p className="mt-1.5 text-sm font-extrabold text-price">{formatCurrency(item.price)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <QuantityControl value={item.quantity} onChange={(next) => onUpdate(item.id, next)} label={`Quantity for ${item.name}`} />
          <div className="text-right">
            <p className="catalog-total">{formatCurrency(item.price * item.quantity)}</p>
            <p className="mt-0.5 text-[0.55rem] font-extrabold uppercase tracking-[0.1em] text-navyMute">Line total</p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-navyMute transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </li>
  );
}

function EmptyCart() {
  return (
    <div className="catalog-shell flex min-h-[64vh] flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-royalSoft text-royal">
        <ShoppingCart size={30} strokeWidth={1.5} />
      </span>
      <h1 className="mt-7 text-3xl font-extrabold tracking-[-0.035em] text-navy sm:text-4xl">Your cart is empty</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-navyMute">
        Set a quantity on any listing and add it to your cart. When you are ready, send the whole list as one enquiry.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
        <Link to="/products" className="catalog-btn catalog-btn-primary">
          Browse all products <ArrowRight size={13} />
        </Link>
        <Link to="/combo-packs" className="catalog-btn catalog-btn-ghost">
          <Plus size={13} /> Combo packs
        </Link>
      </div>
    </div>
  );
}
