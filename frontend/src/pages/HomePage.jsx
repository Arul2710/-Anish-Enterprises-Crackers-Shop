import { ArrowRight, Check, ChevronRight, ClipboardList, Leaf, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductArtwork } from '../components/ProductArtwork';
import { CatalogImage } from '../components/CatalogImage';
import { ServiceHighlights } from '../components/ServiceHighlights';
import { SectionHeading } from '../components/SectionHeading';
import { useCatalog } from '../hooks/useCatalog';
import { useEnquiry } from '../hooks/useEnquiry';
import { useSeo } from '../hooks/useSeo';
import { formatCurrency, getCategoryTone } from '../utils/format';
import { categoryImageCandidates, comboImageCandidates } from '../utils/images';

const CRACKER_HIGHLIGHTS = [
  { title: 'Rockets & fountains', copy: 'Whistling rockets, colour fountains and sky fancies ready to lift the evening.' },
  { title: 'Chakkars & sparklers', copy: 'Ground and fancy chakkars plus handheld sparklers for every age.' },
  { title: 'Flower pots & gift boxes', copy: 'Ashoka and SPL flower pots, along with ready-to-give gift boxes.' },
  { title: 'Enquiry-based ordering', copy: 'Add to your list and our team confirms price, pack details and availability.' },
];

const HOME_REVIEWS = [
  { name: 'Karthik Rajendran', place: 'Madurai', text: 'Ordered for Deepavali and the team confirmed every detail over the phone before dispatch. Packs arrived neatly sealed and right on time.' },
  { name: 'Priya Mahalingam', place: 'Sivakasi', text: 'The enquiry list made comparing pack units so easy. Fair prices and a patient team that answered every single question.' },
  { name: 'Sathish Kumar', place: 'Tenkasi', text: 'The quality was spot on — bright fountains and chakkars that lit up the whole evening. Will order again next festival.' },
  { name: 'Divya Subramani', place: 'Kovilpatti', text: 'Loved the gift boxes. The packaging was sturdy and the sparklers inside were in perfect condition. Truly festive.' },
  { name: 'Rajesh Kannan', place: 'Srivilliputtur', text: 'Ordered a mix of rockets and crackers. Price and availability were confirmed within minutes on WhatsApp. Very smooth.' },
  { name: 'Meena Arul', place: 'Rajapalayam', text: 'Knew exactly what I wanted and they helped me pick the right pack unit for my budget. Honest pricing, no surprises.' },
  { name: 'Vignesh Thiagarajan', place: 'Virudhunagar', text: 'Everything from the packaging to the burn delivered on promise. The flower pots were a big hit at home.' },
  { name: 'Swathi Pradeep', place: 'Tirunelveli', text: 'First time ordering crackers online and the team walked me through it all. Sealed, safe and delivered in time for the night.' },
];

export function HomePage() {
  useSeo({
    title: 'Anish Enterprises | Wholesale Crackers in Sivakasi',
    description:
      'Anish Enterprises is a wholesale crackers outlet in Sivakasi. Shop Deepavali crackers, fancy crackers, sparklers, rockets and ready-to-give gift box packs at wholesale rates.',
    path: '/',
  });
  const { addItem } = useEnquiry();
  const { catalog, tiles } = useCatalog();
  const { catalogCategories, catalogProducts } = catalog;
  const categoryHighlights = catalogCategories.filter((category) => category.active !== false).slice(0, 6);
  const comboHighlights = tiles.slice(0, 3);
  const [reviewsPaused, setReviewsPaused] = useState(false);

  return (
    <>
      <ServiceHighlights />

      <section className="container-shell py-20 sm:py-28">
        <SectionHeading eyebrow="Find your spark" title="Shop by category" description="From a first sparkler to a sky-full finale, explore the catalog by the kind of magic you are looking for." action={<Link className="btn-secondary" to="/products">View all products <ArrowRight size={15} /></Link>} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryHighlights.map((category) => <CategoryCard category={category} key={category.name} />)}
        </div>
      </section>

      <section aria-labelledby="crackers-celebration-title" className="relative overflow-hidden border-y border-tintEdge bg-white py-20 sm:py-28">
        <div className="hero-grid absolute inset-0 opacity-30" />
        <div className="hero-glow -right-28 top-[-12rem] opacity-60" />
        <div className="container-shell relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="relative overflow-hidden rounded-[2rem] border border-tintEdge shadow-soft">
            <img
              src="/bg/hero2.png"
              alt="Crackers and fireworks lighting up the night sky"
              className="h-full min-h-[20rem] w-full object-cover object-center sm:min-h-[26rem]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/35 to-charcoal/10" />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-6 sm:p-7">
              <div>
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-goldBright">Crackers Celebration</span>
                <p className="mt-2 font-display text-3xl leading-none text-white sm:text-4xl">Shop the festive range</p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-white ring-1 ring-white/25">{catalogProducts.length} listings</span>
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-white ring-1 ring-white/25">{catalogCategories.length} categories</span>
              </div>
            </div>
          </div>

          <div>
            <span className="eyebrow">Crackers Celebration</span>
            <h1 id="crackers-celebration-title" className="section-title mt-4">Light up every moment of the night.</h1>
            <p className="body-copy mt-5 max-w-lg">
              From whistling rockets and colour fountains to ground chakkars and flower pots, the 2026 sheet has
              everything your celebration needs — with a single enquiry confirming price, pack and availability before
              anything ships.
            </p>
            <ul className="mt-8 grid gap-4">
              {CRACKER_HIGHLIGHTS.map(({ title, copy }) => (
                <li className="flex gap-3" key={title}>
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ember text-white">
                    <Check size={14} strokeWidth={2.6} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-stone-500">{copy}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link className="btn-primary" to="/products">Shop Crackers <ArrowRight size={15} /></Link>
              <Link className="btn-secondary" to="/combo-packs">Browse combo packs <ArrowRight size={15} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-20 sm:py-28">
        <SectionHeading eyebrow="Shortcuts" title="Start with a combo pack" description="Suggested groupings built from real catalog listings. Add the whole pack to your enquiry, then adjust quantities before you send it." action={<Link className="btn-secondary" to="/combo-packs">All combo packs <ArrowRight size={15} /></Link>} />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {comboHighlights.map((pack) => (
            <article className="card-surface flex flex-col rounded-2xl p-5" key={pack.id}>
              <CatalogImage
                candidates={comboImageCandidates(pack)}
                alt={pack.name}
                sizes="(min-width: 768px) 33vw, 100vw"
                className="mb-5 h-40 w-full rounded-xl object-cover"
              />
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-marigold/30 bg-secondarySoft px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-goldInk">{pack.kind === 'gift-box' ? 'Gift box' : 'Combo'}</span>
                <span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-stone-400">{pack.itemCount} items</span>
              </div>
              <h3 className="mt-4 font-display text-2xl leading-none text-ink">{pack.name}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-stone-500">{pack.description}</p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-200 pt-4">
                <span className="text-sm font-bold text-goldInk">{formatCurrency(pack.price)}</span>
                <div className="flex gap-2">
                  <Link className="rounded-full border border-stone-200 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-stone-600 transition hover:border-ink" to="/combo-packs">View</Link>
                  <button type="button" onClick={() => addItem(pack, 1)} className="rounded-full bg-ember px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-emberDark">Add to enquiry</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container-shell py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-24">
          <div className="relative order-2 lg:order-1">
            <div className="absolute -left-5 -top-5 h-24 w-24 rounded-full border border-ember/20" />
            <div className="relative overflow-hidden rounded-[2rem] border border-tintEdge shadow-soft">
              <img
                src="/bg/hero5.png"
                alt="Fireworks and crackers lighting up the night sky"
                className="h-full min-h-[18rem] w-full object-cover object-center sm:min-h-[22rem] lg:min-h-[24rem]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/25 to-charcoal/5" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                <div>
                  <span className="flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-goldBright"><Sparkles size={13} /> Our promise</span>
                  <p className="mt-2 font-display text-3xl leading-none text-white sm:text-4xl">Good spark.</p>
                  <p className="mt-3 text-xs leading-5 text-white/80">Curated with care · Est. 2026</p>
                </div>
                <span className="hidden rounded-full bg-white/15 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-white ring-1 ring-white/25 sm:block">
                  Anish Enterprises
                </span>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <span className="eyebrow">Why Anish Enterprises</span>
            <h2 className="section-title mt-4">A little more intention in every celebration.</h2>
            <p className="body-copy mt-6 max-w-lg">We believe the best fireworks feel personal. Our storefront is a simple, transparent way to browse the 2026 catalog, compare real listings and send one enquiry for the celebration that feels like yours.</p>
            <div className="mt-8 grid gap-5">
              <Promise icon={Leaf} title="A clearer choice" copy="Original catalog names, categories and pack units stay easy to find." />
              <Promise icon={ShieldCheck} title="Safety, always in the frame" copy="Celebrate responsibly and follow local guidance around fireworks." />
              <Promise icon={ClipboardList} title="Enquiry, not a checkout" copy="No online payment. We confirm every detail with you first." />
            </div>
            <Link className="btn-secondary mt-9" to="/about">More about our story <ChevronRight size={15} /></Link>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white py-16 sm:py-20">
        <div className="container-shell">
          <SectionHeading eyebrow="What customers say" title="Reviews, kept honest." description="Feedback shared by customers who ordered with us — verified by our team before it is published." />
          <div
            className="marquee-clip relative mt-10"
            onMouseEnter={() => setReviewsPaused(true)}
            onMouseLeave={() => setReviewsPaused(false)}
            onTouchStart={() => setReviewsPaused(true)}
            onTouchEnd={() => setReviewsPaused(false)}
            onTouchCancel={() => setReviewsPaused(false)}
          >
            <div
              className="marquee-track"
              style={{ animation: 'marquee 45s linear infinite', animationPlayState: reviewsPaused ? 'paused' : 'running' }}
            >
              {[...HOME_REVIEWS, ...HOME_REVIEWS].map((review, index) => (
                <article className="card-surface mr-4 w-[78vw] min-w-[17rem] shrink-0 rounded-2xl p-5 sm:w-[45vw] lg:w-[24rem]" key={`${review.name}-${index}`}>
                  <div className="flex items-center gap-1 text-goldInk">
                    {Array.from({ length: 5 }).map((_, starIndex) => <Star key={starIndex} size={13} className="fill-goldDeep text-goldDeep" />)}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-stone-600">&ldquo;{review.text}&rdquo;</p>
                  <div className="mt-5 flex items-center gap-3 border-t border-stone-100 pt-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-goldSoft font-display text-sm text-goldDeep">{review.name.charAt(0)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-ink">{review.name}</p>
                      <p className="text-[0.65rem] font-semibold text-stone-400">{review.place} · Verified</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent sm:w-12" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent sm:w-12" />
          </div>
        </div>
      </section>
    </>
  );
}

function CategoryCard({ category }) {
  const { catalog } = useCatalog();
  const tone = getCategoryTone(category.tone);
  const categoryProduct = catalog.catalogProducts.find((product) => product.category === category.name);
  return (
    <Link className="group card-surface relative overflow-hidden rounded-2xl p-4 transition hover:-translate-y-1 hover:border-ember/30 hover:shadow-soft" to={`/products?category=${encodeURIComponent(category.name)}`}>
      {categoryProduct && (
        <CatalogImage
          candidates={categoryImageCandidates(category.name)}
          alt={category.label}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="min-h-[10.5rem] w-full rounded-xl object-cover"
          fallback={<ProductArtwork product={categoryProduct} className="min-h-[10.5rem] rounded-xl" />}
        />
      )}
      <div className="flex items-end justify-between gap-3 pt-4">
        <div>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] ${tone.background} ${tone.text}`}>{category.count} items</span>
          <h3 className="mt-3 font-display text-2xl leading-none text-ink">{category.label}</h3>
          <p className="mt-2 text-xs text-stone-400">{category.description}</p>
        </div>
        <ArrowRight className="mb-1 shrink-0 text-goldInk transition-transform group-hover:translate-x-1" size={17} />
      </div>
    </Link>
  );
}

function Promise({ icon: Icon, title, copy }) {
  return <div className="flex gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-marigold/30 bg-secondarySoft text-goldInk"><Icon size={18} strokeWidth={1.7} /></div><div><h3 className="text-sm font-bold text-ink">{title}</h3><p className="mt-1 text-sm leading-6 text-stone-500">{copy}</p></div></div>;
}
