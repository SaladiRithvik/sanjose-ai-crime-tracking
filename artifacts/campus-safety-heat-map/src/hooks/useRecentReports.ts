import { useEffect, useState } from 'react';
import { isRecentReport, RECENT_REPORT_WINDOW_MS } from '../data/recentReports';

type DatedReport = { id: string; submittedAt: string };

/** Recalculate at the next expiry and when returning to a backgrounded page. */
export function useRecentReports(reports: DatedReport[]): Set<string> {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const current = Date.now();
    const deadlines = reports
      .filter(report => isRecentReport(report.submittedAt, current))
      .map(report => Date.parse(report.submittedAt) + RECENT_REPORT_WINDOW_MS);
    const next = deadlines.length ? Math.min(...deadlines) : Infinity;
    const timer = window.setTimeout(refresh, Math.max(1, Math.min(60_000, next - current)));
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [reports, now]);
  // Newly fetched submissions must be evaluated against this render's clock.
  const current = Math.max(now, Date.now());
  return new Set(reports.filter(report => isRecentReport(report.submittedAt, current)).map(report => report.id));
}
