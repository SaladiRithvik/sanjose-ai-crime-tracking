import React from 'react';
import { useLocation, Link } from 'wouter';
import { ArrowLeft, ClipboardCheck, LogOut, FileText, UserRound, Map as MapIcon } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAppContext } from '../context/AppContext';
import { EmergencyBar } from './EmergencyBar';

export function Layout({ children }: { children: React.ReactNode }) {
  const { role, logout, toastMessage, notify } = useAppContext();
  const [location, setLocation] = useLocation();
  const isReporter = role === 'student' || role === 'resident';
  const roleLabel = role === 'analyst' ? 'Analyst / Report Reviewer'
    : role === 'student' ? 'SJSU Student / Staff'
    : role === 'resident' ? 'Resident / Visitor' : 'Map-only visitor';

  if (location === '/login') {
    return (
      <>
      <EmergencyBar />
      <div className="app-shell app-shell-with-emergency">
        <div className="main-canvas entry-canvas">
          {children}
          {toastMessage && <div className="toast-message" role="status">{toastMessage}</div>}
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    <EmergencyBar />
    <div className="app-shell app-shell-with-emergency">
      <aside className="app-rail" aria-label="Prototype navigation">
        <div>
          <div className="brand-lockup">
            <div className="brand-tile"><BrandLogo size={34} /></div>
            <div className="brand-copy">
              <div className="brand-name">SJSU SafeMap</div>
              <div className="brand-subtitle">{role === 'analyst' ? 'REVIEW DESK' : 'CAMPUS SAFETY'}</div>
            </div>
          </div>
          <div className="rail-kicker">Workspace</div>
          <nav className="rail-nav">
            <Link href="/map" className={`rail-item ${location === '/map' ? 'rail-item-active' : ''}`}>
              <MapIcon size={16} /><span>View heat map</span>
            </Link>
            {isReporter && (
              <Link href="/report" className={`rail-item ${location === '/report' ? 'rail-item-active' : ''}`}>
                <FileText size={16} /><span>Submit report</span>
              </Link>
            )}
            {role === 'analyst' && (
              <Link href="/review" className={`rail-item ${location === '/review' ? 'rail-item-active' : ''}`}>
                <ClipboardCheck size={16} /><span>Review queue</span>
              </Link>
            )}
          </nav>
        </div>
        <div>
          <button className="rail-item" type="button"
            style={{ width: '100%', cursor: 'pointer', background: 'transparent', marginTop: '10px' }}
            onClick={() => { void logout().then(() => setLocation('/login')).catch(() => notify('Could not log out. Please try again.')); }}>
            <LogOut size={16} /><span>{role === 'student' || role === 'analyst' ? 'Log out' : 'Change entry'}</span>
          </button>
          <div className="rail-note" style={{ marginTop: '15px' }}>
            <strong><Link href="/help" className="text-link" data-testid="link-emergency-help">In an emergency, call 911</Link></strong>
            SafeMap reports are reviewed by people and never dispatch help.
          </div>
        </div>
      </aside>

      <main className="main-canvas">
        <header className="topbar">
          <div className="mobile-topbrand"><BrandLogo size={30} decorative /><span>SJSU SafeMap</span></div>
          <div className="topbar-context">
            <span className="context-dot" aria-hidden="true" />
            <span>San José State University · {role === 'analyst' ? 'review desk' : 'public heat map'}</span>
          </div>
          <button type="button" className="back-login" data-testid="button-back-to-login"
            onClick={() => { void logout().then(() => setLocation('/login')).catch(() => notify('Could not log out. Please try again.')); }}>
            <ArrowLeft size={15} aria-hidden="true" /><span>Back to login</span>
          </button>
          <div className="topbar-role">
            <div className="role-avatar" aria-hidden="true"><UserRound size={15} /></div>
            <span>{roleLabel}</span>
          </div>
        </header>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <Link href="/map" className={location === '/map' ? 'active' : ''}>Heat map</Link>
          {isReporter && <Link href="/report" className={location === '/report' ? 'active' : ''}>Submit report</Link>}
          {role === 'analyst' && <Link href="/review" className={location === '/review' ? 'active' : ''}>Review queue</Link>}
          <button type="button" onClick={() => { void logout().then(() => setLocation('/login')).catch(() => notify('Could not log out. Please try again.')); }}>
            {role === 'student' || role === 'analyst' ? 'Log out' : 'Change entry'}
          </button>
        </nav>

        {children}
        
        {toastMessage && <div className="toast-message" role="status" data-testid="status-toast">{toastMessage}</div>}
      </main>
    </div>
    </>
  );
}
