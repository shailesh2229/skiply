import { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useNow } from '../../lib/hooks';
import { estimateAt } from '../../lib/estimate';
import { chime, notify, toast, burst } from '../../lib/fx';
import { announce } from '../../lib/voice';
import { SCRIPTS, screenLang } from '../../lib/announcements';

/** Headless: fires once when a watched venue's line drops to the passenger's threshold. */
export default function LineWatcher() {
  const { watches, clearWatch, settings } = useApp();
  const now = useNow(60000);
  const L = screenLang(settings.voiceLang);
  const fired = useRef(new Set());

  useEffect(() => {
    watches.forEach((w) => {
      if (fired.current.has(w.id)) return;
      // give up after 12 hours
      if (now - w.since > 12 * 3600000) { clearWatch(w.id); return; }
      const e = estimateAt(w, new Date(now));
      if (e.status.open === false || e.wait > w.under) return;
      fired.current.add(w.id);
      const sc = SCRIPTS.watch({ name: w.name, wait: e.wait });
      toast({ tone: 'go', title: sc.title[L], body: sc.body[L], ttl: 20000, action: { label: 'Take a token', to: `/place/${w.id}` } });
      chime('turn');
      notify(sc.title.en, sc.body.en);
      setTimeout(() => announce(sc.say), 1500);
      burst(window.innerWidth / 2, 120, 24);
      clearWatch(w.id);
    });
  }, [watches, now, clearWatch, L]);

  return null;
}
