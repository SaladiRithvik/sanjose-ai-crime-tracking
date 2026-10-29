import type { Category, ReportRecord } from './reports';

export type Severity = 'Low' | 'Medium' | 'High';

/** Type-based presentation labels, not an assessment of verified danger. */
export const INCIDENT_SEVERITY: Record<Category, Severity> = {
  'Fraud': 'Medium',
  'Forgery': 'Medium',
  'Forgery — Bad Checks': 'Medium',
  'Fraudulent Use of Credit/Debit Card': 'Medium',
  'Harassing Communications': 'Medium',
  'Identity Theft': 'Medium',
  'Lost Property': 'Low',
  'Non-Injury Traffic Accident': 'Low',
  'Theft': 'Medium',
  'Theft from Vehicle': 'Medium',
  'Vandalism': 'Low',
  'Vandalism of Vehicle': 'Medium',
  'Fighting / Violence': 'High',
  'Harassment': 'High',
  'Suspicious Activity': 'Low',
  'Property Damage': 'Low',
  'Medical Concern': 'High',
  'Other Safety Concern': 'Low',
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  Low: '#eab308',
  Medium: '#f97316',
  High: '#dc2626',
};

/** Public-map-only lemon yellow; other screens retain their existing palette. */
export const PUBLIC_MAP_SEVERITY_COLORS: Record<Severity, string> = {
  ...SEVERITY_COLORS, Low: '#d4c000',
};

export function incidentSeverity(type: Category): Severity {
  return INCIDENT_SEVERITY[type];
}

export function reportStatus(report: Pick<ReportRecord, 'isDemo' | 'moderationStatus'>) {
  const statuses = {
    approved: { label: 'Approved', key: 'approved' },
    pending: { label: 'Pending', key: 'pending' },
    denied: { label: 'Denied', key: 'denied' },
    removed: { label: 'Removed', key: 'removed' },
  };
  return statuses[report.moderationStatus];
}