import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const TOPICS = {
  feedback: 'Feedback on Skiply',
  business: 'Onboard my business',
  data: 'A venue’s details are wrong',
  bug: 'Something is broken',
};

export default function Contact() {
  const [params] = useSearchParams();
  const [topic, setTopic] = useState(TOPICS[params.get('topic')] ? params.get('topic') : 'feedback');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);

  // Messages are filed as public GitHub issues on the project repository.
  const submit = (e) => {
    e.preventDefault();
    const title = `[${TOPICS[topic]}] ${msg.trim().split('\n')[0].slice(0, 70)}`;
    const body = `${msg.trim()}\n\n---\nFrom: ${name.trim() || 'Anonymous'}\nTopic: ${TOPICS[topic]}\nSent via skiply contact form`;
    window.open(`https://github.com/Anshum25/skiply-web/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
    setSent(true);
  };

  return (
    <main className="contact">
      <div className="wrap contact-grid">
        <div>
          <p className="kicker">Booking office · enquiries</p>
          <h1 className="display about-title">Write to <em>us.</em></h1>
          <p className="lede">Tell us about a venue you’d like on the board, an estimate that looks off, or a bug. Your note opens as a public issue on the Skiply project on GitHub, so you can follow the reply.</p>
          <div className="contact-alt">
            <p className="kicker">Wrong address or hours?</p>
            <p>Venue details come from OpenStreetMap. Use <b>Fix details</b> on any venue page to correct them at the source, so the fix reaches every app that uses the map.</p>
          </div>
        </div>
        <form className="letter" onSubmit={submit}>
          <div className="letter-stamp" aria-hidden="true"><span>SKIPLY</span><span>POST</span></div>
          <div className="field">
            <label>Regarding</label>
            <div className="chips-wrap">
              {Object.entries(TOPICS).map(([k, v]) => <button type="button" key={k} className="chip" aria-pressed={topic === k} onClick={() => setTopic(k)}>{v}</button>)}
            </div>
          </div>
          <div className="field"><label htmlFor="c-name">Your name</label><input id="c-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" /></div>
          <div className="field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" className="input" value={msg} onChange={(e) => setMsg(e.target.value)} required minLength={10} placeholder={topic === 'business' ? 'Venue name, city, number of counters…' : 'Dear Skiply,'} /></div>
          <p className="muted small">Don't include phone numbers or anything private. Issues are public.</p>
          <button className="btn btn-ink" type="submit">Post it on GitHub ↗</button>
          {sent && <p className="sent mono">✓ A GitHub tab has opened with your letter filled in. Press “Create” there to send it.</p>}
        </form>
      </div>
    </main>
  );
}
