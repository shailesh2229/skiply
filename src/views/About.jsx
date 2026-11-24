import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CATEGORY_LIST } from '../data/categories';
import { fmtMin } from '../lib/hours';
import { useReveal } from '../lib/hooks';
import Emblem from '../ui/Emblem';

export default function About() {
  const { hash } = useLocation();
  useReveal();
  useEffect(() => {
    if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }), 60);
    else window.scrollTo(0, 0);
  }, [hash]);
  return (
    <main className="about">
      <section className="wrap about-hero">
        <p className="kicker">The story</p>
        <h1 className="display about-title">India spends its mornings <em>standing.</em></h1>
        <div className="about-cols">
          <p className="lede">In the OPD queue. At the bank counter. Outside the salon on a Sunday. Most of that waiting isn’t needed. It happens because nobody can see how long the line is before they leave home.</p>
          <p className="lede">Skiply puts the line on a board you can read from anywhere, like a railway station does for trains. Look up the board, take a token, and turn up when it’s your turn.</p>
        </div>
      </section>

      <section className="sec" id="estimates">
        <div className="wrap">
          <header className="sec-head" data-reveal>
            <p className="kicker">Showing our working</p>
            <h2 className="h2">How a Skiply <em>estimate</em> is made</h2>
          </header>
          <div className="formula" data-reveal>
            <p className="formula-eq display">wait = <span>people</span> × <span>service time</span> ÷ <span>counters</span></p>
            <p className="formula-eq formula-sub mono">people = typical peak × hourly demand × day-of-week factor × venue size, and zero when the venue is closed</p>
          </div>
          <ol className="steps" data-reveal>
            <li><b>Real venue.</b> We look up the place on OpenStreetMap, including its category and, where volunteers have mapped them, its opening hours.</li>
            <li><b>Hour of day.</b> Each platform has a demand curve. Hospital OPDs peak mid-morning, clinics peak again in the evening, and restaurants peak at lunch and dinner.</li>
            <li><b>Day of week.</b> Salons and restaurants get busier at the weekend. Banks and post offices get quieter.</li>
            <li><b>Venue size.</b> Each venue gets a fixed size factor, so a big hospital and a small one don’t show the same queue. The factor stays the same for everyone and changes slowly over time.</li>
            <li><b>No pretending.</b> Every estimate is labelled. When a venue connects its counter through the business panel, the real queue replaces our model.</li>
          </ol>

          <div className="assume-table" data-reveal>
            <table>
              <thead><tr><th>Platform</th><th>Avg. service</th><th>Counters</th><th>Typical peak line</th><th>Hours if unmapped</th></tr></thead>
              <tbody>
                {CATEGORY_LIST.map((c) => {
                  const peakH = c.curve.indexOf(Math.max(...c.curve));
                  return (
                    <tr key={c.key}>
                      <td><span className="at-name"><Emblem category={c.key} size={16} /> {c.platform}. {c.label}</span></td>
                      <td className="mono">{c.service} min</td>
                      <td className="mono">{c.counters}</td>
                      <td className="mono">{c.peak} people around {fmtMin(peakH * 60)}</td>
                      <td className="mono">{c.typical}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap about-data" data-reveal>
          <div>
            <p className="kicker">Where the data comes from</p>
            <h2 className="h2">Built on the <em>open</em> map.</h2>
          </div>
          <div className="about-cols">
            <p>Venue names, locations, addresses, phone numbers, websites and opening hours come from <a className="link-u" href="https://www.openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a>, which is © OpenStreetMap contributors and licensed under the ODbL. We query it live through the Overpass API and Nominatim. If a place is missing or wrong, anyone can fix it on OpenStreetMap, and Skiply will pick up the change.</p>
            <p>Your tickets, name and number never leave your browser. There is no account, no tracking and no advertising. Your location is only used to ask OpenStreetMap what’s nearby.</p>
          </div>
        </div>
      </section>

      <section className="biz-cta">
        <div className="wrap biz-cta-in">
          <h2 className="display biz-cta-title">Run a counter?<br /><em>Join the board.</em></h2>
          <div className="biz-cta-row">
            <Link to="/business-panel" className="btn btn-ink">Business panel →</Link>
            <Link to="/contact?topic=business" className="btn btn-line">Write to us</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
