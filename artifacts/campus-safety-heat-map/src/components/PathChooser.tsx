import { Link } from 'wouter';
import { AlertTriangle, ArrowRight, Flag } from 'lucide-react';

export function PathChooser({ onConcern, concernActive }: { onConcern: () => void; concernActive?: boolean }) {
  return (
    <section className="path-chooser" aria-label="Choose a reporting path">
      <Link href="/help" className="path-option path-emergency" data-testid="link-help-now">
        <AlertTriangle size={22} aria-hidden="true" />
        <span><strong>I need help now</strong><small>Emergency. Get help first, then report.</small></span>
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
      <button type="button" className="path-option path-concern" aria-pressed={concernActive} onClick={onConcern} data-testid="button-report-concern">
        <Flag size={22} aria-hidden="true" />
        <span><strong>Report a concern</strong><small>Not urgent. Warn others about something you saw.</small></span>
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
