import React, { useState } from 'react';
import { fmtWait } from '../../../lib/estimate';
import PageHead, { Empty } from './PageHead';
import { useSim } from './SimContext';

const GUIDE = [
  ['Call next', 'sends the first person waiting to a free counter and reads their token out loud.'],
  ['Add walk-in', 'gives a token to someone who came in without booking. They join the end of the line.'],
  ['Done', 'means you’ve finished with the customer at that counter. The counter becomes free.'],
  ['No-show', 'removes someone who didn’t turn up when called.'],
  ['Move up', 'lets someone go one place earlier, for example an elderly person or an emergency.'],
  ['Call automatically', 'when switched on, Skiply calls the next person by itself whenever a counter is free.'],
];

const mins = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m < 1 ? 'just now' : `${m} min`; };
const clock = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export default function LiveQueue() {
  const sim = useSim();
  const [show, setShow] = useState('waiting');
  const busy = sim.counters.filter((c) => c.on);

  return (
    <div className="sp">
      <PageHead title="Live" accent="queue" guide={GUIDE}
        lead="This is your line right now. Press Call next when a counter is free."
        actions={<label className="sp-auto"><input type="checkbox" checked={sim.auto} onChange={(e) => sim.setAuto(e.target.checked)} /><i aria-hidden="true" /> Call automatically</label>} />

      <div className="lq-actions">
        <button className="sp-btn sp-btn-primary sp-btn-xl" onClick={() => sim.callNext()} disabled={!sim.queue.length || !sim.open}>
          Call next{sim.queue[0] ? ` · ${sim.queue[0].token}` : ''}
        </button>
        <button className="sp-btn sp-btn-xl" onClick={sim.addWalkIn}>+ Add walk-in</button>
        <p className="lq-sum">{sim.queue.length} waiting · {sim.waitNow == null ? 'all counters closed' : sim.waitNow <= 0 ? 'new arrivals are served straight away' : `new arrivals wait about ${fmtWait(sim.waitNow)}`}</p>
      </div>

      <section className="sp-panel">
        <h2 className="sp-h2">Now serving</h2>
        {!busy.length && <Empty icon="door" title="All counters are closed">Open a counter below so you can start serving people.</Empty>}
        <div className="lq-counters">
          {sim.counters.slice(0, Math.max(busy.length, 1) + (busy.length < sim.max ? 1 : 0)).map((c) => (
            <div key={c.id} className={`lq-ctr ${c.on ? '' : 'is-off'} ${c.serving ? 'is-busy' : ''}`}>
              <div className="lq-ctr-h"><b>Counter {c.id}</b>
                <button className="sp-link" onClick={() => sim.toggle(c.id)}>{c.on ? 'Close' : 'Open this counter'}</button>
              </div>
              {c.on && (c.serving ? (
                <>
                  <p className="lq-token">{c.serving.token}</p>
                  <p className="sp-muted">{c.serving.dept} · with you for {mins(sim.simNow - c.start)}</p>
                  <div className="lq-row-btns">
                    <button className="sp-btn sp-btn-go" onClick={() => sim.finish(c.id)}>✓ Done</button>
                    <button className="sp-btn" onClick={() => sim.noShow(c.serving.token)}>No-show</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="lq-token is-free">Free</p>
                  <button className="sp-btn sp-btn-primary" disabled={!sim.queue.length} onClick={() => sim.callNext(c.id)}>Call next here</button>
                </>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="sp-panel">
        <div className="lq-tabs" role="tablist">
          <button role="tab" aria-selected={show === 'waiting'} onClick={() => setShow('waiting')}>Waiting <span>{sim.queue.length}</span></button>
          <button role="tab" aria-selected={show === 'done'} onClick={() => setShow('done')}>Done <span>{sim.done.length}</span></button>
        </div>

        {show === 'waiting' && (sim.queue.length ? (
          <ol className="lq-list">
            {sim.queue.map((p, i) => (
              <li key={p.token} className={p.source === 'app' ? 'is-app' : ''}>
                <span className="lq-pos">{i + 1}</span>
                <span className="lq-who"><b>{p.token}</b><span>{p.name ? `${p.name} · ` : ''}{p.dept}</span></span>
                {p.source === 'app' && <em className="lq-tag">Booked online</em>}
                <span className="lq-time">waiting {mins(sim.simNow - p.joined)}</span>
                <span className="lq-row-btns">
                  {i > 0 && <button className="sp-btn sp-btn-sm" onClick={() => sim.moveUp(p.token)} aria-label={`Move ${p.token} up`}>↑ Move up</button>}
                  <button className="sp-btn sp-btn-sm" onClick={() => sim.noShow(p.token)}>No-show</button>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty title="Nobody is waiting" action={<button className="sp-btn" onClick={sim.addWalkIn}>+ Add a walk-in to try it</button>}>
            When customers book on Skiply or you add a walk-in, they’ll appear here in order.
          </Empty>
        ))}

        {show === 'done' && (sim.done.length ? (
          <ol className="lq-list lq-done">
            {sim.done.map((p, i) => (
              <li key={`${p.token}-${i}`}>
                <span className={`lq-pos ${p.outcome === 'noshow' ? 'is-x' : 'is-ok'}`}>{p.outcome === 'noshow' ? '✕' : '✓'}</span>
                <span className="lq-who"><b>{p.token}</b><span>{p.dept}</span></span>
                <span className="lq-time">{p.outcome === 'noshow' ? 'didn’t turn up' : `served${p.counter ? ` at counter ${p.counter}` : ''}`} · {clock(p.at)}</span>
              </li>
            ))}
          </ol>
        ) : <Empty icon="list" title="No one finished yet">Customers you mark as Done or No-show will be listed here.</Empty>)}
      </section>
    </div>
  );
}
