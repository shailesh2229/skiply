import React from 'react';

export default function BrandMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="brandmark">
      <circle cx="20" cy="20" r="19" fill="#111" />
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="#fff" strokeWidth="1.2" strokeDasharray="14 5" opacity=".9" className="brandmark-ring" />
      <path d="M25.5 14.2c-1.2-1.7-3.2-2.7-5.5-2.7-3 0-5.3 1.8-5.3 4.3 0 5.5 11.1 3 11.1 8.6 0 2.6-2.5 4.4-5.7 4.4-2.5 0-4.6-1.1-5.8-3"
        fill="none" stroke="#B26BFF" strokeWidth="2.6" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 2.5px #A855F7)' }} />
    </svg>
  );
}
