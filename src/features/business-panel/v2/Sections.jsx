import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AnalyticsView from '../components/Analytics/AnalyticsView';
import FeedbackRatings from '../components/Feedback/FeedbackRatings';
import ReportsExport from '../components/Reports/ReportsExport';
import BusinessProfile from '../components/Profile/BusinessProfile';
import DepartmentList from '../components/DepartmentManagement/DepartmentList';
import ScheduleAvailability from '../components/Profile/ScheduleAvailability';
import StaffList from '../components/StaffManagement/StaffList';
import NotificationCenter from '../components/Notifications/NotificationCenter';
import { CATEGORIES } from '../../../data/categories';
import Emblem from '../../../ui/Emblem';
import PageHead, { Tabs } from './PageHead';
import { useSim } from './SimContext';

function useTab(tabs) {
  const [params, setParams] = useSearchParams();
  const t = params.get('tab');
  const value = tabs.some(([k]) => k === t) ? t : tabs[0][0];
  return [value, (k) => setParams({ tab: k }, { replace: true })];
}

const Legacy = ({ children }) => <div className="legacy sp-legacy">{children}</div>;

/* ---------------- Reports ---------------- */
const R_TABS = [
  ['analytics', 'How busy you were', 'Visitors, waits and busy hours'],
  ['feedback', 'What customers said', 'Ratings and comments'],
  ['export', 'Download a report', 'Get a PDF or spreadsheet'],
];
const R_LEAD = {
  analytics: 'See how many people came, how long they waited and which hours were busiest.',
  feedback: 'Read the ratings and comments customers left after their visit.',
  export: 'Download a summary to share with your team or keep for your records.',
};

export function Reports() {
  const [tab, setTab] = useTab(R_TABS);
  return (
    <div className="sp">
      <PageHead title="Reports" accent="& feedback" lead={R_LEAD[tab]} guide={[
        ['How busy you were', 'shows visitors and waiting times. Use the Today / Week / Month buttons to change the period.'],
        ['What customers said', 'lists star ratings and comments, newest first.'],
        ['Download a report', 'lets you pick dates and save a PDF or spreadsheet.'],
      ]} />
      <Tabs tabs={R_TABS} value={tab} onChange={setTab} />
      <Legacy>
        {tab === 'analytics' && <AnalyticsView />}
        {tab === 'feedback' && <FeedbackRatings />}
        {tab === 'export' && <ReportsExport />}
      </Legacy>
    </div>
  );
}

/* ---------------- Settings ---------------- */
const S_TABS = [
  ['business', 'Your business', 'Name, counters and time per customer'],
  ['counters', 'Counters & services', 'What each counter handles'],
  ['hours', 'Opening hours', 'When you’re open and holidays'],
  ['staff', 'Staff', 'Who can use this console'],
  ['alerts', 'Notifications', 'How Skiply tells you about bookings'],
];
const S_LEAD = {
  business: 'Your business details and the two numbers Skiply uses to work out waiting times.',
  counters: 'Add the services you offer (for example Consultation or Cash deposit) and how long each takes.',
  hours: 'Set the days and times you’re open. Customers can only book when you’re open.',
  staff: 'Add the people who work the counters, and choose what each of them can change.',
  alerts: 'Choose how you hear about new bookings and long lines.',
};

function Num({ label, hint, value, set, min, max, unit }) {
  return (
    <div className="st-num">
      <div><b>{label}</b><span>{hint}</span></div>
      <div className="st-num-c">
        <button onClick={() => set(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Less ${label}`}>−</button>
        <output><b>{value}</b> {unit}</output>
        <button onClick={() => set(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label}`}>+</button>
      </div>
    </div>
  );
}

function BusinessTab({ setup, onSetup, onSwitch }) {
  const sim = useSim();
  const { venue } = sim;
  const cat = CATEGORIES[venue.category];
  const setCounters = (n) => { onSetup({ counters: n }); sim.setOpenCount(n); };
  return (
    <>
      <div className="st-grid">
        <section className="sp-panel st-biz">
          <span className="st-biz-i"><Emblem category={venue.category} size={24} /></span>
          <div>
            <p className="sp-k">{cat.singular}</p>
            <h2 className="sp-h2">{venue.name}</h2>
            <p className="sp-muted">{venue.address || 'Address from the public map'}</p>
          </div>
          <button className="sp-btn" onClick={() => { if (window.confirm(`Stop managing ${venue.name} and choose a different business?`)) onSwitch(); }}>Switch business</button>
        </section>
        <section className="sp-panel">
          <h2 className="sp-h2">Waiting-time settings</h2>
          <Num label="Counters open" hint="Desks or people serving at the same time" value={setup.counters || sim.open || 1} set={setCounters} min={1} max={8} unit="counters" />
          <Num label="Time per customer" hint="Average minutes for one person" value={setup.service || cat.service} set={(n) => onSetup({ service: n })} min={1} max={60} unit="min" />
          <label className="ob-check">
            <input type="checkbox" checked={setup.announce !== false} onChange={(e) => onSetup({ announce: e.target.checked })} />
            <span><b>Read token numbers aloud</b> when you call the next customer</span>
          </label>
        </section>
      </div>
      <details className="sp-more">
        <summary>More business details (photos, description, contact)</summary>
        <Legacy><BusinessProfile /></Legacy>
      </details>
    </>
  );
}

export function Settings({ setup, onSetup, onSwitch }) {
  const [tab, setTab] = useTab(S_TABS);
  return (
    <div className="sp">
      <PageHead title="Settings" lead={S_LEAD[tab]} guide={[
        ['Your business', 'is where you set how many counters are open and how long one customer takes. Skiply uses this to tell people how long they’ll wait.'],
        ['Counters & services', 'lists what you offer. Customers pick one when they book.'],
        ['Opening hours', 'controls when customers can book. Add holidays so nobody books when you’re closed.'],
        ['Staff', 'adds people who can call customers. Managers can change settings; others can only run the queue.'],
        ['Notifications', 'chooses how you hear about new bookings.'],
      ]} />
      <Tabs tabs={S_TABS} value={tab} onChange={setTab} />
      {tab === 'business' && <BusinessTab setup={setup} onSetup={onSetup} onSwitch={onSwitch} />}
      {tab === 'counters' && <Legacy><DepartmentList /></Legacy>}
      {tab === 'hours' && <Legacy><ScheduleAvailability /></Legacy>}
      {tab === 'staff' && <Legacy><StaffList /></Legacy>}
      {tab === 'alerts' && <Legacy><NotificationCenter /></Legacy>}
    </div>
  );
}
