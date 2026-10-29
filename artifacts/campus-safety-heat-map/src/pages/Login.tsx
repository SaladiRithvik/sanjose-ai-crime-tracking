import { useState, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Map, ShieldCheck, Users } from 'lucide-react';
import { LandingMapPreview } from '../components/LandingMapPreview';
import './landing.css';
import { BrandLogo } from '../components/BrandLogo';
import { useAppContext } from '../context/AppContext';

type LoginFlow = 'student' | 'analyst' | null;

export default function Login() {
  const [, navigate] = useLocation();
  const { loginStudent, loginAnalyst, enterAs } = useAppContext();
  const [flow, setFlow] = useState<LoginFlow>(null);
  const [studentEmail, setStudentEmail] = useState('student@sjsu.edu');
  const [studentPassword, setStudentPassword] = useState('demo123');
  const [analystEmail, setAnalystEmail] = useState('analyst@sjsu.edu');
  const [analystPassword, setAnalystPassword] = useState('analyst123');
  const [error, setError] = useState('');

  const choose = (next: LoginFlow) => {
    setError('');
    setFlow(current => current === next ? null : next);
  };

  const submitStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (await loginStudent(studentEmail.trim(), studentPassword)) navigate('/report');
      else setError('Those student credentials did not match. Please try again.');
    } catch { setError('Could not sign in. Please try again.'); }
  };
  const submitAnalyst = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (await loginAnalyst(analystEmail.trim(), analystPassword)) navigate('/review');
      else setError('Those analyst credentials did not match. Please try again.');
    } catch { setError('Could not sign in. Please try again.'); }
  };
  const continueAs = async (role: 'resident' | 'viewer') => {
    try {
      await enterAs(role);
      navigate(role === 'resident' ? '/report' : '/map');
    } catch {
      setError('Could not start your session. Please try again.');
    }
  };

  return (
    <main className="lp">
      <header className="lp-header">
        <span className="lp-brand"><BrandLogo size={44} /><span>SJSU SafeMap</span></span>
        <span className="lp-tag">A student-built neighborhood prototype</span>
      </header>
      <div className="lp-main">
        <section className="lp-preview" aria-label="Live community report map">
          <LandingMapPreview />
          <button type="button" className="lp-fullmap" onClick={() => void continueAs('viewer')} data-testid="button-view-heat-map"><Map size={17} aria-hidden="true" /> View full map</button>
          {error && flow === null && <p role="alert" className="lp-err" style={{ marginTop: 10 }}>{error}</p>}
        </section>
        <section className="lp-report" aria-labelledby="lp-title">
          <h1 id="lp-title">Report something you saw</h1>
          <div className="lp-cards">
            <button type="button" className="lp-card" aria-pressed={flow === 'student'} onClick={() => choose('student')} data-testid="button-student-login-choice">
              <img src={`${import.meta.env.BASE_URL}sjsu-spartan.svg`} width={32} height={32} alt="" aria-hidden="true" style={{ objectFit: 'contain' }} /><strong>SJSU Student / Staff</strong><span>Log in to submit a report</span>
            </button>
            <button type="button" className="lp-card" onClick={() => void continueAs('resident')} data-testid="button-continue-resident">
              <Users size={26} aria-hidden="true" /><strong>Resident / Visitor</strong><span>Continue without login</span>
            </button>
          </div>
          {flow === 'student' && (
            <section className="lp-form" aria-labelledby="student-login-title">
              <h2 id="student-login-title">Student / staff log in</h2>
              <p>Log in with your SJSU email to submit a report.</p>
              <form onSubmit={e => void submitStudent(e)} className="lp-fields">
                <label htmlFor="student-email">Email
                  <input id="student-email" type="email" autoComplete="username" required value={studentEmail} onChange={e => { setStudentEmail(e.target.value); setError(''); }} placeholder="student@sjsu.edu" data-testid="input-student-email" />
                </label>
                <label htmlFor="student-password">Password
                  <input id="student-password" type="password" autoComplete="current-password" required value={studentPassword} onChange={e => { setStudentPassword(e.target.value); setError(''); }} data-testid="input-student-password" />
                </label>
                {error && <p role="alert" className="lp-err">{error}</p>}
                <button className="lp-submit" type="submit" data-testid="button-submit-student-login">Log In <ArrowRight size={15} aria-hidden="true" /></button>
              </form>
            </section>
          )}
        </section>
      </div>
      <footer className="lp-footer">
        <button type="button" className="lp-link" aria-pressed={flow === 'analyst'} onClick={() => choose('analyst')} data-testid="button-analyst-login-choice"><ShieldCheck size={15} aria-hidden="true" /> Analyst login</button>
        {flow === 'analyst' && (
            <section className="lp-form" aria-labelledby="analyst-login-title">
              <h2 id="analyst-login-title">Analyst log in</h2>
              <p>Reviewer access for reports awaiting a decision.</p>
              <form onSubmit={e => void submitAnalyst(e)} className="lp-fields">
                <label htmlFor="analyst-email">Email
                  <input id="analyst-email" type="email" autoComplete="username" required value={analystEmail} onChange={e => { setAnalystEmail(e.target.value); setError(''); }} placeholder="analyst@sjsu.edu" data-testid="input-analyst-email" />
                </label>
                <label htmlFor="analyst-password">Password
                  <input id="analyst-password" type="password" autoComplete="current-password" required value={analystPassword} onChange={e => { setAnalystPassword(e.target.value); setError(''); }} data-testid="input-analyst-password" />
                </label>
                {error && <p role="alert" className="lp-err">{error}</p>}
                <button className="lp-submit" type="submit" data-testid="button-submit-analyst-login">Analyst Login <ArrowRight size={15} aria-hidden="true" /></button>
              </form>
            </section>
        )}
      </footer>
    </main>
  );
}
