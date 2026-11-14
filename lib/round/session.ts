/**
 * One practice round as a pure reducer: (state, event) -> state.
 * Time comes in through 'tick' events and the seed through 'start', so the same events
 * always give the same round. The reducer never mutates its input.
 */
import type { Beat, ChildState, CoachPrompt, CodedSentence, RoundResult, Scene } from '../types';
import { codeTurn } from '../coding/classify';
import { applyMove, farewell, initialChild, MICRO_REACTION, tick } from '../child/model';
import { BLOCKS, SCENES } from '../child/scenes';
import { coachPrompt } from '../coach/policy';
import { countCodes, paceTargets, summarizeRound } from '../progress/targets';

export interface TimedSentence extends CodedSentence {
  atSec: number;
  /** The parent disagreed with this code; it is left out of the rings and the result. */
  disputed: boolean;
}

export interface TimedBeat extends Beat {
  atSec: number;
}

export interface RoundState {
  phase: 'idle' | 'running' | 'ended';
  sceneId: string;
  seconds: number;
  seed: number;
  elapsedSec: number;
  beatEverySec: number;
  nextBeatAtSec: number;
  child: ChildState;
  beats: TimedBeat[];
  sentences: TimedSentence[];
  /** Latest one-line reaction to the parent's move. */
  microReaction: string;
  coach: CoachPrompt | null;
  lastPromptSec: number | null;
  lastSpecificPraiseSec: number | null;
  childSpokeSec: number | null;
  reflectedSinceChildSpoke: boolean;
  /** Consecutive target sentences. */
  combo: number;
  /**
   * Live play with a real child: there is no simulated child and no beats, and reflections are not
   * counted because the app does not know which words were the child's.
   */
  live: boolean;
  result: RoundResult | null;
  farewell: string | null;
}

export type RoundEvent =
  | { type: 'start'; sceneId: string; seconds: number; seed: number; beatEverySec?: number; live?: boolean }
  | { type: 'tick'; dtSec: number }
  | { type: 'say'; text: string }
  | { type: 'copy' }
  | { type: 'wait' }
  | { type: 'dispute'; index: number }
  | { type: 'end' };

export interface RingProgress {
  specific_praise: { count: number; target: number };
  reflection: { count: number; target: number };
  description: { count: number; target: number };
  avoid: { count: number; max: number };
}

export const DEFAULT_BEAT_EVERY_SEC = 7;

export function initialRound(): RoundState {
  return {
    phase: 'idle',
    sceneId: BLOCKS.id,
    seconds: 0,
    seed: 1,
    elapsedSec: 0,
    beatEverySec: DEFAULT_BEAT_EVERY_SEC,
    nextBeatAtSec: DEFAULT_BEAT_EVERY_SEC,
    child: initialChild(1),
    beats: [],
    sentences: [],
    microReaction: '',
    coach: null,
    lastPromptSec: null,
    lastSpecificPraiseSec: null,
    childSpokeSec: null,
    reflectedSinceChildSpoke: false,
    combo: 0,
    live: false,
    result: null,
    farewell: null,
  };
}

const sceneOf = (id: string): Scene => SCENES.find((s) => s.id === id) ?? BLOCKS;

const counted = (state: RoundState): TimedSentence[] => state.sentences.filter((s) => !s.disputed);

/** Ask the coach and keep its line only when it has something to say. */
function withCoach(state: RoundState, justCoded: CodedSentence | null): RoundState {
  const prompt = coachPrompt({
    nowSec: state.elapsedSec,
    lastPromptSec: state.lastPromptSec,
    lastSpecificPraiseSec: state.lastSpecificPraiseSec,
    // Her line can be said back for about 14 seconds. After that a nudge to reflect would ask for the impossible.
    childSpokeSec: state.child.lastSaid === null ? null : state.childSpokeSec,
    reflectedSinceChildSpoke: state.reflectedSinceChildSpoke,
    justCoded,
  });
  return prompt ? { ...state, coach: prompt, lastPromptSec: state.elapsedSec } : state;
}

/**
 * The time a result is measured over, for per-minute rates. A round ended early is measured over the
 * time it ran, but never over less than half its planned length: two quick sentences in five seconds
 * are not a pace. A round played to the end is measured over its full length.
 */
export function measuredSeconds(state: RoundState): number {
  if (state.elapsedSec >= state.seconds) return state.seconds;
  const played = Math.round(state.elapsedSec);
  return Math.min(state.seconds, Math.max(played, Math.ceil(state.seconds / 2)));
}

/** Targets, `met` and the lever stay those of the planned length; only the time measured follows the clock. */
const summary = (state: RoundState): RoundResult => ({
  ...summarizeRound(counted(state), state.seconds, { reflections: !state.live }),
  seconds: measuredSeconds(state),
});

function finish(state: RoundState): RoundState {
  return {
    ...state,
    phase: 'ended',
    result: summary(state),
    // The goodbye belongs to the simulated child; a live session has none.
    farewell: state.live ? null : farewell(state.child, sceneOf(state.sceneId)),
  };
}

function start(e: Extract<RoundEvent, { type: 'start' }>): RoundState {
  const scene = sceneOf(e.sceneId);
  // The child speaks first, so the parent always has something to reflect or describe.
  const opening = scene.actions[0];
  const says = opening.says ?? null;
  // A beat interval that is not a positive number would never advance; use the default instead.
  const beatEverySec = e.beatEverySec !== undefined && e.beatEverySec > 0 ? e.beatEverySec : DEFAULT_BEAT_EVERY_SEC;
  const seconds = Number.isFinite(e.seconds) && e.seconds > 0 ? e.seconds : 60;
  if (e.live) {
    return { ...initialRound(), phase: 'running', sceneId: scene.id, seconds, seed: e.seed, beatEverySec, nextBeatAtSec: beatEverySec, child: initialChild(e.seed), live: true };
  }
  return {
    ...initialRound(),
    phase: 'running',
    sceneId: scene.id,
    // A length that is not a positive number would never end by the clock; fall back to one minute.
    seconds,
    seed: e.seed,
    beatEverySec,
    nextBeatAtSec: beatEverySec,
    child: { ...initialChild(e.seed), lastSaid: says },
    beats: [{ kind: 'play', does: opening.does, says, ...(opening.habit ? { habit: opening.habit } : {}), atSec: 0 }],
    childSpokeSec: says === null ? null : 0,
  };
}

function advance(state: RoundState, dtSec: number): RoundState {
  if (!(dtSec > 0)) return state;
  const scene = sceneOf(state.sceneId);
  const next: RoundState = { ...state, elapsedSec: Math.min(state.seconds, state.elapsedSec + dtSec), beats: [...state.beats] };

  // Beats are stamped with their scheduled time, so one big tick equals many small ones.
  while (!next.live && next.elapsedSec >= next.nextBeatAtSec && next.nextBeatAtSec < next.seconds) {
    const { state: child, beat } = tick(next.child, scene);
    next.child = child;
    next.beats.push({ ...beat, atSec: next.nextBeatAtSec });
    if (beat.says !== null) {
      next.childSpokeSec = next.nextBeatAtSec;
      next.reflectedSinceChildSpoke = false;
    }
    next.nextBeatAtSec += next.beatEverySec;
  }

  return next.elapsedSec >= next.seconds ? finish(next) : withCoach(next, null);
}

function say(state: RoundState, text: string): RoundState {
  if (!text.trim()) return state;
  const coded = codeTurn(text, { childLastSaid: state.child.lastSaid });
  if (coded.length === 0) return state;

  const next: RoundState = { ...state, sentences: [...state.sentences] };
  let lastCoded: CodedSentence | null = null;
  for (const s of coded) {
    next.sentences.push({ ...s, atSec: next.elapsedSec, disputed: false });
    next.child = applyMove(next.child, s.code, s.namedBehavior);
    if (s.code === 'specific_praise') next.lastSpecificPraiseSec = next.elapsedSec;
    if (s.code === 'reflection') next.reflectedSinceChildSpoke = true;
    if (s.bucket === 'target') next.combo += 1;
    else if (s.bucket === 'avoid') next.combo = 0;
    if (s.code !== 'unknown') lastCoded = s;
  }
  if (!lastCoded) return next;
  next.microReaction = MICRO_REACTION[lastCoded.code];
  return withCoach(next, lastCoded);
}

function dispute(state: RoundState, index: number): RoundState {
  if (!state.sentences[index]) return state;
  const next: RoundState = {
    ...state,
    sentences: state.sentences.map((s, i) => (i === index ? { ...s, disputed: !s.disputed } : s)),
  };
  // A dispute in the replay, after the round, also updates the final result.
  return next.phase === 'ended' ? { ...next, result: summary(next) } : next;
}

export function roundReducer(state: RoundState, event: RoundEvent): RoundState {
  if (event.type === 'start') return state.phase === 'running' ? state : start(event);
  if (event.type === 'dispute') return state.phase === 'idle' ? state : dispute(state, event.index);
  if (state.phase !== 'running') return state;

  switch (event.type) {
    case 'tick':
      return advance(state, event.dtSec);
    case 'say':
      return say(state, event.text);
    case 'copy':
    case 'wait':
      return { ...state, child: applyMove(state.child, event.type), microReaction: MICRO_REACTION[event.type] };
    case 'end':
      return finish(state);
  }
}

/** What the four rings show right now: undisputed counts against the pace for this round's length. */
export function ringProgress(state: RoundState): RingProgress {
  const counts = countCodes(counted(state));
  const targets = paceTargets(state.seconds);
  return {
    specific_praise: { count: counts.specific_praise, target: targets.specific_praise },
    reflection: { count: counts.reflection, target: state.live ? 0 : targets.reflection },
    description: { count: counts.description, target: targets.description },
    avoid: { count: counts.avoid, max: targets.maxAvoid },
  };
}
