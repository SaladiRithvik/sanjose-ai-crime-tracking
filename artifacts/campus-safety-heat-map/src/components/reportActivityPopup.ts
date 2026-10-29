import type { ReportRecord } from '../data/reports';

/** Compact individual details; clusters zoom directly and never use this card. */
export function reportActivityPopup(report: ReportRecord): HTMLElement {
  const root = document.createElement('section');
  root.className = 'report-activity-popup';
  root.dataset.reportIds = JSON.stringify([report.id]);
  root.setAttribute('aria-label', 'Report details');
  const heading = document.createElement('h3');
  heading.textContent = report.incidentType;
  root.append(heading);
  const summary = document.createElement('dl');
  const fields = [
    ['Priority', report.priorityStatus],
    ['Status', report.moderationStatus === 'approved' ? 'Approved' : report.moderationStatus],
    ['Location', report.location],
    ...(report.incidentDate ? [['Date', report.incidentDate]] : []),
  ];
  for (const [label, value] of fields) {
    if (!value) continue;
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    detail.title = value;
    summary.append(term, detail);
  }
  root.append(summary);
  return root;
}
