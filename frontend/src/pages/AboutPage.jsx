import { ArrowRight, Heart, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSeo } from '../hooks/useSeo';

const values = [
  { icon: Heart, title: 'Celebration, considered', copy: 'We make browsing feel as thoughtful as the moment you are creating.' },
  { icon: ShieldCheck, title: 'Clarity at every step', copy: 'Original catalog details stay visible, with no invented stock or final prices.' },
  { icon: Sparkles, title: 'A little more joy', copy: 'From a small spark to a full sky, there is a moment for every kind of celebration.' },
];

export function AboutPage() {
  useSeo({
    title: 'About us - wholesale crackers in Sivakasi',
    description:
      'Anish Enterprises is a wholesale crackers business in Sivakasi, supplying Deepavali crackers, fancy crackers and gift box packs to retailers at wholesale rates.',
    path: '/about',
  });

  return (
    <div className="bg-cream">
      <section className="relative isolate overflow-hidden border-b border-tintEdge bg-navy py-16 sm:py-24">
        <img src="/bg/hero4.png" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-charcoal/80 via-charcoal/40 to-charcoal/25 lg:bg-gradient-to-r lg:from-charcoal/80 lg:via-charcoal/40 lg:to-charcoal/5" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-charcoal/60 to-transparent" />
        <div className="container-shell relative text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-white/15 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm">Our story</span>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">Good fireworks begin with a <span className="text-goldBright">good feeling.</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] sm:text-base">A wholesale crackers outlet in Sivakasi, supplying Deepavali crackers, fancy crackers and ready-to-give gift boxes to retailers and distributors — a calm, clear space between the excitement and the celebration.</p>
        </div>
      </section>
      <section className="container-shell grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="relative order-2 lg:order-1">
          <div className="absolute -left-4 -top-4 hidden h-28 w-28 rounded-[1.5rem] border border-ember/25 sm:block" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-tintEdge shadow-soft">
            <img
              src="/bg/hero.png"
              alt="Bursts of fireworks over the night sky during the Deepavali season"
              className="h-full min-h-[18rem] w-full object-cover object-center sm:min-h-[24rem]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/10 to-transparent" />
            <p className="absolute inset-x-0 bottom-0 p-5 font-display text-2xl leading-none text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.55)] sm:text-3xl">A calmer way to celebrate.</p>
          </div>
        </div>
          <div className="order-1 min-w-0 lg:order-2">
            <span className="eyebrow">The idea</span>
          <h2 className="section-title mt-4">Less noise. More <span className="text-goldInk">spark.</span></h2>
          <div className="body-copy space-y-6 text-base">
            <p>
              Anish Enterprises is a wholesale crackers business based in Sivakasi, supplying retailers, distributors
              and event organisers across the region. Sivakasi has long been the centre of the Indian fireworks trade,
              and being based here means we buy and stock from that same established network rather than reselling
              through a layer of intermediaries.
            </p>
            <p>
              We operate as a <strong className="font-bold text-ink">crackers wholesale outlet</strong> rather than a
              retail shop. Everything is priced at the wholesale net rate from our 2026 sheet, ordered in case
              quantities, and a single enquiry can mix any number of lines together. Retailers who reorder every
              season, and distributors who need a full range in one place, are both served the same way.
            </p>
            <p>
              The season runs on Deepavali, so that is when demand peaks. Our catalog is not limited to it, though.
              Fancy crackers, twinkling stars and ground chakkar are bought year round for weddings, family functions,
              temple festivals, New Year and Pongal, which is why our ordering is open continuously rather than only in
              the weeks before Deepavali.
            </p>
            <p>
              This frontend is built around the supplied <strong className="font-bold text-ink">Order Crackers
              2026.xlsx</strong> catalog. Every product shown here comes from that sheet. Where the source does not
              provide a confirmed customer price or stock quantity, we say so rather than making something up.
            </p>
            <p>
              Ordering works by enquiry: shortlist what you like, send us the list, and we confirm price, pack details
              and availability with you directly. There is no online payment and no checkout pressure.
            </p>
          </div>
        </div>
      </section>

      {/* Wholesale in Sivakasi: the single biggest search phrase the shop is aiming at,
          with a route of its own rather than competing with this page for the same words. */}
      <section className="border-y border-tintEdge bg-white py-16 sm:py-20">
        <div className="container-shell grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <span className="eyebrow">Where we are</span>
            <h2 className="section-title mt-4 text-ink">Wholesale crackers in Sivakasi</h2>
            <div className="body-copy mt-5 space-y-5 text-base">
              <p>
                Our base is in Sivakasi, which is where the region&apos;s fireworks trade is concentrated, and it is
                where our Deepavali stock is checked and packed. Most of our customers are within a short distance of
                us, and we supply the surrounding towns on the same wholesale terms.
              </p>
              <p>
                Because the busy season is short and intense, the practical thing retailers look for is certainty
                rather than novelty. That is why availability is confirmed by our team against the live sheet before a
                single case is dispatched, and why we would rather tell you a line is short than send you a surprise.
              </p>
              <p>
                If you are buying for the season ahead, send your list early. Confirming stock before the rush is the
                single most useful thing you can do for your own Deepavali planning.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="btn-primary" to="/sivakasi-wholesale-crackers">
                Our wholesale page <ArrowRight size={15} />
              </Link>
              <Link className="btn-light" to="/contact">
                Contact details
              </Link>
            </div>
          </div>

          <div className="lg:pt-2">
            <div className="card-surface rounded-2xl p-6 sm:p-7">
              <h3 className="flex items-center gap-2 font-display text-xl text-ink">
                <MapPin size={18} strokeWidth={1.9} className="text-goldInk" aria-hidden="true" />
                Find us
              </h3>
              <p className="mt-4 text-sm leading-7 text-navyMute">
                Come to the shop to discuss an order, or send an enquiry from the site and we will come back with rate
                and availability. Both work equally well for wholesale accounts.
              </p>
              <dl className="mt-6 space-y-4 border-t border-lineSoft pt-6 text-sm">
                <div>
                  <dt className="text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-navyMute">Based in</dt>
                  <dd className="mt-1.5 font-bold text-ink">Sivakasi, Tamil Nadu</dd>
                </div>
                <div>
                  <dt className="text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-navyMute">Supplying</dt>
                  <dd className="mt-1.5 font-bold text-ink">Retailers, distributors and event organisers</dd>
                </div>
                <div>
                  <dt className="text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-navyMute">Season</dt>
                  <dd className="mt-1.5 font-bold text-ink">Deepavali, New Year, Pongal, weddings and festivals</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
      <section className="border-y border-tintEdge bg-white py-20 sm:py-24"><div className="container-shell"><span className="eyebrow">What guides us</span><div className="mt-10 grid gap-4 md:grid-cols-3">{values.map(({ icon: Icon, title, copy }) => <div className="card-surface rounded-2xl p-6" key={title}><div className="flex h-11 w-11 items-center justify-center rounded-full border border-marigold/30 bg-secondarySoft text-goldInk"><Icon size={20} strokeWidth={1.7} /></div><h3 className="mt-7 font-display text-2xl text-ink">{title}</h3><p className="mt-3 text-sm leading-6 text-stone-500">{copy}</p></div>)}</div></div></section>
      <section className="relative isolate overflow-hidden border-t border-tintEdge bg-navy py-20 sm:py-28">
        <img src="/bg/hero3.png" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-charcoal/85 via-charcoal/55 to-charcoal/40" />
        <div className="container-shell relative text-center">
          <p className="mx-auto max-w-xl text-[0.65rem] font-bold uppercase tracking-[0.16em] text-goldBright [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">Ready to find your favourite?</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-semibold leading-none tracking-[-0.05em] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">Make a little room for wonder.</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><Link className="btn-primary" to="/products">Explore the collection <ArrowRight size={15} /></Link></div>
        </div>
      </section>
    </div>
  );
}
