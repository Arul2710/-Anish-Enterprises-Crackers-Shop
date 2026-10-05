import { Minus, Plus } from 'lucide-react';

export function QuantityControl({ value, onChange, min = 1, max = 99, compact = false }) {
  return (
    <div className={`inline-flex items-center rounded-full border border-stone-200 bg-white ${compact ? 'h-9' : 'h-11'}`}>
      <button
        type="button"
        className="flex h-full w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus size={14} />
      </button>
      <span className={`${compact ? 'w-7 text-xs' : 'w-8 text-sm'} text-center font-bold text-ink`}>{value}</span>
      <button
        type="button"
        className="flex h-full w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
