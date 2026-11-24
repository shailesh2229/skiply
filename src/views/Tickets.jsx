import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useNow } from '../lib/hooks';
import { ticketState } from '../lib/tickets';
import Ticket from '../ui/Ticket';

export default function Tickets() {
  const { tickets, cancelTicket, removeTicket } = useApp();
  const now = useNow(5000);
  const active = tickets.filter((t) => !['done', 'cancelled'].includes(ticketState(t, now).phase));
  const past = tickets.filter((t) => ['done', 'cancelled'].includes(ticketState(t, now).phase));
  const cancel = (id) => { if (window.confirm('Cancel this token? Your place in line will be released.')) cancelTicket(id); };

  return (
    <main className="tickets-page">
      <div className="wrap">
        <header className="explore-head">
          <div>
            <p className="kicker">Ticket wallet · stored on this device</p>
            <h1 className="h1">My tickets</h1>
          </div>
        </header>

        {!tickets.length && (
          <div className="empty empty-page">
            <p className="display empty-t">No tickets yet.</p>
            <p className="muted">Find a venue on the board, take a token, and it will appear here with a live countdown.</p>
            <Link to="/explore" className="btn btn-ink">Browse departures →</Link>
          </div>
        )}

        {active.length > 0 && (
          <section className="tk-sec">
            <p className="kicker tk-label"><span className="dot dot-go pulse" /> Active · {active.length}</p>
            <div className="tk-list">{active.map((t) => <Ticket key={t.id} ticket={t} now={now} onCancel={cancel} />)}</div>
          </section>
        )}
        {past.length > 0 && (
          <section className="tk-sec">
            <p className="kicker tk-label">Past journeys · {past.length}</p>
            <div className="tk-list tk-past">{past.map((t) => <Ticket key={t.id} ticket={t} now={now} onRemove={removeTicket} />)}</div>
          </section>
        )}
      </div>
    </main>
  );
}
