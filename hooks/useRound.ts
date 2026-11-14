'use client';

import { useCallback, useEffect, useReducer } from 'react';
import { view } from '@/lib/child/model';
import { initialRound, ringProgress, roundReducer } from '@/lib/round/session';

const TICK_MS = 250;

/**
 * Thin wrapper around the pure round reducer. The only thing added here is the clock:
 * while a round is running, real elapsed time is fed in as 'tick' events.
 */
export function useRound() {
  const [state, dispatch] = useReducer(roundReducer, undefined, initialRound);
  const running = state.phase === 'running';

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      // Measured, not assumed: a throttled background tab still ends the round on time.
      dispatch({ type: 'tick', dtSec: (now - last) / 1000 });
      last = now;
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(
    (sceneId: string, seconds: number, seed: number, beatEverySec?: number, live = false) =>
      dispatch({ type: 'start', sceneId, seconds, seed, beatEverySec, live }),
    [],
  );
  const say = useCallback((text: string) => dispatch({ type: 'say', text }), []);
  const copy = useCallback(() => dispatch({ type: 'copy' }), []);
  const wait = useCallback(() => dispatch({ type: 'wait' }), []);
  const dispute = useCallback((index: number) => dispatch({ type: 'dispute', index }), []);
  const end = useCallback(() => dispatch({ type: 'end' }), []);

  return { state, view: view(state.child), rings: ringProgress(state), start, say, copy, wait, dispute, end };
}
