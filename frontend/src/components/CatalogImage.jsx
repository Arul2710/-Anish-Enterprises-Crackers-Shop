import { useEffect, useState } from 'react';

export function CatalogImage({
  candidates = [],
  alt = '',
  className = '',
  loading = 'lazy',
  decoding = 'async',
  sizes,
  fallback = null,
  ...rest
}) {
  const sourceKey = candidates.join('|');
  const [index, setIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setIndex(0);
    setExhausted(false);
  }, [sourceKey]);

  if (exhausted || !candidates.length) return fallback;

  // A new list can be shorter than the one an index was chosen from, so the index is
  // clamped instead of read blind: without this a resolving manifest that shortens the
  // list renders one frame with no src at all, which shows as a broken image.
  const active = Math.min(index, candidates.length - 1);

  return (
    <img
      {...rest}
      src={candidates[active]}
      alt={alt}
      loading={loading}
      decoding={decoding}
      sizes={sizes}
      draggable="false"
      onError={() => {
        if (active < candidates.length - 1) setIndex(active + 1);
        else setExhausted(true);
      }}
      className={className}
    />
  );
}
