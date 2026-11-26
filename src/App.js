import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './ui/Navbar';
import Footer from './ui/Footer';
import Intro from './ui/Intro';
import Home from './views/Home';
import FxLayer from './ui/fx/FxLayer';
import CompareTray from './ui/CompareTray';
import TicketWatcher from './ui/TicketWatcher';
import LiveDock from './ui/LiveDock';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/fx.css';
import './styles/flat.css';

const Explore = lazy(() => import('./views/Explore'));
const Place = lazy(() => import('./views/Place'));
const Tickets = lazy(() => import('./views/Tickets'));
const About = lazy(() => import('./views/About'));
const Contact = lazy(() => import('./views/Contact'));
const Profile = lazy(() => import('./views/Profile'));
const Errands = lazy(() => import('./views/Errands'));
const Pulse = lazy(() => import('./views/Pulse'));
const Compare = lazy(() => import('./views/Compare'));
const Saved = lazy(() => import('./views/Saved'));
const NotFound = lazy(() => import('./views/NotFound'));
const BusinessPanel = lazy(() => import('./features/business-panel/pages/BusinessPanel'));

function Shell() {
  const { pathname } = useLocation();
  const panel = pathname.startsWith('/business-panel');
  useEffect(() => { if (!pathname.startsWith('/place')) window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { document.body.classList.toggle('in-panel', panel); }, [panel]);

  return (
    <>
      {!panel && <Intro />}
      {!panel && <Navbar />}
      {!panel && pathname !== '/' && <div className="nav-spacer" />}
      <Suspense fallback={<RouteLoading />}>
        <div className="route" key={panel ? 'panel' : pathname}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/place/:pid" element={<Place />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/errands" element={<Errands />} />
            <Route path="/pulse" element={<Pulse />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/business-panel/*" element={<BusinessPanel />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Suspense>
      {!panel && <Footer />}
      {!panel && <CompareTray />}
      {!panel && <LiveDock />}
      <TicketWatcher />
      <FxLayer panel={panel} />
    </>
  );
}

function RouteLoading() {
  return (
    <div className="route-loading">
      <span className="rl-track"><i /></span>
      <span className="mono">ARRIVING ON PLATFORM…</span>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Shell />
      </Router>
    </AppProvider>
  );
}
