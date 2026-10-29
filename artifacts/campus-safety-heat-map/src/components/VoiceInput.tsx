import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

type Rec = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
const getCtor = (): (new () => Rec) | undefined => {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export function VoiceInput({ value, onChange, testId = 'button-voice-input' }: { value: string; onChange: (next: string) => void; testId?: string }) {
  const Ctor = getCtor();
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const recRef = useRef<Rec | null>(null);
  const baseRef = useRef('');
  const changeRef = useRef(onChange); changeRef.current = onChange;
  useEffect(() => () => {
    const rec = recRef.current;
    recRef.current = null;
    if (rec) { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.abort(); }
  }, []);
  if (!Ctor) return null;
  const stop = () => recRef.current?.stop();
  const start = () => {
    setMessage('');
    recRef.current?.abort();
    const rec = new Ctor();
    rec.lang = navigator.language || 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = value.trim() ? value.replace(/\s+$/, '') + ' ' : '';
    rec.onresult = e => {
      if (recRef.current !== rec) return;
      const parts: string[] = [];
      for (let i = 0; i < e.results.length; i++) parts.push(e.results[i][0].transcript.trim());
      changeRef.current(baseRef.current + parts.filter(Boolean).join(' '));
    };
    rec.onerror = e => {
      if (recRef.current !== rec) return;
      setMessage(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Microphone permission was declined. Allow it in your browser, or type instead.'
        : e.error === 'no-speech' ? 'No speech heard. Try again.' : e.error === 'aborted' ? '' : 'Voice input stopped because of an error. You can type instead.');
      setListening(false);
    };
    rec.onend = () => { if (recRef.current === rec) { setListening(false); recRef.current = null; } };
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { recRef.current = null; setListening(false); setMessage('Voice input could not start. You can type instead.'); }
  };
  return (
    <div className="voice-input">
      <button type="button" className={`voice-button ${listening ? 'is-listening' : ''}`} onClick={listening ? stop : start} aria-pressed={listening} data-testid={testId}>
        {listening ? <Square size={14} aria-hidden="true" /> : <Mic size={14} aria-hidden="true" />} {listening ? 'Stop listening' : 'Speak your description'}
      </button>
      <span role="status" className="voice-status">{listening ? 'Listening…' : message}</span>
    </div>
  );
}
