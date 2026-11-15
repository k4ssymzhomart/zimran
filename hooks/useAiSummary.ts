'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { readSummary, requestSummary, saveSummary } from '@/client/aiSummary';
import { CHILDREN } from '@/components/child';
import { useProfile } from '@/hooks/useProfile';
import { keepRewrites, summaryInput, type AiSummary, type Rewrite } from '@/lib/ai/summary';
import { FEATURES } from '@/lib/features';
import type { SavedSession } from '@/lib/types';

/** idle: nothing asked yet or done; consent: the sheet is open; loading: the model is writing; error: it could not. */
export type AiSummaryPhase = 'idle' | 'consent' | 'loading' | 'error';

/**
 * The optional AI summary of one session, wired: the parent's consent (asked once, kept in the profile), the
 * request, the cache on this device, and the rewrites the rules let through. Off unless FEATURES.aiSummary.
 */
export function useAiSummary(session: SavedSession) {
  const { profile, update } = useProfile();
  const [written, setWritten] = useState<AiSummary | null>(null);
  const [phase, setPhase] = useState<AiSummaryPhase>('idle');
  const [error, setError] = useState<string | null>(null);

  const input = useMemo(() => summaryInput(session, CHILDREN[session.partner ?? 'mia'].name), [session]);
  const available = FEATURES.aiSummary && input !== null;

  // A summary written before is read once this session is shown; storage exists only in the browser.
  useEffect(() => {
    if (!available) return;
    const id = setTimeout(() => setWritten(readSummary(session.id)), 0);
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

  /** The parent asked for a summary: the first time, the sheet says what is sent; after that it is written at once. */
  const ask = useCallback(() => {
    if (profile.aiSummary) void write();
    else setPhase('consent');
  }, [profile.aiSummary, write]);

  const accept = useCallback(() => {
    update({ aiSummary: true });
    void write();
  }, [update, write]);

  const decline = useCallback(() => setPhase('idle'), []);

  const rewrites: Rewrite[] = useMemo(() => (written ? keepRewrites(written.rewrites, session) : []), [written, session]);
  const rewriteFor = useCallback((text: string) => rewrites.find((r) => r.original === text)?.rewrite ?? null, [rewrites]);

  return { available, summary: written?.summary ?? null, rewriteFor, phase, error, ask, accept, decline };
}
