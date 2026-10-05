/**
 * Full-view catalog hero. The supplied hero artwork is a dark night-sky image, so the
 * text is white and the scrim stays light enough that the picture shows at full
 * strength across the whole banner. The image fills the band edge to edge via
 * `object-cover` (full view, no crop bars) and the section keeps a generous height,
 * matching the full-view hero style used on the home page.
 */
export function CatalogHero({ categoryLabel }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line bg-navy">
      <img src="/bg/hero2.png" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-charcoal/80 via-charcoal/40 to-charcoal/25 lg:bg-gradient-to-r lg:from-charcoal/80 lg:via-charcoal/40 lg:to-charcoal/5" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-charcoal/60 to-transparent" />

      <div className="container-shell flex min-h-[20rem] flex-col justify-end pb-9 pt-16 sm:min-h-[28rem] sm:pb-12 lg:min-h-[34rem] lg:pb-16">
        <h1 className="font-display text-4xl font-bold leading-none tracking-[-0.04em] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">
          {categoryLabel || 'All Products'}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] sm:text-base sm:leading-7">
          {categoryLabel
            ? `Every ${categoryLabel.toLowerCase()} listing in the supplied 2026 order sheet.`
            : 'The complete 2026 order sheet, grouped by category with indicative pricing. Build a cart and send it as one enquiry.'}
        </p>
      </div>
    </section>
  );
}