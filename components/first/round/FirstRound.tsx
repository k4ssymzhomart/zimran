'use client';

import { useEffect, useRef } from 'react';
import { noopRecorder } from '@/components/round/noopRecorder';
import type { RoundStageProps } from '@/components/round/types';
import { useRoundRecorder } from '@/components/round/useRoundRecorder';
import { useRound } from '@/hooks/useRound';
import { SplitRoundStage } from './SplitRoundStage';

/**
 * One round of the first visit in the Split design, behind the same frozen props as
 * components/round/RoundRunner.tsx and with the same logic: it owns the engine (useRound) and the recorder,
 * starts the round as it mounts and calls `onDone` once when the round is over. Only the screen differs.
 * A fallback: when the round screen of components/round is rebuilt, the first visit goes back to RoundRunner.
 *
 * The props describe one round and are read when it starts: for another round, mount it again (a new `key`).
 */
export function FirstRound({ mode, sceneId, partner, durationSec, seed = 1, title = '', guess = null, recorder = noopRecorder, onDone }: RoundStageProps) {
  const round = useRound();
  const { start, done } = round;
  const { begin, finish } = useRoundRecorder(recorder);
  const live = mode === 'live';
  const began = useRef(false);
  const handed = useRef(false);

  // The engine with its clock, and the recording when the parent opted in. Once per mount.
  useEffect(() => {
    if (began.current) return;
    began.current = true;
    start(sceneId, durationSec, seed, undefined, live);
    begin();
  }, [start, begin, sceneId, durationSec, seed, live]);

  // The finished round is handed over once, with the key of its audio when some was kept.
  useEffect(() => {
    if (!done || handed.current) return;
    handed.current = true;
    void finish().then((audioId) => onDone(audioId ? { ...done, audioId } : done));
  }, [done, finish, onDone]);

  return (
    // White from the first frame: the engine starts one frame after the screen mounts, and the stage comes with it.
    <div className="split-root">
      {round.state.phase !== 'idle' && <SplitRoundStage round={round} partner={partner} title={title} live={live} guess={guess} />}
    </div>
  );
}
