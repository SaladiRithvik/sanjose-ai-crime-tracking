import { isMapEligible } from '../data/publicMapPresentation';
import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import type { ReportRecord } from '../data/reports';
import GeographicHeatMap from '../components/GeographicHeatMap';
import { CalendarClock, Info, MapPin, Trash2 } from 'lucide-react';
import { formatReportDate, capitalizeFirst } from '../data/reportPresentation';
import './heat-clarity.css';
import { StatusBadge, SeverityBadge } from '../components/ReportBadges';
import { PUBLIC_MAP_SEVERITY_COLORS as SEVERITY_COLORS, type Severity } from '../data/incidentPresentation';
import { Link } from 'wouter';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../components/ui/alert-dialog';
import './map-redesign.css';
import './map-clarity.css';
import './public-map-renderer.css';
import { CATEGORIES, type Category } from '../data/reports';
import { publicMapSeverity } from '../data/publicMapPresentation';
import './map-controls.css';
import { matchesMapTimeRange, mapUpdatedLabel, type MapTimeRange } from '../data/publicMapFilters';
import { useRecentReports } from '../hooks/useRecentReports';

const RANGES: { value: MapTimeRange; label: string }[] = [{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: 'all', label: 'All' }];
const LEVELS = ['Low', 'Medium', 'High'] as const;

function publicLabel(item: ReportRecord, analyst = false): string {
  return !analyst && !item.isDemo && item.privacyMode === 'anonymous' ? 'Anonymous report' : item.location;
}

export default function Map() {
  const { role, reports, record, selectRecord, storageState, storageError, reloadReports, removeReport, notify } = useAppContext();
  useEffect(() => { void reloadReports(); }, [reloadReports]);
  // Fictional examples retain their old map behavior. Submitted reports must be approved.
  const [range, setRange] = useState<MapTimeRange>('all');
  const [visible, setVisible] = useState<Set<Severity>>(() => new Set<Severity>(LEVELS));
  const [typeFilter, setTypeFilter] = useState<Category | 'all'>('all');
  const approvedReports = useMemo(() => storageState === 'error' ? [] : reports.filter(isMapEligible), [reports, storageState]);
  const publicReports = useMemo(() => approvedReports.filter(item => matchesMapTimeRange(item, range) && (typeFilter === 'all' || item.incidentType === typeFilter) && visible.has(publicMapSeverity(item))), [approvedReports, range, visible, typeFilter]);
  const recentIds = useRecentReports(publicReports);
  const toggleLevel = (level: Severity) => setVisible(prev => { const next = new Set(prev); if (next.has(level)) next.delete(level); else next.add(level); return next; });
  const [removalTarget, setRemovalTarget] = useState<ReportRecord | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const doRemove = async () => {
    if (!removalTarget || removing) return;
    setRemoving(true); setRemoveError('');
    try { await removeReport(removalTarget.id); setRemovalTarget(null); notify('Report archived. It has been removed from the heat map and preserved in Archived reports.'); }
    catch { setRemoveError('The report could not be archived. Please try again.'); }
    finally { setRemoving(false); }
  };
  const selected = publicReports.find(item => item.id === record.id) ?? publicReports[0];
  const approvedCount = publicReports.length;
  const total = approvedReports.length;
  const privateDetails = role !== 'analyst' && selected && !selected.isDemo && selected.privacyMode === 'anonymous';

  return (
    <div className="page-wrap public-heat-map public-map-page">
      <header className="mc-head">
        <h1 className="mc-title">Incident map: SJSU and Downtown San José</h1>
        <p className="mc-meta">{total} approved report{total === 1 ? '' : 's'} · Updated {mapUpdatedLabel(approvedReports)} · <Link href="/help">In an emergency, call 911</Link></p>
      </header>

      {storageState === 'loading' && <div className="surface record-card" role="status">Loading reports…</div>}
      {storageState === 'error' && (
        <div className="surface record-card save-error" role="alert">
          Reports could not be loaded: {storageError}{' '}
          <button type="button" className="secondary-button" onClick={() => void reloadReports()}>Retry</button>
        </div>
      )}

      <section className="surface map-card" aria-labelledby="map-heading">
        <h2 id="map-heading" className="sr-only">Incident map</h2>
        <div className="pm-controls">
          <div className="mc-group" role="group" aria-label="Time range" title="Incident date when provided; otherwise submission date. Days are based on San José time.">
            {RANGES.map(r => <button key={r.value} type="button" className="mc-chip" aria-pressed={range === r.value} onClick={() => setRange(r.value)}>{r.label}</button>)}
          </div>
          <label className="pm-type"><span>Type</span>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as Category | 'all')}>
              <option value="all">All types</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <div className="mc-group" role="group" aria-label="Severity filter">
            {LEVELS.map(level => (
              <button key={level} type="button" className="mc-chip" aria-pressed={visible.has(level)} onClick={() => toggleLevel(level)}>
                <i style={{ background: SEVERITY_COLORS[level] }} aria-hidden="true" />{level}
              </button>
            ))}
          </div>
          <span className="mc-count" role="status">{approvedCount} of {total} shown</span>
        </div>
        <div className="map-visual" data-testid="visual-draft-heat-map">
          <GeographicHeatMap reports={publicReports} selectedId={selected?.id ?? ''} revealSelected={selected?.id === record.id} onSelect={selectRecord} isAuthenticated={role === 'analyst'} publicView={true} />
          {storageState === 'ready' && !publicReports.length && <div className="map-empty">{total ? 'No reports match these filters.' : 'No approved reports yet.'}</div>}
        </div>
        <div className="map-foot"><Info size={14} /><span>Shading shows report volume, not verified risk. Pending and denied reports are excluded.</span></div>
      </section>

      <div className="review-layout">
        <section className="surface record-list" aria-label="Approved incident records">
          <div className="record-list-head"><strong>Map records</strong><span>{approvedCount} approved report{approvedCount === 1 ? '' : 's'}</span></div>
          <div className="record-list-scroll">
            {publicReports.map(item => (
              <button key={item.id} type="button"
                className={`record-list-item ${selected?.id === item.id ? 'selected' : ''}${recentIds.has(item.id) ? ' report-recent' : ''}`}
                onClick={() => selectRecord(item.id)} aria-pressed={selected?.id === item.id}
                data-testid={`button-select-record-${item.id}`}>
                <StatusBadge report={item} />
                <strong>{publicLabel(item, role === 'analyst')}</strong>
                <small><SeverityBadge type={item.incidentType} colors={SEVERITY_COLORS} /> {item.incidentType} · {formatReportDate(item)}</small>
                {recentIds.has(item.id) && <span className="recent-report-tag" title="Submitted within the last hour">Recent</span>}
              </button>
            ))}
          </div>
        </section>
        {selected && (
          <section className="surface record-card map-detail" aria-labelledby="record-heading">
            <div className="map-detail-top">
              <h2 id="record-heading" className="map-detail-title"><span>{selected.incidentType}<span className="sr-only"> (Incident type)</span></span><SeverityBadge type={selected.incidentType} colors={SEVERITY_COLORS} /></h2>
              <div className="map-detail-meta"><StatusBadge report={selected} /><span>{selected.id}</span></div>
            </div>
            <div className="map-detail-facts">
              <div className="map-detail-fact"><MapPin size={15} aria-hidden="true" /><span>{privateDetails ? 'Hidden for anonymous reports' : selected.location}</span></div>
              <div className="map-detail-fact"><CalendarClock size={15} aria-hidden="true" /><span>{formatReportDate(selected)}</span></div>
            </div>
            <p className="map-detail-desc">{privateDetails ? 'Hidden for anonymous reports in public view.' : capitalizeFirst(selected.description) || 'No description supplied.'}</p>
            {selected.image && !privateDetails && <div className="image-preview"><img src={selected.image} alt="Attached report" /></div>}
            <div className="map-detail-foot">
              <small>{selected.privacyMode === 'anonymous' ? 'Reported anonymously' : `Reported by ${selected.displayName?.trim() || 'a community member'}`}</small>
              {role === 'analyst' && <button type="button" className="remove-outline" onClick={() => { setRemoveError(''); setRemovalTarget(selected); }} data-testid="button-remove-report"><Trash2 size={12} /> Remove from heat map</button>}
            </div>
          </section>
        )}
      </div>
      <AlertDialog open={removalTarget !== null} onOpenChange={open => { if (!open && !removing) setRemovalTarget(null); }}>
        <AlertDialogContent className="surface">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this report and remove it from the heat map?</AlertDialogTitle>
            <AlertDialogDescription>{removalTarget?.id} will move to Archived reports and no longer contribute to the public map or heat layer. Its contents, approval decision, and review history will be preserved, not deleted. Archived reports cannot be reopened.</AlertDialogDescription>
          </AlertDialogHeader>
          {removeError && <p role="alert" className="save-error">{removeError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing} data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction className="danger-button" disabled={removing} onClick={event => { event.preventDefault(); void doRemove(); }} data-testid="button-confirm-remove">{removing ? 'Archiving…' : 'Archive report'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
