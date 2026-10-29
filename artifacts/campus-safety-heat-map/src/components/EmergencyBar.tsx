import { Link } from 'wouter';
import './emergency-bar.css';

export function EmergencyBar() {
  return (
    <div className="site-emergency-bar" role="note" aria-label="Emergency information" data-testid="site-emergency-bar">
      <span>In an emergency, call 911.</span>
      <Link href="/help" data-testid="link-help-now">Need help now?</Link>
    </div>
  );
}