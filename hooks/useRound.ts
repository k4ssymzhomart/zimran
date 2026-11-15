'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';
// Relative, not '@/': vitest runs the pure helpers in this file without the Next path alias.
import type { RoundDone } from '../components/round/types';
import { view } from '../lib/child/model';
import { initialRound, ringProgress, roundReducer, type RoundEvent, type RoundState, type TimedSentence } from '../lib/round/session';
import type { InputMode, SavedSentence, SessionDraft } from '../lib/types';

const TICK_MS = 250;

// ---------- what the device adds to the engine's round ----------

/** How one sentence reached the engine. */
export type Via = 'typed' | 'spoken';

/** The engine's round, with the two things only the device knows: when it started and how each sentence arrived. */
export interface TrackedRound {
  round: RoundState;
  /** ISO date-time of the start; null before the first round. */
  startedAt: string | null;
  /** via[i] is how round.sentences[i] arrived. */
  via: Via[];
}

export type TrackedEvent = RoundEvent & { at?: string; via?: Via };

export function initialTracked(): TrackedRound {
  return { round: initialRound(), startedAt: null, via: [] };
}

/** The engine's reducer, untouched, with the start time and the path of each new sentence noted beside it. */
export function trackedReducer(tracked: TrackedRound, event: TrackedEvent): TrackedRound {
  const round = roundReducer(tracked.round, event);
  if (round === tracked.round) return tracked;
  if (event.type === 'start') return { round, startedAt: event.at ?? null, via: [] };
  // One turn can add several sentences; all of them came the same way.
  const added = round.sentences.length - tracked.via.length;
  const via = added > 0 ? [...tracked.via, ...Array<Via>(added).fill(event.via ?? 'typed')] : tracked.via;
  return { ...tracked, round, via };
}

/** Typed, spoken, or mixed when the round has both. A round with no sentences is typed: nothing was heard. */
export function inputMode(via: readonly Via[]): InputMode {
  const spoken = via.filter((v) => v === 'spoken').length;
  if (spoken === 0) return 'typed';
  return spoken === via.length ? 'spoken' : 'mixed';
}

/** About 150 words a minute, the pace of talk during play. */
const SEC_PER_WORD = 0.4;
const tenths = (sec: number) => Math.round(sec * 10) / 10;
const wordCount = (text: string) => text.trim().split(/\s+/).length;

/**
 * The engine's sentences as they are saved. The engine stamps a sentence when it arrives (atSec); when the parent
 * began it is not measured yet, so startSec is worked back from the number of words and never reaches into the
 * turn before. A recording is played from startSec: a little early is the safe side.
 */
export function savedSentences(sentences: readonly TimedSentence[]): SavedSentence[] {
  let floor = 0; // when the turn before this one arrived
  return sentences.map((s, i) => {
    const prev = sentences[i - 1];
    if (prev && prev.atSec !== s.atSec) floor = prev.atSec;
    // Sentences of one turn share a time stamp: the words still to come push this start further back.
    let words = 0;
    for (let j = i; j < sentences.length && sentences[j].atSec === s.atSec; j++) words += wordCount(sentences[j].text);
    const startSec = Math.max(floor, s.atSec - words * SEC_PER_WORD);
    return {
      text: s.text,
      code: s.code,
      startSec: tenths(startSec),
      atSec: tenths(s.atSec),
      rule: s.rule,
      ...(s.disputed ? { disputed: true } : {}),
    };
  });
}

/** A finished round as the round screen hands it over, or null while there is none. A recorder adds `audioId`. */
export function roundDone({ round, startedAt, via }: TrackedRound): RoundDone | null {
  if (round.phase !== 'ended' || !round.result || !startedAt) return null;
  return {
    result: round.result,
    sentences: savedSentences(round.sentences),
    input: inputMode(via),
    startedAt,
    // The engine's measured time: the full length, or the time played when the parent ended early.
    durationSec: round.result.seconds,
    farewell: round.farewell,
  };
}

/** What the session store keeps of a finished round. The caller adds what the round itself does not know. */
export function sessionDraft(done: RoundDone, about: Pick<SessionDraft, 'kind' | 'date' | 'sceneId' | 'partner'>): SessionDraft {
  const { result, audioId } = done;
  return {
    kind: about.kind,
    startedAt: done.startedAt,
    date: about.date,
    durationSec: done.durationSec,
    sceneId: about.sceneId,
    partner: about.partner,
    counts: result.counts,
    targets: result.targets,
    met: result.met,
    input: done.input,
    sentences: done.sentences,
    ...(audioId ? { audioId } : {}),
  };
}

// ---------- the hook ----------

/**
 * Thin wrapper around the pure round reducer. Two things are added here: the clock (while a round is running,
 * real elapsed time is fed in as 'tick' events) and the notes above, which become `done` when the round ends.
 */
export function useRound() {
  const [tracked, dispatch] = useReducer(trackedReducer, undefined, initialTracked);
  const state = tracked.round;
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
      // Called from a tap or an effect, never while rendering, so the clock can be read here.
      dispatch({ type: 'start', sceneId, seconds, seed, beatEverySec, live, at: new Date().toISOString() }),
    [],
  );
  const say = useCallback((text: string) => dispatch({ type: 'say', text, via: 'typed' }), []);
  /** The same `say`, for a sentence that came through the microphone. */
  const saySpoken = useCallback((text: string) => dispatch({ type: 'say', text, via: 'spoken' }), []);
  const copy = useCallback(() => dispatch({ type: 'copy' }), []);
  const wait = useCallback(() => dispatch({ type: 'wait' }), []);
  const dispute = useCallback((index: number) => dispatch({ type: 'dispute', index }), []);
  const end = useCallback(() => dispatch({ type: 'end' }), []);

  /** The finished round, or null. A dispute after the round gives a new one with the corrected result. */
  const done = useMemo(() => roundDone(tracked), [tracked]);

  return { state, view: view(state.child), rings: ringProgress(state), start, say, saySpoken, copy, wait, dispute, end, done };
}
