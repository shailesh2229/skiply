import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_CITY } from '../data/cities';
import { load, save } from '../lib/storage';
import { reverseLocality } from '../services/places';
import { PALETTES, resolvePalette } from '../data/palettes';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const DEFAULT_SETTINGS = { sound: true, voice: false, voiceLang: 'en', voices: {}, announcements: true, cursor: true, notify: false };

// Keep only what's needed to show a venue again without a network round-trip.
const snap = (p) => ({
  id: p.id, name: p.name, category: p.category, lat: p.lat, lng: p.lng, address: p.address || '',
  hours: p.hours || null, osmType: p.osmType, osmId: p.osmId, phone: p.phone || null, website: p.website || null,
  operator: p.operator || null, speciality: p.speciality || null, localName: p.localName || null,
  image: p.image || null, commons: p.commons || null, wikidata: p.wikidata || null,
});

export function AppProvider({ children }) {
  const [place, setPlaceRaw] = useState(() => load('skiply.location', { ...DEFAULT_CITY, source: 'default' }));
  const [tickets, setTickets] = useState(() => load('skiply.tickets', []));
  const [passenger, setPassengerRaw] = useState(() => load('skiply.passenger', { name: '', phone: '' }));
  // palette: a key of PALETTES, 'auto' (follow the OS) or 'surprise' (a new one every visit)
  const [palette, setPaletteRaw] = useState(() => load('skiply.palette', load('skiply.theme', null) === 'dark' ? 'midnight' : 'terminus'));
  const [resolved, setResolved] = useState(() => resolvePalette(palette));
  const [favorites, setFavorites] = useState(() => load('skiply.favorites', []));
  const [compare, setCompare] = useState(() => load('skiply.compare', []));
  const [reports, setReports] = useState(() => load('skiply.reports', {}));
  const [watches, setWatches] = useState(() => load('skiply.watches', []));
  const [settings, setSettingsRaw] = useState(() => ({ ...DEFAULT_SETTINGS, ...load('skiply.settings', {}) }));
  const [locating, setLocating] = useState(false);

  useEffect(() => save('skiply.tickets', tickets), [tickets]);
  useEffect(() => save('skiply.favorites', favorites), [favorites]);
  useEffect(() => save('skiply.compare', compare), [compare]);
  useEffect(() => save('skiply.reports', reports), [reports]);
  useEffect(() => save('skiply.settings', settings), [settings]);
  useEffect(() => save('skiply.watches', watches), [watches]);

  // Apply palette → <html data-theme="light|dark" data-palette="name">
  useEffect(() => {
    const apply = () => {
      const key = resolvePalette(palette);
      const pal = PALETTES[key];
      setResolved(key);
      const root = document.documentElement;
      root.dataset.theme = pal.mode;
      root.dataset.palette = key;
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', pal.vars['--paper']));
    };
    apply();
    save('skiply.palette', palette);
    if (palette !== 'auto') return undefined;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener('change', apply);
    return () => mq?.removeEventListener('change', apply);
  }, [palette]);

  const setLocation = useCallback((loc) => { setPlaceRaw(loc); save('skiply.location', loc); }, []);
  const setPassenger = useCallback((p) => { setPassengerRaw(p); save('skiply.passenger', p); }, []);
  const setPalette = useCallback((p) => setPaletteRaw(p), []);
  const setSettings = useCallback((patch) => setSettingsRaw((s) => ({ ...s, ...patch })), []);

  const locate = useCallback(() => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation is not supported by this browser.'));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      let name = 'Your location';
      try { name = await reverseLocality(lat, lng); } catch (e) { /* keep generic name */ }
      const loc = { name, state: '', lat, lng, source: 'gps' };
      setLocation(loc); setLocating(false); resolve(loc);
    }, (err) => { setLocating(false); reject(err); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 });
  }), [setLocation]);

  const addTicket = useCallback((t) => setTickets((all) => [t, ...all]), []);
  const cancelTicket = useCallback((id) => setTickets((all) => all.map((t) => (t.id === id ? { ...t, cancelled: true } : t))), []);
  const removeTicket = useCallback((id) => setTickets((all) => all.filter((t) => t.id !== id)), []);
  const updateTicket = useCallback((id, patch) => setTickets((all) => all.map((t) => (t.id === id ? { ...t, ...patch } : t))), []);

  // ---- favourites ("saved stations") ----
  const isFavorite = useCallback((id) => favorites.some((f) => f.id === id), [favorites]);
  const toggleFavorite = useCallback((p) => setFavorites((all) => (all.some((f) => f.id === p.id)
    ? all.filter((f) => f.id !== p.id)
    : [{ ...snap(p), savedAt: Date.now() }, ...all])), []);

  // ---- compare tray (max 3) ----
  const inCompare = useCallback((id) => compare.some((c) => c.id === id), [compare]);
  const toggleCompare = useCallback((p) => setCompare((all) => (all.some((c) => c.id === p.id)
    ? all.filter((c) => c.id !== p.id)
    : [...all, snap(p)].slice(-3))), []);
  const clearCompare = useCallback(() => setCompare([]), []);

  // ---- crowd reports: { [placeId]: [{ t, people, wait }] } (this device only) ----
  const addReport = useCallback((placeId, r) => setReports((all) => ({
    ...all, [placeId]: [{ t: Date.now(), ...r }, ...(all[placeId] || [])].slice(0, 20),
  })), []);

  // ---- line watches: alert once when a venue's wait drops to `under` minutes ----
  const watchFor = useCallback((id) => watches.find((w) => w.id === id) || null, [watches]);
  const setWatch = useCallback((p, under) => setWatches((all) => [{ ...snap(p), under, since: Date.now() }, ...all.filter((w) => w.id !== p.id)]), []);
  const clearWatch = useCallback((id) => setWatches((all) => all.filter((w) => w.id !== id)), []);

  const value = useMemo(() => ({
    location: place, setLocation, locate, locating,
    tickets, addTicket, cancelTicket, removeTicket, updateTicket,
    passenger, setPassenger,
    palette, setPalette, resolvedPalette: resolved, theme: PALETTES[resolved].mode,
    favorites, isFavorite, toggleFavorite,
    compare, inCompare, toggleCompare, clearCompare,
    reports, addReport,
    settings, setSettings,
    watches, watchFor, setWatch, clearWatch,
  }), [place, setLocation, locate, locating, tickets, addTicket, cancelTicket, removeTicket, updateTicket, passenger, setPassenger,
    palette, setPalette, resolved, favorites, isFavorite, toggleFavorite, compare, inCompare, toggleCompare, clearCompare,
    reports, addReport, settings, setSettings, watches, watchFor, setWatch, clearWatch]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
