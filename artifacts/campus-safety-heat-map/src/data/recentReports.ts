export const RECENT_REPORT_WINDOW_MS = 60 * 60 * 1000;

export function isRecentReport(submittedAt: string, now = Date.now()): boolean {
  const age = now - Date.parse(submittedAt);
  return Number.isFinite(age) && age >= 0 && age < RECENT_REPORT_WINDOW_MS;
}
