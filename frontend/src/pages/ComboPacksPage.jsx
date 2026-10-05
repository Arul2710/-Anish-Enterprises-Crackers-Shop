import { ArrowRight, Gift, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ComboTile } from '../components/catalog/ComboTile';
import { CartSummary } from '../components/catalog/CartSummary';
import { CartTotals } from '../components/catalog/CartTotals';
import { useCatalog } from '../hooks/useCatalog';
import { useSeo } from '../hooks/useSeo';
import { formatCurrency } from '../utils/format';

/**
 * Combo & Gift.
 *
 * Tiles come from the pack records the admin panel manages, so a price, stock or
 * availability change made in the panel is what shoppers see here. Outlines and
 * labels stay in a responsive grid (one column on phones and tablets, two on wide
 * screens) and each tile keeps its image-left / information-right structure. The
 * stepper and the Add to Cart button on every tile write to the same cart, so the
 * Products / Items / Total summary and the nav badge update as you add.
 */
export function ComboPacksPage() {
  useSeo({
    title: 'Combo & Gift - crackers gift box assortments',
    description:
      'Ready-to-give crackers gift box packs in seven sizes, from a 20-item box to a 60-item box. Wholesale Deepavali combo assortments in Sivakasi with itemised contents and net rates.',
    path: '/combo-packs',
  });
  const { tiles } = useCatalog();

  const range = useMemo(() => {
    if (!tiles.length) return null;
    const prices = tiles.map((tile) => tile.price);
    return { lowest: Math.min(...prices), dearest: Math.max(...prices) };
  }, [tiles]);

  return (
    <div className="catalog-shell">
      <ComboHero total={tiles.length} />

      <div className="catalog-toolbar border-b border-line bg-white">
        <div className="container-shell flex flex-wrap items-center justify-between gap-2.5 py-3">
          <p className="text-xs font-semibold text-navyMute">
            <span className="font-extrabold text-navy">{tiles.length} combo packs</span>
            {range ? (
              <>
                {' '}· from {formatCurrency(range.lowest)} to {formatCurrency(range.dearest)}
              </>
            ) : null}
          </p>
          <CartTotals />
        </div>
      </div>

      <div className="container-shell py-6 lg:py-9">
        {tiles.length ? (
          <div className="grid items-stretch gap-4 sm:gap-5 xl:grid-cols-2">
            {tiles.map((tile) => (
              <ComboTile key={tile.id} tile={tile} />
            ))}
          </div>
        ) : (
          <p className="catalog-panel p-8 text-center text-sm font-semibold text-navyMute">
            No combo packs are available right now. Please check back soon.
          </p>
        )}

        <ComboGiftContent tiles={tiles} />

        <div className="catalog-panel mt-8 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <h2 className="text-lg font-extrabold tracking-[-0.02em] text-navy">Need a different size?</h2>
            <p className="mt-1.5 max-w-md text-sm leading-6 text-navyMute">
              Every listing in the 2026 sheet can be mixed into one enquiry, so a custom assortment is just a few
              quantity tweaks away.
            </p>
          </div>
          <Link to="/products" className="catalog-btn catalog-btn-primary shrink-0">
            Browse all products <ArrowRight size={14} strokeWidth={2.2} />
          </Link>
        </div>
      </div>

      <div className="h-16 lg:hidden" aria-hidden="true" />
      <div className="lg:hidden">
        <CartSummary layout="bar" />
      </div>
    </div>
  );
}

/**
 * SEO copy for the page, kept below the tiles so the catalog stays the first thing a
 * visitor sees. Every figure is derived from the tiles themselves, so the sizes and
 * quantities quoted here always match what is actually listed above.
 */
function ComboGiftContent({ tiles }) {
  if (!tiles.length) return null;

  const giftBoxes = tiles.filter((tile) => tile.kind === 'gift-box');
  const sizes = giftBoxes.length
    ? [...new Set(giftBoxes.map((tile) => tile.itemCount))].sort((a, b) => a - b)
    : [];
  const smallest = sizes[0] ?? null;
  const largest = sizes[sizes.length - 1] ?? null;

  return (
    <div className="mt-10 space-y-6 sm:mt-12">
      <div className="max-w-3xl">
        <span className="eyebrow">Gift boxes and combos</span>
        <h2 className="section-title mt-4 text-ink">Crackers gift box assortments</h2>
        <p className="body-copy mt-4 text-base">
          Each pack on this page is a ready-to-give <strong className="font-bold text-ink">crackers gift box</strong>:
          one sealed box holding an assortment of assorted crackers, sold as a single case. That is the practical
          advantage of ordering a box instead of building one line by line &mdash; the mix is already decided, and
          each card below shows exactly which items are inside it.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: `${tiles.length} sizes to choose from`,
            copy: sizes.length
              ? `From a ${smallest}-item box up to a ${largest}-item box, so a single-customer gift and a bulk retailer order are both covered.`
              : 'Each pack has its own item count and case size, listed above.',
          },
          {
            title: 'Itemised, not vague',
            copy:
              'Every card opens its own combo item list, so you can see the individual product names in the pack before you order rather than taking it on trust.',
          },
          {
            title: 'Mixed with anything else',
            copy:
              'Gift boxes do not have to be the whole order. Add them alongside any other listing in the 2026 sheet and send one enquiry for the lot.',
          },
        ].map((card) => (
          <div key={card.title} className="catalog-panel p-5">
            <h3 className="text-sm font-extrabold tracking-[-0.01em] text-navy">{card.title}</h3>
            <p className="mt-2 text-[0.8rem] leading-6 text-navyMute">{card.copy}</p>
          </div>
        ))}
      </div>

      <div className="max-w-3xl">
        <h2 className="font-display text-xl text-ink">Deepavali and other seasons</h2>
        <div className="body-copy mt-3 space-y-4 text-base">
          <p>
            Gift boxes are the line most retailers reorder from, because a sealed assortment is the easiest thing to
            sell in the final week before Deepavali and needs far less shelf planning than loose items. They are also
            the simplest thing for us to confirm stock against, which is why they are worth ordering early.
          </p>
          <p>
            They are not limited to Deepavali. The same assorted boxes are bought for weddings, family functions and
            temple festivals across the year, and for New Year and Pongal, always on the same wholesale terms as the
            rest of the catalog.
          </p>
        </div>
      </div>
    </div>
  );
}

function ComboHero({ total }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line bg-navy">
      <img src="/bg/hero3.png" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-charcoal/80 via-charcoal/40 to-charcoal/25 lg:bg-gradient-to-r lg:from-charcoal/80 lg:via-charcoal/40 lg:to-charcoal/5" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-charcoal/60 to-transparent" />

      <div className="container-shell flex min-h-[20rem] flex-col justify-end pb-9 pt-16 sm:min-h-[28rem] sm:pb-12 lg:min-h-[34rem] lg:pb-16">
        <h1 className="font-display text-4xl font-bold leading-none tracking-[-0.04em] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">
          Combo &amp; Gift
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] sm:text-base sm:leading-7">
          {total} ready-to-give gift boxes, each one a single shared record for its included item, price and saving,
          so what you see here is what the shop stocks. Wholesale crackers gift box assortments for the Sivakasi
          trade.
        </p>

        <ul className="mt-6 flex flex-wrap gap-2">
          <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm">
            <Gift size={12} strokeWidth={2.4} aria-hidden="true" /> Ready-to-give boxes
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm">
            <Sparkles size={12} strokeWidth={2.4} aria-hidden="true" /> Up to 86% off sheet rates
          </li>
        </ul>
      </div>
    </section>
  );
}
