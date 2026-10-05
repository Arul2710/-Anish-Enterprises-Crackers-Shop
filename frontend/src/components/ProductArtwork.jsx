import { Sparkles } from 'lucide-react';
import { getCategoryTone, getInitials } from '../utils/format';
import { productImageCandidates } from '../utils/images';
import { CatalogImage } from './CatalogImage';

export function ProductArtwork({ product, className = '', eager = false }) {
  const tone = getCategoryTone(categoryTone(product.category));
  return (
    <div className={`product-art ${className}`}>
      <div className="product-art-glow" />
      <CatalogImage
        candidates={productImageCandidates(product)}
        alt={product.name}
        loading={eager ? 'eager' : 'lazy'}
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className="product-art-image"
        fallback={
          <>
            <div className="product-art-mark">{getInitials(product.category)}</div>
            <span className="product-art-label">Image placeholder A{`\u00b7`} {tone.text.replace('text-', '')}</span>
          </>
        }
      />
      <Sparkles className="absolute right-5 top-5 z-[1] text-ember/50" size={18} strokeWidth={1.5} />
    </div>
  );
}

function categoryTone(category = '') {
  if (category.includes('GIFT')) return 'orange';
  if (category.includes('NEW')) return 'rose';
  if (category.includes('ROCKET') || category.includes('SKY')) return 'blue';
  if (category.includes('FLOWER')) return 'green';
  if (category.includes('PEACOCK')) return 'purple';
  if (category.includes('SPARK')) return 'amber';
  if (category.includes('FOUNTAIN')) return 'pink';
  if (category.includes('FLASH') || category.includes('BOMB')) return 'red';
  return 'violet';
}
