import { Minus, Plus } from 'lucide-react';

/**
 * Blue-accented stepper used across the catalog, cart and detail views.
 *
 * Pass `onIncrease` / `onDecrease` to route the buttons somewhere other than
 * `onChange` (the catalog rows do this so the stepper writes straight to the cart).
 * `min` is 0 for catalog rows, where 0 means "not in the cart yet".
 */
export function QuantityControl({
  value,
  onChange,
  onIncrease,
  onDecrease,
  min = 1,
  max = 99,
  size = 'md',
  label = 'Quantity',
}) {
  const safe = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const lower = Math.max(0, min);
  const upper = Math.max(lower, max);
  const clamp = (next) => Math.min(upper, Math.max(lower, next));

  const step = (delta) => {
    const next = clamp(safe + delta);
    if (next === safe) return;
    if (delta > 0) (onIncrease || onChange)?.(next);
    else (onDecrease || onChange)?.(next);
  };

  return (
    <div className={`catalog-ctrl ${size === 'sm' ? 'catalog-ctrl-sm' : ''}`} role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={safe <= lower}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <Minus size={size === 'sm' ? 12 : 14} strokeWidth={2.4} />
      </button>
      <span className="catalog-ctrl-value" aria-live="polite">
        {safe}
      </span>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={safe >= upper}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <Plus size={size === 'sm' ? 12 : 14} strokeWidth={2.4} />
      </button>
    </div>
  );
}
