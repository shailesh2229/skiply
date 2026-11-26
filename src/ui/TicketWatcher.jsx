import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useNow } from '../lib/hooks';
import { ticketState } from '../lib/tickets';
import { distanceKm } from '../lib/geo';
import { toast, chime, notify, burst } from '../lib/fx';
import { announce } from '../lib/voice';
import { SCRIPTS, screenLang } from '../lib/announcements';

const travelMin = (from, t) => (from ? Math.max(5, Math.round((distanceKm(from, t) / 18) * 60) + 4) : 20);
const clock = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/** Headless: watches active tickets and raises alerts when their phase changes. */
export default function TicketWatcher() {
  const { tickets, updateTicket, location, settings } = useApp();
  const L = screenLang(settings.voiceLang);
  const now = useNow(5000);
  const last = useRef(null); // id -> phase

  useEffect(() => {
    const seen = last.current;
    const next = {};
    tickets.forEach((t) => {
      const st = ticketState(t, now);
      next[t.id] = st.phase;
      // First sighting (page load, or a ticket just booked): remember, don't fire.
      if (!seen || !(t.id in seen)) return;
      const prev = seen[t.id];
      if (prev === st.phase) return;

      if (st.phase === 'soon') {
        const sc = SCRIPTS.soon({ token: t.token, name: t.placeName, ahead: st.ahead });
        toast({ tone: 'warn', title: sc.title[L], body: sc.body[L], action: { label: 'View', to: '/tickets' }, ttl: 12000 });
        chime('dingdong');
        notify(sc.title.en, sc.body.en);
        setTimeout(() => announce(sc.say), 1100);
      } else if (st.phase === 'now') {
        const sc = SCRIPTS.now({ token: t.token, name: t.placeName, dept: t.department });
        toast({ tone: 'go', title: sc.title[L], body: sc.body[L], action: { label: 'Show ticket', to: '/tickets' }, ttl: 20000 });
        chime('turn');
        notify(sc.title.en, sc.body.en);
        setTimeout(() => announce(sc.say), 1500);
        burst(window.innerWidth - 120, window.innerHeight - 80, 22);
      }
    });

    // Booked slots: one "time to leave" nudge.
    tickets.forEach((t) => {
      if (t.mode !== 'advance' || t.cancelled || t.alerted?.leave) return;
      const until = t.slot - now;
      const lead = (travelMin(location, t) + 10) * 60000;
      if (until > 0 && until <= lead) {
        const leaveAt = t.slot - travelMin(location, t) * 60000;
        const sc = SCRIPTS.leave({ name: t.placeName, by: clock(leaveAt) });
        updateTicket(t.id, { alerted: { ...(t.alerted || {}), leave: now } });
        toast({ tone: 'warn', title: sc.title[L], body: sc.body[L], action: { label: 'Directions', onClick: () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`, '_blank', 'noopener') }, ttl: 15000 });
        chime('dingdong');
        notify(sc.title.en, sc.body.en);
        setTimeout(() => announce(sc.say), 1100);
      }
    });

    last.current = next;
  }, [tickets, now, location, updateTicket, L]);

  return null;
}
