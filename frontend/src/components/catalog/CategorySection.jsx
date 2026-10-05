import { Link } from 'react-router-dom';
import { getTone } from '../../data/categoryTones';

/**
 * A category section: coloured rounded label, live count, and a soft rule that
 * runs to the edge. Sections are generated from the catalog data by the caller.
 */
export function CategorySection({ section, view, children }) {
  const tone = getTone(section.tone);

  return (
    <section aria-labelledby={`section-${section.key}`} className="scroll-mt-44">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={`section-${section.key}`} className="catalog-section-label">
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {section.label}
          <span className="catalog-section-count">{section.count}</span>
        </h2>
        <span className="catalog-rule" aria-hidden="true" />
        {section.category.description && (
          <p className="hidden text-[0.7rem] font-medium text-navyMute lg:block">{section.category.description}</p>
        )}
      </div>

      {view === 'list' ? (
        <div className="mt-4 flex flex-col gap-2.5">{children}</div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
      )}
    </section>
  );
}

export function SectionLink({ section, children }) {
  return (
    <Link
      to={`/products?category=${encodeURIComponent(section.category.name)}`}
      className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-royal transition hover:text-royalDark"
    >
      {children}
    </Link>
  );
}
