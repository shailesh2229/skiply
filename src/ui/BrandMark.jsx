import React from 'react';

/** Monochrome mark: ink disc with a paper-coloured S. Inverts automatically on dark surfaces. */
export default function BrandMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="brandmark">
      <circle className="bm-bg" cx="20" cy="20" r="19" />
      <path className="bm-s" d="M25.5 14.2c-1.2-1.7-3.2-2.7-5.5-2.7-3 0-5.3 1.8-5.3 4.3 0 5.5 11.1 3 11.1 8.6 0 2.6-2.5 4.4-5.7 4.4-2.5 0-4.6-1.1-5.8-3"
        fill="none" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}
