import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { sortOptions } from '../../data/catalog';

export function SortDropdown({ value, onChange, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const active = sortOptions.find((option) => option.value === value) || sortOptions[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-line bg-white px-3.5 text-left transition hover:border-slate-300"
      >
        <span className="min-w-0">
          <span className="block text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-navyMute">Sort</span>
          <span className="block truncate text-sm font-bold text-navy">{active.label}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-navyMute transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Sort products"
          className={`absolute z-40 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-panel ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {sortOptions.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-semibold transition hover:bg-panel ${option.value === value ? 'text-royal' : 'text-navySoft'}`}
              >
                {option.label}
                {option.value === value && <Check size={14} strokeWidth={2.6} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
