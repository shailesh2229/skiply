import { CATEGORIES } from '../data/categories';
import { hash01 } from './geo';

// A ticket's progress is derived from time, never mutated:
// live tickets advance one person every (service / counters) minutes.
export function createTicket({ place, department, mode, slot, estimate, passenger }) {
  const cat = CATEGORIES[place.category];
  const now = Date.now();
  const seq = 1 + Math.floor(hash01(place.id + now) * 98) + (estimate?.people || 0);
  return {
    id: `T${now.toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0')}`,
    token: `${cat.letter}-${String(seq).padStart(3, '0')}`,
    placeId: place.id, placeName: place.name, category: place.category,
    address: place.address || '', lat: place.lat, lng: place.lng,
    department, mode, passenger,
    createdAt: now,
    slot: mode === 'advance' ? slot : null,
    ahead: mode === 'live' ? estimate.people : 0,
    perPerson: mode === 'live' ? estimate.perPerson : cat.service,
    cancelled: false,
  };
}

export function ticketState(t, now = Date.now()) {
  if (t.cancelled) return { phase: 'cancelled', label: 'Cancelled' };
  if (t.mode === 'advance') {
    const until = t.slot - now;
    if (until > 0) return { phase: 'scheduled', label: 'Scheduled', until, ahead: null, eta: t.slot };
    if (until > -20 * 60000) return { phase: 'now', label: 'Your turn', eta: t.slot };
    return { phase: 'done', label: 'Completed', eta: t.slot };
  }
  const step = t.perPerson * 60000;
  const served = Math.floor((now - t.createdAt) / step);
  const ahead = Math.max(0, t.ahead - served);
  const eta = t.createdAt + t.ahead * step;
  if (ahead > 0) {
    return { phase: ahead <= 2 ? 'soon' : 'waiting', label: ahead <= 2 ? 'Almost there' : 'In queue', ahead, eta, progress: 1 - ahead / Math.max(1, t.ahead) };
  }
  if (now - eta < 20 * 60000) return { phase: 'now', label: 'Your turn', ahead: 0, eta, progress: 1 };
  return { phase: 'done', label: 'Completed', ahead: 0, eta, progress: 1 };
}
