import React, { useEffect, useRef, useState } from 'react';
import { cachedVenuePhoto, findVenuePhoto } from '../services/venuePhotos';
import { photo } from '../data/photos';

/** Commons thumbnails can be re-sized by rewriting the "/NNNpx-" segment. */
export function sized(url, w) {
  return url && /\/thumb\//.test(url) ? url.replace(/\/\d+px-/, `/${w}px-`) : url;
}

/**
 * Real photo of the venue when open data has one; otherwise the category photo, labelled as representative.
 * variant: 'thumb' (cards, lists) | 'hero' (venue page, with credit line)
 */
export default function VenuePhoto({ place, width = 320, variant = 'thumb', className = '', onResult }) {
  const el = useRef(null);
  const [real, setReal] = useState(() => (place ? cachedVenuePhoto(place.id) : undefined));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!place) return undefined;
    let live = true;
    const c = cachedVenuePhoto(place.id);
    setReal(c); setLoaded(false);
    if (c !== undefined) { onResult?.(c); return undefined; }
    const go = () => findVenuePhoto(place).then((r) => { if (live) { setReal(r); onResult?.(r); } });
    if (variant === 'hero' || !('IntersectionObserver' in window)) { go(); return () => { live = false; }; }
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); go(); } }, { rootMargin: '200px' });
    io.observe(el.current);
    return () => { live = false; io.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place?.id]);

  if (!place) return null;
  const fallback = photo(place.category, width);
  const src = real ? sized(real.thumb, Math.round(width * 1.5)) : null;

  return (
    <span ref={el} className={`vphoto vphoto-${variant} ${real ? 'is-real' : 'is-generic'} ${className}`}>
      <img className="vphoto-fb" src={fallback} alt="" loading={variant === 'hero' ? 'eager' : 'lazy'} />
      {src && <img className={`vphoto-real ${loaded ? 'is-in' : ''}`} src={src} alt={place.name} loading="lazy" onLoad={() => setLoaded(true)} onError={() => setReal(null)} />}
      {variant === 'hero' && (
        real
          ? <a className="vphoto-credit" href={real.page} target="_blank" rel="noreferrer">
              Photo: {real.author} · {real.source === 'google' ? 'Google Maps' : real.license}
            </a>
          : real === null && <span className="vphoto-credit is-generic">Representative photo · no public photo of this place yet</span>
      )}
      {variant === 'thumb' && real && <span className="vphoto-real-dot" title="Real photo of this place" />}
    </span>
  );
}
