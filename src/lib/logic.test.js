import { parseHours, statusAt } from './hours';
import { estimateAt } from './estimate';
import { createTicket, ticketState } from './tickets';
import { categoryFromTags } from '../data/categories';

const at = (iso) => new Date(iso);

describe('opening hours', () => {
  test('24/7 is always open', () => {
    expect(statusAt(parseHours('24/7'), at('2026-11-24T03:00:00')).open).toBe(true);
  });
  test('day ranges and off days', () => {
    const h = parseHours('Mo-Sa 10:00-16:00; Su off');
    expect(statusAt(h, at('2026-11-24T11:00:00')).open).toBe(true);   // Tuesday
    expect(statusAt(h, at('2026-11-24T17:00:00')).open).toBe(false);
    expect(statusAt(h, at('2026-11-29T11:00:00')).open).toBe(false);  // Sunday
  });
  test('split shifts', () => {
    const h = parseHours('Mo-Sa 10:00-13:30,17:00-21:00');
    expect(statusAt(h, at('2026-11-24T15:00:00')).open).toBe(false);
    expect(statusAt(h, at('2026-11-24T18:00:00')).open).toBe(true);
  });
  test('past midnight', () => {
    const h = parseHours('18:00-02:00');
    expect(statusAt(h, at('2026-11-25T01:00:00')).open).toBe(true);
  });
  test('unknown syntax returns null', () => {
    expect(parseHours('Mo-Fr 09:00-17:00 "by appointment"')).toBeNull();
  });
});

describe('estimates', () => {
  const bank = { id: 'n1', category: 'bank', hours: 'Mo-Sa 10:00-16:00' };
  test('closed venues have no queue', () => {
    expect(estimateAt(bank, at('2026-11-24T20:00:00')).people).toBe(0);
  });
  test('deterministic within a 5-minute window', () => {
    const a = estimateAt(bank, at('2026-11-24T11:01:00')), b = estimateAt(bank, at('2026-11-24T11:03:00'));
    expect(a.people).toBe(b.people);
    expect(a.people).toBeGreaterThan(0);
  });
});

describe('tickets', () => {
  test('live tickets count down to your turn', () => {
    const place = { id: 'n2', name: 'X', category: 'pharmacy', lat: 0, lng: 0 };
    const t = createTicket({ place, department: 'Rx', mode: 'live', estimate: { people: 4, perPerson: 2 }, passenger: {} });
    expect(ticketState(t, t.createdAt).ahead).toBe(4);
    expect(ticketState(t, t.createdAt + 4 * 60000).ahead).toBe(2);
    expect(ticketState(t, t.createdAt + 8 * 60000).phase).toBe('now');
    expect(ticketState(t, t.createdAt + 60 * 60000).phase).toBe('done');
    expect(ticketState({ ...t, cancelled: true }).phase).toBe('cancelled');
  });
});

test('OSM tags map to platforms', () => {
  expect(categoryFromTags({ amenity: 'doctors' })).toBe('clinic');
  expect(categoryFromTags({ shop: 'hairdresser' })).toBe('salon');
  expect(categoryFromTags({ amenity: 'school' })).toBeNull();
});
