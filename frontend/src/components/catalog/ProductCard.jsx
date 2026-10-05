import { Link } from 'react-router-dom';
import { useAddToCart } from '../../hooks/useAddToCart';
import { formatCurrency } from '../../utils/format';
import { CategoryChip, PriceBlock, ProductCode } from './PriceBlock';
import { ProductMedia } from './ProductMedia';
import { QuantityControl } from './QuantityControl';

/**
 * Compact grid card. Two columns on mobile, four on wide desktops. There is no add
 * button: the quantity control is the cart, starting at 0 for a product that is not
 * in the cart, so "+" is what adds the product and "-" is what takes it back out.
 */
export function ProductCard({ product }) {
  const { quantity, increase, decrease, inCart, cartQuantity, atMax } = useAddToCart(product);

  return (
    <article className="catalog-row group flex flex-col overflow-hidden">
      <Link to={`/products/${product.id}`} className="relative block" aria-label={`View ${product.name}`}>
        <ProductMedia
          product={product}
          className="aspect-square w-full border-0 border-b border-lineSoft rounded-none"
          sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
        />
        {product.hasDiscount && (
          <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-[0.06em] text-goldInk shadow-sm">
            {product.discountPercent}% off
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <CategoryChip product={product} />
        <h3 className="mt-2 line-clamp-2 text-[0.86rem] font-bold leading-snug text-navy sm:text-[0.95rem]">
          <Link to={`/products/${product.id}`} className="transition hover:text-royal">
            {product.name}
          </Link>
        </h3>
        <ProductCode product={product} className="mt-1.5" />

        <div className="mt-2.5">
          <PriceBlock product={product} />
        </div>

        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between gap-2">
            <QuantityControl
              value={quantity}
              onIncrease={increase}
              onDecrease={decrease}
              min={0}
              max={atMax ? quantity : 99}
              size="sm"
              label={`Quantity for ${product.name}`}
            />
            <span className="catalog-total text-sm">{formatCurrency(product.price * quantity)}</span>
          </div>

          {inCart && (
            <p className="mt-2 text-center text-[0.58rem] font-extrabold uppercase tracking-[0.08em] text-success">
              {cartQuantity} in cart
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
