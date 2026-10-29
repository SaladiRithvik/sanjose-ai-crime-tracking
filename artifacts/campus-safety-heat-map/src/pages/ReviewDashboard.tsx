import { useEffect, useRef, useState } from 'react';
import '../styles/review-workflow.css';
import { Check, Clock3, FileText, Image as ImageIcon, MapPin, X } from 'lucide-react';
import type { SafemapTriage } from '@workspace/api-client-react';
import { useAppContext } from '../context/AppContext';
import type { PriorityStatus, ReportRecord } from '../data/reports';
import { StatusBadge } from '../components/ReportBadges';
import { useRecentReports } from '../hooks/useRecentReports';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from '../components/ui/alert-dialog';

const DENIAL_REASONS = ['Resolved', 'False Report', 'Missing Critical Information', 'Duplicate Report', 'Other'] as const;
type Tab = 'pending' | 'urgent' | 'reviewed' | 'approved' | 'denied' | 'all' | 'resolved';
type Rec = ReportRecord;
type ReviewConfirmation =
  | { id: string; action: 'approved' | 'denied'; reason: string; comment: string }
  | { id: string; action: 'correction'; description: string; priority: PriorityStatus };
const isResolved = (r: Rec) => !!r.resolvedAt || r.moderationStatus === 'removed';
const fmt = (v?: string) => (v ? new Date(v).toLocaleString() : 'Not recorded');

function TriageBox({ triage }: { triage?: SafemapTriage | null }) {
  if (!triage) return <div className="ai-box" data-testid="box-ai-summary"><header><strong>AI summary</strong><span className="suggest-tag">Suggestion only</span></header><p>AI summary unavailable</p></div>;
  return (
    <div className="ai-box" data-testid="box-ai-summary">
      <header><strong>AI summary</strong><span className="suggest-tag">Suggestion only</span></header>
      <p style={{ margin: '0 0 8px' }}>{triage.summary}</p>
      <dl className="review-details">
        <div><dt>Urgency</dt><dd>{triage.urgency}</dd></div>
        <div><dt>Suggested incident type</dt><dd>{triage.incidentType}</dd></div>
        <div><dt>Severity</dt><dd>{triage.severity}</dd></div>
        <div><dt>Location mentioned</dt><dd>{triage.mentionedLocation || 'None'}</dd></div>
        <div><dt>Time mentioned</dt><dd>{triage.mentionedTime || 'None'}</dd></div>
        <div><dt>Spam likelihood</dt><dd>{triage.spamLikelihood}{triage.spamReason ? ` · ${triage.spamReason}` : ''}</dd></div>
        <div><dt>Suggested decision</dt><dd>{triage.suggestedDecision}. The analyst makes the final call.</dd></div>
      </dl>
    </div>
  );
}

function CorrectionEditor({ report, busy, onSave }: {
  report: ReportRecord;
  busy: boolean;
  onSave: (description: string, priorityStatus: PriorityStatus) => Promise<void>;
}) {
  const [description, setDescription] = useState(report.description);
  const [priority, setPriority] = useState(report.priorityStatus);
  return (
    <details className="correction-box">
      <summary>Correct report details before deciding</summary>
      <div className="edit-grid">
        <label>Priority
          <select value={priority} onChange={e => setPriority(e.target.value as PriorityStatus)}>
            <option>Unknown</option><option>Low</option><option>Normal</option><option>High</option><option>Critical</option>
          </select>
        </label>
        <label>Description
          <textarea value={description} onChange={e => setDescription(e.target.value)} />
        </label>
      </div>
      <button type="button" className="secondary-button" disabled={busy} onClick={() => void onSave(description, priority)}>
        <Check size={14} /> Save correction
      </button>
    </details>
  );
}

export default function ReviewDashboard() {
  const [archiveReason, setArchiveReason] = useState<string>('Resolved');
  const { reports, moderateReport, correctPendingReport, resolveReport, notify, storageState, storageError, reloadReports } = useAppContext();
  const recentIds = useRecentReports(reports);
  useEffect(() => { void reloadReports(); }, [reloadReports]);
  const all = reports;
  const active = all.filter(i => !isResolved(i));
  const time = (i: Rec) => Date.parse(i.submittedAt) || 0;
  const byTab = (t: Tab): Rec[] => {
    if (t === 'resolved') return all.filter(isResolved).sort((a, b) => (Date.parse(b.resolvedAt ?? '') || 0) - (Date.parse(a.resolvedAt ?? '') || 0) || a.id.localeCompare(b.id));
    const l = t === 'urgent' ? active.filter(i => i.urgent && i.moderationStatus === 'pending')
      : t === 'all' ? active : t === 'reviewed' ? active.filter(i => i.moderationStatus === 'approved' || i.moderationStatus === 'denied')
      : active.filter(i => i.moderationStatus === t);
    if (t === 'pending') return [...l].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || time(b) - time(a) || a.id.localeCompare(b.id));
    return t === 'all' || t === 'reviewed' ? [...l].sort((a, b) => time(b) - time(a) || a.id.localeCompare(b.id)) : l;
  };
  const [tab, setTab] = useState<Tab>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState<(typeof DENIAL_REASONS)[number] | ''>('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<Rec | null>(null);
  const [note, setNote] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [confirmation, setConfirmation] = useState<ReviewConfirmation | null>(null);
  const submitting = useRef(false);
  const list = byTab(tab);
  const current = list.find(item => item.id === selectedId) ?? list[0];
  const tabs: Array<[Tab, string]> = [['pending', 'Needs review'], ['urgent', 'Urgent'], ['reviewed', 'Reviewed'], ['approved', 'Approved'], ['denied', 'Denied'], ['all', 'All Reports'], ['resolved', 'Archived']];
  const tabName = tabs.find(t => t[0] === tab)?.[1];
  const select = (id: string | null) => { setSelectedId(id); setDenialReason(''); setComment(''); setError(''); };
  const reviewedCount = byTab('approved').length + byTab('denied').length;
  const go = (t: Tab) => { setTab(t); select(null); };
  const isResolvedView = tab === 'resolved';
  useEffect(() => {
    setDenialReason(''); setComment(''); setError('');
  }, [current?.id]);

  const requestDecision = (decision: 'approved' | 'denied') => {
    if (!current || busy) return;
    if (decision === 'denied' && !denialReason) { setError('Choose a reason to deny this report.'); return; }
    setError('');
    setConfirmation({ id: current.id, action: decision, reason: denialReason, comment: comment.trim() });
  };
  const decide = async (request: Extract<ReviewConfirmation, { action: 'approved' | 'denied' }>) => {
    if (submitting.current) return;
    const decision = request.action;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const id = request.id;
      const idx = list.findIndex(i => i.id === id);
      const next = list[idx + 1] ?? list[idx - 1];
      await moderateReport(id, decision, decision === 'denied' ? request.reason : undefined, request.comment);
      setConfirmation(null);
      if (tab === 'pending' || tab === 'urgent') select(next?.id ?? null); else select(id);
      notify(decision === 'approved' ? `${id} approved and added to the heat map.` : `${id} denied and archived. It is excluded from the heat map.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the decision. Please retry.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const saveCorrection = async (id: string, description: string, priorityStatus: PriorityStatus) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await correctPendingReport(id, { description, priorityStatus });
      setConfirmation(null);
      notify('Correction saved. This report is still pending review.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the correction.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const openResolve = (r: Rec) => { setTarget(r); setArchiveReason('Resolved'); setNote(''); setResolveError(''); };
  const closeResolve = () => { if (!busy) setTarget(null); };
  const confirmResolve = async () => {
    if (!target || !resolveReport || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setResolveError('');
    const id = target.id;
    try {
      const idx = list.findIndex(i => i.id === id);
      const next = list[idx + 1] ?? list[idx - 1];
      await resolveReport(id, `${archiveReason}${note.trim() ? '\n' + note.trim() : ''}`);
      setTarget(null);
      select(next?.id ?? null);
      notify(`${id} archived. It is off the public map and preserved for administrative review.`);
    } catch (cause) {
      setResolveError((cause instanceof Error ? cause.message : 'Could not resolve this report.') + ' It may have changed since you opened it. Refresh the queue and try again.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const refreshTarget = async () => {
    await reloadReports();
    setTarget(null);
    setResolveError('');
  };

  const stageBtn = (t: Tab, label: string, n: number, hint: string) => (
    <button type="button" className="rw-stage" disabled={busy} aria-current={tab === t || (t === 'reviewed' && (tab === 'denied' || tab === 'approved'))} onClick={() => go(t)} data-testid={`stage-${t}`}>
      <span>{label}</span><b>{n}</b><small>{hint}</small>
    </button>
  );

  return (
    <div className="page-wrap">
      <section className="page-intro">
        <div className="eyebrow"><span className="eyebrow-line" /> ANALYST / REPORT REVIEWER</div>
        <h1 className="display-title">Review reports.</h1>
        <p className="intro-copy">Decide each submission, then resolve it when finished. Only approved, unresolved reports appear on the public heat map.</p>
      </section>
      <div className="rw-stages" aria-label="Review stages">
        {stageBtn('pending', '1 · Needs review', byTab('pending').length, 'Urgent first, then newest')}
        {stageBtn('reviewed', '2 · Reviewed', reviewedCount, 'Decided, awaiting resolution')}
        {stageBtn('resolved', '3 · Archived', byTab('resolved').length, 'Read-only archive')}
      </div>
      <div className="rw-filter">
        <label htmlFor="review-category">Filter reports</label>
        <select id="review-category" value={tab} disabled={busy} onChange={event => go(event.target.value as Tab)} data-testid="select-review-category">
          {tabs.map(([key, name]) => (
            <option key={key} value={key}>{name} ({byTab(key).length})</option>
          ))}
        </select>
      </div>
      {storageState === 'loading' && <div className="surface record-card" role="status" data-testid="status-loading">Loading review queue…</div>}
      {storageState === 'error' && <div className="surface record-card save-error" role="alert">Unable to load reports. <span className="sr-only">{storageError}</span> <button type="button" className="secondary-button" onClick={() => void reloadReports()} data-testid="button-retry-load">Retry</button></div>}
      {storageState === 'ready' && !current && (
        <div className="surface record-card" style={{ marginTop: 24 }} role="status" data-testid="empty-queue">
          <h2 className="card-title">{tab === 'pending' ? 'Queue clear.' : tab === 'resolved' ? 'Nothing resolved yet.' : `No reports in ${tabName}.`}</h2>
          <p className="card-caption">{tab === 'pending' ? 'No reports are waiting for a decision. New submissions will appear here.' : tab === 'resolved' ? 'Resolved reports are kept here as a read-only history.' : 'Reports will appear here as they move through review.'}</p>
        </div>
      )}
      {storageState === 'ready' && current && (
        <div className="review-layout">
          <section className="surface record-list" aria-label="Reports">
            <div className="record-list-head"><strong>{tabName}</strong><span>{list.length} report{list.length === 1 ? '' : 's'}</span></div>
            {tab === 'all' && <p className="card-caption">Newest submitted first</p>}
            {tab === 'pending' && <p className="card-caption">Urgent first, then newest submitted</p>}
            {isResolvedView && <p className="card-caption">Most recently archived first</p>}
            <div className="record-list-scroll">
              {list.map(item => (
                <button key={item.id} type="button"
                  className={`record-list-item ${current.id === item.id ? 'selected' : ''}${recentIds.has(item.id) ? ' report-recent' : ''}`}
                  aria-pressed={current.id === item.id}
                  data-testid={`item-report-${item.id}`}
                  disabled={busy}
                  onClick={() => select(item.id)}>
                  <span>{item.urgent && <span className="urgent-badge">URGENT</span>} <StatusBadge report={item} />
                    {item.moderationStatus === 'removed' ? <span className="rw-chip removed">Removed</span> : item.resolvedAt ? <span className="rw-chip resolved">Archived</span> : null}</span>
                  <strong>{item.location}</strong>
                  <small>{item.incidentType} · {new Date(item.submittedAt).toLocaleString()}</small>
                  {recentIds.has(item.id) && <span className="recent-report-tag" title="Submitted within the last hour">Recent</span>}
                </button>
              ))}
            </div>
          </section>
          <section className="surface record-card" aria-labelledby="review-heading">
            <div className="record-head">
              <div>
                <h2 id="review-heading" className="record-title">{isResolvedView ? 'Archived report' : current.moderationStatus === 'pending' ? 'Report for review' : 'Reviewed report'}</h2>
                <div className="record-id">{current.id} {current.urgent && <span className="urgent-badge">URGENT</span>}</div>
              </div>
              <div className="record-icon" aria-hidden="true"><FileText size={16} /></div>
            </div>
            {isResolvedView && <div className="rw-banner ro" data-testid="banner-readonly"><p>Read-only history. Archived reports cannot be changed.</p></div>}
            <TriageBox triage={current.triage} />
            {current.image && <div className="image-preview">
              <strong><ImageIcon size={14} /> Submitted photo</strong>
              <img src={current.image} alt="Photo submitted with incident report" />
            </div>}
            <dl className="review-details">
              <div><dt><MapPin size={12} /> Detected / confirmed location</dt><dd>{current.location} · {current.coordinates.latitude.toFixed(5)}, {current.coordinates.longitude.toFixed(5)} ({current.locationSource})</dd></div>
              {current.locationAddress && <div><dt>Selected address</dt><dd>{current.locationAddress}</dd></div>}
              <div><dt>Incident type</dt><dd>{current.incidentType}</dd></div>
              <div><dt><Clock3 size={12} /> Incident date / time</dt><dd>{current.incidentDate && current.incidentTime ? `${current.incidentDate} · ${current.incidentTime}` : 'Not supplied'}</dd></div>
              <div><dt>Submitted at</dt><dd>{new Date(current.submittedAt).toLocaleString()}</dd></div>
              <div><dt>Reporter / anonymous</dt><dd>{current.reporterType === 'student' ? 'SJSU student / staff' : 'Resident / visitor'} · {current.privacyMode === 'anonymous' ? 'Anonymous' : current.displayName || 'No display name provided'}</dd></div>
              <div><dt>Priority</dt><dd>{current.priorityStatus}</dd></div>
              <div><dt>Description</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{current.description}</dd></div>
            </dl>
            {current.moderationStatus === 'pending' && !isResolvedView ? <>
              <CorrectionEditor key={current.id} report={current} busy={busy} onSave={async (description, priority) => {
                setError('');
                setConfirmation({ id: current.id, action: 'correction', description, priority });
              }} />
              <div className="decision-box">
                <h3 className="card-title">Review decision</h3>
                <label className="field-label" htmlFor="analyst-comment">Analyst comment
                  <textarea id="analyst-comment" className="report-input" value={comment} onChange={e => setComment(e.target.value)} disabled={busy} data-testid="input-analyst-comment" />
                </label>
                <label className="field-label" htmlFor="deny-reason">Reason (required to deny)
                  <select id="deny-reason" className="detail-input" value={denialReason} onChange={e => { setDenialReason(e.target.value as typeof denialReason); setError(''); }} disabled={busy} data-testid="select-deny-reason">
                    <option value="">Select a reason</option>
                    {DENIAL_REASONS.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                  </select>
                </label>
                {error && <div className="save-error" role="alert" data-testid="text-decision-error">{error}</div>}
                <div className="decision-row">
                  <button type="button" className="primary-button action-approved" disabled={busy} onClick={() => requestDecision('approved')} data-testid="button-approve-record"><Check size={15} /> {busy ? 'Saving…' : 'Approve'}</button>
                  <button type="button" className="danger-button action-denied" disabled={busy} onClick={() => requestDecision('denied')} data-testid="button-reject-record"><X size={15} /> Deny & archive</button>
                  <button type="button" className="secondary-button" disabled={busy} onClick={() => openResolve(current)}>Archive / mark incomplete</button>
                </div>
                <p className="rw-next">After you decide, the next report in this queue opens automatically.</p>
              </div>
            </> : (
              <div className="decision-box" data-testid="section-decision-result">
                <h3 className="card-title">{isResolvedView ? 'Decision history' : 'Review decision'}</h3>
                <dl className="review-details">
                  <div><dt>Decision</dt><dd>{current.moderationStatus === 'approved' ? 'Approved' : current.moderationStatus === 'denied' ? 'Denied' : current.moderationStatus === 'pending' ? 'Archived without approval' : 'Removed (legacy, inactive)'}</dd></div>
                  <div><dt>Reviewed by</dt><dd>{current.reviewedBy || 'Not recorded'}</dd></div>
                  <div><dt>Reviewed at</dt><dd>{fmt(current.moderatedAt)}</dd></div>
                  {current.moderationStatus === 'denied' && <div><dt>Reason</dt><dd>{current.moderationReason || 'None given'}</dd></div>}
                  <div><dt>Analyst comment</dt><dd>{current.analystComment || 'No comment'}</dd></div>
                  {isResolvedView && current.moderationStatus !== 'removed' && <>
                    <div><dt>Archived at</dt><dd data-testid="text-resolved-at">{fmt(current.resolvedAt)}</dd></div>
                    <div><dt>Archived by</dt><dd>{current.resolvedBy || 'Not recorded'}</dd></div>
                    <div><dt>Archive reason / note</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{current.resolutionNote || 'Resolved'}</dd></div>
                  </>}
                </dl>
                {!isResolvedView && (
                  <div className="rw-resolve">
                    <h3 className="card-title">Finished with this report?</h3>
                    <p>{current.moderationStatus === 'approved' ? 'Resolving removes it from the public heat map and active work. The decision stays in the archive.' : 'Resolving clears it from active work. The decision stays in the archive.'}</p>
                    <button type="button" className="secondary-button" onClick={() => openResolve(current)} disabled={!resolveReport} data-testid="button-resolve-record"><Check size={14} /> Archive report</button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
      <AlertDialog open={!!confirmation} onOpenChange={open => { if (!open && !busy) { setConfirmation(null); setError(''); } }}>
        {confirmation && <AlertDialogContent className="rw-dialog" data-testid="dialog-review-confirmation" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}>
          <AlertDialogTitle>{confirmation.action === 'correction' ? 'Save corrections' : confirmation.action === 'approved' ? 'Approve report' : 'Deny and archive report'}?</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmation.id}: {confirmation.action === 'correction'
              ? 'The description and priority will be updated. The report will remain pending for a separate review decision.'
              : confirmation.action === 'approved'
                ? 'This report will appear on the public heat map. After saving, the queue advances to the next report.'
                : 'This report will be denied and archived, not deleted. It will not appear on the heat map. The queue then advances to the next report. Archived reports cannot be reopened.'}
          </AlertDialogDescription>
          {confirmation.action === 'denied' && <p>Reason: {confirmation.reason}</p>}
          {confirmation.action === 'correction' && <p>Priority: {confirmation.priority}</p>}
          {error && <p className="save-error" role="alert">{error}</p>}
          <div className="rw-actions">
            <button type="button" className="secondary-button" disabled={busy} onClick={() => { setConfirmation(null); setError(''); }} data-testid="button-cancel-review">Cancel</button>
            <button type="button" className="primary-button" disabled={busy} data-testid="button-confirm-review" onClick={() => {
              if (confirmation.action === 'correction') void saveCorrection(confirmation.id, confirmation.description, confirmation.priority);
              else void decide(confirmation);
            }}>{busy ? 'Saving…' : confirmation.action === 'correction' ? 'Save corrections' : confirmation.action === 'approved' ? 'Approve report' : 'Deny & archive'}</button>
          </div>
        </AlertDialogContent>}
      </AlertDialog>
      <AlertDialog open={!!target} onOpenChange={open => { if (!open) closeResolve(); }}>
        {target && (
          <AlertDialogContent className="rw-dialog" data-testid="dialog-resolve" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}>
            <AlertDialogTitle>Archive {target.id}?</AlertDialogTitle>
            <AlertDialogDescription>{target.location}. This is a {target.moderationStatus} report.</AlertDialogDescription>
            <ul>
              {target.moderationStatus === 'approved' && <li>It will be removed from the public heat map.</li>}
              <li>It will leave active work and move to the archive.</li>
              <li>The decision, reason, comments, and your note are preserved read-only. Archived reports cannot be reopened.</li>
            </ul>
            <label className="field-label">Archive reason
              <select className="detail-input" value={archiveReason} onChange={e => setArchiveReason(e.target.value)}>
                {DENIAL_REASONS.map(reason => <option key={reason}>{reason}</option>)}
              </select>
            </label>
            <label className="field-label" htmlFor="rw-note">Archive note (optional)
              <textarea id="rw-note" className="report-input" autoFocus maxLength={2000} value={note} onChange={e => setNote(e.target.value)} disabled={busy} data-testid="input-resolution-note" />
            </label>
            {resolveError && <div className="save-error" role="alert" data-testid="text-resolve-error">{resolveError}</div>}
            <div className="rw-actions">
              {resolveError && <button type="button" className="secondary-button" onClick={() => void refreshTarget()} data-testid="button-refresh-queue">Refresh queue</button>}
              <button type="button" className="secondary-button" onClick={closeResolve} disabled={busy} data-testid="button-cancel-resolve">Cancel</button>
              <button type="button" className="primary-button" onClick={() => void confirmResolve()} disabled={busy} data-testid="button-confirm-resolve">{busy ? 'Saving…' : 'Archive report'}</button>
            </div>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
