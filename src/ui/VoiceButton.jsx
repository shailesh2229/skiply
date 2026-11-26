import React, { useEffect, useRef, useState } from 'react';
import { toast } from '../lib/fx';

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

/** Mic button: speak a venue or service ("dentist near me", "SBI") and it fills the search. */
export default function VoiceButton({ onResult, className = '' }) {
  const [on, setOn] = useState(false);
  const rec = useRef(null);
  useEffect(() => () => rec.current?.abort(), []);
  if (!SR) return null;

  const start = () => {
    if (on) { rec.current?.stop(); return; }
    const r = new SR();
    r.lang = 'en-IN'; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = (e) => {
      const txt = Array.from(e.results).map((x) => x[0].transcript).join(' ').replace(/\b(near me|nearby|around here)\b/gi, '').trim();
      onResult(txt, e.results[e.results.length - 1].isFinal);
    };
    r.onerror = (e) => { setOn(false); if (e.error !== 'aborted' && e.error !== 'no-speech') toast({ tone: 'warn', title: 'Couldn’t hear you', body: e.error === 'not-allowed' ? 'Microphone permission was blocked.' : 'Try again, or type instead.' }); };
    r.onend = () => setOn(false);
    rec.current = r;
    r.start(); setOn(true);
  };

  return (
    <button type="button" className={`voice ${on ? 'is-on' : ''} ${className}`} onClick={start} aria-pressed={on} aria-label={on ? 'Stop listening' : 'Search by voice'} title="Search by voice">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
      {on && <span className="voice-wave" aria-hidden="true"><i /><i /><i /></span>}
    </button>
  );
}
