import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PALETTE_LIST, PALETTES } from '../../data/palettes';
import { askNotify, chime, revealTransition, toast } from '../../lib/fx';
import { announce, SAMPLE } from '../../lib/voice';
import VoicePanel from './VoicePanel';

function Swatch({ colors }) {
  return (
    <span className="lv-sw" aria-hidden="true">
      <span style={{ background: colors[0] }} />
      <span style={{ background: colors[1] }} />
      <span style={{ background: colors[2] }} />
      <span style={{ background: colors[3] }} />
    </span>
  );
}

function Toggle({ on, onChange, label, hint }) {
  return (
    <button type="button" className="lv-tg" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="lv-tg-t"><b>{label}</b>{hint && <span>{hint}</span>}</span>
      <span className="lv-tg-k" aria-hidden="true"><i /></span>
    </button>
  );
}

/** Theme ("livery") + experience settings popover for the navbar. */
export default function Livery() {
  const { palette, setPalette, resolvedPalette, settings, setSettings } = useApp();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const pal = PALETTES[resolvedPalette];

  useEffect(() => {
    if (!open) return undefined;
    const out = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', out);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc); };
  }, [open]);

  const choose = (key, e) => {
    const r = e.currentTarget.getBoundingClientRect();
    revealTransition(() => setPalette(key), r.left + r.width / 2, r.top + r.height / 2);
  };

  const enableNotify = async (v) => {
    if (!v) { setSettings({ notify: false }); return; }
    const res = await askNotify();
    if (res === 'granted') { setSettings({ notify: true }); toast({ tone: 'go', title: 'Alerts on', body: 'We’ll ping you when your turn is near, even in another tab.' }); }
    else toast({ tone: 'warn', title: 'Alerts blocked', body: 'Your browser declined notifications. You can allow them in site settings.' });
  };

  return (
    <div className="livery" ref={box}>
      <button className="nav-icon lv-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Look and settings" title="Look & settings">
        <span className="lv-dot" style={{ background: `conic-gradient(${pal.swatch[2]} 0 25%, ${pal.swatch[3]} 0 50%, ${pal.swatch[0]} 0 75%, ${pal.swatch[1]} 0)` }} />
      </button>
      {open && (
        <div className="lv-pop" role="dialog" aria-label="Livery and settings">
          <p className="kicker">Look</p>
          <div className="lv-grid">
            {PALETTE_LIST.map((p) => (
              <button key={p.key} className={`lv-card ${resolvedPalette === p.key && palette !== 'auto' ? 'is-on' : ''}`} onClick={(e) => choose(p.key, e)}
                style={{ '--pa': p.swatch[0], '--pb': p.swatch[1], '--pc': p.swatch[2], '--pd': p.swatch[3] }}>
                <span className="lv-prev" aria-hidden="true"><i /><i /><i /></span>
                <span className="lv-name"><b>{p.label}</b><span>{p.tagline}</span></span>
              </button>
            ))}
          </div>
          <div className="lv-row">
            <button className={`chip ${palette === 'auto' ? 'is-on' : ''}`} onClick={(e) => choose('auto', e)}>◐ Follow system</button>
          </div>
          <p className="lv-now mono"><Swatch colors={pal.swatch} /> NOW SHOWING · {pal.label.toUpperCase()} · PRESS T TO SWITCH</p>
          <hr className="rule" />
          <p className="kicker">On board</p>
          <div className="lv-tgs">
            <Toggle on={settings.announcements} onChange={(v) => setSettings({ announcements: v })} label="Station announcements" hint="Live tips from real venues near you" />
            <Toggle on={settings.sound} onChange={(v) => { setSettings({ sound: v }); if (v) chime('ping', true); }} label="Chimes" hint="Ding-dong when something changes" />
            <Toggle on={settings.voice} onChange={(v) => { setSettings({ voice: v }); if (v) announce(SAMPLE, { mode: settings.voiceLang, force: true }); }} label="Voice announcer" hint="Speaks in English, हिन्दी or ગુજરાતી" />
            {settings.voice && <VoicePanel />}
            <Toggle on={settings.notify} onChange={enableNotify} label="Turn alerts" hint="System notification when it’s nearly your turn" />
                      </div>
          <p className="muted small lv-foot">Press <kbd>?</kbd> for keyboard shortcuts.</p>
        </div>
      )}
    </div>
  );
}
