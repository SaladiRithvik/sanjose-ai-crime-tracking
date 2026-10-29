import { useCallback, useEffect, useState } from 'react';
import { listMySafemapReports, type SafemapReport } from '@workspace/api-client-react';
import { RefreshCw } from 'lucide-react';

const label = (s: string) => s === 'approved' ? 'Approved' : s === 'denied' ? 'Denied' : s === 'pending' ? 'Pending review' : s;

export function MySubmissions({ refreshKey = 0 }: { refreshKey?: number }) {
  const [items, setItems] = useState<SafemapReport[] | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try { const next = await listMySafemapReports(); setItems([...next].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))); setError(false); }
    catch { setError(true); }
  }, []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [load, refreshKey]);
  return (
    <section className="surface my-submissions" aria-labelledby="my-submissions-title" data-testid="section-my-submissions">
      <div className="card-header">
        <div><h2 id="my-submissions-title" className="card-title">My submissions</h2><p className="card-caption">Status and analyst comments for reports you sent from this browser session.</p></div>
        <button type="button" className="secondary-button" onClick={() => void load()} data-testid="button-refresh-submissions"><RefreshCw size={14} aria-hidden="true" /> Refresh</button>
      </div>
      {error && <p className="save-error" role="alert">Could not load your submissions. <button type="button" className="text-button" onClick={() => void load()}>Retry</button></p>}
      {!error && items === null && <p role="status" className="report-note">Loading your submissions…</p>}
      {items && items.length === 0 && <p className="report-note" role="status">You have not submitted any reports yet.</p>}
      {items && items.map(item => (
        <details key={item.id} className="my-submission" data-testid={`row-submission-${item.id}`}>
          <summary>
            <span className={`report-badge status-${item.moderationStatus}`}>{label(item.moderationStatus)}</span>
            {item.resolvedAt && <span className="report-badge status-removed">Archived</span>}
            {item.urgent && <span className="urgent-badge">URGENT</span>}
            <strong>{item.id}</strong> <span>{item.incidentType} · {item.location}</span>
          </summary>
          <dl className="review-details">
            <div><dt>Submitted</dt><dd>{new Date(item.submittedAt).toLocaleString()}</dd></div>
            <div><dt>Description</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{item.description || 'Photo only'}</dd></div>
            {item.moderationStatus === 'denied' && item.moderationReason && <div><dt>Reason</dt><dd>{item.moderationReason}</dd></div>}
            <div><dt>Analyst comment</dt><dd>{item.analystComment || 'No comment yet.'}</dd></div>
            {item.resolvedAt && <div><dt>Archived</dt><dd>{new Date(item.resolvedAt).toLocaleString()} · Archived and removed from the public map.</dd></div>}
          </dl>
        </details>
      ))}
    </section>
  );
}
