import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useEffect } from 'react';
import { getTone } from '../../data/categoryTones';
import { formatCurrency } from '../../utils/format';

function CategoryList({ options, activeCategory, counts, onSelect }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {options.map((option) => {
        const active = option.value === activeCategory;
        const tone = getTone(option.tone);
        const count = option.value === 'all' ? counts.all : (counts.byCategory[option.value] ?? 0);
        return (
          <li key={option.value}>
            <button
              type="button"
              onClick={() => onSelect(option.value)}
              aria-current={active ? 'true' : undefined}
              className={`catalog-filter-link ${active ? 'active' : ''}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-white' : tone.dot}`} />
                <span className="truncate">{option.label}</span>
              </span>
              <span className="catalog-filter-count shrink-0">{count}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PanelBody({ options, activeCategory, counts, hasFilters, onSelect, onClear, onClose }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-navy" strokeWidth={2} />
          <h2 className="text-sm font-extrabold text-navy">Filter</h2>
        </div>
        <div className="flex items-center gap-1">
          {hasFilters && (
            <button type="button" onClick={onClear} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-royal transition hover:bg-royalSoft">
              <RotateCcw size={12} /> Clear
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-navyMute transition hover:bg-panel hover:text-navy" aria-label="Close filters">
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <p className="px-2.5 pb-2 pt-1 text-[0.58rem] font-extrabold uppercase tracking-[0.16em] text-navyMute">Category</p>
        <CategoryList options={options} activeCategory={activeCategory} counts={counts} onSelect={onSelect} />
      </div>

      <div className="border-t border-line px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-navyMute">Showing</span>
          <span className="text-sm font-extrabold text-navy">{counts.total} products</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-navyMute">Value</span>
          <span className="text-sm font-extrabold text-success">{formatCurrency(counts.value)}</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="catalog-btn catalog-btn-primary mt-3.5 w-full">
            Show {counts.total} products
          </button>
        )}
      </div>
    </>
  );
}

function FilterSheet(props) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') props.onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [props]);

  return (
    <>
      <div className="catalog-scrim" onClick={props.onClose} aria-hidden="true" />
      <div className="catalog-sheet" role="dialog" aria-modal="true" aria-label="Filter products" id="catalog-filter-panel">
        <div className="catalog-sheet-panel">
          <PanelBody {...props} onClose={props.onClose} />
        </div>
      </div>
    </>
  );
}

export function FilterPanel({ layout = 'sidebar', ...props }) {
  if (layout === 'sheet') return <FilterSheet {...props} />;

  return (
    <div className="catalog-panel flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden">
      <PanelBody {...props} />
    </div>
  );
}
