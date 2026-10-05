import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAddToCart } from '../../hooks/useAddToCart';
import { formatCurrency } from '../../utils/format';
import { CategoryChip, PriceBlock, ProductCode } from './PriceBlock';
import { ProductMedia } from './ProductMedia';
import { QuantityControl } from './QuantityControl';

/**
 * List row: large rounded white container, image left, name and code beside it,
 * price block, blue quantity stepper, and the line total on the right. There is no
 * add button: the stepper starts at 0 and is the cart, so "+" adds the product and
 * "-" removes it again once the quantity returns to 0.
 */
export function ProductListItem({ product }) {
  const { quantity, increase, decrease, inCart, cartQuantity, atMax } = useAddToCart(product);
  const lineTotal = product.price * quantity;
  const stepper = (size) => (
    <QuantityControl
      value={quantity}
      onIncrease={increase}
      onDecrease={decrease}
      min={0}
      max={atMax ? quantity : 99}
      size={size}
      label={`Quantity for ${product.name}`}
    />
  );

  return (
    <article className="catalog-row p-3 sm:p-4">
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:gap-5">
        <Link to={`/products/${product.id}`} className="flex shrink-0 gap-3.5 lg:block" aria-label={`View ${product.name}`}>
          <ProductMedia product={product} className="h-24 w-24 shrink-0 sm:h-28 sm:w-28 lg:h-32 lg:w-32" sizes="128px" />
          <div className="min-w-0 flex-1 lg:hidden">
            <CategoryChip product={product} />
            <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-navy">{product.name}</h3>
            <ProductCode product={product} className="mt-1.5" />
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="hidden lg:block">
            <CategoryChip product={product} />
            <h3 className="mt-2 text-[1.02rem] font-bold leading-snug text-navy">
              <Link to={`/products/${product.id}`} className="transition hover:text-royal">
                {product.name}
              </Link>
            </h3>
            <ProductCode product={product} className="mt-1.5" />
          </div>

          <div className="mt-0 lg:mt-3">
            <PriceBlock product={product} />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 lg:hidden">
            {stepper('sm')}
            <span className="catalog-total">{formatCurrency(lineTotal)}</span>
          </div>

          {inCart && (
            <p className="mt-2 text-[0.58rem] font-extrabold uppercase tracking-[0.08em] text-success lg:hidden">
              {cartQuantity} in cart
            </p>
          )}
        </div>

        <div className="hidden w-56 shrink-0 flex-col items-stretch gap-2.5 lg:flex">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-navyMute">Quantity</span>
            {stepper('md')}
          </div>
          {inCart && (
            <p className="text-center text-[0.58rem] font-extrabold uppercase tracking-[0.08em] text-success">
              {cartQuantity} in cart
            </p>
          )}
        </div>

        <div className="hidden w-32 shrink-0 flex-col items-end justify-center gap-1 border-l border-line pl-5 lg:flex">
          <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-navyMute">Total</span>
          <span className="catalog-total text-lg">{formatCurrency(lineTotal)}</span>
          <Link
            to={`/products/${product.id}`}
            className="mt-0.5 inline-flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-royal transition hover:text-royalDark"
          >
            <Eye size={12} strokeWidth={2.4} /> Details
          </Link>
        </div>
      </div>

      <div className="mt-3 lg:hidden">
        <Link to={`/products/${product.id}`} className="catalog-btn catalog-btn-ghost w-full">
          <Eye size={14} strokeWidth={2.2} /> Details
        </Link>
      </div>
    </article>
  );
}
