import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { CheckCircle2, MapPin, Navigation, Phone } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { LocationPicker, type Coordinates } from '../components/LocationPicker';
import { VoiceInput } from '../components/VoiceInput';
import { CAMPUS_LANDMARKS } from '../data/campusLandmarks';

export default function Help() {
  const { role, sessionReady, enterAs, submitReport } = useAppContext();
  const [what, setWhat] = useState(() => { try { return sessionStorage.getItem('safemap-help-draft') ?? ''; } catch { return ''; } });
  const [where, setWhere] = useState('');
  const [coords, setCoords] = useState<Coordinates>();
  const automaticLandmark = useRef(false);
  const [source, setSource] = useState<'device' | 'manual' | 'address'>('manual');
  const [locating, setLocating] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const busyRef = useRef(false);
  const canReport = role === 'student' || role === 'resident';
  const updateWhere = (value: string) => {
    setWhere(value);
    const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
    const landmark = CAMPUS_LANDMARKS.find(item => normalize(item.name) === normalize(value));
    if (landmark) {
      setCoords({ latitude: landmark.latitude, longitude: landmark.longitude });
      setSource('manual'); automaticLandmark.current = true;
    } else if (automaticLandmark.current) {
      setCoords(undefined); automaticLandmark.current = false;
    }
  };

  const locate = () => {
    if (!navigator.geolocation) { setError('Device location is unavailable. Choose a point on the map instead.'); return; }
    setLocating(true); setError('');
    navigator.geolocation.getCurrentPosition(
      p => { setCoords({ latitude: p.coords.latitude, longitude: p.coords.longitude }); setSource('device'); automaticLandmark.current = false; setLocating(false); },
      () => { setLocating(false); setError('Location was not available or permission was declined. Describe where you are, or choose a point on the map.'); },
      { timeout: 10000 });
  };

  const send = async () => {
    if (busyRef.current) return;
    if (!coords || showPicker) { setError('Attach your location or confirm a point on the map before submitting. Calling for help does not require a report.'); setBusy(false); setWaiting(false); return; }
    busyRef.current = true; setBusy(true); setError('');
    try {
      await submitReport({
        privacyMode: 'anonymous', coordinates: coords, locationSource: source, locationConfirmed: true,
        location: where.trim() || (coords ? 'Shared location' : 'Location not provided'), incidentDate: '', incidentTime: '',
        description: [what.trim() || 'Urgent help requested. No details given.', where.trim() && `Where: ${where.trim()}`].filter(Boolean).join('\n'),
        incidentType: 'Other Safety Concern', urgent: true,
      });
      try { sessionStorage.removeItem('safemap-help-draft'); } catch { /* ignore */ }
      setDone(true);
    } catch { setError('The report could not be saved. If you are in danger, call 911.'); }
    finally { busyRef.current = false; setBusy(false); setWaiting(false); }
  };
  const sendRef = useRef(send); sendRef.current = send;
  useEffect(() => { if (waiting && canReport) void sendRef.current(); }, [waiting, canReport]);

  const submit = async () => {
    if (!coords || showPicker) { setError('Attach your location or confirm a point on the map before submitting. Calling for help does not require a report.'); return; }
    if (role === 'analyst') { setError('Analyst sessions cannot submit reports. Log out first.'); return; }
    if (canReport) { await send(); return; }
    setBusy(true); setError('');
    try { await enterAs('resident'); setWaiting(true); } catch { setBusy(false); setError('Could not start a session. If you are in danger, call 911.'); }
  };

  return (
    <main className="page-wrap help-page">
      <header className="page-intro">
        <h1 className="display-title">Get help first.</h1>
        <p className="intro-copy">Call now. Reporting can wait until you are safe.</p>
      </header>
      <div className="call-grid">
        <a className="call-button call-911" href="tel:911" data-testid="link-call-911"><Phone size={28} aria-hidden="true" /><span>Call 911</span><small>Police, fire, medical</small></a>
        <a className="call-button call-upd" href="tel:+14089242222" data-testid="link-call-upd"><Phone size={28} aria-hidden="true" /><span>Call University Police</span><small>SJSU UPD · (408) 924-2222</small></a>
      </div>
      <section className="surface report-card help-form" aria-labelledby="help-form-title">
        {done ? (
          <div className="report-success" role="status" data-testid="status-help-saved">
            <CheckCircle2 size={30} aria-hidden="true" />
            <h2>Urgent report submitted.</h2>
            <p><strong>This report does not dispatch help. Call 911 if you have not already.</strong></p>
            <div className="report-choice-row">
              <a className="call-inline" href="tel:911">Call 911</a>
              <a className="call-inline" href="tel:+14089242222">Call University Police</a>
              <Link href="/map" className="text-link">View the map</Link>
            </div>
          </div>
        ) : <>
          <div className="card-header"><div>
            <h2 id="help-form-title" className="card-title">Then tell us what is happening (optional)</h2>
            <p className="card-caption">Keep it short. An analyst will see this at the top of the review queue.</p>
          </div></div>
          <div className="report-section">
            <label className="field-label" htmlFor="help-what">What is happening</label>
            <textarea id="help-what" className="report-input" value={what} onChange={e => setWhat(e.target.value)} data-testid="input-help-what" />
            <VoiceInput value={what} onChange={setWhat} testId="button-voice-help" />
          </div>
          <div className="report-section">
            <label className="field-label" htmlFor="help-where">Where</label>
            <input id="help-where" className="detail-input" list="help-landmarks" value={where} onChange={e => updateWhere(e.target.value)} placeholder="Building, street, or landmark" data-testid="input-help-where" />
            <datalist id="help-landmarks">{CAMPUS_LANDMARKS.map(item => <option key={item.name} value={item.name} />)}</datalist>
            <p className="report-note">Type a campus landmark, share your location, or confirm a point on the map.</p>
            <div className="report-choice-row" style={{ marginTop: 10 }}>
              <button type="button" className="secondary-button" disabled={locating} onClick={locate} data-testid="button-help-use-location"><Navigation size={14} aria-hidden="true" /> {locating ? 'Finding location…' : 'Use my location'}</button>
              <button type="button" className="secondary-button" onClick={() => setShowPicker(true)} data-testid="button-help-pick-location"><MapPin size={14} aria-hidden="true" /> Choose on map</button>
            </div>
            {coords && <p className="report-note" role="status">Location attached: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</p>}
            {showPicker && <LocationPicker initialCoordinates={coords}
              onConfirm={(point, src, address, label) => { setCoords(point); automaticLandmark.current = false; setSource(src === 'address' ? 'address' : 'manual'); if (!where.trim()) setWhere(label ?? address ?? ''); setShowPicker(false); }}
              onCancel={() => setShowPicker(false)} />}
          </div>
          {error && <p className="save-error" role="alert">{error}</p>}
          <div className="form-foot">
            <span className="privacy-note">Submitting does not dispatch help. Call first.</span>
            <button type="button" className="primary-button" disabled={busy || !sessionReady} onClick={() => void submit()} data-testid="button-submit-help">{busy ? 'Submitting…' : 'Submit urgent report'}</button>
          </div>
        </>}
      </section>
    </main>
  );
}
