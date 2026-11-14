'use client';

import { useEffect } from 'react';

/** The parts of the Screen Wake Lock API this hook uses. */
interface Sentinel {
  release(): Promise<void>;
}
interface WakeLockLike {
  request(type: 'screen'): Promise<Sentinel>;
}

/**
 * Keeps the screen on while `active` is true. Live play runs with the phone lying on the table,
 * and a locked screen stops the browser's speech recognition.
 * Where the browser has no Wake Lock API, or refuses the request (battery saver), nothing happens:
 * the session still works for as long as the screen stays on by itself.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const wakeLock = (navigator as unknown as { wakeLock?: WakeLockLike }).wakeLock;
    if (!wakeLock) return;
    let sentinel: Sentinel | null = null;
    let stopped = false;
    const release = (s: Sentinel | null) => {
      s?.release().catch(() => {
        /* already released by the browser */
      });
    };

    const request = () => {
      if (document.visibilityState !== 'visible') return;
      wakeLock
        .request('screen')
        .then((s) => {
          if (stopped) {
            release(s);
            return;
          }
          release(sentinel);
          sentinel = s;
        })
        .catch(() => {
          /* refused: the session goes on without it */
        });
    };

    // The browser drops the lock whenever the page is hidden, so it is asked for again on return.
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', request);
      release(sentinel);
    };
  }, [active]);
}
