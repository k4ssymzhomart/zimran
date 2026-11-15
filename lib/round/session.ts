/**
 * One practice round as a pure reducer: (state, event) -> state.
 * Time comes in through 'tick' events and the seed through 'start', so the same events
 * always give the same round. The reducer never mutates its input.
 */
import type { Beat, ChildState, CoachPrompt, CodedSentence, RoundResult, Scene } from '../types';
import { codeSentence, codeTurn, isReflection, normalize } from '../coding/classify';
import { SAFETY_NOTE } from '../coding/safety';
import { applyMove, farewell, initialChild, isOutburst, MICRO_REACTION, tick } from '../child/model';
import { BLOCKS, sceneById } from '../child/scenes';
import { coachPrompt, REACT_GAP } from '../coach/policy';
import { biggestLever, countCodes, LEVER_TEXT, paceTargets, summarizeRound } from '../progress/targets';

export interface TimedSentence extends CodedSentence {
  atSec: number;
  /** The parent disagreed with this code; it is left out of the rings and the result. */
  disputed: boolean;
  /**
   * Said again inside the repeat window, or a second saying-back of a line of hers that was already
   * reflected. It is kept in the list as neutral talk (rule 'repeat') and fills no ring.
   */
  repeat?: boolean;
  /**
   * A target sentence beyond the MAX_COUNTED_PER_TURN counted in one turn. It is kept in the list as
   * neutral talk (rule 'turn_cap') and fills no ring. The list shows TURN_CAP_NOTE on it.
   */
  capped?: boolean;
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
  /** How many more sentences the parent may set aside with "Disagree?" in this round. Starts at MAX_DISPUTES. */
  disputesLeft: number;
  /** An outburst has happened and no specific praise has followed her calming down yet. */
  calmPraiseDue: boolean;
  /** `atSec` of the outburst beat the wait_out line last went up for, or null. */
  waitOutBeatSec: number | null;
  /** The beat interval (elapsedSec / beatEverySec, rounded down) of the last "Copy her" that counted, or null. */
  copiedBeat: number | null;
  /** The line about English sentences has been shown in this round. It is shown once. */
  englishNoteShown: boolean;
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
/** One turn counts at most this many target sentences. A pasted paragraph is one turn of talk, not ten. */
export const MAX_COUNTED_PER_TURN = 3;
/** Label for a sentence marked `capped`, for the chip in the list. */
export const TURN_CAP_NOTE = 'One turn counts up to three sentences.';
/** "Disagree?" sets aside at most this many sentences a round, so it corrects the coding and does not replace it. */
export const MAX_DISPUTES = 3;
/** Shown with a result marked `short`. */
export const SHORT_ROUND_NOTE = 'This round ended early, so it has no pace verdict.';
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
    disputesLeft: MAX_DISPUTES,
    calmPraiseDue: false,
    waitOutBeatSec: null,
    copiedBeat: null,
    englishNoteShown: false,
    result: null,
    farewell: null,
  };
}

const sceneOf = (id: string): Scene => sceneById(id) ?? BLOCKS;

const counted = (state: RoundState): TimedSentence[] => state.sentences.filter((s) => !s.disputed);

/**
 * Whether the coach may ask to say her current line back. Not a line with no content word ("No!":
 * nothing said back could count as a reflection), and not a line from a whine or a meltdown.
 */
function canSayBack(state: RoundState): boolean {
  const line = state.child.lastSaid;
  if (line === null || !isReflection(line, line)) return false;
  for (let i = state.beats.length - 1; i >= 0; i--) {
    if (state.beats[i].says !== null) return !isOutburst(state.beats[i].kind);
  }
  return true;
}

/**
 * Ask the coach. A new line replaces the old one. With nothing new to say, the old line is taken down
 * once it no longer fits: the parent has said something since, or it asked to say her words back and
 * that is done or her line has gone. The wait_out line stays for as long as she is upset.
 */
function withCoach(state: RoundState, justCoded: CodedSentence | null): RoundState {
  const beat = state.beats.length > 0 ? state.beats[state.beats.length - 1] : null;
  const outburst = beat !== null && isOutburst(beat.kind);
  const calmAgain = state.calmPraiseDue && !outburst;
  const canReflect = canSayBack(state);
  const prompt = coachPrompt({
    nowSec: state.elapsedSec,
    lastPromptSec: state.lastPromptSec,
    lastSpecificPraiseSec: state.lastSpecificPraiseSec,
    // Her line can be said back for about 14 seconds. After that a nudge to reflect would ask for the impossible.
    childSpokeSec: state.child.lastSaid === null ? null : state.childSpokeSec,
    reflectedSinceChildSpoke: state.reflectedSinceChildSpoke,
    justCoded,
    outburst,
    // Once per outburst beat, and one line across several outburst beats in a row.
    waitOutShown: state.coach?.kind === 'wait_out' || (outburst && state.waitOutBeatSec === beat.atSec),
    calmAgain,
    canReflect,
  });
  if (prompt) {
    return {
      ...state,
      coach: prompt,
      lastPromptSec: state.elapsedSec,
      waitOutBeatSec: prompt.kind === 'wait_out' && beat ? beat.atSec : state.waitOutBeatSec,
      // With calmAgain the only praise_now the coach gives is the one for her calming down. It is given once.
      calmPraiseDue: calmAgain && prompt.kind === 'praise_now' ? false : state.calmPraiseDue,
    };
  }
  if (!state.coach) return state;
  const stale =
    state.coach.kind === 'wait_out'
      ? !outburst
      : justCoded !== null || (state.coach.kind === 'reflect_now' && (state.reflectedSinceChildSpoke || !canReflect));
  return stale ? { ...state, coach: null } : state;
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

/**
 * Targets and the lever stay those of the planned length; only the time measured follows the clock.
 * A round the parent ended before half of its planned length gets no pace verdict: a burst of
 * sentences in the first seconds is not five minutes of play. The lever is still worked out.
 */
function summary(state: RoundState): RoundResult {
  const base = summarizeRound(counted(state), state.seconds, { reflections: !state.live });
  let result: RoundResult = { ...base, seconds: measuredSeconds(state) };
  if (state.elapsedSec < state.seconds / 2) {
    const lever = biggestLever(base.counts, base.targets);
    result = { ...result, met: false, lever, leverText: lever ? LEVER_TEXT[lever] : null, short: true };
  }
  const disputed = state.sentences.filter((s) => s.disputed).length;
  return disputed > 0 ? { ...result, disputed } : result;
}

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
    // After a whine or a meltdown, the first calm moment is the one to praise.
    if (isOutburst(beat.kind)) next.calmPraiseDue = true;
    next.nextBeatAtSec += next.beatEverySec;
  }

  return next.elapsedSec >= next.seconds ? finish(next) : withCoach(next, null);
}

/** Words that do not make a sentence new: articles, determiners, "you are", "I see", names, fillers, intensifiers. */
const KEY_DROP = new Set(
  (
    "a an the this that that's these those my your her his our their its some " +
    "you you're you've i i'm i've it it's them is are am was were be been being have has had " +
    'mia sweetie sweetheart honey buddy baby kiddo ' +
    'so very really such just too quite ' +
    'oh wow yay hey ok okay well and now please yes yeah see notice noticed job work'
  ).split(' '),
);
/** Every praise word is the same word here: "Nice stacking." and "Great stacking." are one sentence. */
const KEY_PRAISE = new Set(
  (
    'good great nice nicely awesome excellent fantastic terrific wonderful amazing super perfect beautiful ' +
    'beautifully lovely gorgeous cute brilliant impressive incredible cool neat smart clever proud bravo ' +
    'like love thank thanks'
  ).split(' '),
);

/** Fold plural and -ing/-ed endings: blocks ~ block, stacking ~ stacked ~ stack, putting ~ put, making ~ make. */
function keyStem(word: string): string {
  let w = word;
  if (w.length > 4) w = w.replace(/(?:ing|ed)$/, '');
  if (w.length > 3 && !w.endsWith('ss')) w = w.replace(/s$/, '');
  if (w.length > 3) w = w.replace(/e$/, '');
  return w.replace(/([a-z])\1$/, '$1');
}

/**
 * What makes a sentence "the same sentence" for the repeat window: the set of its content-word stems.
 * Swapping "the" for "a", adding "Mia" or "so", or changing one praise word for another does not make
 * a sentence new; another color, toy or place does.
 */
export function repeatKey(text: string): string {
  const plain = normalize(text)
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const stems = plain
    .split(' ')
    .filter((w) => w !== '' && !KEY_DROP.has(w))
    .map((w) => (KEY_PRAISE.has(w) ? '+praise' : keyStem(w)));
  // A sentence made only of dropped words ("ok", "Yes.") keeps its plain text, so two different ones stay different.
  return stems.length > 0 ? Array.from(new Set(stems)).sort().join(' ') : plain;
}

const asNeutral = (s: CodedSentence, rule: string): CodedSentence => ({ text: s.text, code: 'neutral', bucket: 'neutral', confidence: s.confidence, rule });
const asRepeat = (s: CodedSentence): CodedSentence => asNeutral(s, 'repeat');

function say(state: RoundState, text: string): RoundState {
  if (!text.trim()) return state;
  const coded = codeTurn(text, { childLastSaid: state.child.lastSaid });
  if (coded.length === 0) return state;

  const next: RoundState = { ...state, sentences: [...state.sentences] };
  // What was said inside the repeat window, kept in step with the list while this turn is added.
  const heard = next.sentences
    .filter((p) => next.elapsedSec - p.atSec <= REPEAT_WINDOW_SEC)
    .map((p) => ({ key: repeatKey(p.text), counted: p.bucket === 'target' || p.repeat }));
  const outburst = next.beats.length > 0 && isOutburst(next.beats[next.beats.length - 1].kind);
  /** The last coded sentence of the turn that was not cut by the turn cap: Mia and the coach react to it. */
  let last: CodedSentence | null = null;
  let lastAvoid: CodedSentence | null = null;
  let countedTargets = 0;
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
    const key = repeatKey(s.text);
    if (s.bucket === 'target' && s.code !== 'reflection' && heard.some((h) => h.counted && h.key === key)) s = asRepeat(s);
    const repeat = s.rule === 'repeat';

    // One turn counts up to MAX_COUNTED_PER_TURN target sentences; the rest of a paste is kept as neutral talk.
    // Questions, commands and criticism are never cut: every one of them is counted.
    let capped = false;
    if (s.bucket === 'target') {
      if (countedTargets >= MAX_COUNTED_PER_TURN) {
        s = asNeutral(s, 'turn_cap');
        capped = true;
      } else countedTargets += 1;
    }

    // Filler said again ("ok", "Good job!") keeps its code, but she has just heard it: it does not warm her twice.
    const again = !repeat && !capped && (s.code === 'neutral' || s.code === 'general_praise') && heard.some((h) => h.key === key);
    next.sentences.push({ ...s, atSec: next.elapsedSec, disputed: false, repeat, capped });
    heard.push({ key, counted: s.bucket === 'target' || repeat });
    if (s.rule === 'safety') safety = true;
    if (s.code !== 'unknown' && !capped) last = s;
    if (s.bucket === 'avoid') lastAvoid = s;
    // Words she has just heard, words beyond the turn cap and words the classifier could not make out
    // (rule 'unclear_...') move neither her nor the combo.
    if (repeat || again || capped || s.rule.startsWith('unclear_')) continue;

    next.child = applyMove(next.child, s.code, s.namedBehavior);
    if (s.code === 'specific_praise') {
      next.lastSpecificPraiseSec = next.elapsedSec;
      // Praise once she is calm is what the calm-again nudge asks for. Praise during the outburst is not.
      if (!outburst) next.calmPraiseDue = false;
    }
    if (s.code === 'reflection') {
      if (reflectsPrev) next.prevReflected = true;
      else next.reflectedSinceChildSpoke = true;
    }
    if (s.bucket === 'target') next.combo += 1;
    else if (s.bucket === 'avoid') next.combo = 0;
  }

  const reaction = (s: CodedSentence): string => MICRO_REACTION[s.rule.startsWith('unclear_') ? 'neutral' : s.code];
  if (safety) {
    next.safety = true;
    // Live play may read the coach aloud next to the child; there the screen's card carries the support lines.
    next.coach = next.live ? null : { kind: 'swap', text: SAFETY_NOTE.body };
    next.lastPromptSec = next.elapsedSec;
    if (last) next.microReaction = reaction(last);
    return next;
  }
  if (!last) {
    // Digits and emoji alone ("1, 2, 3!") are not another language: they get no line about English.
    // The line is shown once a round. Live play never shows it: there the uncoded words may be a child's name.
    if (next.live || next.englishNoteShown || !/\p{L}/u.test(text)) return next;
    return { ...next, coach: { kind: 'swap', text: ENGLISH_ONLY }, lastPromptSec: next.elapsedSec, englishNoteShown: true };
  }
  next.microReaction = reaction(last);
  // A to-swap sentence anywhere in the turn gets its swap line, whatever came after it.
  if (lastAvoid) return withCoach(next, lastAvoid);
  // A turn that was only a repeat gets one calm line, unless she is upset: then the wait_out line stays.
  if (last.rule === 'repeat' && !outburst) {
    const since = next.lastPromptSec === null ? Infinity : next.elapsedSec - next.lastPromptSec;
    if (since >= REACT_GAP) return { ...next, coach: { kind: 'swap', text: REPEAT_COACH }, lastPromptSec: next.elapsedSec };
  }
  return withCoach(next, last);
}

function dispute(state: RoundState, index: number): RoundState {
  const target = state.sentences[index];
  if (!target) return state;
  // Setting a sentence aside takes one of the MAX_DISPUTES slots; with none left nothing changes.
  // Taking a dispute back frees its slot.
  if (!target.disputed && state.disputesLeft <= 0) return state;
  const next: RoundState = {
    ...state,
    sentences: state.sentences.map((s, i) => (i === index ? { ...s, disputed: !s.disputed } : s)),
    disputesLeft: state.disputesLeft + (target.disputed ? 1 : -1),
  };
  // A dispute in the replay, after the round, also updates the final result.
  return next.phase === 'ended' ? { ...next, result: summary(next) } : next;
}

/** "Copy her" changes her once per beat: tapping it twenty times a second is still one imitation of one thing she did. */
function copy(state: RoundState): RoundState {
  const beat = Math.floor(state.elapsedSec / state.beatEverySec);
  if (state.copiedBeat === beat) return state;
  return { ...state, copiedBeat: beat, child: applyMove(state.child, 'copy'), microReaction: MICRO_REACTION.copy };
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
      return copy(state);
    case 'wait':
      return { ...state, child: applyMove(state.child, 'wait'), microReaction: MICRO_REACTION.wait };
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
