'use client';

import { useEffect, useRef } from 'react';
import { SplitRoundStage } from '@/components/first/round/SplitRoundStage';
import { useRound } from '@/hooks/useRound';
import { noopRecorder } from './noopRecorder';
import type { RoundStageProps } from './types';
import { useRoundRecorder } from './useRoundRecorder';

/**
 * One round from its first second to the hand-over, behind the frozen props in ./types.ts.
 * It owns the engine (useRound) and the recorder. The screen it renders only shows the engine's state and
 * forwards the parent's moves, so the visuals can be replaced without touching anything here.
 *
 * Mounting it starts the round, and `onDone` is called once when the round is over. The props describe that
 * one round and are read when it starts: for another round, mount it again (a new `key`).
 */
export function RoundRunner({ mode, sceneId, partner, durationSec, seed = 1, title = '', guess = null, recorder = noopRecorder, onDone }: RoundStageProps) {
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

  // The round screen of the Split design, the same one the first visit plays. White from the first frame:
  // the engine starts one frame after the screen mounts, and the stage comes with it.
  return (
    <div className="split-root">
      {round.state.phase !== 'idle' && <SplitRoundStage round={round} partner={partner} title={title} live={live} guess={guess} />}
    </div>
  );
}
