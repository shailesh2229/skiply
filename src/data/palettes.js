// Skiply colour system — premium monochrome: white, black and greys.
// Colour is reserved for meaning (wait status, venue type dots).
// `--violet` is the historical name of the text-safe accent; `--sign` is the primary fill.
export const PALETTES = {
  terminus: {
    key: 'terminus', label: 'Light', mode: 'light', tagline: 'White, black, nothing extra',
    swatch: ['#FFFFFF', '#0A0A0A', '#737373', '#12805C'],
    vars: {
      '--paper': '#FFFFFF', '--paper-2': '#F5F5F4', '--card': '#FFFFFF', '--ink': '#0A0A0A', '--ink-2': '#3F3F3F', '--ink-3': '#737373',
      '--rule': '#E7E7E5', '--rule-strong': '#0A0A0A',
      '--violet': '#0A0A0A', '--violet-neon': '#0A0A0A', '--violet-ink': '#0A0A0A', '--amber': '#B25E09',
      '--sign': '#0A0A0A', '--on-sign': '#FFFFFF', '--glow-a': '#0A0A0A', '--glow-b': '#737373', '--on-accent': '#FFFFFF',
      '--signal-go': '#12805C', '--signal-stop': '#C4320A', '--signal-wait': '#B25E09',
      '--board': '#0A0A0A', '--board-cell': '#171717', '--board-text': '#FAFAFA',
      '--grain-opacity': '0',
    },
  },
  midnight: {
    key: 'midnight', label: 'Dark', mode: 'dark', tagline: 'Black, white, nothing extra',
    swatch: ['#0A0A0A', '#FAFAFA', '#8F8F8F', '#3DD68C'],
    vars: {
      '--paper': '#0A0A0A', '--paper-2': '#141414', '--card': '#161616', '--ink': '#FAFAFA', '--ink-2': '#C7C7C7', '--ink-3': '#8F8F8F',
      '--rule': '#262626', '--rule-strong': '#FAFAFA',
      '--violet': '#FAFAFA', '--violet-neon': '#FAFAFA', '--violet-ink': '#FAFAFA', '--amber': '#F0A44B',
      '--sign': '#FAFAFA', '--on-sign': '#0A0A0A', '--glow-a': '#FAFAFA', '--glow-b': '#8F8F8F', '--on-accent': '#0A0A0A',
      '--signal-go': '#3DD68C', '--signal-stop': '#FF6B4A', '--signal-wait': '#F0A44B',
      '--board': '#000000', '--board-cell': '#141414', '--board-text': '#FAFAFA',
      '--grain-opacity': '0',
    },
  },
};

export const PALETTE_LIST = Object.values(PALETTES);

export function resolvePalette(p) {
  if (p === 'terminus' || p === 'midnight') return p;
  // 'auto', and any retired livery, follows the system setting
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'midnight' : 'terminus';
}

// Inject token sets once. Extra attribute selector beats base.css's light/dark rules.
if (typeof document !== 'undefined' && !document.getElementById('skiply-palettes')) {
  const css = PALETTE_LIST.map((p) => `:root[data-palette="${p.key}"][data-theme]{${Object.entries(p.vars).map(([k, v]) => `${k}:${v}`).join(';')};color-scheme:${p.mode}}`).join('\n');
  const el = document.createElement('style');
  el.id = 'skiply-palettes';
  el.textContent = css;
  document.head.appendChild(el);
}
