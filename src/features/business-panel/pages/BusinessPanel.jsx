import React, { useState } from 'react';
import { Routes, Route, NavLink, Link } from 'react-router-dom';
import DepartmentList from '../components/DepartmentManagement/DepartmentList';
import QueueView from '../components/QueueManagement/QueueView';
import AnalyticsView from '../components/Analytics/AnalyticsView';
import NotificationCenter from '../components/Notifications/NotificationCenter';
import StaffList from '../components/StaffManagement/StaffList';
import ScheduleAvailability from '../components/Profile/ScheduleAvailability';
import BusinessProfile from '../components/Profile/BusinessProfile';
import FeedbackRatings from '../components/Feedback/FeedbackRatings';
import ReportsExport from '../components/Reports/ReportsExport';
import Overview from '../v2/Overview';
import Claim from '../v2/Claim';
import BrandMark from '../../../ui/BrandMark';
import { load, save } from '../../../lib/storage';
import '../v2/console.css';

const I = {
  home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  queue: <><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="7" r="2.5" /><path d="M2.5 19c.5-3 2.3-5 4.5-5s4 2 4.5 5M12.5 19c.5-3 2.3-5 4.5-5s4 2 4.5 5" /></>,
  dept: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  bell: <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4" />,
  staff: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>,
  shop: <><path d="M4 9h16l-1-5H5zM5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
};
const NAV = [
  ['', 'Overview', 'home'], ['queue', 'Queue', 'queue'], ['departments', 'Departments', 'dept'], ['schedule', 'Schedule', 'cal'],
  ['analytics', 'Analytics', 'chart'], ['notifications', 'Alerts', 'bell'], ['staff', 'Staff', 'staff'], ['feedback', 'Feedback', 'star'],
  ['reports', 'Reports', 'doc'], ['profile', 'Profile', 'shop'],
];
const Ico = ({ k }) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[k]}</svg>;
const Legacy = ({ children }) => <div className="legacy">{children}</div>;

export default function BusinessPanel() {
  const [venue, setVenue] = useState(() => load('skiply.biz', null));
  const claim = (p) => { const v = { ...p }; delete v.distance; setVenue(v); save('skiply.biz', v); };
  const unclaim = () => { setVenue(null); save('skiply.biz', null); };

  return (
    <div className="console">
      <aside className="rail" aria-label="Business navigation">
        <Link to="/" className="rail-brand" aria-label="Back to Skiply"><BrandMark size={36} /></Link>
        <nav className="rail-nav">
          {NAV.map(([to, label, icon]) => (
            <NavLink key={label} to={`/business-panel${to ? `/${to}` : ''}`} end={!to} className="rail-a" data-tip={label} aria-label={label}>
              <Ico k={icon} /><span className="rail-l">{label}</span>
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="rail-a rail-exit" data-tip="Back to site" aria-label="Back to site">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>
          <span className="rail-l">Exit</span>
        </Link>
      </aside>
      <main className="console-main">
        <Routes>
          <Route path="/" element={venue ? <Overview key={venue.id} venue={venue} onSwitch={unclaim} /> : <Claim onClaim={claim} />} />
          <Route path="/departments" element={<Legacy><DepartmentList /></Legacy>} />
          <Route path="/queue" element={<Legacy><QueueView /></Legacy>} />
          <Route path="/analytics" element={<Legacy><AnalyticsView /></Legacy>} />
          <Route path="/notifications" element={<Legacy><NotificationCenter /></Legacy>} />
          <Route path="/staff" element={<Legacy><StaffList /></Legacy>} />
          <Route path="/schedule" element={<Legacy><ScheduleAvailability /></Legacy>} />
          <Route path="/profile" element={<Legacy><BusinessProfile /></Legacy>} />
          <Route path="/feedback" element={<Legacy><FeedbackRatings /></Legacy>} />
          <Route path="/reports" element={<Legacy><ReportsExport /></Legacy>} />
        </Routes>
      </main>
    </div>
  );
}
