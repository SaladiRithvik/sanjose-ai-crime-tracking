import type { CSSProperties } from 'react';
import type { Category, ReportRecord } from '../data/reports';
import { incidentSeverity, reportStatus, SEVERITY_COLORS, type Severity } from '../data/incidentPresentation';

export function StatusBadge({ report }: { report: Pick<ReportRecord, 'isDemo' | 'moderationStatus'> }) {
  const status = reportStatus(report);
  return <span className={`report-badge status-${status.key}`} data-testid={`badge-status-${status.key}`}>{status.label}</span>;
}

export function SeverityBadge({ type, colors = SEVERITY_COLORS }: { type: Category; colors?: Record<Severity, string> }) {
  const level = incidentSeverity(type);
  return (
    <span className="report-badge severity" style={{ '--severity-color': colors[level] } as CSSProperties} title="Type-based label, not verified danger" data-testid={`badge-severity-${level.toLowerCase()}`}>
      <i aria-hidden="true" />{level}
    </span>
  );
}
