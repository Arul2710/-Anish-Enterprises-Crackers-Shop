import { ChevronDown } from 'lucide-react';
import { useContent } from '../hooks/useContent';
import { heroBgImageCandidates } from '../utils/images';
import { CatalogImage } from './CatalogImage';

const highlightIcons = {
  'fast-delivery': DeliveryTruckIcon,
  'best-deals': PriceTagIcon,
  packaging: PackageBoxIcon,
  'working-hours': ClockIcon,
};

const FallbackIcon = PackageBoxIcon;

export function ServiceHighlights() {
  const { siteContent } = useContent();
  const highlights = siteContent.serviceHighlights.slice(0, 4);
  const hasBanner = heroBgImageCandidates().length > 0;

  if (!highlights.length) return null;

  return (
    <section aria-labelledby="service-highlights-title" className="border-b border-tintEdge bg-white">
      <h2 id="service-highlights-title" className="sr-only">Service highlights</h2>
      {hasBanner && (
        <div className="hero-banner h-96 sm:h-[32rem] lg:h-[40rem] xl:h-[48rem]">
          <CatalogImage candidates={heroBgImageCandidates()} alt="" loading="eager" fetchpriority="high" className="hero-bg-image" />
          <span className="hero-scroll-cue" aria-hidden="true">
            <ChevronDown size={20} />
          </span>
        </div>
      )}
      <div className="container-shell py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {highlights.map((highlight) => (
            <ServiceCard highlight={highlight} key={highlight.id} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ highlight }) {
  const Icon = highlightIcons[highlight.id] || FallbackIcon;

  return (
    <article className="group flex h-full min-w-0 flex-col rounded-2xl border border-goldEdge bg-white p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-marigold hover:bg-goldWash hover:shadow-soft sm:p-6 motion-reduce:transform-none motion-reduce:transition-none">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-goldSoft text-goldInk ring-1 ring-goldEdge transition-colors duration-200 group-hover:bg-white group-hover:text-goldDeep group-hover:ring-marigold/40">
        <Icon />
      </span>
      <h3 className="mt-5 break-words text-[0.82rem] font-bold uppercase leading-tight tracking-[0.12em] text-goldInk transition-colors duration-200 group-hover:text-goldDeep">
        {highlight.title}
      </h3>
      <p className="mt-2.5 break-words text-sm leading-6 text-stone-600">{highlight.copy}</p>
    </article>
  );
}

function DeliveryTruckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M14 17V5a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1" />
      <path d="M14 8h4l4 4v4a1 1 0 0 1-1 1h-1" />
      <path d="M9 17h6" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function PriceTagIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}

function PackageBoxIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
