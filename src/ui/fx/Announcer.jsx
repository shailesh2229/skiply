import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useNearby } from '../../lib/hooks';
import { estimateAt } from '../../lib/estimate';
import { chime, toast } from '../../lib/fx';
import { announce } from '../../lib/voice';
import { SCRIPTS, screenLang } from '../../lib/announcements';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const FIRST = 38000;
const GAP = () => 70000 + Math.random() * 80000;

// Build one announcement from real nearby venues. Every line is true to the model right now.
function compose(places, city) {
  const now = new Date();
  const open = places.map((p) => ({ p, e: estimateAt(p, now) })).filter((x) => x.e.status.open !== false);
  if (!open.length) return null;
  const kinds = [];
  const quick = open.filter((x) => x.p.distance < 2).sort((a, b) => a.e.wait - b.e.wait)[0];
  if (quick) kinds.push(() => ({ s: SCRIPTS.quick({ name: quick.p.name, wait: quick.e.wait }), to: quick.p }));
  const busy = [...open].sort((a, b) => b.e.wait - a.e.wait)[0];
  if (busy && busy.e.wait > 20) {
    const alt = open.filter((x) => x.p.category === busy.p.category && x.p.id !== busy.p.id).sort((a, b) => a.e.wait - b.e.wait)[0];
    kinds.push(() => ({ s: SCRIPTS.busy({ name: busy.p.name, wait: busy.e.wait, alt: alt?.p.name, altWait: alt?.e.wait }), to: alt?.p || busy.p }));
  }
  const closing = open.filter((x) => x.e.status.closesIn && x.e.status.closesIn <= 60 && x.e.status.closesIn > 5).sort((a, b) => a.e.status.closesIn - b.e.status.closesIn)[0];
  if (closing) kinds.push(() => ({ s: SCRIPTS.closing({ name: closing.p.name, mins: closing.e.status.closesIn }), to: closing.p }));
  const counts = open.reduce((a, x) => ({ ...a, [x.p.category]: (a[x.p.category] || 0) + 1 }), {});
  const cat = pick(Object.keys(counts));
  if (cat) kinds.push(() => ({ s: SCRIPTS.count({ n: counts[cat], cat, city }), link: `/explore?cat=${cat}` }));
  kinds.push(() => ({ s: SCRIPTS.tip() }));
  return pick(kinds)();
}

/** Random station announcements built from real, nearby venues, in the passenger's languages. */
export default function Announcer() {
  const { location, settings } = useApp();
  const [armed, setArmed] = useState(false);
  // only load venues once armed, so it reuses the session cache the page warmed up
  const { places } = useNearby(armed ? location : null);
  const placesRef = useRef(places); placesRef.current = places;
  const langRef = useRef(settings.voiceLang); langRef.current = settings.voiceLang;

  useEffect(() => { const id = setTimeout(() => setArmed(true), FIRST - 8000); return () => clearTimeout(id); }, []);

  useEffect(() => {
    if (!settings.announcements) return undefined;
    let id;
    const fire = () => {
      if (document.visibilityState === 'visible' && placesRef.current.length) {
        const a = compose(placesRef.current, location.name);
        if (a) {
          const L = screenLang(langRef.current);
          chime('dingdong');
          setTimeout(() => announce(a.s.say), 1100);
          toast({
            tone: 'pa', title: a.s.title[L], body: a.s.body[L], ttl: 12000, dedupe: 'pa',
            action: a.to ? { label: 'Open venue', to: `/place/${a.to.id}` } : a.link ? { label: 'Take me there', to: a.link } : undefined,
          });
        }
      }
      id = setTimeout(fire, GAP());
    };
    id = setTimeout(fire, FIRST);
    return () => clearTimeout(id);
  }, [settings.announcements, location.name]);

  return null;
}
