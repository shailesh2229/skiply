// Real photographs from Unsplash (free to use under the Unsplash License, no attribution required).
// Served from Unsplash's image CDN at the size each slot needs.
const U = (id) => `https://images.unsplash.com/photo-${id}`;

export const PHOTO_IDS = {
  hero: '1524314612445-2aeca1677be9', // busy Indian street, scooters and shops
  street: '1703142488992-72018a83fd8a', // autos on a leafy street
  waiting: '1761671595934-4737d86dba1f', // people waiting in a corridor
  phone: '1488509082528-cefbba5ad692', // hands holding a phone
  hospital: '1519494026892-80bbd2d6fd0d', // hospital reception desk
  clinic: '1612349317150-e413f6a5b16d', // doctor in a clinic
  bank: '1762792049412-7bf096c0f016', // bank building
  salon: '1593702275687-f8b402bf1fb5', // haircut in a barber shop
  restaurant: '1547573854-74d2a71d0826', // Indian dishes on a table
  pharmacy: '1642055514517-7b52288890ec', // pharmacy shelves
  post_office: '1521575107034-e0fa0b594529', // red post boxes on a brick wall
};

/** photo('hero', 1600) → sized, compressed URL. */
export function photo(key, w = 1200, q = 75) {
  const id = PHOTO_IDS[key];
  return id ? `${U(id)}?auto=format&fit=crop&w=${w}&q=${q}` : '';
}

/** srcSet string for responsive <img>. */
export function photoSet(key, widths = [480, 800, 1200, 1800]) {
  return widths.map((w) => `${photo(key, w)} ${w}w`).join(', ');
}
