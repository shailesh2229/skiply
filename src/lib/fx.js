// Cross-cutting effects any component can fire without prop-drilling.
import { load } from './storage';
import { announce } from './voice';

const settings = () => ({ sound: true, voice: false, notify: false, ...load('skiply.settings', {}) });

/** toast({ title, body, tone: 'info'|'go'|'warn'|'pa', icon, action: { label, to } | { label, onClick }, ttl }) */
export function toast(opts) {
  window.dispatchEvent(new CustomEvent('skiply:toast', { detail: { id: Math.random().toString(36).slice(2), ttl: 6000, tone: 'info', ...opts } }));
}

let ctx;
function audio() {
  if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Station chime. kind: 'dingdong' (announcement), 'ping' (small UI), 'turn' (your turn, three rising notes) */
export function chime(kind = 'dingdong', force = false) {
  if (!force && !settings().sound) return;
  const a = audio(); if (!a) return;
  const seq = { dingdong: [[659.25, 0], [523.25, 0.42]], ping: [[1046.5, 0]], turn: [[523.25, 0], [659.25, 0.18], [783.99, 0.36], [1046.5, 0.54]] }[kind] || [[880, 0]];
  const t0 = a.currentTime + 0.02;
  seq.forEach(([f, at]) => {
    const o = a.createOscillator(), g = a.createGain(), o2 = a.createOscillator(), g2 = a.createGain();
    o.type = 'sine'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.01;
    g.gain.setValueAtTime(0, t0 + at); g.gain.linearRampToValueAtTime(0.22, t0 + at + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 1.4);
    g2.gain.setValueAtTime(0, t0 + at); g2.gain.linearRampToValueAtTime(0.05, t0 + at + 0.01); g2.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.6);
    o.connect(g).connect(a.destination); o2.connect(g2).connect(a.destination);
    o.start(t0 + at); o2.start(t0 + at); o.stop(t0 + at + 1.5); o2.stop(t0 + at + 0.7);
  });
}

/** Read an English line aloud (kept for older callers). Multilingual: use announce() from lib/voice. */
export function speak(text, force = false) {
  announce({ en: text }, { mode: 'en', force });
}

/** System notification when the tab is hidden and the passenger allowed it. */
export function notify(title, body) {
  if (!settings().notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  try { new Notification(title, { body, icon: '/logo192.png', tag: title }); } catch (e) { /* some browsers need a SW */ }
}

export async function askNotify() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

/** Run a DOM update inside a View Transition with a circular reveal from (x, y). */
export function revealTransition(update, x = window.innerWidth / 2, y = 0) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce) { update(); return; }
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const vt = document.startViewTransition(() => { update(); });
  vt.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 750, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
}

/** Tiny confetti burst of tokens from (x, y). */
export function burst(x = window.innerWidth / 2, y = window.innerHeight / 2, n = 28) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const host = document.createElement('div');
  host.className = 'fx-burst';
  host.style.left = `${x}px`; host.style.top = `${y}px`;
  const glyphs = ['◆', '●', '■', '✦', 'S', '★'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.5, d = 80 + Math.random() * 160;
    s.textContent = glyphs[i % glyphs.length];
    s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * d - 60}px`);
    s.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    s.style.setProperty('--h', `${Math.floor(Math.random() * 360)}`);
    host.appendChild(s);
  }
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 1400);
}
