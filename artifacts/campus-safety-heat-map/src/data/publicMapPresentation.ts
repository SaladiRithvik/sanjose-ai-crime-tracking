import type { ReportRecord } from './reports';
import { incidentSeverity, type Severity } from './incidentPresentation';

/** Per-report priority can vary within a type; other screens retain type badges. */
export function publicMapSeverity(report: ReportRecord): Severity {
  if (report.priorityStatus === 'Critical' || report.priorityStatus === 'High') return 'High';
  if (report.priorityStatus === 'Low') return 'Low';
  return incidentSeverity(report.incidentType);
}

export const OVERVIEW_LABELS = new Set([
  'SJSU Campus', 'MLK Library', 'Student Union',
  'San Pedro Square', 'Diridon Station', 'Convention Center',
  // All four garages are primary references, including at all-reports zoom.
  'North Garage', 'West Garage', 'South Garage', 'South Campus Garage',
]);

export const ACTIVITY_COLORS = ['#F7E8B5', '#E5B84B', '#C96A32', '#9E1B1B', '#641414'];
export const activityMarkerColor = (count: number) => ACTIVITY_COLORS[count < 3 ? 0 : count < 6 ? 1 : count < 10 ? 2 : count < 16 ? 3 : 4];
export function isMapEligible(report: ReportRecord): boolean {
  const { latitude, longitude } = report.coordinates ?? {};
  return report.moderationStatus === 'approved' && !report.resolvedAt && report.locationConfirmed
    && !!report.location?.trim() && Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && !(latitude === 0 && longitude === 0);
}
export const ACTIVITY_LEGEND = [
  'Number = approved reports',
];
export const ACTIVITY_DISCLAIMER = 'This map shows report activity, not confirmed danger or verified risk.';

/** Absolute density, not severity or dataset-normalized risk. */
export function publicHeatColorAt(density: number): [number, number, number, number] {
  if (density < 0.15) return [0, 0, 0, 0];
  const stops = [[247,232,181], [229,184,75], [201,106,50], [158,27,27], [100,20,20]];
  const position = Math.min(4, Math.max(0, (density - 1) / 4));
  const index = Math.min(3, Math.floor(position)), fraction = position - index;
  const rgb = stops[index].map((value, channel) => Math.round(value + (stops[index + 1][channel] - value) * fraction));
  return [rgb[0], rgb[1], rgb[2], Math.round(Math.min(.62, density * .045) * 255)];
}

export function publicHeatOpacity(zoom: number): number {
  return Math.max(0.06, Math.min(1, 1 - Math.max(0, zoom - 16) * 0.4));
}