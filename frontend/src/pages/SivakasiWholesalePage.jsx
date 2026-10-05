import { ArrowRight, Gift, MapPin, Package, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../hooks/useCatalog';
import { useSeo } from '../hooks/useSeo';
import { Breadcrumbs } from '../components/Breadcrumbs';

/**
 * Wholesale Crackers in Sivakasi.
 *
 * This page exists to carry one search intent properly - "wholesale crackers in
 * Sivakasi" - so that page is not competing with About for the same words. Every
 * figure on it is read from the live catalog rather than typed in, so the counts and
 * the category list can never drift away from what the shop actually sells.
 */

const usePageSeo = () =>
  useSeo({
    title: 'Wholesale Crackers in Sivakasi',
    description:
      'Anish Enterprises is a crackers wholesale outlet in Sivakasi, supplying Deepavali crackers, fancy crackers, sparklers, rockets and gift box packs at wholesale rates.',
    path: '/sivakasi-wholesale-crackers',
  });

export function SivakasiWholesalePage() {
  usePageSeo();
  const { catalog, tiles } = useCatalog();

  const categories = catalog.catalogCategories;
  const listed = categories.filter((category) => category.count > 0);
  const giftBoxes = tiles.filter((tile) => tile.kind === 'gift-box');
  const totalListings = catalog.CATALOG_TOTAL;

  return (
    <div className="bg-cream">
      <Hero totalListings={totalListings} categoryCount={listed.length} />

      <div className="container-shell py-10 sm:py-14">
        <Breadcrumbs items={[{ label: 'Wholesale Crackers in Sivakasi' }]} />
      </div>

      {/* What a wholesale enquiry looks like */}
      <section className="container-shell pb-14 sm:pb-20">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <span className="eyebrow">Wholesale crackers outlet</span>
            <h2 className="section-title mt-4 text-ink">
              A <span className="text-goldInk">crackers wholesale outlet</span> in Sivakasi
            </h2>
            <div className="body-copy mt-6 space-y-5 text-base">
              <p>
                Anish Enterprises supplies Deepavali crackers to retailers, distributors and event organisers across
                Sivakasi and the surrounding towns. We work as a wholesale crackers outlet rather than a shop that
                happens to discount a few lines: the catalog is built around case quantities, the net rate is the rate
                you order at, and a single enquiry can mix any number of listings together.
              </p>
              <p>
                Because Sivakasi is the fireworks hub of the region, most of our customers are buying for the Deepavali
                season and want a dependable supplier who can confirm stock early. That is the part we take seriously.
                Availability is confirmed by our team against the live sheet before anything is dispatched, so the
                quantity you receive is the quantity that was agreed.
              </p>
              <p>
                Ordering is enquiry based. Shortlist what you need, send us the list, and we come back with price, pack
                details and availability. There is no online payment and no checkout pressure - for a wholesale
                relationship, a conversation is worth more than a basket.
              </p>
            </div>
          </div>

          <div className="min-w-0 lg:pt-2">
            <div className="card-surface rounded-2xl p-6 sm:p-7">
              <h3 className="font-display text-xl text-ink">How wholesale ordering works</h3>
              <ol className="mt-5 space-y-4">
                {[
                  { title: 'Shortlist from the catalog', copy: 'Browse every line in the 2026 sheet, or start from a category below.' },
                  { title: 'Send one enquiry', copy: 'Add quantities to the list and send it. Mixed categories in one list are fine.' },
                  { title: 'We confirm rate and stock', copy: 'Our team replies with the net rate, pack details and what is actually available.' },
                  { title: 'Goods are packed and dispatched', copy: 'Packed in poly bundles and cartons, then sent to your address.' },
                ].map((step, index) => (
                  <li key={step.title} className="flex gap-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondarySoft text-[0.7rem] font-extrabold text-goldInk ring-1 ring-inset ring-marigold/30">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-ink">{step.title}</p>
                      <p className="mt-1 text-[0.8rem] leading-6 text-navyMute">{step.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link className="btn-primary mt-7" to="/products">
                Browse the wholesale catalog <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories, read from the live catalog */}
      <section className="border-y border-tintEdge bg-white py-16 sm:py-20">
        <div className="container-shell">
          <div className="max-w-2xl">
            <span className="eyebrow">What we stock</span>
            <h2 className="section-title mt-4 text-ink">Crackers categories we supply</h2>
            <p className="body-copy mt-4">
              {listed.length} categories are in the current 2026 sheet, covering {totalListings} listings in total.
              Every line is ordered at its wholesale net rate, and the count below is how many listings sit in each
              category right now.
            </p>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listed.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/products?category=${encodeURIComponent(category.name)}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-lineSoft bg-panel px-4 py-3.5 transition hover:border-marigold/40 hover:bg-secondarySoft"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-navy">{category.label}</span>
                    <span className="mt-0.5 block text-[0.7rem] font-semibold text-navyMute">
                      {category.count} {category.count === 1 ? 'listing' : 'listings'}
                    </span>
                  </span>
                  <ArrowRight
                    size={15}
                    strokeWidth={2.2}
                    aria-hidden="true"
                    className="shrink-0 text-navySoft transition group-hover:translate-x-0.5 group-hover:text-goldInk"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Gift boxes, the deepavali-favourites angle */}
      {giftBoxes.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="container-shell grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
            <div className="min-w-0">
              <span className="eyebrow">Ready to give</span>
              <h2 className="section-title mt-4 text-ink">Crackers gift box assortments</h2>
              <div className="body-copy mt-5 space-y-4 text-base">
                <p>
                  The <strong className="font-bold text-ink">crackers gift box</strong> is the line most retailers
                  reorder from, because it removes the guesswork from a mixed order. Each one is a single sealed box
                  holding an assortment of assorted items, sold as one case.
                </p>
                <p>
                  We carry {giftBoxes.length} sizes, from a {Math.min(...giftBoxes.map((tile) => tile.itemCount))}-item
                  box up to a {Math.max(...giftBoxes.map((tile) => tile.itemCount))}-item box, so a customer buying one
                  box and a customer buying a hundred are both covered by the same range.
                </p>
              </div>
              <Link className="btn-primary mt-7" to="/combo-packs">
                See the gift box range <ArrowRight size={15} />
              </Link>
            </div>

            <ul className="grid min-w-0 gap-2.5 sm:grid-cols-2">
              {giftBoxes.map((box) => (
                <li key={box.id} className="card-surface flex min-w-0 items-center gap-3 rounded-xl p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondarySoft text-goldInk ring-1 ring-inset ring-marigold/30">
                    <Gift size={16} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-navy">{box.name}</span>
                    <span className="mt-0.5 block text-[0.7rem] font-semibold text-navyMute">
                      {box.itemCount} items &middot; {box.packSize}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Buying for a different occasion than Deepavali */}
      <section className="border-t border-tintEdge bg-white py-16 sm:py-20">
        <div className="container-shell">
          <div className="max-w-3xl">
            <span className="eyebrow">Other seasons</span>
            <h2 className="section-title mt-4 text-ink">Not only for Deepavali</h2>
            <div className="body-copy mt-5 space-y-5 text-base">
              <p>
                Deepavali is our busiest season, but the catalog is not Deepavali only. Fancy crackers and
                twinkling stars are sold across the year for weddings, family functions and temple festivals, and
                ground chakkar, colour fountains and sound fountains are popular for New Year and Pongal too. The same
                wholesale terms and the same single-enquiry ordering apply whenever you buy.
              </p>
              <p>
                Sparklers and kids items are the most frequently reordered lines for retailers, because they sell
                through quickly and need restocking well before the main nights. If you are planning ahead, get your
                list to us early and we will confirm what can be reserved.
              </p>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Sparkles, title: 'Deepavali fancy crackers', copy: 'Fountains, chakkar and ground items for the main nights.' },
                { icon: Package, title: 'Case quantities', copy: 'Every listing is ordered wholesale, in the pack the sheet specifies.' },
                { icon: MapPin, title: 'Sivakasi based', copy: 'Supplying retailers and distributors in and around Sivakasi.' },
              ].map(({ icon: Icon, title, copy }) => (
                <li key={title} className="card-surface rounded-2xl p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-marigold/30 bg-secondarySoft text-goldInk">
                    <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-sm font-extrabold text-ink">{title}</p>
                  <p className="mt-1.5 text-[0.78rem] leading-6 text-navyMute">{copy}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-t border-tintEdge bg-navy py-16 sm:py-24">
        <img
          src="/bg/hero3.png"
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
          loading="lazy"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-charcoal/85 via-charcoal/55 to-charcoal/40" />
        <div className="container-shell relative text-center">
          <p className="mx-auto max-w-xl text-[0.65rem] font-bold uppercase tracking-[0.16em] text-goldBright [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
            Wholesale enquiries open
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold leading-none tracking-[-0.045em] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-4xl lg:text-5xl">
            Send us your Deepavali list.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
            Shortlist what you need from the catalog and send one enquiry. We will confirm the net rate, pack details
            and current availability for your whole list.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link className="btn-primary" to="/products">
              Start an enquiry <ArrowRight size={15} />
            </Link>
            <Link className="btn-light" to="/contact">
              Contact details
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Hero({ totalListings, categoryCount }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-tintEdge bg-navy py-16 sm:py-24">
      <img
        src="/bg/hero4.png"
        alt=""
        className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-charcoal/80 via-charcoal/40 to-charcoal/25 lg:bg-gradient-to-r lg:from-charcoal/80 lg:via-charcoal/40 lg:to-charcoal/5" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-charcoal/60 to-transparent" />
      <div className="container-shell relative">
        <div className="max-w-3xl">
          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm">
            <MapPin size={11} strokeWidth={2.4} aria-hidden="true" /> Sivakasi
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">
            Wholesale crackers in <span className="text-goldBright">Sivakasi</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] sm:text-base">
            Anish Enterprises is a crackers wholesale outlet supplying Deepavali crackers, fancy crackers, sparklers,
            rockets and ready-to-give gift boxes to retailers and distributors &mdash; {totalListings} listings across{' '}
            {categoryCount} categories, all ordered at wholesale net rates through a single enquiry.
          </p>
        </div>
      </div>
    </section>
  );
}
