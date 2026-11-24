import React from 'react';
import { Link } from 'react-router-dom';
import { CATEGORY_LIST } from '../data/categories';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-col footer-lead">
            <p className="h3 italic">“The best queue is the one you never stand in.”</p>
            <p className="muted">Skiply shows you how busy a place probably is before you leave home, and gives you a token so you can turn up when it's your turn.</p>
          </div>
          <div className="footer-col">
            <p className="kicker">Platforms</p>
            {CATEGORY_LIST.map((c) => <Link key={c.key} to={`/explore?cat=${c.key}`}>{c.platform} · {c.label}</Link>)}
          </div>
          <div className="footer-col">
            <p className="kicker">Skiply</p>
            <Link to="/about">The story</Link>
            <Link to="/about#estimates">How estimates work</Link>
            <Link to="/tickets">My tickets</Link>
            <Link to="/profile">Passenger details</Link>
            <Link to="/contact">Write to us</Link>
            <Link to="/business-panel">Business panel</Link>
          </div>
          <div className="footer-col">
            <p className="kicker">Open data</p>
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Venue data © OpenStreetMap contributors (ODbL)</a>
            <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Missing a place? Add it to OSM ↗</a>
            <a href="https://github.com/Anshum25/skiply-web" target="_blank" rel="noreferrer">Source on GitHub ↗</a>
          </div>
        </div>
      </div>
      <div className="footer-word" aria-hidden="true">SKIPLY</div>
      <div className="wrap footer-base">
        <span className="mono">© {new Date().getFullYear()} SKIPLY · MADE IN INDIA</span>
        <span className="mono">PLEASE MIND THE GAP BETWEEN ESTIMATE AND REALITY</span>
      </div>
    </footer>
  );
}
