import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import type { WebsiteAccess } from '@workspace/api-client-react';
import { BrandLogo } from './BrandLogo';
import './website-gate.css';

const ProtectedApp = lazy(() => import('../ProtectedApp'));
const accessUrl = `${import.meta.env.BASE_URL}api/site-access`;
type State = 'checking' | 'locked' | 'unlocked' | 'unavailable';

async function readAccess(signal?: AbortSignal): Promise<WebsiteAccess> {
  const response = await fetch(accessUrl, { credentials: 'same-origin', cache: 'no-store', signal });
  if (!response.ok) throw new Error('Could not check website access.');
  const result = await response.json();
  if (typeof result.unlocked !== 'boolean') throw new Error('Invalid access response.');
  return result;
}

export default function WebsiteGate() {
  const [state, setState] = useState<State>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState('checking');
    void readAccess(controller.signal)
      .then(result => { if (!controller.signal.aborted) setState(result.unlocked ? 'unlocked' : 'locked'); })
      .catch(() => { if (!controller.signal.aborted) setState('unavailable'); });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (state !== 'unlocked') return;
    const controller = new AbortController();
    const check = () => {
      void readAccess(controller.signal).then(result => {
        if (!controller.signal.aborted && !result.unlocked) {
          setPassword(''); setError('Website access has expired. Please enter the password again.');
          setState('locked');
        }
      }).catch(() => { /* A temporary network outage does not discard an open draft. */ });
    };
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    const timer = window.setInterval(check, 60_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort(); window.clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state]);

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(accessUrl, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok || result.unlocked !== true) {
        setError(result.error || 'Could not unlock the website. Please try again.'); return;
      }
      // Confirm the browser accepted the HttpOnly cookie before importing any features.
      if (!(await readAccess()).unlocked) {
        setError('Website access could not be saved. Please enable cookies and try again.'); return;
      }
      setPassword(''); setState('unlocked');
    } catch { setError('Could not reach the server. Please try again.'); }
    finally { setBusy(false); }
  };

  if (state === 'unlocked') return (
    <Suspense fallback={<div className="site-access-loading" role="status">Opening website…</div>}>
      <ProtectedApp />
    </Suspense>
  );

  return (
    <main className="site-access-screen">
      <section className="site-access-card" aria-labelledby="site-access-title" data-testid="website-password-gate">
        <div className="site-access-brand"><BrandLogo size={40} /><div>SJSU SafeMap<small>Campus safety</small></div></div>
        <h1 id="site-access-title">Website access</h1>
        {state === 'checking' ? <p role="status">Checking website access…</p> : state === 'unavailable' ? (
          <div>
            <p role="alert">Could not check website access. The site remains locked.</p>
            <button className="site-access-button" onClick={() => setRetry(value => value + 1)}>Try again</button>
          </div>
        ) : (
          <form onSubmit={event => void unlock(event)}>
            <p>Enter the website password to continue.</p>
            <label htmlFor="website-password">Password</label>
            <input id="website-password" type="password" autoComplete="current-password"
              autoFocus required maxLength={256} value={password} disabled={busy}
              onChange={event => { setPassword(event.target.value); setError(''); }}
              aria-invalid={!!error} aria-describedby={error ? 'website-password-error' : undefined}
              data-testid="input-website-password" />
            {error && <p id="website-password-error" className="site-access-error" role="alert">{error}</p>}
            <button type="submit" className="site-access-button" disabled={busy || !password}
              data-testid="button-unlock-website">{busy ? 'Checking…' : 'Continue'}</button>
          </form>
        )}
        <p className="site-access-emergency">In an emergency, call 911.</p>
      </section>
    </main>
  );
}