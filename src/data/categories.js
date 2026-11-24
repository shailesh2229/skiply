// Each category is a "platform" at the Skiply station.
// Queue-model numbers are planning assumptions, not measurements:
//   service  – average minutes to serve one person/party
//   counters – people served in parallel (doctors, tellers, chairs, tables)
//   peak     – people typically waiting at the busiest hour
//   curve    – relative demand by hour of day (0–23), 0..1
//   weekend  – multiplier applied on Sat/Sun
//   typical  – fallback opening hours (OSM syntax) when a venue has none mapped
const c = (arr) => arr;

export const CATEGORIES = {
  hospital: {
    key: 'hospital', neon: '#FF3B5C', color: '#C8102E', platform: 1, letter: 'H', label: 'Hospitals', singular: 'Hospital',
    service: 12, counters: 4, peak: 38, weekend: 0.75, typical: '24/7',
    curve: c([.1,.08,.06,.05,.05,.08,.2,.45,.75,.95,1,.95,.8,.6,.55,.6,.7,.8,.75,.6,.45,.3,.2,.15]),
    departments: ['OPD Registration', 'General Medicine', 'Orthopaedics', 'Paediatrics', 'Gynaecology', 'Pathology Lab', 'Radiology'],
  },
  clinic: {
    key: 'clinic', neon: '#3BA4FF', color: '#0077C8', platform: 2, letter: 'C', label: 'Clinics & Doctors', singular: 'Clinic',
    service: 10, counters: 1, peak: 12, weekend: 0.85, typical: 'Mo-Sa 10:00-13:30,17:00-21:00',
    curve: c([0,0,0,0,0,0,0,.1,.3,.6,.85,1,.85,.4,.2,.25,.5,.8,.95,1,.8,.5,.15,0]),
    departments: ['Consultation', 'Follow-up', 'Reports Review', 'Dental Check-up'],
  },
  bank: {
    key: 'bank', neon: '#2EE07A', color: '#00843D', platform: 3, letter: 'B', label: 'Banks', singular: 'Bank',
    service: 7, counters: 3, peak: 24, weekend: 0.9, typical: 'Mo-Sa 10:00-16:00',
    curve: c([0,0,0,0,0,0,0,0,0,.3,.7,1,.95,.75,.7,.85,.6,.2,0,0,0,0,0,0]),
    departments: ['Cash Deposit / Withdrawal', 'Account Opening', 'Passbook & KYC', 'Loans', 'Demand Draft'],
  },
  salon: {
    key: 'salon', neon: '#FF5FA8', color: '#D6337A', platform: 4, letter: 'S', label: 'Salons & Beauty', singular: 'Salon',
    service: 25, counters: 3, peak: 9, weekend: 1.45, typical: 'Mo-Su 10:00-21:00',
    curve: c([0,0,0,0,0,0,0,0,.1,.2,.35,.55,.6,.5,.45,.5,.65,.85,1,.95,.7,.35,.1,0]),
    departments: ['Haircut', 'Shave & Beard', 'Hair Colour', 'Facial & Cleanup', 'Spa'],
  },
  restaurant: {
    key: 'restaurant', neon: '#FFC233', color: '#E8A317', platform: 5, letter: 'R', label: 'Restaurants', singular: 'Restaurant',
    service: 40, counters: 14, peak: 16, weekend: 1.5, typical: 'Mo-Su 12:00-23:00',
    curve: c([.05,0,0,0,0,0,0,.05,.15,.2,.2,.3,.75,1,.85,.4,.25,.3,.45,.7,.95,1,.7,.3]),
    departments: ['Table for 2', 'Table for 4', 'Table for 6+', 'Takeaway'],
  },
  pharmacy: {
    key: 'pharmacy', neon: '#22E3D5', color: '#00A19A', platform: 6, letter: 'P', label: 'Pharmacies', singular: 'Pharmacy',
    service: 3, counters: 2, peak: 7, weekend: 0.9, typical: 'Mo-Su 09:00-23:00',
    curve: c([.05,.03,.02,.02,.02,.05,.1,.25,.45,.65,.8,.85,.75,.6,.55,.6,.7,.85,1,.95,.8,.6,.35,.15]),
    departments: ['Prescription', 'Over the Counter', 'Order Pickup'],
  },
  post_office: {
    key: 'post_office', neon: '#C266FF', color: '#7A1F5C', platform: 7, letter: 'O', label: 'Post Offices', singular: 'Post Office',
    service: 6, counters: 2, peak: 16, weekend: 0.6, typical: 'Mo-Sa 10:00-17:00',
    curve: c([0,0,0,0,0,0,0,0,0,.3,.8,1,.95,.7,.65,.6,.4,.1,0,0,0,0,0,0]),
    departments: ['Speed Post', 'Savings Bank', 'Aadhaar Services', 'Parcels'],
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES).sort((a, b) => a.platform - b.platform);

// OSM tag -> Skiply category
export function categoryFromTags(t = {}) {
  const a = t.amenity, s = t.shop;
  if (a === 'hospital') return 'hospital';
  if (a === 'clinic' || a === 'doctors' || a === 'dentist') return 'clinic';
  if (a === 'bank') return 'bank';
  if (a === 'restaurant') return 'restaurant';
  if (a === 'pharmacy' || s === 'chemist') return 'pharmacy';
  if (a === 'post_office') return 'post_office';
  if (s === 'hairdresser' || s === 'beauty') return 'salon';
  return null;
}
