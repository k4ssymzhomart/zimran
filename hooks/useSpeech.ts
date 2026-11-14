'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { acceptTranscript, initialSpeech, shouldStart, speechReducer, type Heard, type SpokenLine } from '@/lib/speech/speech';

/** The parts of the browser's SpeechRecognition this hook uses (TypeScript ships no types for it). */
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Pause before restarting after the browser ends recognition, so a failing service is not hammered. */
const RESTART_MS = 300;

/**
 * Voice input for a round. The browser turns speech into text; every finished sentence goes to
 * `onSentence`, which is the same `say` the typed input uses. All decisions are in lib/speech/speech.ts.
 * No audio is recorded or stored by this app.
 */
export function useSpeech(onSentence: (text: string) => void) {
  const [state, dispatch] = useReducer(speechReducer, undefined, initialSpeech);
  const recognition = useRef<RecognitionLike | null>(null);
  const running = useRef(false);
  const lastHeard = useRef<Heard | null>(null);
  const spoken = useRef<SpokenLine | null>(null);
  const onSentenceRef = useRef(onSentence);

  useEffect(() => {
    onSentenceRef.current = onSentence;
  }, [onSentence]);

  // Support is only known in the browser.
  useEffect(() => {
    if (!recognitionCtor()) dispatch({ type: 'support', supported: false });
    return () => {
      recognition.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const ensure = useCallback((): RecognitionLike | null => {
    if (recognition.current) return recognition.current;
    const Ctor = recognitionCtor();
    if (!Ctor) return null;
    const r = new Ctor();
    r.lang = 'en-US';
    // Chrome on Android repeats the earlier words in every result when recognition is continuous.
    // There it listens for one sentence at a time, and the restart below keeps it going.
    const android = /Android/i.test(navigator.userAgent);
    r.continuous = !android;
    r.interimResults = !android;
    r.onstart = () => dispatch({ type: 'started' });
    r.onend = () => {
      running.current = false;
      dispatch({ type: 'ended' });
    };
    r.onerror = (e) => dispatch({ type: 'error', code: e.error });
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (!result.isFinal) {
          interim += transcript;
          continue;
        }
        const now = performance.now();
        const text = acceptTranscript(transcript, now, lastHeard.current, spoken.current);
        if (text) {
          lastHeard.current = { text, atMs: now };
          dispatch({ type: 'accepted' });
          onSentenceRef.current(text);
        }
      }
      dispatch({ type: 'interim', text: interim.trim() });
    };
    recognition.current = r;
    return r;
  }, []);

  // Start, and start again after the browser's own pauses, for as long as the parent wants voice on.
  useEffect(() => {
    if (!shouldStart(state) || running.current) return;
    const id = setTimeout(() => {
      const r = ensure();
      if (!r || running.current) return;
      try {
        r.start();
        running.current = true;
      } catch {
        // start() throws if recognition is already running; the next 'ended' event retries.
      }
    }, RESTART_MS);
    return () => clearTimeout(id);
  }, [state, ensure]);

  const start = useCallback(() => {
    dispatch({ type: 'want', on: true });
    // Called from a click, so the browser may show its permission prompt right away.
    const r = ensure();
    if (!r || running.current) return;
    try {
      r.start();
      running.current = true;
    } catch {
      /* the effect above retries */
    }
  }, [ensure]);

  const stop = useCallback(() => {
    dispatch({ type: 'want', on: false });
    recognition.current?.stop();
  }, []);

  /** Speak a coach line aloud (for an earbud). The line is remembered so its echo is not coded as the parent. */
  const sayAloud = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.05;
    const line: SpokenLine = { text, endedAtMs: null };
    const done = () => {
      // cancel() below ends the previous line a moment later; only the line still being spoken is closed,
      // so an old line cannot overwrite the new one.
      if (spoken.current === line) spoken.current = { text, endedAtMs: performance.now() };
    };
    utterance.onend = done;
    utterance.onerror = done;
    spoken.current = line;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  return { state, start, stop, sayAloud };
}
