import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Collapsed to a single icon until it is tapped, then expands into a live search
 * field. Typing is debounced so the catalog URL updates once per pause.
 */
export function SearchBar({ value, onChange, placeholder = 'Search by name, code or category...', className = '' }) {
  const [open, setOpen] = useState(Boolean(value));
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(value);
    if (value) setOpen(true);
  }, [value]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (draft === value) return undefined;
    const timer = window.setTimeout(() => onChange(draft), 220);
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange]);

  const close = () => {
    setOpen(false);
    if (draft) {
      setDraft('');
      onChange('');
    }
  };

  return (
    <div className={className}>
      <div
        className={`flex h-12 items-center rounded-xl border bg-white transition-all duration-300 ease-out ${
          open ? 'w-full border-royal ring-4 ring-royal/10' : 'w-12 border-line'
        }`}
      >
        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          aria-label={open ? 'Close search' : 'Search products'}
          aria-expanded={open}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-navySoft transition hover:text-navy"
        >
          {open ? <X size={18} strokeWidth={2.2} /> : <Search size={18} strokeWidth={2.2} />}
        </button>

        <div
          className="min-w-0 flex-1 overflow-hidden transition-all duration-300 ease-out"
          style={{ maxWidth: open ? '100%' : '0px', opacity: open ? 1 : 0 }}
          aria-hidden={!open}
        >
          <input
            ref={inputRef}
            type="search"
            tabIndex={open ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key === 'Escape') close();
            }}
            onBlur={() => {
              if (!draft) setOpen(false);
            }}
            className="h-12 w-full min-w-0 bg-transparent pr-3.5 text-sm text-navy outline-none placeholder:text-navyMute"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            aria-label="Search products"
          />
        </div>
      </div>
    </div>
  );
}
