'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { RecorderPort } from './types';

/**
 * Runs a recorder for exactly one round: on when the round starts, off when it ends or the screen goes away.
 * A recorder that fails never costs the parent the round; the round is handed over without audio.
 */
export function useRoundRecorder(recorder: RecorderPort) {
  const on = useRef(false);
  const mounted = useRef(false);

  const begin = useCallback(() => {
    if (on.current) return;
    on.current = true;
    recorder.start().catch(() => {});
  }, [recorder]);

  /** Stops the recording. Resolves to the key of the saved audio, or null when nothing was kept. */
  const finish = useCallback(async (): Promise<string | null> => {
    if (!on.current) return null;
    on.current = false;
    return recorder.stop().catch(() => null);
  }, [recorder]);

  // Leaving in the middle of a round (Back, a link) must not leave the microphone recording.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // In development React unmounts and remounts a new screen at once; only a real unmount is still gone a moment later.
      queueMicrotask(() => {
        if (!mounted.current) void finish();
      });
    };
  }, [finish]);

  return { begin, finish };
}
