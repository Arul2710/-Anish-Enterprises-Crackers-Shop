import { getTone } from '../../data/categoryTones';
import { comboImageCandidates, productImageCandidates } from '../../utils/images';
import { CatalogImage } from '../CatalogImage';

const GLYPHS = {
  'SPARKLERS': 'M4 20 20 4M4 4l16 16',
  'GROUND CHAKKAR VARITIES': 'M12 3a9 9 0 1 0 9 9M12 12l8-8',
  'FANCY CHAKKAR': 'M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3',
  'TWINKLING STAR': 'M12 3v18M3 12h18M6 6l12 12M18 6 6 18',
  'FLOWER POT': 'M12 8c3 0 5 2 5 5s-2 8-5 8-5-5-5-8 2-5 5-5ZM12 8V3M9 5h6',
  'FANCY COLOR FOUNTAIN': 'M12 21V9M12 9 8 4M12 9l4-5M9 13l-4-3M15 13l4-3',
  'CRACKLING SOUND FOUNTAIN': 'M12 3v6M7 9v3M17 9v3M4 15a8 8 0 0 0 16 0M12 20v1',
  'ROCK N ROLL': 'M12 3c4 0 7 3 7 7 0 3-2 4-4 4s-3-1-3-3 1-2 2-2M8 21h8',
  'STICK VARITIES': 'M10 3h4v18h-4zM7 8h10M7 14h10',
  'PEACOCK VARITIES': 'M12 12a9 9 0 0 1 9-9M12 12a9 9 0 0 0 9 9M12 12a9 9 0 0 1-9 9M12 12a9 9 0 0 0-9-9M12 12v9',
  'SINGLE FLASH CRACKERS': 'M12 2v4M12 18v4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M2 12h4M18 12h4M4.9 19.1l2.9-2.9M16.2 7.8l2.9-2.9',
  'BOMB VARITIES': 'M12 3a6 6 0 0 1 6 6c0 4-3 5-3 8h-6c0-3-3-4-3-8a6 6 0 0 1 6-6ZM10 20h4',
  'LOOSE CRACKERS': 'M4 18 18 4M6 4v4M4 6h4M14 20h6M18 16v6M16 18h4',
  'KIDS ITEMS': 'M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM6 20v-2a6 6 0 0 1 12 0v2',
  'ROCKET VAIETY': 'M12 2c3 3 4 6 4 10l-2 4h-4l-2-4c0-4 1-7 4-10ZM10 20h4M12 9v4',
  'SKY FANCIES': 'M12 21a9 9 0 1 0-9-9M12 7a5 5 0 1 0-5 5M12 12a1 1 0 1 0 0 .01',
  'NEW ARRIVALS 2026': 'M12 2l2.4 6.2L21 9l-5 4.4L17.4 20 12 16.6 6.6 20 8 13.4 3 9l6.6-.8L12 2Z',
  'AERIAL FANCY': 'M12 3v18M12 3c-4 0-6 3-6 6M12 3c4 0 6 3 6 6M12 12l-5 3M12 12l5 3',
  'REPEATING SHOTS': 'M4 12a8 8 0 0 1 16 0M4 12v4M20 12v4M8 20h8M8 12V8M16 12V8',
  'WALA ITEAM': 'M3 12h4l3-7 4 14 3-7h4',
  'CRACKERS GIFT BOX': 'M3 8h18v12H3zM3 8l2-4h14l2 4M12 8v12',
};

const glyphFor = (category) => GLYPHS[category] || 'M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z';

function GeneratedArtwork({ product }) {
  const tone = getTone(product.categoryTone);
  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br ${tone.wash.split(' ').slice(1).join(' ')}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute inset-0 h-full w-full opacity-[0.16]" fill="none" stroke="currentColor" strokeWidth="0.6">
        <defs>
          <pattern id={`grid-${product.id}`} width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M12 0v12M0 12h12" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${product.id})`} />
      </svg>
      <span className="relative flex h-[62%] w-[62%] items-center justify-center">
        <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-full w-full ${tone.text}`} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
          <path d={glyphFor(product.category)} />
        </svg>
      </span>
      <span className={`absolute bottom-1.5 left-1.5 rounded-full bg-white/80 px-1.5 py-0.5 text-[0.5rem] font-extrabold uppercase tracking-[0.1em] ${tone.text}`}>
        {product.categoryLabel}
      </span>
    </div>
  );
}

/**
 * Catalog image surface. The product's own photo is used when it has one - from the
 * product record, from the index, or from the file named after the product number.
 * A Combo & Gift card looks in the combo artwork first, so a pack shows its own photo
 * rather than a picture of one of the items inside it. A product with no photo at all
 * keeps a deterministic, category-toned artwork instead, so a missing picture never
 * borrows another product's image. Images are always rendered with object-fit: contain
 * so nothing is ever stretched or cropped.
 */
export function ProductMedia({ product, className = '', eager = false, sizes }) {
  // The image index ships inside the bundle, so this needs no waiting: the first paint
  // already asks for the card's own photo.
  const isPack = product?.kind === 'combo' || product?.kind === 'gift-box';
  const candidates = isPack ? comboImageCandidates(product) : productImageCandidates(product);
  const showArtwork = candidates.length === 0;

  return (
    <div className={`catalog-frame ${className}`}>
      {showArtwork ? (
        <GeneratedArtwork product={product} />
      ) : (
        <CatalogImage
          candidates={candidates}
          alt={product.name}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes}
          fallback={<GeneratedArtwork product={product} />}
        />
      )}
    </div>
  );
}
