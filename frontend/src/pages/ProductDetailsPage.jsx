import { ArrowLeft, ArrowRight, Check, Info, Package, ShieldCheck, ShoppingCart, Sparkles, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProductMedia } from '../components/catalog/ProductMedia';
import { PriceBlock, ProductCode } from '../components/catalog/PriceBlock';
import { QuantityControl } from '../components/catalog/QuantityControl';
import { useCatalog } from '../hooks/useCatalog';
import { useCart } from '../hooks/useCart';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatCurrency } from '../utils/format';

export function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { catalog } = useCatalog();
  const { getCatalogProduct, getCatalogCategory, filterCatalog } = catalog;
  const product = getCatalogProduct(id);
  const { addItem, quantityOf } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  useDocumentTitle(product?.name || 'Product details');

  const category = product ? getCatalogCategory(product.category) : null;
  const inCart = product ? quantityOf(product.id) : 0;

  const related = useMemo(() => {
    if (!product) return [];
    return filterCatalog({ category: product.category })
      .filter((item) => item.id !== product.id)
      .slice(0, 4);
  }, [product, filterCatalog]);

  useEffect(() => {
    setQuantity(1);
    setAdded(false);
  }, [id]);

  if (!product) return <MissingProduct />;

  const add = () => {
    addItem(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  const addAndGoToCart = () => {
    addItem(product, quantity);
    navigate('/cart');
  };

  return (
    <div className="catalog-shell">
      <div className="container-shell py-5 sm:py-7">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-navyMute">
          <Link to="/" className="transition hover:text-royal">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/products" className="transition hover:text-royal">Products</Link>
          {category && (
            <>
              <span aria-hidden="true">/</span>
              <Link to={`/products?category=${encodeURIComponent(category.name)}`} className="transition hover:text-royal">
                {category.label}
              </Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span className="max-w-[16rem] truncate text-navy">{product.name}</span>
        </nav>
      </div>

      <section className="container-shell grid gap-8 pb-14 lg:grid-cols-2 lg:gap-12 lg:pb-20">
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <ProductMedia
            product={product}
            eager
            className="aspect-square w-full rounded-2xl"
            sizes="(min-width: 1024px) 46vw, 100vw"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-navyMute">
            <span className="flex items-center gap-1.5">
              <Package size={13} /> {product.packSize}
            </span>
            <span>{product.code}</span>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold leading-[1.05] tracking-[-0.04em] text-navy sm:text-[2.75rem]">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <ProductCode product={product} />
            {inCart > 0 && (
              <span className="catalog-swatch bg-successSoft text-success ring-1 ring-inset ring-emerald-200">{inCart} in cart</span>
            )}
          </div>

          <p className="mt-5 text-sm leading-7 text-navySoft">{product.description}</p>

          <div className="mt-6 rounded-2xl border border-line bg-white p-5">
            <PriceBlock product={product} size="lg" />
            <p className="mt-3 text-[0.65rem] leading-5 text-navyMute">
              Sheet RATE {formatCurrency(product.mrp)} · NET RAT {formatCurrency(product.price)} · indicative until confirmed.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-navyMute">Quantity</p>
              <div className="mt-2">
                <QuantityControl value={quantity} onChange={setQuantity} label={`Quantity for ${product.name}`} />
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-navyMute">Line total</p>
              <p className="catalog-total mt-1 text-2xl">{formatCurrency(product.price * quantity)}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <button type="button" onClick={add} className={`catalog-btn catalog-btn-primary sm:flex-1 ${added ? 'catalog-btn-added' : ''}`}>
              {added ? <Check size={15} strokeWidth={2.6} /> : <ShoppingCart size={15} strokeWidth={2.2} />}
              {added ? 'Added to cart' : 'Add to cart'}
            </button>
            <button type="button" onClick={addAndGoToCart} className="catalog-btn catalog-btn-ghost sm:flex-1">
              Buy via enquiry <ArrowRight size={14} />
            </button>
          </div>

          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <FeatureNote Icon={ShieldCheck} title="Enquiry based">Nothing is ordered or paid on this site.</FeatureNote>
            <FeatureNote Icon={Truck} title="Delivery confirmed">We confirm rates and dispatch with you.</FeatureNote>
          </ul>

          <div className="mt-5 flex gap-3 rounded-2xl border border-goldEdge bg-goldSoft p-4">
            <Info size={16} className="mt-0.5 shrink-0 text-goldInk" strokeWidth={2.2} />
            <p className="text-[0.7rem] leading-5 text-navySoft">
              The source sheet lists RATE and NET RAT per listing. We show NET RAT as the indicative price and keep RATE as the struck-through sheet rate. Stock
              quantities are not part of the supplied data.
            </p>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-line bg-white py-12 sm:py-16">
          <div className="container-shell">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold tracking-[-0.03em] text-navy sm:text-2xl">More from {category?.label.toLowerCase()}</h2>
                <p className="mt-1.5 text-sm text-navyMute">{related.length} more listings in this category</p>
              </div>
              <Link to={`/products?category=${encodeURIComponent(product.category)}`} className="catalog-btn catalog-btn-ghost">
                View category <ArrowRight size={13} />
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
              {related.map((item) => (
                <RelatedCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function FeatureNote({ Icon, title, children }) {
  return (
    <li className="flex gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3">
      <Icon size={15} className="mt-0.5 shrink-0 text-success" strokeWidth={2} />
      <span>
        <span className="block text-xs font-extrabold text-navy">{title}</span>
        <span className="mt-0.5 block text-[0.68rem] leading-5 text-navyMute">{children}</span>
      </span>
    </li>
  );
}

function RelatedCard({ product }) {
  return (
    <Link to={`/products/${product.id}`} className="catalog-row group flex flex-col overflow-hidden">
      <ProductMedia product={product} className="aspect-square w-full border-0 border-b border-lineSoft rounded-none" sizes="22vw" />
      <span className="flex flex-1 flex-col p-3">
        <span className="line-clamp-2 text-[0.8rem] font-bold leading-snug text-navy transition group-hover:text-royal">{product.name}</span>
        <span className="mt-auto pt-2.5 text-sm font-extrabold text-price">{formatCurrency(product.price)}</span>
      </span>
    </Link>
  );
}

function MissingProduct() {
  return (
    <div className="catalog-shell flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center">
      <Sparkles size={30} className="text-royal" strokeWidth={1.5} />
      <h1 className="mt-5 text-3xl font-extrabold tracking-[-0.035em] text-navy">That listing is not in the catalog</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-navyMute">
        We could not match that reference against the supplied 2026 order sheet.
      </p>
      <Link to="/products" className="catalog-btn catalog-btn-primary mt-7">
        <ArrowLeft size={14} /> Back to all products
      </Link>
    </div>
  );
}
