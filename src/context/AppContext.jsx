import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_CITY } from '../data/cities';
import { load, save } from '../lib/storage';
import { reverseLocality } from '../services/places';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [place, setPlaceRaw] = useState(() => load('skiply.location', { ...DEFAULT_CITY, source: 'default' }));
  const [tickets, setTickets] = useState(() => load('skiply.tickets', []));
  const [passenger, setPassengerRaw] = useState(() => load('skiply.passenger', { name: '', phone: '' }));
  const [theme, setTheme] = useState(() => load('skiply.theme', null));
  const [locating, setLocating] = useState(false);

  useEffect(() => save('skiply.tickets', tickets), [tickets]);
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme;
    save('skiply.theme', theme);
  }, [theme]);

  const setLocation = useCallback((loc) => { setPlaceRaw(loc); save('skiply.location', loc); }, []);
  const setPassenger = useCallback((p) => { setPassengerRaw(p); save('skiply.passenger', p); }, []);

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

  const value = useMemo(() => ({
    location: place, setLocation, locate, locating,
    tickets, addTicket, cancelTicket, removeTicket,
    passenger, setPassenger, theme, setTheme,
  }), [place, setLocation, locate, locating, tickets, addTicket, cancelTicket, removeTicket, passenger, setPassenger, theme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
