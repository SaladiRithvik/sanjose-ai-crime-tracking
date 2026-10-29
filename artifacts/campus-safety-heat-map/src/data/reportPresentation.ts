import type { ReportRecord } from './reports';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtTime(h: number, m: number): string {
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function parseTime(t: string): { h: number; m: number } | null {
  const x = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/.exec(t.trim());
  if (!x) return null;
  let h = Number(x[1]);
  const m = Number(x[2]);
  if (x[3]) { const pm = x[3].toLowerCase() === 'pm'; h = (h % 12) + (pm ? 12 : 0); }
  return h < 24 && m < 60 ? { h, m } : null;
}

/** Mar 28, 2025 · 1:40 PM. Never substitute submission time for an unknown incident time. */
export function formatReportDate(r: Pick<ReportRecord, 'incidentDate' | 'incidentTime'>): string {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec((r.incidentDate || '').trim());
  if (d) {
    const date = `${MONTHS[Number(d[2]) - 1]} ${Number(d[3])}, ${d[1]}`;
    const t = parseTime(r.incidentTime || '');
    return t ? `${date} · ${fmtTime(t.h, t.m)}` : date;
  }
  if (r.incidentDate && r.incidentDate.trim()) return r.incidentTime ? `${r.incidentDate} · ${r.incidentTime}` : r.incidentDate;
  return 'Date/time not supplied';
}

export function capitalizeFirst(s: string): string {
  const i = s.search(/\p{L}/u);
  return i < 0 ? s : s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1);
}
