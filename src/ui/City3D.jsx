import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CATEGORIES } from '../data/categories';
import { estimateAt, fmtWait } from '../lib/estimate';


// Night-time style over OpenFreeMap's OpenStreetMap vector tiles (OpenMapTiles schema).
const STYLE = {
  version: 8,
  sources: { omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '© OpenMapTiles · © OpenStreetMap contributors' } },
  sky: { 'sky-color': '#0A0812', 'horizon-color': '#3B1D6E', 'fog-color': '#08070B', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.35, 'atmosphere-blend': 0 },
  light: { anchor: 'map', color: '#C7B8FF', intensity: 0.45, position: [1.3, 210, 40] },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#08070B' } },
    { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': '#0B120E', 'fill-opacity': 0.9 } },
    { id: 'green', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood', 'forest']]], paint: { 'fill-color': '#0A100C' } },
    { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': '#0F0A24' } },
    { id: 'water-edge', type: 'line', source: 'omt', 'source-layer': 'water', paint: { 'line-color': '#4C2A9A', 'line-width': 0.8, 'line-opacity': 0.55 } },
    { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'rail'], paint: { 'line-color': '#5B4E8C', 'line-width': 1, 'line-dasharray': [2, 2], 'line-opacity': 0.6 } },
    { id: 'roads-minor', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary']]],
      paint: { 'line-color': '#3A3128', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.3, 16, 2.2] } },
    { id: 'roads-glow', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]],
      paint: { 'line-color': '#F2B233', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2, 16, 14], 'line-blur': 8, 'line-opacity': 0.22 } },
    { id: 'roads-major', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]],
      paint: { 'line-color': '#F6C969', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 16, 3], 'line-opacity': 0.75 } },
    { id: 'buildings', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 13,
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 8], 0, '#211C30', 25, '#2E2746', 80, '#46386E', 200, '#6A52B8'],
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.2, ['coalesce', ['get', 'render_height'], 8]],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.92,
        'fill-extrusion-vertical-gradient': true,
      } },
  ],
};

function circle(lng, lat, r = 16, n = 18) {
  const k = 1 / 111320, ring = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    ring.push([lng + (Math.cos(a) * r * k) / Math.cos((lat * Math.PI) / 180), lat + Math.sin(a) * r * k]);
  }
  return [ring];
}

function venueData(places, now) {
  const d = new Date(now);
  const cols = [], pts = [];
  places.forEach((p) => {
    const e = estimateAt(p, d);
    const closed = e.status.open === false;
    const props = { id: p.id, cat: p.category, color: closed ? '#3A3542' : CATEGORIES[p.category].neon, h: closed ? 14 : 70 + e.wait * 16, name: p.name, wait: closed ? 'Closed' : fmtWait(e.wait), people: e.people };
    cols.push({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: circle(p.lng, p.lat) } });
    pts.push({ type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } });
  });
  return { cols: { type: 'FeatureCollection', features: cols }, pts: { type: 'FeatureCollection', features: pts } };
}

/**
 * Real 3D city at night. `shot` = { center:{lat,lng}, zoom, pitch, bearing, focusCat, focusId, orbit }.
 */
export default function City3D({ places, now, shot, onSelect, onReady }) {
  const el = useRef(null), map = useRef(null), ready = useRef(false), orbiting = useRef(true), raf = useRef(0);
  const [tip, setTip] = useState(null);
  const shotRef = useRef(shot); shotRef.current = shot;

  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const m = new maplibregl.Map({
      container: el.current, style: STYLE, center: [shot.center.lng, shot.center.lat], zoom: shot.zoom - 1.2, pitch: 20, bearing: shot.bearing - 30,
      maxPitch: 75, attributionControl: false, scrollZoom: false, dragPan: !coarse, touchZoomRotate: !coarse, doubleClickZoom: false,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.6), fadeDuration: 0,
    });
    map.current = m;
    m.on('error', (e) => console.warn('[city3d]', e.error?.message || e));
    m.on('load', () => {
      m.addSource('venues', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('venue-pts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'venue-halo', type: 'circle', source: 'venue-pts', paint: {
        'circle-color': ['get', 'color'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 9, 16, 60], 'circle-blur': 1, 'circle-opacity': 0.75, 'circle-pitch-alignment': 'map' } });
      m.addLayer({ id: 'venue-pulse', type: 'circle', source: 'venue-pts', filter: ['==', ['get', 'id'], '__none__'], paint: {
        'circle-color': 'rgba(0,0,0,0)', 'circle-radius': 10, 'circle-stroke-width': 2, 'circle-stroke-color': ['get', 'color'], 'circle-stroke-opacity': 0.9, 'circle-pitch-alignment': 'map' } });
      m.addLayer({ id: 'venue-cols', type: 'fill-extrusion', source: 'venues', paint: {
        'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': false } });
      ready.current = true;
      m.flyTo({ center: [shot.center.lng, shot.center.lat], zoom: shot.zoom, pitch: shot.pitch, bearing: shot.bearing, duration: 3200, curve: 1.2, essential: true });
      onReady?.();
    });
    const stopOrbit = () => { orbiting.current = false; };
    m.on('mousedown', stopOrbit); m.on('touchstart', stopOrbit);
    m.on('mousemove', 'venue-cols', (e) => {
      m.getCanvas().style.cursor = 'pointer';
      const f = e.features[0];
      setTip({ x: e.point.x, y: e.point.y, ...f.properties });
    });
    m.on('mouseleave', 'venue-cols', () => { m.getCanvas().style.cursor = ''; setTip(null); });
    m.on('click', 'venue-cols', (e) => onSelect?.(e.features[0].properties.id));

    let last = performance.now();
    const spin = (t) => {
      const dt = t - last; last = t;
      if (ready.current && orbiting.current && shotRef.current.orbit && !m.isMoving()) m.setBearing(m.getBearing() + dt * 0.0035);
      if (ready.current) {
        const k = (t % 2200) / 2200, z = m.getZoom();
        const base = Math.max(6, (z - 11) * 14);
        m.setPaintProperty('venue-pulse', 'circle-radius', base * (0.4 + k * 1.6));
        m.setPaintProperty('venue-pulse', 'circle-stroke-opacity', 0.9 * (1 - k));
      }
      raf.current = requestAnimationFrame(spin);
    };
    raf.current = requestAnimationFrame(spin);
    return () => { cancelAnimationFrame(raf.current); m.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // data — columns rise out of the ground the first time they arrive
  const grown = useRef(false);
  useEffect(() => {
    const m = map.current;
    const apply = () => {
      const { cols, pts } = venueData(places, now);
      m.getSource('venue-pts')?.setData(pts);
      if (grown.current || !cols.features.length || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        m.getSource('venues')?.setData(cols); grown.current = grown.current || cols.features.length > 0; return;
      }
      grown.current = true;
      const t0 = performance.now(), n = cols.features.length;
      const frame = (t) => {
        const el = t - t0;
        const data = { type: 'FeatureCollection', features: cols.features.map((f, i) => {
          const k = Math.min(1, Math.max(0, (el - (i / n) * 900) / 900));
          const e = 1 - (1 - k) ** 3;
          return { ...f, properties: { ...f.properties, h: f.properties.h * e } };
        }) };
        m.getSource('venues')?.setData(data);
        if (el < 1900) requestAnimationFrame(frame); else m.getSource('venues')?.setData(cols);
      };
      requestAnimationFrame(frame);
    };
    if (ready.current) apply(); else m?.once('load', apply);
  }, [places, now]);

  // camera + focus
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const go = () => {
      orbiting.current = true;
      m.flyTo({ center: [shot.center.lng, shot.center.lat], zoom: shot.zoom, pitch: shot.pitch, bearing: shot.bearing, duration: 2600, curve: 1.3, essential: true });
      const color = shot.focusId
        ? ['case', ['==', ['get', 'id'], shot.focusId], '#FFFFFF', ['get', 'color']]
        : shot.focusCat ? ['case', ['==', ['get', 'cat'], shot.focusCat], ['get', 'color'], '#2A2631'] : ['get', 'color'];
      m.setPaintProperty('venue-cols', 'fill-extrusion-color', color);
      m.setFilter('venue-pulse', shot.focusId ? ['==', ['get', 'id'], shot.focusId] : shot.focusCat ? ['==', ['get', 'cat'], shot.focusCat] : ['==', ['get', 'id'], shot.pulseId || '__none__']);
      m.setPaintProperty('venue-halo', 'circle-opacity', shot.focusCat ? ['case', ['==', ['get', 'cat'], shot.focusCat], 0.9, 0.05] : 0.75);
    };
    if (ready.current) go(); else m.once('load', go);
  }, [shot.key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="city3d">
      <div ref={el} className="city3d-map" />
      <p className="city3d-credit mono">
        <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · © <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>
      </p>
      {tip && (
        <div className="city3d-tip" style={{ transform: `translate(${tip.x + 14}px, ${tip.y - 14}px)` }}>
          <span className="mono" style={{ color: tip.color }}>● {CATEGORIES[tip.cat].singular.toUpperCase()}</span>
          <b>{tip.name}</b>
          <span>{tip.wait}{tip.wait !== 'Closed' ? ` · ${tip.people} waiting` : ''}</span>
        </div>
      )}
    </div>
  );
}
