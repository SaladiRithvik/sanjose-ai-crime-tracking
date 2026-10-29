import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createSafemapSession, deleteSafemapSession, getSafemapSession } from '@workspace/api-client-react';
import type { SafemapSubmission } from '@workspace/api-client-react';
import type { ReportRecord } from '../data/reports';
import { changeReport, loadReports, submitReportToServer } from '../data/reportStore';
export type { ReportRecord, ModerationStatus, PriorityStatus } from '../data/reports';

/** Unselected placeholder only; never displayed as a report. */
export const initialRecord: ReportRecord = {
  id: 'SAMPLE', isDemo: true, reporterType: 'student', privacyMode: 'anonymous',
  coordinates: { latitude: 37.3352, longitude: -121.8811 }, locationSource: 'manual', locationConfirmed: true,
  location: '', incidentDate: '', incidentTime: '', description: '', incidentType: 'Other Safety Concern',
  moderationStatus: 'pending', priorityStatus: 'Normal', moderationReason: '', submittedAt: '1970-01-01T00:00:00Z',
};

export type UserRole = 'student' | 'analyst' | 'resident' | 'viewer';
type Storage = 'loading' | 'ready' | 'error';

type AppContextType = {
  role: UserRole | null;
  sessionReady: boolean;
  loginStudent: (email: string, pass: string) => Promise<boolean>;
  loginAnalyst: (email: string, pass: string) => Promise<boolean>;
  enterAs: (role: 'resident' | 'viewer') => Promise<void>;
  logout: () => Promise<void>;
  record: ReportRecord;
  setRecord: (val: ReportRecord) => void;
  draftRecord: ReportRecord;
  setDraftRecord: (val: ReportRecord) => void;
  editing: boolean;
  setEditing: (val: boolean) => void;
  reports: ReportRecord[];
  selectRecord: (id: string) => void;
  submitReport: (submission: Omit<SafemapSubmission, 'image'>, photoDataUrl?: string) => Promise<void>;
  moderateReport: (id: string, decision: 'approved' | 'denied', reason?: string, comment?: string) => Promise<void>;
  correctPendingReport: (id: string, changes: Pick<ReportRecord, 'description' | 'priorityStatus'>) => Promise<void>;
  removeReport: (id: string) => Promise<void>;
  resolveReport: (id: string, note?: string) => Promise<void>;
  storageState: Storage;
  storageError: string;
  reloadReports: () => Promise<void>;
  toastMessage: string;
  notify: (msg: string) => void;
};
const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [record, setRecord] = useState<ReportRecord>(initialRecord);
  const [draftRecord, setDraftRecord] = useState<ReportRecord>(initialRecord);
  const [editing, setEditing] = useState(false);
  const [storageState, setStorageState] = useState<Storage>('loading');
  const [storageError, setStorageError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const editingRef = useRef(false); editingRef.current = editing;
  const recordRef = useRef(record); recordRef.current = record;
  const epoch = useRef(0);
  const loadedOnce = useRef(false);
  const latestLoad = useRef(0);

  const reloadReports = useCallback(async (silent = false) => {
    const mine = epoch.current;
    const loadNumber = ++latestLoad.current;
    if (!silent || !loadedOnce.current) setStorageState('loading');
    try {
      const items = [...await loadReports()].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
      if (mine !== epoch.current || loadNumber !== latestLoad.current) return;
      loadedOnce.current = true;
      setReports(items);
      const current = recordRef.current;
      const fresh = items.find(item => item.id === current.id);
      if (fresh) {
        if (!editingRef.current) { setRecord(fresh); setDraftRecord(fresh); }
      } else if (current.id !== initialRecord.id && !editingRef.current) {
        setRecord(initialRecord); setDraftRecord(initialRecord);
      }
      setStorageState('ready'); setStorageError('');
    } catch (error) {
      if (mine !== epoch.current || loadNumber !== latestLoad.current) return;
      setReports([]);
      loadedOnce.current = false;
      setStorageError(error instanceof Error ? error.message : 'Reports are unavailable.');
      setStorageState('error');
    }
  }, []);

  const applyRole = useCallback((next: UserRole | null) => {
    epoch.current += 1;
    loadedOnce.current = false;
    setReports([]); setRecord(initialRecord); setDraftRecord(initialRecord); setEditing(false);
    setRole(next);
    setStorageError('');
    setStorageState(next ? 'loading' : 'ready');
  }, []);

  useEffect(() => {
    let live = true;
    getSafemapSession().then(s => { if (live) applyRole(s.role); })
      .catch(() => { if (live) applyRole(null); })
      .finally(() => { if (live) setSessionReady(true); });
    return () => { live = false; };
  }, [applyRole]);

  useEffect(() => {
    if (!sessionReady) return;
    void reloadReports();
    const timer = window.setInterval(() => void reloadReports(true), 15000);
    const onFocus = () => void reloadReports(true);
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [role, sessionReady, reloadReports]);

  const selectRecord = (id: string) => {
    const found = reports.find(item => item.id === id);
    if (found) { setRecord(found); setDraftRecord(found); setEditing(false); }
  };

  const reconcile = async (updated: ReportRecord) => {
    setReports(previous => previous.map(item => item.id === updated.id ? updated : item));
    if (recordRef.current.id === updated.id) { setRecord(updated); setDraftRecord(updated); }
    await reloadReports(true);
  };

  const submitReport = async (submission: Omit<SafemapSubmission, 'image'>, photoDataUrl?: string) => {
    if (role !== 'student' && role !== 'resident') throw new Error('Choose a reporting entry option before submitting.');
    await submitReportToServer(submission, photoDataUrl);
    void reloadReports(true);
  };
  const moderateReport = async (id: string, decision: 'approved' | 'denied', reason = '', comment = '') => {
    if (role !== 'analyst') throw new Error('Analyst access is required to review reports.');
    await reconcile(await changeReport(id, { moderationStatus: decision, analystComment: comment, ...(reason ? { moderationReason: reason } : {}) }));
  };
  const correctPendingReport = async (id: string, changes: Pick<ReportRecord, 'description' | 'priorityStatus'>) => {
    if (role !== 'analyst') throw new Error('Analyst access is required to correct reports.');
    await reconcile(await changeReport(id, changes));
  };
  const removeReport = async (id: string) => {
    if (role !== 'analyst') throw new Error('Analyst access is required to remove reports.');
    await reconcile(await changeReport(id, { resolved: true, resolutionNote: 'Archived from the heat map by an analyst.' }));
  };
  const resolveReport = async (id: string, note = '') => {
    if (role !== 'analyst') throw new Error('Analyst access is required to resolve reports.');
    await reconcile(await changeReport(id, { resolved: true, resolutionNote: note }));
  };

  const login = async (payload: { role: UserRole; email?: string; password?: string }) => {
    const session = await createSafemapSession(payload);
    applyRole(session.role);
  };
  const loginStudent = async (email: string, password: string) => {
    try { await login({ role: 'student', email, password }); return true; }
    catch (error) { if (error && typeof error === 'object' && 'status' in error && error.status === 401) return false; throw error; }
  };
  const loginAnalyst = async (email: string, password: string) => {
    try { await login({ role: 'analyst', email, password }); return true; }
    catch (error) { if (error && typeof error === 'object' && 'status' in error && error.status === 401) return false; throw error; }
  };
  const enterAs = async (entry: 'resident' | 'viewer') => { await login({ role: entry }); };
  const logout = async () => {
    await deleteSafemapSession();
    applyRole(null);
  };
  const notify = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 4000);
  };
  return <AppContext.Provider value={{
    role, sessionReady, loginStudent, loginAnalyst, enterAs, logout, record, setRecord, draftRecord, setDraftRecord,
    editing, setEditing, reports, selectRecord, submitReport, moderateReport, correctPendingReport, removeReport, resolveReport,
    storageState, storageError, reloadReports, toastMessage, notify,
  }}>{children}</AppContext.Provider>;
}
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
