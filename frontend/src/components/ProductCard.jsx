import { Check, ClipboardList, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useEnquiry } from '../hooks/useEnquiry';
import { formatCurrency, formatCategory } from '../utils/format';
import { ProductArtwork } from './ProductArtwork';
import { QuantityControl } from './QuantityControl';

export function ProductCard({ product, featured = false, showQuantity = false }) {
  const { addItem } = useEnquiry();
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    addItem(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className={`product-card ${featured ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
      <Link to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
        <ProductArtwork product={product} />
      </Link>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="product-meta">
          <span className="truncate">{formatCategory(product.category)}</span>
          <span className="flex shrink-0 items-center gap-1.5"><span className="status-dot" /> To confirm</span>
        </div>
        <Link className="mt-3 block" to={`/products/${product.id}`}>
          <h3 className="product-name">{product.name}</h3>
        </Link>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="product-price">{formatCurrency(product.customerPrice)}</p>
            <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-stone-400">NET RAT · {product.packSize}</p>
          </div>
          <span className="text-[0.65rem] font-bold text-stone-400">#{String(product.sourceSerial).padStart(3, '0')}</span>
        </div>
        {showQuantity && <div className="mt-4 flex items-center justify-between rounded-xl bg-secondarySoft px-3 py-2"><span className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-stone-400">Quantity</span><QuantityControl value={quantity} onChange={setQuantity} compact /></div>}
        <button type="button" className={`${showQuantity ? 'mt-3' : 'mt-5'} flex h-11 w-full items-center justify-center gap-2 rounded-full text-[0.7rem] font-bold uppercase tracking-[0.1em] transition ${added ? 'bg-emerald-600 text-white' : 'bg-ember text-white hover:bg-emberDark'}`} onClick={handleAdd}>
          {added ? <Check size={15} /> : <ClipboardList size={15} />}
          {added ? 'Added to enquiry' : 'Add to enquiry'}
        </button>
      </div>
    </article>
  );
}

export function ProductMiniRow({ product, onAdd }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3">
      <ProductArtwork product={product} className="h-16 min-h-0 w-16 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{product.name}</p>
        <p className="mt-1 text-xs text-stone-400">{formatCurrency(product.customerPrice)} · {product.packSize}</p>
      </div>
      <button type="button" onClick={() => onAdd(product)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ember text-white transition hover:bg-emberDark" aria-label={`Add ${product.name}`}>
        <Plus size={15} />
      </button>
    </div>
  );
}
