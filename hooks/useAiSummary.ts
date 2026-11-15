'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readExplanations, readSummary, requestExplanation, requestSummary, saveExplanation, saveSummary } from '@/client/aiSummary';
import { CHILDREN } from '@/components/child';
import { useProfile } from '@/hooks/useProfile';
import { explainInput, keepExplanation, type Explanation } from '@/lib/ai/explain';
import { keepRewrites, summaryInput, type AiSummary, type Rewrite } from '@/lib/ai/summary';
import { FEATURES } from '@/lib/features';
import type { SavedSentence, SavedSession } from '@/lib/types';

/** idle: nothing asked yet or done; consent: the sheet is open; loading: the model is writing; error: it could not. */
export type AiSummaryPhase = 'idle' | 'consent' | 'loading' | 'error';

/** What the consent sheet was opened for: the summary, or "Why?" next to one sentence. */
export type ConsentFor = 'summary' | 'why';

/** "Why?" for one sentence: being written, written, or a calm message. */
export type WhyState = { status: 'loading' } | ({ status: 'done' } & Explanation) | { status: 'error'; message: string };

/** A sentence's key within its session, stable across reloads. */
export const sentenceKey = (s: SavedSentence): string => `${s.startSec}:${s.text}`;

/**
 * The optional AI summary of one session, wired: the parent's consent (asked once, kept in the profile), the
 * request, the cache on this device, and the rewrites the rules let through. Off unless FEATURES.aiSummary.
 */
export function useAiSummary(session: SavedSession) {
  const { profile, update } = useProfile();
  const [written, setWritten] = useState<AiSummary | null>(null);
  const [phase, setPhase] = useState<AiSummaryPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [consentFor, setConsentFor] = useState<ConsentFor>('summary');
  const [why, setWhy] = useState<Record<string, WhyState>>({});
  /** What to run once the parent agrees in the sheet. */
  const pending = useRef<(() => void) | null>(null);

  const input = useMemo(() => summaryInput(session, CHILDREN[session.partner ?? 'mia'].name), [session]);
  const available = FEATURES.aiSummary && input !== null;

  // A summary written before is read once this session is shown; storage exists only in the browser.
  useEffect(() => {
    if (!available) return;
    const id = setTimeout(() => {
      setWritten(readSummary(session.id));
      const saved = readExplanations(session.id);
      setWhy(Object.fromEntries(Object.entries(saved).map(([key, value]) => [key, { status: 'done' as const, ...value }])));
    }, 0);
    return () => clearTimeout(id);
  }, [available, session.id]);

  const write = useCallback(async () => {
    if (!input) return;
    setPhase('loading');
    setError(null);
    const answer = await requestSummary(input);
    if ('error' in answer) {
      setError(answer.error);
      setPhase('error');
      return;
    }
    saveSummary(session.id, answer);
    setWritten(answer);
    setPhase('idle');
  }, [input, session.id]);

  /** The first time AI is used on this device, the sheet says what is sent; after that it runs at once. */
  const withConsent = useCallback(
    (kind: ConsentFor, run: () => void) => {
      if (profile.aiSummary) {
        run();
        return;
      }
      pending.current = run;
      setConsentFor(kind);
      setPhase('consent');
    },
    [profile.aiSummary],
  );

  const ask = useCallback(() => withConsent('summary', () => void write()), [withConsent, write]);

  /** "Why?" next to one sentence: what made it that code, and something to say instead that the rules accept. */
  const askWhy = useCallback(
    (sentence: SavedSentence) => {
      const input = explainInput(sentence);
      if (!input) return;
      const key = sentenceKey(sentence);
      withConsent('why', () => {
        setWhy((all) => ({ ...all, [key]: { status: 'loading' } }));
        void requestExplanation(input).then((answer) => {
          if ('error' in answer) {
            setWhy((all) => ({ ...all, [key]: { status: 'error', message: answer.error } }));
            return;
          }
          const kept = keepExplanation(answer, sentence);
          saveExplanation(session.id, key, kept);
          setWhy((all) => ({ ...all, [key]: { status: 'done', ...kept } }));
        });
      });
    },
    [withConsent, session.id],
  );

  const accept = useCallback(() => {
    update({ aiSummary: true });
    setPhase('idle');
    const run = pending.current;
    pending.current = null;
    run?.();
  }, [update]);

  const decline = useCallback(() => {
    pending.current = null;
    setPhase('idle');
  }, []);

  const rewrites: Rewrite[] = useMemo(() => (written ? keepRewrites(written.rewrites, session) : []), [written, session]);
  const rewriteFor = useCallback((text: string) => rewrites.find((r) => r.original === text)?.rewrite ?? null, [rewrites]);

  const whyFor = useCallback((sentence: SavedSentence): WhyState | null => why[sentenceKey(sentence)] ?? null, [why]);

  return { available, summary: written?.summary ?? null, rewriteFor, phase, error, ask, accept, decline, consentFor, askWhy, whyFor };
}
