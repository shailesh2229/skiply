import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CATEGORIES } from '../data/categories';

/** OpenStreetMap map with lettered "platform" pins. */
export default function PlaceMap({ center, places = [], activeId, onSelect, zoom = 14, className = '', you }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null), markers = useRef({});

  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView([center.lat, center.lng], zoom);
    L.control.zoom({ position: 'bottomright' }).addTo(map.current);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    const m = map.current;
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { map.current?.setView([center.lat, center.lng], zoom); }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers(); markers.current = {};
    if (you) {
      L.marker([you.lat, you.lng], { icon: L.divIcon({ className: '', html: '<span class="pin-you"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(layer.current);
    }
    places.forEach((p) => {
      const cat = CATEGORIES[p.category];
      const icon = L.divIcon({ className: '', html: `<span class="pin pin-${p.category}"><b>${cat.letter}</b></span>`, iconSize: [28, 34], iconAnchor: [14, 34] });
      const mk = L.marker([p.lat, p.lng], { icon, title: p.name, keyboard: true }).addTo(layer.current);
      mk.bindTooltip(p.name, { direction: 'top', offset: [0, -30], className: 'pin-tip' });
      if (onSelect) mk.on('click', () => onSelect(p));
      markers.current[p.id] = mk;
    });
  }, [places, onSelect, you]);

  useEffect(() => {
    Object.entries(markers.current).forEach(([id, mk]) => {
      const node = mk.getElement()?.firstChild;
      if (node) node.classList.toggle('is-active', id === activeId);
      if (id === activeId) mk.setZIndexOffset(1000); else mk.setZIndexOffset(0);
    });
  }, [activeId, places]);

  return <div ref={el} className={`placemap ${className}`} />;
}
