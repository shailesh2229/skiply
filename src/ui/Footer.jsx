import React from 'react';
import { Link } from 'react-router-dom';
import { CATEGORY_LIST } from '../data/categories';
import BrandMark from './BrandMark';
import '../styles/footer.css';

const COLS = [
  ['Use Skiply', [['/explore', 'Find a queue'], ['/errands', 'Plan my day'], ['/tickets', 'My tickets'], ['/saved', 'Saved places'], ['/pulse', 'City Pulse']]],
  ['Places', CATEGORY_LIST.map((c) => [`/explore?cat=${c.key}`, c.label])],
  ['Company', [['/about', 'How it works'], ['/about#estimates', 'How we estimate'], ['/business-panel', 'For business'], ['/contact', 'Contact us']]],
];

export default function Footer() {
  return (
    <footer className="pfoot">
      <div className="wrap">
        <div className="pfoot-top">
          <div className="pfoot-lead">
            <Link to="/" className="pfoot-brand"><BrandMark size={30} /><span>Skiply</span></Link>
            <p>Know the line before you leave home.</p>
            <Link to="/explore" className="pfoot-cta">Find a queue near you</Link>
          </div>
          {COLS.map(([h, links]) => (
            <nav key={h} className="pfoot-col" aria-label={h}>
              <p>{h}</p>
              {links.map(([to, l]) => <Link key={to} to={to}>{l}</Link>)}
            </nav>
          ))}
        </div>
        <div className="pfoot-base">
          <span>© {new Date().getFullYear()} Skiply. Made in India.</span>
          <span>Place data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors · Photos from <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a></span>
        </div>
      </div>
    </footer>
  );
}
