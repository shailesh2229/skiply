import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LANGS, SAMPLE, announce, checkCloud, cloudInfo, qualityLabel, stopSpeaking, voicesFor } from '../../lib/voice';
import { toast } from '../../lib/fx';

const MODES = [['en', 'English'], ['hi', 'हिन्दी'], ['gu', 'ગુજરાતી'], ['all', 'All three']];
const PROVIDER = { azure: 'Microsoft Azure neural', google: 'Google Cloud neural' };

/** Announcer language + voice picker, with a live test. */
export default function VoicePanel() {
  const { settings, setSettings } = useApp();
  const [, setTick] = useState(0);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    const on = () => setTick((n) => n + 1);
    window.addEventListener('skiply:voices', on);
    return () => window.removeEventListener('skiply:voices', on);
  }, []);
  const mode = settings.voiceLang || 'en';
  const langs = mode === 'all' ? ['hi', 'en', 'gu'] : [mode];
  const cloud = cloudInfo();
  const studio = !!cloud.provider && settings.cloudVoice !== false;

  const setVoice = (lang, name) => setSettings({ voices: { ...(settings.voices || {}), [lang]: name } });
  const test = () => {
    if (!settings.voice) setSettings({ voice: true });
    const r = announce(SAMPLE, { mode, force: true });
    if (r.missing?.length) {
      toast({ tone: 'warn', title: `${r.missing.map((l) => LANGS[l].label).join(' & ')} voice not installed`, body: 'This device has no voice for it, so that part is skipped. Connect the studio voice for all three languages.', ttl: 8000 });
    }
  };
  const recheck = async () => { setChecking(true); await checkCloud(true); setChecking(false); };

  return (
    <div className="vp">
      <div className="vp-seg" role="radiogroup" aria-label="Announcement language">
        {MODES.map(([k, l]) => (
          <button key={k} role="radio" aria-checked={mode === k} className={mode === k ? 'is-on' : ''} onClick={() => setSettings({ voiceLang: k })}>{l}</button>
        ))}
      </div>

      <div className={`vp-studio ${cloud.provider ? 'is-on' : ''}`}>
        <div className="vp-studio-h">
          <span className="vp-studio-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg></span>
          <span>
            <b>Studio voice</b>
            <span>{cloud.provider ? `${PROVIDER[cloud.provider]} · human-like Hindi, Gujarati & English` : 'Not connected: using this device’s voices'}</span>
          </span>
          {cloud.provider
            ? <button type="button" className="lv-tg-k vp-sw" role="switch" aria-checked={settings.cloudVoice !== false} aria-label="Use studio voice" onClick={() => setSettings({ cloudVoice: settings.cloudVoice === false })}><i /></button>
            : <button type="button" className="chip" onClick={recheck} disabled={checking}>{checking ? 'Checking…' : 'Re-check'}</button>}
        </div>
        {studio && (
          <div className="vp-seg vp-seg-2" role="radiogroup" aria-label="Voice">
            {[['female', 'Female voice'], ['male', 'Male voice']].map(([k, l]) => (
              <button key={k} role="radio" aria-checked={(settings.voiceGender || 'female') === k} className={(settings.voiceGender || 'female') === k ? 'is-on' : ''} onClick={() => setSettings({ voiceGender: k })}>{l}</button>
            ))}
          </div>
        )}
        {!cloud.provider && <p className="vp-help">To connect it, the site owner adds an Azure or Google speech key to <code>.env.local</code> and restarts the server. The steps are in <code>VOICE_SETUP.md</code>.</p>}
      </div>

      {!studio && langs.map((l) => {
        const list = voicesFor(l);
        const cur = list.find((v) => v.name === settings.voices?.[l]) || list[0];
        return (
          <div key={l} className="vp-row">
            <span className="vp-lang">{LANGS[l].native}</span>
            {list.length ? (
              <>
                <select className="vp-sel" value={cur?.name} onChange={(e) => setVoice(l, e.target.value)} aria-label={`${LANGS[l].label} voice`}>
                  {list.map((v) => <option key={v.name} value={v.name}>{v.name.replace(/Microsoft |Online |\(Natural\)| - .*$/g, '').trim()} · {qualityLabel(v)}</option>)}
                </select>
                <span className={`vp-q q-${qualityLabel(cur).toLowerCase()}`}>{qualityLabel(cur)}</span>
              </>
            ) : (
              <span className="vp-miss">No {LANGS[l].label} voice on this device.</span>
            )}
          </div>
        );
      })}

      <div className="vp-acts">
        <button className="btn btn-ink btn-sm" onClick={test}>▶ Play a sample announcement</button>
        <button className="btn btn-ghost btn-sm" onClick={stopSpeaking}>Stop</button>
      </div>
    </div>
  );
}
