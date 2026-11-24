import React from 'react';
import { Link } from 'react-router-dom';
import SplitFlap from '../ui/SplitFlap';

export default function NotFound() {
  return (
    <main className="wrap empty empty-page notfound">
      <div className="board board-mini"><SplitFlap text="PLATFORM 404" size={12} /></div>
      <p className="display empty-t">This train doesn’t stop here.</p>
      <p className="muted">The page you’re after has left the station, or never existed.</p>
      <Link to="/" className="btn btn-ink">Back to the concourse</Link>
    </main>
  );
}
