import { ProductCard } from './ProductCard';

export function ProductGrid({ products, featured = false, showQuantity = false, emptyMessage = 'No products match these filters.' }) {
  if (!products.length) {
    return <div className="card-surface rounded-2xl px-6 py-14 text-center text-sm text-stone-500">{emptyMessage}</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
      {products.map((product) => <ProductCard key={product.id} product={product} featured={featured} showQuantity={showQuantity} />)}
    </div>
  );
}
