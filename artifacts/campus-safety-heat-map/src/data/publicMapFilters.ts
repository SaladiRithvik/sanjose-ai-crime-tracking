import type { ReportRecord } from './reports';

export type MapTimeRange = '7' | '30' | 'all';
const DAY = 86_400_000;
const campusDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
});

function dayNumber(date: Date): number {
  const parts = campusDate.formatToParts(date);
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return Date.UTC(part('year'), part('month') - 1, part('day')) / DAY;
}

/** Calendar days in San José. Undated incidents use the known submission date. */
export function matchesMapTimeRange(
  report: Pick<ReportRecord, 'incidentDate' | 'submittedAt'>,
  range: MapTimeRange,
  now = new Date(),
): boolean {
  if (range === 'all') return true;
  let day: number;
  if (report.incidentDate.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(report.incidentDate)) return false;
    const date = new Date(`${report.incidentDate}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== report.incidentDate) return false;
    day = date.getTime() / DAY;
  } else {
    const submitted = new Date(report.submittedAt);
    if (!Number.isFinite(submitted.getTime())) return false;
    day = dayNumber(submitted);
  }
  const age = dayNumber(now) - day;
  return age >= 0 && age < Number(range);
}

/** Most recent actual submission/review timestamp, not the visitor's load time. */
export function mapUpdatedLabel(reports: ReadonlyArray<Pick<ReportRecord, 'submittedAt' | 'moderatedAt'>>): string {
  const timestamps = reports.flatMap(report => [report.submittedAt, report.moderatedAt])
    .filter((value): value is string => Boolean(value))
    .map(value => Date.parse(value)).filter(Number.isFinite);
  if (!timestamps.length) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric',
  }).format(timestamps.reduce((latest, value) => Math.max(latest, value), -Infinity));
}