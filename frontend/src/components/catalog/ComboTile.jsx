import { useState } from 'react';
import { ChevronDown, ChevronUp, Gift, Package, Plus, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { COMBO_ITEMS_PREVIEW, isCatalogProductId } from '../../data/comboGift';
import { useAddToCart } from '../../hooks/useAddToCart';
import { formatCurrency } from '../../utils/format';
import { ProductMedia } from './ProductMedia';
import { QuantityControl } from './QuantityControl';

/**
 * Combo & Gift tile.
 *
 * A horizontal e-commerce card: image on the left (about 40% of the tile on wide
 * screens, stacked on top on mobile) and information on the right, reading in the
 * order a shopper does -
 *
 *   image -> name -> Combo Items -> discount -> original price -> offer price
 *         -> savings -> add to cart
 *
 * The Combo Items block lists the individual item names in the pack. It opens on the
 * first six names so the tile stays compact; "View more" reveals the rest and turns
 * into "View less". That state is local to the tile, so every card expands on its own.
 *
 * The tile keeps no independent quantity state: the stepper and the Add to Cart
 * button both write straight to the cart, which is what keeps the stepper, the line
 * total, the Products/Items/Total summary and the nav badge in agreement.
 */
export function ComboTile({ tile }) {
  const { quantity, increase, decrease, atMax } = useAddToCart(tile);
  const [expanded, setExpanded] = useState(false);
  const [added, setAdded] = useState(false);

  const items = tile.comboItems;
  const visibleItems = expanded ? items : items.slice(0, COMBO_ITEMS_PREVIEW);
  const hiddenCount = items.length - visibleItems.length;
  const hasDetails = isCatalogProductId(tile.id);

  const addToCart = () => {
    if (atMax) return;
    increase();
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article className="catalog-row group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover lg:flex-row">
      {/* Image: left on desktop and tablet, top on mobile */}
      <div className="relative w-full shrink-0 overflow-hidden bg-white lg:w-[42%]">
        <div className="aspect-[5/4] w-full sm:aspect-[16/10] lg:aspect-auto lg:h-full">
          <ProductMedia
            product={tile}
            className="h-full w-full"
            sizes="(min-width: 1024px) 42vw, (min-width: 640px) 60vw, 92vw"
          />
        </div>

        {/* Discount badge: noticeable, not oversized */}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-ember px-2 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.08em] text-white shadow-sm ring-1 ring-inset ring-white/25">
          <Tag size={11} strokeWidth={2.6} aria-hidden="true" />
          {tile.discountPercent}% off
        </span>

        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-navy/90 px-2.5 py-1 text-[0.55rem] font-extrabold uppercase tracking-[0.1em] text-white ring-1 ring-inset ring-white/20">
          <Gift size={11} strokeWidth={2.4} aria-hidden="true" />
          {tile.kind === 'gift-box' ? `Gift box · ${tile.itemCount} items` : `${items.length}-item combo`}
        </span>
      </div>

      {/* Information: right on desktop and tablet, below the image on mobile */}
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondarySoft px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.08em] text-goldInk ring-1 ring-inset ring-marigold/30">
            <Gift size={12} strokeWidth={2.4} aria-hidden="true" /> Combo &amp; Gift
          </span>
          <span className="rounded bg-lineSoft px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.06em] text-navySoft">
            {tile.code}
          </span>
        </div>

        <h2 className="mt-2 flex min-h-[3.1rem] items-start text-[1.05rem] font-extrabold leading-snug tracking-[-0.02em] text-navy lg:text-[1.15rem]">
          {tile.name}
        </h2>

        {/* Short description: one line of what the pack is, from its own record */}
        {tile.description ? (
          <p className="mt-1 text-[0.78rem] leading-5 text-navyMute">{tile.description}</p>
        ) : null}

        {/* Combo Items: the individual names in the pack, six to start */}
        <div className="mt-1 rounded-xl border border-lineSoft bg-panel p-3">
          <p className="flex items-center gap-1.5 text-[0.55rem] font-extrabold uppercase tracking-[0.12em] text-navyMute">
            <Package size={11} strokeWidth={2.4} aria-hidden="true" /> Combo Items
          </p>

          <ul id={`combo-items-${tile.id}`} className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
            {visibleItems.map((item) => (
              <li key={item.productId} className="flex items-start gap-1.5 text-[0.72rem] font-semibold leading-5 text-navy">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-royal" />
                <span className="min-w-0">{item.name}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={`combo-items-${tile.id}`}
            className="mt-2 inline-flex items-center gap-1 text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-royal transition hover:text-royalDark"
          >
            {expanded ? <ChevronUp size={12} strokeWidth={2.6} aria-hidden="true" /> : <ChevronDown size={12} strokeWidth={2.6} aria-hidden="true" />}
            {expanded ? 'View Less' : `View More${hiddenCount > 0 ? ` (${hiddenCount} more)` : ''}`}
          </button>
        </div>

        {/* Price: offer price prominent, original struck through, saving called out */}
        <div className="mt-3 flex flex-wrap items-end gap-x-2.5 gap-y-1">
          <span className="catalog-price catalog-price-lg text-[1.6rem]">{formatCurrency(tile.price)}</span>
          {tile.hasDiscount && <span className="catalog-mrp line-through">{formatCurrency(tile.mrp)}</span>}
          {tile.savings > 0 && (
            <span className="text-[0.68rem] font-extrabold text-success">You save {formatCurrency(tile.savings)}</span>
          )}
        </div>
        {/* Pack and case detail. The sheet's own case count is shown here rather than
            inside the product title, which is why the heading above reads as a product
            name instead of a spreadsheet cell. */}
        <p className="mt-0.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-navyMute">
          {[tile.packSize, tile.packNote].filter(Boolean).join(' · ')} · Indicative
        </p>

        {/* Quantity + Add to Cart, pinned to the bottom of every tile */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-navyMute">Qty</span>
            <QuantityControl
              value={quantity}
              onIncrease={increase}
              onDecrease={decrease}
              min={0}
              max={atMax ? quantity : 99}
              size="sm"
              label={`Quantity for ${tile.name}`}
            />
          </div>

          <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
            {/* A pack that is also a sheet listing has its own detail page to open */}
            {hasDetails ? (
              <Link to={`/products/${tile.id}`} className="catalog-btn catalog-btn-ghost">
                View Details
              </Link>
            ) : null}
            <button
              type="button"
              onClick={addToCart}
              disabled={atMax}
              className={`catalog-btn ${added ? 'catalog-btn-added' : 'catalog-btn-primary'}`}
              aria-label={`Add ${tile.name} to cart`}
            >
              {added ? 'Added' : atMax ? 'Max reached' : <><Plus size={13} strokeWidth={2.6} /> Add to Cart</>}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
