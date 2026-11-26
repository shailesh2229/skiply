import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ICON = { info: 'i', go: '✓', warn: '!', pa: '◉', err: '×' };

function Toast({ t, onClose }) {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const left = useRef(t.ttl);
  const close = useCallback(() => { setLeaving(true); setTimeout(() => onClose(t.id), 320); }, [onClose, t.id]);

  useEffect(() => {
    if (paused || !t.ttl) return undefined;
    const start = Date.now();
    const id = setTimeout(close, left.current);
    return () => { clearTimeout(id); left.current -= Date.now() - start; };
  }, [paused, close, t.ttl]);

  const act = () => {
    if (t.action?.to) navigate(t.action.to);
    t.action?.onClick?.();
    close();
  };

  return (
    <div className={`toast tone-${t.tone} ${leaving ? 'is-leaving' : ''}`} role={t.tone === 'warn' || t.tone === 'go' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {t.tone === 'pa' && <div className="toast-pa mono"><span className="toast-pa-led" />STATION ANNOUNCEMENT<span className="toast-pa-eq"><i /><i /><i /><i /></span></div>}
      <div className="toast-row">
        <span className="toast-ico" aria-hidden="true">{t.icon || ICON[t.tone] || 'i'}</span>
        <div className="toast-txt">
          {t.title && <b>{t.title}</b>}
          {t.body && <p>{t.body}</p>}
          {t.action && <button className="toast-act" onClick={act}>{t.action.label} →</button>}
        </div>
        <button className="toast-x" onClick={close} aria-label="Dismiss">×</button>
      </div>
      {!!t.ttl && <span className="toast-life" style={{ animationDuration: `${t.ttl}ms`, animationPlayState: paused ? 'paused' : 'running' }} />}
    </div>
  );
}

export default function Toaster() {
  const [list, setList] = useState([]);
  useEffect(() => {
    const on = (e) => setList((l) => [...l.filter((x) => x.dedupe == null || x.dedupe !== e.detail.dedupe), e.detail].slice(-4));
    window.addEventListener('skiply:toast', on);
    return () => window.removeEventListener('skiply:toast', on);
  }, []);
  const remove = useCallback((id) => setList((l) => l.filter((x) => x.id !== id)), []);
  return (
    <div className="toaster" aria-live="polite">
      {list.map((t) => <Toast key={t.id} t={t} onClose={remove} />)}
    </div>
  );
}
