import { useEffect, useState } from 'react';
import { fetchNearby } from '../services/places';

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

// Loads real venues around a location, streaming partial results.
export function useNearby(location) {
  const [state, setState] = useState({ places: [], loading: true, error: null, source: null });
  const lat = location?.lat, lng = location?.lng;
  useEffect(() => {
    if (lat == null) return undefined;
    const ctrl = new AbortController();
    setState({ places: [], loading: true, error: null, source: null });
    fetchNearby({ lat, lng }, {
      signal: ctrl.signal,
      onProgress: (places, source) => !ctrl.signal.aborted && setState({ places, loading: true, error: null, source }),
    })
      .then(({ places, source }) => !ctrl.signal.aborted && setState({ places, loading: false, error: null, source }))
      .catch((e) => !ctrl.signal.aborted && setState((s) => ({ ...s, loading: false, error: e.message || 'Could not reach OpenStreetMap' })));
    return () => ctrl.abort();
  }, [lat, lng]);
  return state;
}

export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]:not(.is-in)');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return undefined; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  });
}
