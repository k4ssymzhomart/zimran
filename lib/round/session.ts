/**
 * One practice round as a pure reducer: (state, event) -> state.
 * Time comes in through 'tick' events and the seed through 'start', so the same events
 * always give the same round. The reducer never mutates its input.
 */
import type { Beat, ChildState, CoachPrompt, CodedSentence, RoundResult, Scene } from '../types';
import { codeSentence, codeTurn, normalize } from '../coding/classify';
import { SAFETY_NOTE } from '../coding/safety';
import { applyMove, farewell, initialChild, MICRO_REACTION, tick } from '../child/model';
import { BLOCKS, SCENES } from '../child/scenes';
import { coachPrompt, REACT_GAP } from '../coach/policy';
import { countCodes, paceTargets, summarizeRound } from '../progress/targets';

export interface TimedSentence extends CodedSentence {
  atSec: number;
  /** The parent disagreed with this code; it is left out of the rings and the result. */
  disputed: boolean;
  /**
   * Said again inside the repeat window, or a second saying-back of a line of hers that was already
   * reflected. It is kept in the list as neutral talk (rule 'repeat') and fills no ring.
   */
  repeat?: boolean;
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
  /**
   * The line she said before her current one. Saying it back still counts as a reflection until
   * `prevSaidUntilSec`: a parent who started typing before she moved on is not short-changed.
   */
  prevSaid: string | null;
  prevSaidUntilSec: number | null;
  /** Whether `prevSaid` has been reflected already. One line of hers is reflected once. */
  prevReflected: boolean;
  /** A sentence in this round matched isSafetyConcern. It was not coded; the screen shows the support card. */
  safety: boolean;
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
/** The same target sentence said again within this many seconds fills no ring. */
export const REPEAT_WINDOW_SEC = 20;
/** Label for a sentence marked `repeat`, for the chip in the list. */
export const REPEAT_NOTE = 'Already said. Say something new.';
const REPEAT_COACH = 'That one is already counted. Say something new you see.';
const ENGLISH_ONLY = 'This practice reads English sentences. Try a short one.';

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
    prevSaid: null,
    prevSaidUntilSec: null,
    prevReflected: false,
    safety: false,
    combo: 0,
    live: false,
    result: null,
    farewell: null,
  };
}

const sceneOf = (id: string): Scene => SCENES.find((s) => s.id === id) ?? BLOCKS;

const counted = (state: RoundState): TimedSentence[] => state.sentences.filter((s) => !s.disputed);

/**
 * Ask the coach. A new line replaces the old one. With nothing new to say, the old line is taken down
 * once it no longer fits: the parent has said something since, or it asked to say her words back and
 * that is done or her line has gone.
 */
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
  if (prompt) return { ...state, coach: prompt, lastPromptSec: state.elapsedSec };
  const stale =
    justCoded !== null ||
    (state.coach?.kind === 'reflect_now' && (state.child.lastSaid === null || state.reflectedSinceChildSpoke));
  return stale && state.coach ? { ...state, coach: null } : state;
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
  const child = initialChild(e.seed);
  if (e.live) {
    return { ...initialRound(), phase: 'running', sceneId: scene.id, seconds, seed: e.seed, beatEverySec, nextBeatAtSec: beatEverySec, child, live: true };
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
    // A harder scene starts with her already a little wound up.
    child: { ...child, tension: scene.startTension ?? child.tension, lastSaid: says },
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
    const before = next.child.lastSaid;
    const { state: child, beat } = tick(next.child, scene);
    next.child = child;
    next.beats.push({ ...beat, atSec: next.nextBeatAtSec });
    if (beat.says !== null) {
      if (before !== null && before !== beat.says) {
        // She moved on. Her previous line stays reflectable for one more beat interval from now.
        next.prevSaid = before;
        next.prevSaidUntilSec = next.nextBeatAtSec + next.beatEverySec;
        next.prevReflected = next.reflectedSinceChildSpoke;
      }
      next.childSpokeSec = next.nextBeatAtSec;
      next.reflectedSinceChildSpoke = false;
    }
    next.nextBeatAtSec += next.beatEverySec;
  }

  return next.elapsedSec >= next.seconds ? finish(next) : withCoach(next, null);
}

/** Case and punctuation do not make a sentence new. */
const repeatKey = (text: string): string =>
  normalize(text)
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const asRepeat = (s: CodedSentence): CodedSentence => ({ text: s.text, code: 'neutral', bucket: 'neutral', confidence: s.confidence, rule: 'repeat' });

function say(state: RoundState, text: string): RoundState {
  if (!text.trim()) return state;
  const coded = codeTurn(text, { childLastSaid: state.child.lastSaid });
  if (coded.length === 0) return state;

  const next: RoundState = { ...state, sentences: [...state.sentences] };
  let lastCoded: CodedSentence | null = null;
  let safety = false;
  for (const raw of coded) {
    let s = raw;
    let reflectsPrev = false;

    // Typing grace: her previous line said back just after she moved on is still a reflection.
    const graceOpen = next.prevSaid !== null && !next.prevReflected && next.prevSaidUntilSec !== null && next.elapsedSec < next.prevSaidUntilSec;
    if (graceOpen && s.code !== 'reflection' && s.code !== 'unknown') {
      const late = codeSentence(s.text, { childLastSaid: next.prevSaid });
      if (late.code === 'reflection') {
        s = late;
        reflectsPrev = true;
      }
    }

    // One line of hers is reflected once. A second saying-back is read without her line:
    // a real description or praise still counts as that, anything else is a repeat.
    if (s.code === 'reflection' && !reflectsPrev && next.reflectedSinceChildSpoke) {
      const plain = codeSentence(s.text);
      s = plain.bucket === 'target' ? plain : asRepeat(s);
    }

    // The same target sentence said again within the window fills no ring, in one paste or over several turns.
    // A reflection has already passed "one line of hers, one reflection" above: when she says the same
    // line again, saying it back again is a new reflection, whatever was typed a few seconds ago.
    if (s.bucket === 'target' && s.code !== 'reflection') {
      const key = repeatKey(s.text);
      const saidAlready = next.sentences.some(
        (p) => (p.bucket === 'target' || p.repeat) && next.elapsedSec - p.atSec <= REPEAT_WINDOW_SEC && repeatKey(p.text) === key,
      );
      if (saidAlready) s = asRepeat(s);
    }

    const repeat = s.rule === 'repeat';
    // Filler said again ("ok", "Good job!") keeps its code, but she has just heard it: it does not warm her twice.
    const again =
      !repeat &&
      (s.code === 'neutral' || s.code === 'general_praise') &&
      next.sentences.some((p) => next.elapsedSec - p.atSec <= REPEAT_WINDOW_SEC && repeatKey(p.text) === repeatKey(s.text));
    next.sentences.push({ ...s, atSec: next.elapsedSec, disputed: false, repeat });
    if (s.rule === 'safety') safety = true;
    if (s.code !== 'unknown') lastCoded = s;
    // A repeat is words she has just heard: it moves neither her nor the combo.
    if (repeat || again) continue;

    next.child = applyMove(next.child, s.code, s.namedBehavior);
    if (s.code === 'specific_praise') next.lastSpecificPraiseSec = next.elapsedSec;
    if (s.code === 'reflection') {
      if (reflectsPrev) next.prevReflected = true;
      else next.reflectedSinceChildSpoke = true;
    }
    if (s.bucket === 'target') next.combo += 1;
    else if (s.bucket === 'avoid') next.combo = 0;
  }

  if (safety) {
    next.safety = true;
    // Live play may read the coach aloud next to the child; there the screen's card carries the support lines.
    next.coach = next.live ? null : { kind: 'swap', text: SAFETY_NOTE.body };
    next.lastPromptSec = next.elapsedSec;
    if (lastCoded) next.microReaction = MICRO_REACTION[lastCoded.code];
    return next;
  }
  // Digits and emoji alone ("1, 2, 3!") are not another language: they get no line about English.
  if (!lastCoded) return /\p{L}/u.test(text) ? { ...next, coach: { kind: 'swap', text: ENGLISH_ONLY }, lastPromptSec: next.elapsedSec } : next;
  next.microReaction = MICRO_REACTION[lastCoded.code];
  if (lastCoded.rule === 'repeat') {
    const since = next.lastPromptSec === null ? Infinity : next.elapsedSec - next.lastPromptSec;
    return since >= REACT_GAP ? { ...next, coach: { kind: 'swap', text: REPEAT_COACH }, lastPromptSec: next.elapsedSec } : { ...next, coach: null };
  }
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
