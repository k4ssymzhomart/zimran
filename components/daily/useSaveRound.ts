'use client';

import { useCallback, useRef, useState } from 'react';
import { loadProgress, saveProgress, todayISO } from '@/client/progressStore';
import { sessionStore } from '@/client/sessionStore';
import type { RoundDone } from '@/components/round/types';
import { sessionDraft } from '@/hooks/useRound';
import { addSession } from '@/lib/progress/history';
import type { PartnerId } from '@/lib/types';

/** What a round is played with, fixed as it starts: a profile changed in another tab does not change a round under way. */
export interface Play {
  sceneId: string;
  partner: PartnerId;
  seed: number;
}

/** A finished round and the id it was saved under. */
export interface Saved {
  done: RoundDone;
  id: string;
}

/**
 * Saves a finished round exactly once, however often the round screen hands it over.
 * A daily session is also written to the old v1 progress, as the old daily session did, so the old screens agree.
 */
export function useSaveRound(kind: 'daily' | 'practice', play: Play | null) {
  const [saved, setSaved] = useState<Saved | null>(null);
  const once = useRef(false);

  const onDone = useCallback(
    (done: RoundDone) => {
      if (once.current || !play) return;
      once.current = true;
      const date = todayISO();
      // The session store goes first: on its first run it brings the old sessions over, and this one must not be among them.
      const id = sessionStore.add(sessionDraft(done, { kind, date, sceneId: play.sceneId, partner: play.partner }));
      if (kind === 'daily') saveProgress(addSession(loadProgress(), done.result, date, 'practice'));
      setSaved({ done, id });
    },
    [kind, play],
  );

  return { saved, onDone };
}
