import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { triageSafemapReport } from '@workspace/api-client-react';
import { PathChooser } from '../components/PathChooser';
import { VoiceInput } from '../components/VoiceInput';
import { MySubmissions } from '../components/MySubmissions';
import exifr from 'exifr';
import { ArrowRight, Camera, CheckCircle2, Info, MapPin, Navigation, ShieldCheck, X } from 'lucide-react';
import { useAppContext, type ReportRecord } from '../context/AppContext';
import { LocationPicker, type Coordinates } from '../components/LocationPicker';
import { CATEGORIES, type Category } from '../data/reports';

type Source = ReportRecord['locationSource'];
type Guess = { coordinates: Coordinates; name: string };
const LANDMARKS: Array<{ test: RegExp; name: string; coordinates: Coordinates }> = [
  { test: /\b(mlk|martin luther king|king library|dr\.? martin luther king|library)\b/i, name: 'MLK Library', coordinates: { latitude: 37.3355, longitude: -121.8840 } },
  { test: /\b(student union|union building)\b/i, name: 'Student Union', coordinates: { latitude: 37.3365, longitude: -121.8806 } },
  { test: /\b(washington square)\b/i, name: 'Washington Square', coordinates: { latitude: 37.3330, longitude: -121.8835 } },
  { test: /\b(campus village|cv2|cv1)\b/i, name: 'Campus Village', coordinates: { latitude: 37.3310, longitude: -121.8769 } },
  { test: /\b(paseo de san carlos)\b/i, name: 'Paseo de San Carlos', coordinates: { latitude: 37.3326, longitude: -121.8803 } },
  { test: /\b(san pedro square)\b/i, name: 'San Pedro Square', coordinates: { latitude: 37.3367, longitude: -121.8937 } },
];
const categoryRules: Array<[RegExp, Category]> = [
  [/\b(fight(?:ing)?|violent|violence|assault|attacked|weapon)\b/i, 'Fighting / Violence'],
  [/\b(medical|fainted|unconscious|injur(?:y|ed)|ambulance|overdose)\b/i, 'Medical Concern'],
  [/\b(credit card|debit card|card charge|card fraud)\b/i, 'Fraudulent Use of Credit/Debit Card'],
  [/\b(identity theft|stolen identity|account takeover)\b/i, 'Identity Theft'],
  [/\b(bad check|bounced check)\b/i, 'Forgery — Bad Checks'],
  [/\b(forged|forgery|fake signature)\b/i, 'Forgery'],
  [/\b(scam|fraud|phishing|fake payment)\b/i, 'Fraud'],
  [/\b(harass(?:ed|ing|ment)?|stalking|followed me)\b/i, 'Harassment'],
  [/\b(threatening messages?|unwanted calls?)\b/i, 'Harassing Communications'],
  [/\b(car break.?in|vehicle break.?in|stolen from (my |a |the )?car|stolen from (my |a |the )?vehicle)\b/i, 'Theft from Vehicle'],
  [/\b(car (was )?(keyed|damaged|vandalized)|vehicle (was )?(keyed|damaged|vandalized))\b/i, 'Vandalism of Vehicle'],
  [/\b(stolen|theft|robbed|taken|bike missing)\b/i, 'Theft'],
  [/\b(lost|misplaced|left behind|missing wallet|missing bag)\b/i, 'Lost Property'],
  [/\b(crash|collision|traffic accident|fender bender)\b/i, 'Non-Injury Traffic Accident'],
  [/\b(graffiti|vandal(?:ized|ism)?|spray paint)\b/i, 'Vandalism'],
  [/\b(property damage|broken window|damaged (?:door|building|fence))\b/i, 'Property Damage'],
  [/\b(suspicious|following people|prowling|lurking)\b/i, 'Suspicious Activity'],
];
const guessCategory = (text: string): Category => categoryRules.find(([rule]) => rule.test(text))?.[1] ?? 'Other Safety Concern';
const guessLandmark = (text: string): Guess | undefined => {
  const match = LANDMARKS.find(item => item.test.test(text));
  return match && { coordinates: match.coordinates, name: match.name };
};
const sourceLabel = (source?: Source) => source === 'exif' ? 'photo GPS metadata' : source === 'description' ? 'a landmark mentioned in your description' : source === 'device' ? 'your device’s current location' : source === 'address' ? 'address search' : 'your map selection';

export default function Report() {
  const [, navigate] = useLocation();
  const { role, submitReport, setEditing, notify } = useAppContext();
  const reporterType: ReportRecord['reporterType'] = role === 'student' ? 'student' : 'resident';
  const [step, setStep] = useState<'start' | 'review' | 'saved'>('start');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [photoGps, setPhotoGps] = useState<Coordinates>();
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [category, setCategory] = useState<Category>('Other Safety Concern');
  const [coordinates, setCoordinates] = useState<Coordinates>();
  const [locationSource, setLocationSource] = useState<Source>();
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState<string>();
  const [confirmed, setConfirmed] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [locating, setLocating] = useState(false);
  const [anonymous, setAnonymous] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentTime, setIncidentTime] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [urgentWarning, setUrgentWarning] = useState(false);
  const [warnedText, setWarnedText] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [triaging, setTriaging] = useState(false);
  useEffect(() => {
    try { const draft = sessionStorage.getItem('safemap-concern-draft'); if (draft) { setDescription(draft); sessionStorage.removeItem('safemap-concern-draft'); } } catch { /* ignore */ }
  }, []);

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPG, PNG or WEBP image under 5 MB.');
      event.target.value = '';
      return;
    }
    setReadingPhoto(true);
    setError('');
    setPhotoGps(undefined);
    try {
      const [dataUrl, metadata] = await Promise.all([
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('The photo could not be opened. Try another file.'));
          reader.readAsDataURL(file);
        }),
        exifr.parse(file, { gps: true }).catch(() => undefined),
      ]);
      setImage(dataUrl);
      if (metadata && Number.isFinite(metadata.latitude) && Number.isFinite(metadata.longitude)) {
        const point = { latitude: metadata.latitude, longitude: metadata.longitude };
        setPhotoGps(point);
        if (step === 'review' && !confirmed) {
          setCoordinates(point);
          setLocationSource('exif');
          setLocationName('Photo GPS location');
          setShowPicker(false);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The photo could not be opened.');
    } finally {
      setReadingPhoto(false);
    }
  };
  const removePhoto = () => {
    setImage(null);
    setPhotoGps(undefined);
    if (locationSource === 'exif') {
      setCoordinates(undefined);
      setConfirmed(false);
      setLocationSource(undefined);
      setLocationName('');
    }
  };
  const analyze = async () => {
    if (!image && !description.trim()) { setError('Add a photo or a short description to continue.'); return; }
    setError('');
    setCategory(guessCategory(description));
    if (photoGps) {
      setCoordinates(photoGps);
      setLocationName('Photo GPS location');
      setLocationSource('exif');
      setConfirmed(false);
    } else {
      const landmark = guessLandmark(description);
      setCoordinates(landmark?.coordinates);
      setLocationName(landmark?.name ?? '');
      setLocationSource(landmark ? 'description' : undefined);
      setConfirmed(false);
      // Reuse a previously granted permission without triggering a new location prompt.
      if (!landmark && navigator.geolocation && navigator.permissions?.query) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          if (permission.state === 'granted') useDeviceLocation();
        } catch { /* The optional device-location button remains available. */ }
      }
    }
    setShowPicker(false);
    setStep('review');
  };
  const useDeviceLocation = () => {
    if (!navigator.geolocation) { setError('Device location is unavailable. Choose a point on the map instead.'); return; }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      position => {
        setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationSource('device');
        setLocationName('Device current location');
        setLocationAddress(undefined);
        setConfirmed(false);
        setShowPicker(false);
        setLocating(false);
      },
      () => { setLocating(false); setError('Device location was not available or permission was declined. Choose a point on the map instead.'); },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };
  const submit = async (skipTriage = false) => {
    if (savingRef.current) return;
    if (!coordinates || !confirmed || showPicker) { setError('Confirm the incident point before saving it to the map.'); return; }
    if (!category) { setError('Choose an incident type before saving.'); return; }
    if (!image && !description.trim()) { setError('Keep a photo or description in your report.'); return; }
    if ((incidentDate && !incidentTime) || (!incidentDate && incidentTime)) { setError('Enter both date and time, or leave both blank.'); return; }
    if (incidentDate && incidentTime) {
      const incidentMoment = new Date(`${incidentDate}T${incidentTime}`).getTime();
      if (!Number.isFinite(incidentMoment) || incidentMoment > Date.now()) { setError('Choose a valid incident date and time that is not in the future.'); return; }
    }
    setError('');
    savingRef.current = true;
    setSaving(true);
    if (!skipTriage && description.trim()) {
      setTriaging(true);
      try {
        const result = await triageSafemapReport({ description: description.trim() });
        if (result?.triage?.urgency === 'Emergency' && warnedText !== description.trim()) {
          setWarnedText(description.trim()); setUrgentWarning(true); setSaving(false); setTriaging(false); savingRef.current = false; return;
        }
      } catch { /* triage is optional; never block submitting */ }
      setTriaging(false);
    }
    setUrgentWarning(false);
    const submission = {
      privacyMode: anonymous ? 'anonymous' as const : 'identified' as const,
      displayName: !anonymous && displayName.trim() ? displayName.trim() : undefined,
      coordinates,
      locationSource: locationSource ?? 'manual',
      locationAddress: locationSource === 'address' ? locationAddress : undefined,
      locationConfirmed: true,
      location: locationName.trim() || 'Selected map point',
      incidentDate,
      incidentTime,
      description: description.trim(),
      incidentType: category,
    };
    try {
      await submitReport(submission, image ?? undefined);
      setEditing(false);
      setStep('saved');
      setRefreshKey(k => k + 1);
      notify('Report submitted for review.');
    } catch (cause) {
      void cause;
      setError('Report could not be saved. Please try again.');
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  return (
    <main className="page-wrap safe-report">
      <header className="page-intro">
        <div className="eyebrow"><span className="eyebrow-line" /> Contribute a local signal</div>
        <h1 className="display-title">Start with what you know.</h1>
        <p className="intro-copy">A photo, a few words, or both. We’ll organize a draft for you to check before it is submitted for analyst review.</p>
      </header>
      <PathChooser concernActive onConcern={() => { setStep('start'); document.getElementById('report-heading')?.scrollIntoView({ behavior: 'smooth' }); }} />
      <div className="entry-grid">
        <section className="surface report-card" aria-labelledby="report-heading">
          {step === 'saved' ? (
            <div className="report-success" role="status" data-testid="status-report-saved">
              <CheckCircle2 size={30} aria-hidden="true" />
              <h2>Report submitted for review.</h2>
              <p>Your report is pending. It will not appear on the public heat map unless an analyst approves it.</p>
              <button type="button" className="primary-button" onClick={() => navigate('/map')} data-testid="button-return-to-map">Go to map now <ArrowRight size={15} aria-hidden="true" /></button>
            </div>
          ) : <>
            <div className="card-header">
              <div>
                <h2 id="report-heading" className="card-title">{step === 'start' ? 'Tell us what you noticed' : 'Check the draft'}</h2>
                <p className="card-caption">{step === 'start' ? 'Only one input is needed to begin. You can edit everything before saving.' : 'These are suggestions, not verified findings. Confirm the incident point and type.'}</p>
              </div>
              <span className="step-label">{step === 'start' ? '01 / 02' : '02 / 02'}</span>
            </div>
            {step === 'start' ? (
              <>
                <div className="report-section">
                  <label className="field-label" htmlFor="report-photo">Upload / take a photo <span className="field-hint">OPTIONAL</span></label>
                  <div className="report-upload">
                    {image ? <div className="image-preview"><img src={image} alt="Preview of your attached incident photo" /><button type="button" className="image-remove-button" onClick={removePhoto} data-testid="button-remove-image"><X size={14} aria-hidden="true" /> Remove photo</button></div> : <Camera size={25} aria-hidden="true" />}
                    <input id="report-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={uploadPhoto} aria-describedby="report-photo-hint" data-testid="input-report-photo" />
                    <p id="report-photo-hint">JPG, PNG or WEBP, up to 5 MB. A photo’s GPS metadata may suggest a point; photo content is not analyzed.</p>
                  </div>
                  {readingPhoto && <p role="status" className="report-note">Reading photo…</p>}
                </div>
                <div className="report-section">
                  <label className="field-label" htmlFor="incident-report">Short description <span className="field-hint">OPTIONAL</span></label>
                  <textarea id="incident-report" className="report-input" value={description} onChange={e => { setDescription(e.target.value); setError(''); }} placeholder="For example: A bike was taken near the Student Union…" data-testid="input-incident-report" />
                  <VoiceInput value={description} onChange={setDescription} testId="button-voice-report" />
                  <p className="report-note">You can submit with only a photo. Please avoid names, contact details, and identifying information.</p>
                </div>
                {error && <p className="save-error" role="alert">{error}</p>}
                <div className="form-foot">
                  <span className="privacy-note"><ShieldCheck size={15} aria-hidden="true" /> <Link href="/help" className="text-link">In an emergency, call 911</Link></span>
                  <button type="button" className="primary-button" disabled={readingPhoto} onClick={() => void analyze()} data-testid="button-analyze-report">Analyze Report <ArrowRight size={15} aria-hidden="true" /></button>
                </div>
              </>
            ) : (
              <>
                <p className="notice"><Info size={15} aria-hidden="true" /><span>Estimates can be wrong. Category clues come only from your description, not the image. Please confirm or change them.</span></p>
                <div className="report-section" style={{ marginTop: 25 }}>
                  <label className="field-label">Incident location <span className="field-hint">CONFIRM A POINT</span></label>
                  {coordinates ? (
                    <div className="report-location-box">
                      <strong>{locationName || 'Suggested location'} {confirmed ? '— confirmed' : '— needs confirmation'}</strong>
                      <p>{coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)} · Based on {sourceLabel(locationSource)}. {locationSource === 'device' ? 'This is your CURRENT location, not necessarily where the incident happened. Confirm only if it is the incident site.' : 'Check that this is where the incident happened.'}</p>
                      <div className="report-choice-row">
                        {!confirmed && <button type="button" className="primary-button" onClick={() => { setConfirmed(true); setError(''); }} data-testid="button-confirm-location"><CheckCircle2 size={15} aria-hidden="true" /> Confirm incident point</button>}
                        <button type="button" className="secondary-button" onClick={() => setShowPicker(true)} data-testid="button-change-location"><MapPin size={15} aria-hidden="true" /> {confirmed ? 'Change location' : 'Choose another point'}</button>
                      </div>
                    </div>
                  ) : <div className="report-location-box"><strong>Where did it happen?</strong><p>No location was found in the photo metadata or supported landmark clues. Choose only an incident point on the map or search an address.</p><button type="button" className="secondary-button" onClick={() => setShowPicker(true)} data-testid="button-choose-location"><MapPin size={15} aria-hidden="true" /> Choose incident location</button></div>}
                  <div className="report-choice-row" style={{ marginTop: 11 }}>
                    <button type="button" className="text-button" disabled={locating} onClick={useDeviceLocation} data-testid="button-use-device-location"><Navigation size={13} aria-hidden="true" /> {locating ? 'Finding current location…' : 'Use my current device location instead'}</button>
                  </div>
                  <p className="report-note">Device location is optional and requires browser permission. Use it only if you are at the incident site.</p>
                  {showPicker && <LocationPicker
                    initialCoordinates={coordinates}
                    initialSource={locationSource === 'exif' || locationSource === 'address' || locationSource === 'manual' ? locationSource : undefined}
                    initialAddress={locationAddress}
                    onConfirm={(point, source, address, label) => {
                      const unchanged = coordinates && Math.abs(point.latitude - coordinates.latitude) < 0.000001 && Math.abs(point.longitude - coordinates.longitude) < 0.000001;
                      setCoordinates(point);
                      setLocationSource(unchanged && source === 'manual' && (locationSource === 'description' || locationSource === 'device') ? locationSource : source);
                      setLocationAddress(source === 'address' ? address : undefined);
                      setLocationName(source === 'address' ? label ?? address ?? 'Selected address' : unchanged ? locationName : label ?? 'Selected map point');
                      setConfirmed(true);
                      setShowPicker(false);
                      setError('');
                    }}
                    onCancel={() => setShowPicker(false)}
                  />}
                </div>
                <div className="report-section">
                  <label className="field-label" htmlFor="incident-category">Possible incident type <span className="field-hint">CONFIRM OR CHANGE</span></label>
                  <select id="incident-category" className="detail-input" value={category} onChange={e => setCategory(e.target.value as Category)} data-testid="select-incident-category">
                    {CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <p className="report-note">{description.trim() ? 'Suggested from words in your description. Please choose the best fit.' : 'Photo content is not analyzed. “Other Safety Concern” was selected as a starting point.'}</p>
                </div>
                <div className="report-section">
                  <label className="field-label" htmlFor="review-description">Description <span className="field-hint">EDITABLE</span></label>
                  <textarea id="review-description" className="report-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional if you attached a photo" data-testid="input-review-description" />
                  <VoiceInput value={description} onChange={setDescription} testId="button-voice-review" />
                  {image && <div className="image-preview" style={{ marginTop: 14 }}><img src={image} alt="Photo attached to this report" /><button type="button" className="image-remove-button" onClick={removePhoto} data-testid="button-remove-review-image"><X size={14} aria-hidden="true" /> Remove photo</button></div>}
                  {!image && <div style={{ marginTop: 12 }}><label className="field-label" htmlFor="review-photo">Add a photo <span className="field-hint">OPTIONAL</span></label><input id="review-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={uploadPhoto} data-testid="input-review-photo" /></div>}
                </div>
                <div className="report-section">
                  <span className="field-label" id="anonymous-label">Submit anonymously?</span>
                  <div className="report-choice-row" role="group" aria-labelledby="anonymous-label">
                    <label><input type="radio" name="anonymous" checked={anonymous} onChange={() => setAnonymous(true)} data-testid="radio-anonymous-yes" /> Yes</label>
                    <label><input type="radio" name="anonymous" checked={!anonymous} onChange={() => setAnonymous(false)} data-testid="radio-anonymous-no" /> No</label>
                  </div>
                  {!anonymous && <div style={{ marginTop: 14 }}><label className="field-label" htmlFor="display-name">Display name <span className="field-hint">OPTIONAL</span></label><input id="display-name" className="detail-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="A name reviewers can see" data-testid="input-display-name" /></div>}
                  <p className="report-note">Reporter profile: {reporterType === 'student' ? 'SJSU student / staff' : 'Resident / visitor'}. Anonymous is the default; no contact details are requested.</p>
                </div>
                <details className="report-section">
                  <summary className="field-label">Add incident date and time <span className="field-hint">OPTIONAL</span></summary>
                  <div className="report-field-grid">
                    <div><label className="field-label" htmlFor="incident-date">Date</label><input className="detail-input" type="date" id="incident-date" max={new Date().toISOString().slice(0, 10)} value={incidentDate} onChange={e => setIncidentDate(e.target.value)} data-testid="input-incident-date" /></div>
                    <div><label className="field-label" htmlFor="incident-time">Time</label><input className="detail-input" type="time" id="incident-time" value={incidentTime} onChange={e => setIncidentTime(e.target.value)} data-testid="input-incident-time" /></div>
                  </div>
                  <p className="report-note">If unknown, leave both blank. A submission timestamp will be stored separately.</p>
                </details>
                {urgentWarning && <div className="urgent-warning" role="alert" data-testid="warning-urgent">
                  <p>“This sounds urgent. Call 911 or switch to I need help now.”</p>
                  <div className="report-choice-row">
                    <button type="button" className="primary-button" disabled={saving} onClick={() => void submit(true)} data-testid="button-continue-anyway">Continue submitting</button>
                    <Link href="/help" className="path-option path-emergency" onClick={() => { try { sessionStorage.setItem('safemap-help-draft', description); } catch { /* ignore */ } }} data-testid="link-switch-help">Switch to I need help now</Link>
                  </div>
                </div>}
                {error && <p role="alert" className="save-error">{error}</p>}
                                <div className="form-foot">
                  <button type="button" className="secondary-button" disabled={saving} onClick={() => { setStep('start'); setError(''); }} data-testid="button-back-to-input">Back to inputs</button>
                  {coordinates && <button type="button" className="primary-button" disabled={saving || readingPhoto} onClick={() => void submit()} data-testid="button-submit-report">{triaging ? 'Checking…' : saving ? 'Submitting…' : 'Confirm & save report'} <ArrowRight size={15} aria-hidden="true" /></button>}
                </div>
              </>
            )}
          </>}
        </section>
        <aside className="side-stack">
          <section className="surface info-card info-card-accent">
            <h2 className="info-card-title"><MapPin size={16} aria-hidden="true" /> What happens next</h2>
            <dl className="info-list">
              <div className="info-list-row"><span className="info-list-icon">01</span><div><dt>We suggest, you decide</dt><dd>Only description keywords and photo GPS metadata can suggest details. No image recognition is used.</dd></div></div>
              <div className="info-list-row"><span className="info-list-icon">02</span><div><dt>Confirm the incident point</dt><dd>A confirmed location and category are needed for a useful map record.</dd></div></div>
              <div className="info-list-row"><span className="info-list-icon">03</span><div><dt>Human review first</dt><dd>Your report is saved as pending. It stays off the public heat map until approved.</dd></div></div>
            </dl>
          </section>
          <div className="notice"><ShieldCheck size={16} aria-hidden="true" /><span><Link href="/help" className="text-link">In an emergency, call 911</Link>. Do not submit personal information or identifying photos. Reports and photos are shared with an analyst for review. The public map shows approved reports only. No student ID is stored. Address search uses OpenStreetMap.</span></div>
        </aside>
      </div>
      <MySubmissions refreshKey={refreshKey} />
    </main>
  );
}