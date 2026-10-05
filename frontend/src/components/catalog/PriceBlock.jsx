import { getTone } from '../../data/categoryTones';
import { formatCurrency } from '../../utils/format';

export function PriceBlock({ product, size = 'md', align = 'left' }) {
  const tone = getTone(product.categoryTone);
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <span className={`catalog-price ${size === 'lg' ? 'catalog-price-lg' : ''}`}>{formatCurrency(product.price)}</span>
        {product.hasDiscount && <span className="catalog-mrp">{formatCurrency(product.mrp)}</span>}
        {product.hasDiscount && (
          <span className="catalog-swatch bg-goldSurface text-goldInk ring-1 ring-inset ring-goldLine">
            {product.discountPercent}% off
          </span>
        )}
      </div>
      <p className={`mt-1 flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-navyMute ${align === 'right' ? 'justify-end' : ''}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
        {product.packSize} · Indicative
      </p>
    </div>
  );
}

export function CategoryChip({ product }) {
  const tone = getTone(product.categoryTone);
  return <span className={`catalog-swatch ring-1 ring-inset ${tone.chip}`}>{product.categoryLabel}</span>;
}

export function ProductCode({ product, className = '' }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-1.5 text-[0.68rem] font-semibold text-navyMute ${className}`}>
      <span className="rounded bg-lineSoft px-1.5 py-0.5 font-bold tracking-[0.06em] text-navySoft">{product.code}</span>
      <span aria-hidden="true">·</span>
      <span>Sheet #{product.sourceSerial}</span>
    </p>
  );
}
