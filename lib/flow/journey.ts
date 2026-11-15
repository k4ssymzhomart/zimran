/**
 * The first visit as a pure state machine:
 * answer Mia -> see what the sentence did -> round 1 -> result -> short lesson -> round 2 ->
 * before and after -> a few setup questions -> the plan.
 * Screens only render this state and send events. Nothing here knows about React, the clock or storage.
 */
import { BUCKET, type CodedSentence, type Code, type RoundChange, type RoundResult, type SavedSentence } from '../types';
import { codeTurn } from '../coding/classify';
import { SAFETY_NOTE } from '../coding/safety';
import { BLOCKS } from '../child/scenes';
import { checkAnswer, lessonFor, type Lesson, type LessonTask } from '../lesson/lesson';
import { biggestLever, compareRounds, LEVER_TEXT, summarizeRound } from '../progress/targets';
import { MAX_DISPUTES } from '../round/session';

export const ROUND1 = { sceneId: 'blocks', seconds: 60 } as const;
export const ROUND2 = { sceneId: 'drawing', seconds: 40 } as const;
/** After this many tries the model answer is shown and the lesson moves on. */
export const MAX_TRIES = 2;

export type JourneyPhase =
  | 'opener' // Mia has spoken; the parent has not answered yet
  | 'opener_reveal' // the first answer is coded; the parent tries saying her words back
  | 'ready1' // one screen of instructions before the clock starts
  | 'round1'
  | 'result1'
  | 'lesson'
  | 'round2'
  | 'change' // round 1 against round 2
  | 'setup' // one question: when the five minutes happen
  | 'plan';

export interface Insight {
  headline: string;
  body: string;
}

export interface TaskTry {
  answer: string;
  ok: boolean;
  feedback: string;
}

/** The plan is the same 28 days for every family. The one thing a parent sets is when the five minutes happen. */
export interface SetupAnswers {
  /** The daily moment the five minutes are tied to, for example "After dinner". */
  anchor: string | null;
}

export interface JourneyState {
  phase: JourneyPhase;
  seed: number;
  opener: {
    does: string;
    childSaid: string;
    first: CodedSentence[];
    insight: Insight | null;
    reflectionTries: number;
    reflected: boolean;
    reflectionFeedback: string | null;
  };
  round1: RoundResult | null;
  lesson: Lesson | null;
  /** Index of the lesson task being answered; equals tasks.length when the lesson is done. */
  taskIndex: number;
  tries: TaskTry[][];
  round2: RoundResult | null;
  change: RoundChange | null;
  setup: SetupAnswers;
}

export type JourneyEvent =
  | { type: 'answer_opener'; text: string }
  | { type: 'try_reflection'; text: string }
  /** The first answer has been read: on to the one screen of instructions before round one. */
  | { type: 'ready' }
  | { type: 'begin_round1' }
  | { type: 'round_ended'; result: RoundResult }
  /** The parent disputed a sentence after the round: the stored result follows. */
  | { type: 'result_updated'; result: RoundResult }
  | { type: 'begin_lesson' }
  | { type: 'answer_task'; text: string }
  | { type: 'begin_round2' }
  | { type: 'continue' }
  | { type: 'set_setup'; patch: Partial<SetupAnswers> }
  | { type: 'finish_setup' }
  /** The back arrow of a screen: one screen back, where there is one to go back to. */
  | { type: 'back' }
  | { type: 'restart' };

export function initialJourney(seed = 1, startAt: JourneyPhase = 'opener'): JourneyState {
  const opening = BLOCKS.actions[0];
  return {
    phase: startAt,
    seed,
    opener: {
      does: opening.does,
      childSaid: opening.says ?? '',
      first: [],
      insight: null,
      reflectionTries: 0,
      reflected: false,
      reflectionFeedback: null,
    },
    round1: null,
    lesson: null,
    taskIndex: 0,
    tries: [],
    round2: null,
    change: null,
    setup: { anchor: null },
  };
}

/**
 * What to tell the parent about their very first answer. One code in the turn decides the headline.
 * A to-swap sentence comes before any skill: "You made a tower. Now shut up." is not opened with praise
 * for the reflection. Among the skills, saying her words back comes first.
 */
const INSIGHT_ORDER: Code[] = [
  'criticism',
  'command',
  'question',
  'reflection',
  'specific_praise',
  'description',
  'general_praise',
  'neutral',
];

const INSIGHT: Record<Exclude<Code, 'unknown'>, Insight> = {
  reflection: {
    headline: 'You said her words back.',
    body: 'That is a reflection. She hears that you listened, and she keeps talking. It is the one that slips away first under pressure.',
  },
  criticism: {
    headline: 'That one corrected her.',
    body: 'It is a natural reflex. In these five minutes small things are left alone, so she keeps the lead.',
  },
  command: {
    headline: 'That was a suggestion.',
    body: 'It comes from wanting to help. It also moves the lead from her to you.',
  },
  question: {
    headline: 'That was a question.',
    body: 'It feels warm. It also asks her to stop playing and answer you. Questions are great the rest of the day.',
  },
  specific_praise: {
    headline: 'You named exactly what you liked.',
    body: 'That is specific praise. She knows what to do again.',
  },
  description: {
    headline: 'You said what she did.',
    body: 'That is a description. It tells her you are watching, and she stays with the toy.',
  },
  general_praise: {
    headline: 'Warm, and a little vague.',
    body: 'She knows you are pleased, but not about what. Naming it works better.',
  },
  neutral: {
    headline: 'That was neutral talk.',
    body: 'Nothing lost. Three things move her: praise for something exact, her own words said back, and a description of what she is doing.',
  },
};

const UNREADABLE: Insight = {
  headline: 'That one could not be read.',
  body: 'This practice reads English sentences. Say her words back in English below.',
};

export function openerInsight(first: CodedSentence[]): Insight {
  // Not play talk: no code and no lesson about it, only where support is.
  if (first.some((s) => s.rule === 'safety')) return SAFETY_NOTE;
  for (const code of INSIGHT_ORDER) {
    if (first.some((s) => s.code === code)) return INSIGHT[code as Exclude<Code, 'unknown'>];
  }
  return UNREADABLE;
}

export function activeTask(state: JourneyState): LessonTask | null {
  return state.lesson?.tasks[state.taskIndex] ?? null;
}

export function lessonDone(state: JourneyState): boolean {
  return state.lesson !== null && state.taskIndex >= state.lesson.tasks.length;
}

/** The most recent try in the lesson, across tasks; the screen shows its feedback. */
export function lastTry(state: JourneyState): TaskTry | null {
  for (let i = state.tries.length - 1; i >= 0; i--) {
    const t = state.tries[i];
    if (t && t.length > 0) return t[t.length - 1];
  }
  return null;
}

/**
 * "Disagree?" on one sentence of a finished round, worked out from the sentences as they are saved. The tapped
 * sentence leaves the count (a second tap puts it back) and the result is summed again the way the round engine
 * does it (lib/round/session.ts): targets, `met` and the lever belong to the planned length, and `seconds` stays
 * the time the round was measured over. Null when there is no sentence at that index.
 */
export function afterDispute(
  sentences: readonly SavedSentence[],
  index: number,
  plannedSeconds: number,
  measuredSeconds: number,
  /** True when the round was ended before half of its planned length: it keeps having no pace verdict. */
  short = false,
): { sentences: SavedSentence[]; result: RoundResult } | null {
  const target = sentences[index];
  if (!target) return null;
  // As in the round engine: a round has MAX_DISPUTES slots; taking a dispute back frees one.
  if (!target.disputed && sentences.filter((s) => s.disputed).length >= MAX_DISPUTES) return null;
  const next = sentences.map((s, i): SavedSentence => {
    if (i !== index) return s;
    const { disputed, ...rest } = s;
    return disputed ? rest : { ...rest, disputed: true };
  });
  const counted = next
    .filter((s) => !s.disputed)
    .map((s): CodedSentence => ({ text: s.text, code: s.code, bucket: BUCKET[s.code], confidence: 1, rule: s.rule ?? '' }));
  const base = summarizeRound(counted, plannedSeconds);
  let result: RoundResult = { ...base, seconds: measuredSeconds };
  if (short) {
    const lever = biggestLever(base.counts, base.targets);
    result = { ...result, met: false, lever, leverText: lever ? LEVER_TEXT[lever] : null, short: true };
  }
  const disputed = next.filter((s) => s.disputed).length;
  return { sentences: next, result: disputed > 0 ? { ...result, disputed } : result };
}

function answerOpener(state: JourneyState, text: string): JourneyState {
  if (!text.trim()) return state;
  const first = codeTurn(text, { childLastSaid: state.opener.childSaid });
  const reflected = first.some((s) => s.code === 'reflection');
  return {
    ...state,
    phase: 'opener_reveal',
    opener: { ...state.opener, first, insight: openerInsight(first), reflected },
  };
}

function tryReflection(state: JourneyState, text: string): JourneyState {
  if (!text.trim()) return state;
  const coded = codeTurn(text, { childLastSaid: state.opener.childSaid });
  const ok = coded.some((s) => s.code === 'reflection');
  const tries = state.opener.reflectionTries + 1;
  const reflectionFeedback = ok
    ? 'Yes. She heard that you listened.'
    : tries >= MAX_TRIES
      ? `One way to say it: “You made a tower!”`
      : 'Close. Use her own words and start with “You made …”.';
  return { ...state, opener: { ...state.opener, reflectionTries: tries, reflected: state.opener.reflected || ok, reflectionFeedback } };
}

function withRound1(state: JourneyState, result: RoundResult): JourneyState {
  // A round that already meets the pace still gets a lesson: reflections are the usual gap.
  return { ...state, round1: result, lesson: lessonFor(result.lever ?? 'reflection', state.seed), taskIndex: 0, tries: [] };
}

function withRound2(state: JourneyState, result: RoundResult): JourneyState {
  return { ...state, round2: result, change: state.round1 ? compareRounds(state.round1, result) : null };
}

function answerTask(state: JourneyState, text: string): JourneyState {
  const task = activeTask(state);
  if (!task || !text.trim()) return state;
  const checked = checkAnswer(task, text);
  const before = state.tries[state.taskIndex] ?? [];
  const outOfTries = !checked.ok && before.length + 1 >= MAX_TRIES;
  const feedback = outOfTries ? `${checked.feedback} One way to say it: “${task.modelAnswer}”` : checked.feedback;
  const tries = state.tries.slice();
  tries[state.taskIndex] = [...before, { answer: text.trim(), ok: checked.ok, feedback }];
  return { ...state, tries, taskIndex: checked.ok || outOfTries ? state.taskIndex + 1 : state.taskIndex };
}

/**
 * One screen back, for the screens that draw a back arrow. A round, its result and the plan have none.
 * Nothing the parent did is lost on the way, except the first answer: going back to it is how it is given again.
 */
function stepBack(state: JourneyState): JourneyState {
  switch (state.phase) {
    case 'opener_reveal':
      return { ...state, phase: 'opener', opener: initialJourney(state.seed).opener };
    case 'ready1':
      // After "Play again" there is no first answer to go back to.
      return state.opener.first.length > 0 ? { ...state, phase: 'opener_reveal' } : state;
    case 'lesson':
      return { ...state, phase: 'result1' };
    case 'setup':
      return state.round1 && state.round2 ? { ...state, phase: 'change' } : state;
    default:
      return state;
  }
}

/** True when the back arrow of the screen that is up leads somewhere. */
export function canStepBack(state: JourneyState): boolean {
  return stepBack(state) !== state;
}

export function journeyReducer(state: JourneyState, event: JourneyEvent): JourneyState {
  switch (event.type) {
    case 'answer_opener':
      return state.phase === 'opener' ? answerOpener(state, event.text) : state;
    case 'try_reflection':
      return state.phase === 'opener_reveal' ? tryReflection(state, event.text) : state;
    case 'ready':
      return state.phase === 'opener_reveal' ? { ...state, phase: 'ready1' } : state;
    case 'begin_round1':
      return ['opener', 'opener_reveal', 'ready1'].includes(state.phase) ? { ...state, phase: 'round1' } : state;
    case 'round_ended':
      if (state.phase === 'round1') return { ...withRound1(state, event.result), phase: 'result1' };
      if (state.phase === 'round2') return { ...withRound2(state, event.result), phase: 'change' };
      return state;
    case 'result_updated':
      if (state.phase === 'result1') return withRound1(state, event.result);
      if (state.phase === 'change') return withRound2(state, event.result);
      return state;
    case 'begin_lesson':
      return state.phase === 'result1' && state.lesson ? { ...state, phase: 'lesson' } : state;
    case 'answer_task':
      return state.phase === 'lesson' ? answerTask(state, event.text) : state;
    case 'begin_round2':
      // The lesson can be skipped; the parent stays in charge.
      return state.phase === 'lesson' || state.phase === 'result1' ? { ...state, phase: 'round2' } : state;
    case 'continue':
      return state.phase === 'change' ? { ...state, phase: 'setup' } : state;
    case 'set_setup':
      return state.phase === 'setup' ? { ...state, setup: { ...state.setup, ...event.patch } } : state;
    case 'finish_setup':
      return state.phase === 'setup' ? { ...state, phase: 'plan' } : state;
    case 'back':
      return stepBack(state);
    case 'restart':
      // Round 2 of the visit just played used seed + 1. Skipping past it keeps its finished result
      // from being taken for the new round 1.
      return initialJourney(state.seed + 2, 'ready1');
  }
}
