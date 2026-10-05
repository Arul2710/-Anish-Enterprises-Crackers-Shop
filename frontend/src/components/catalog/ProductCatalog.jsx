import { PackageSearch, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ALL_CATEGORIES, defaultSort, getSortLabel } from '../../data/catalog';
import { useCatalog } from '../../hooks/useCatalog';
import { CartSummary } from './CartSummary';
import { CartTotals } from './CartTotals';
import { CatalogHero } from './CatalogHero';
import { CategorySection } from './CategorySection';
import { FilterPanel } from './FilterPanel';
import { ProductCard } from './ProductCard';
import { ProductListItem } from './ProductListItem';
import { SearchBar } from './SearchBar';
import { SortDropdown } from './SortDropdown';
import { ViewToggle } from './ViewToggle';

const DEFAULT_VIEW = 'list';

const readParam = (params, key, fallback) => {
  const value = params.get(key);
  return value && value.trim() ? value : fallback;
};

/**
 * Data-driven product catalog. Every piece of state (search, category, sort, view)
 * lives in the URL, so it survives refresh, back/forward and shared links.
 */
export function ProductCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { catalog } = useCatalog();
  const { filterCatalog, buildSections, getCatalogCategory, categoryOptions } = catalog;

  const search = readParam(searchParams, 'search', '');
  const sort = readParam(searchParams, 'sort', defaultSort);
  const view = readParam(searchParams, 'view', DEFAULT_VIEW);
  const rawCategory = readParam(searchParams, 'category', ALL_CATEGORIES);
  const activeCategory = useMemo(() => getCatalogCategory(rawCategory)?.name || ALL_CATEGORIES, [rawCategory, getCatalogCategory]);

  const updateParams = useCallback(
    (patch) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([key, value]) => {
        if (!value || value === readParam(searchParams, key, '')) next.delete(key);
        else next.set(key, value);
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const results = useMemo(() => filterCatalog({ search, category: activeCategory }), [filterCatalog, search, activeCategory]);
  const sections = useMemo(() => buildSections(results, sort), [buildSections, results, sort]);

  const allResults = useMemo(() => filterCatalog({ category: ALL_CATEGORIES }), [filterCatalog]);
  const counts = useMemo(() => {
    const byCategory = {};
    allResults.forEach((product) => {
      byCategory[product.category] = (byCategory[product.category] || 0) + 1;
    });
    return { all: allResults.length, byCategory, total: results.length, value: allResults.reduce((sum, product) => sum + product.price, 0) };
  }, [allResults, results.length]);

  // Layout and ordering are not filters: clearing filters must not reset the view.
  const hasFilters = Boolean(search) || activeCategory !== ALL_CATEGORIES;
  const clearAll = useCallback(() => {
    const next = {};
    if (sort !== defaultSort) next.sort = sort;
    if (view !== DEFAULT_VIEW) next.view = view;
    setSearchParams(next, { replace: true });
  }, [setSearchParams, sort, view]);

  return (
    <div className="catalog-shell">
      <CatalogHero categoryLabel={activeCategory === ALL_CATEGORIES ? null : getCatalogCategory(activeCategory)?.label} />

      <div className="catalog-toolbar border-b border-line bg-white">
        <div className="container-shell flex flex-wrap items-center gap-2.5 py-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="catalog-filter-panel"
            className={`catalog-btn order-1 shrink-0 ${filtersOpen ? 'catalog-btn-primary' : 'catalog-btn-ghost'}`}
          >
            <SlidersHorizontal size={16} strokeWidth={2.2} />
            Filter
            {activeCategory !== ALL_CATEGORIES && <span className={`h-1.5 w-1.5 rounded-full ${filtersOpen ? 'bg-white' : 'bg-royal'}`} />}
          </button>

          <SearchBar
            className="order-2 min-w-0 flex-1"
            value={search}
            onChange={(value) => updateParams({ search: value })}
          />

          <CartTotals className="order-5 w-full lg:order-3 lg:w-auto lg:shrink-0" />

          <div className="order-3 min-w-0 flex-1 sm:max-w-52 sm:flex-none lg:order-4">
            <SortDropdown value={sort} onChange={(value) => updateParams({ sort: value })} />
          </div>

          <ViewToggle value={view} onChange={(value) => updateParams({ view: value })} className="order-4 shrink-0 lg:order-5" />
        </div>
      </div>

      <div className="container-shell py-6 lg:py-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-navyMute">
            {hasFilters ? (
              <>
                Showing <span className="font-extrabold text-navy">{results.length}</span> of {counts.all} products · {getSortLabel(sort)}
              </>
            ) : (
              <>
                <span className="font-extrabold text-navy">{counts.all} products</span> across {sections.length} categories · prices are indicative
              </>
            )}
          </p>
          {hasFilters && (
            <button type="button" onClick={clearAll} className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-royal transition hover:text-royalDark">
              <RotateCcw size={12} /> Clear all filters
            </button>
          )}
        </div>

        {sections.length ? (
          <div className="mt-5 flex flex-col gap-9">
            {sections.map((section) => (
              <CategorySection key={section.key} section={section} view={view}>
                {section.products.map((product) =>
                  view === 'list' ? (
                    <ProductListItem key={product.id} product={product} />
                  ) : (
                    <ProductCard key={product.id} product={product} />
                  ),
                )}
              </CategorySection>
            ))}
          </div>
        ) : (
          <EmptyResults onClear={clearAll} search={search} />
        )}
      </div>

      <div className="h-16 lg:hidden" aria-hidden="true" />
      <div className="lg:hidden">
        <CartSummary layout="bar" />
      </div>

      {filtersOpen && (
          <FilterPanel
            layout="sheet"
            options={categoryOptions}
            activeCategory={activeCategory}
          counts={counts}
          hasFilters={hasFilters}
          onSelect={(value) => updateParams({ category: value })}
          onClear={clearAll}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </div>
  );
}

function EmptyResults({ onClear, search }) {
  return (
    <div className="catalog-panel mt-5 flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-royalSoft text-royal">
        <PackageSearch size={28} strokeWidth={1.6} />
      </span>
      <h2 className="mt-5 text-lg font-extrabold text-navy">No products match these filters</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-navyMute">
        {search ? <>Nothing in the 2026 catalog matches “{search}”.</> : 'Try a different category or clear the filters to see the full catalog.'}
      </p>
      <button type="button" onClick={onClear} className="catalog-btn catalog-btn-primary mt-6">
        <RotateCcw size={13} /> Clear all filters
      </button>
    </div>
  );
}
