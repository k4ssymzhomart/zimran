/**
 * The first visit around the journey: the personalization screens before the first answer and after the before and
 * after, the way back from each screen, and the place of each one in the progress segments.
 *
 *   partner -> guess -> fact -> [the journey: first answer ... before and after] ->
 *   name -> age -> moments -> how often -> scene -> when you play (+ the calendar sheet) -> your answers -> the plan
 *
 * Pure, like the journey it wraps: no React, no clock, no storage. The answers themselves live in the profile;
 * hooks/useFirstVisit.ts writes them there and passes in the little this needs to know about them.
 */
import { initialJourney, journeyReducer, lessonDone, type JourneyEvent, type JourneyPhase, type JourneyState } from './journey';

/**
 * The personalization screens, in the order the parent meets them: three before the rounds, the rest after.
 * Each has a place in the progress segments. `setup` ("When can you play?") is also a phase of the journey.
 */
export const QUESTIONS = ['partner', 'guess', 'fact', 'name', 'age', 'moments', 'frequency', 'scene', 'setup', 'answers'] as const;
export type Question = (typeof QUESTIONS)[number];

/** A personalization screen that is no phase of the journey: the visit keeps track of it. */
export type Aside = Exclude<Question, 'setup'>;

/** Every screen of the first visit. `ready2` is the screen a skipped lesson passes on its way to round two. */
export type VisitStep = Aside | JourneyPhase | 'ready2';

/** A row of "Your plan, from your answers." that leads back to its question. */
export type EditableQuestion = 'partner' | 'scene' | 'moments' | 'setup';

export interface VisitState {
  journey: JourneyState;
  /** The personalization screen that is up; null while the journey's own phase is the screen. */
  aside: Aside | null;
  /** True while the screen before round two is up. */
  beforeRound2: boolean;
  /**
   * False once the parent left "Which moments are hardest?" with none picked: "How often do they happen?" is then
   * not asked, and the progress has one segment fewer. Until then the question is counted.
   */
  howOften: boolean;
  /**
   * Set while a row of the plan is being changed: the answer, and the back arrow, lead back to the plan.
   * It keeps the daily moment as it was, so the reminder is offered again only for a new one.
   */
  editing: { anchor: string | null } | null;
  /** The calendar sheet is up, over "When can you play?". */
  calendar: boolean;
}

/** The events of the journey that reach it as they are. Its way on and its way back go through the visit. */
type PassedOn = Exclude<JourneyEvent, { type: 'continue' | 'finish_setup' | 'back' | 'begin_round2' | 'restart' }>;

export type VisitEvent =
  | PassedOn
  /**
   * The one way on from a personalization screen, from the before and after, and from "When can you play?".
   * `moments` is how many hardest moments are picked, read when "Which moments are hardest?" is left.
   * `anchor` is the daily moment, read when "When can you play?" is left.
   */
  | { type: 'forward'; moments?: number; anchor?: string | null }
  /** The back arrow of the screen that is up. */
  | { type: 'step_back' }
  /** The lesson's one way out: into round two when it is done, to the screen before round two when it was skipped. */
  | { type: 'leave_lesson' }
  | { type: 'begin_round2' }
  /** "Play again" on the before and after. */
  | { type: 'restart' }
  /** A row of the plan was tapped. `anchor` is the daily moment as it is now. */
  | { type: 'edit'; question: EditableQuestion; anchor: string | null }
  /** The calendar sheet was closed. With `stay` the parent wants another moment: the question under it remains. */
  | { type: 'calendar_closed'; stay?: boolean };

export function initialVisit(seed = 1): VisitState {
  return { journey: initialJourney(seed, 'opener'), aside: 'partner', beforeRound2: false, howOften: true, editing: null, calendar: false };
}

/** The screen that is up. */
export function stepOf(state: VisitState): VisitStep {
  if (state.aside !== null) return state.aside;
  if (state.journey.phase === 'lesson' && state.beforeRound2) return 'ready2';
  return state.journey.phase;
}

/**
 * Where the screen that is up stands among the personalization screens, for the progress segments: 1-based, with
 * the real number of screens this parent passes. Null on a screen that is not one of them.
 */
export function placeOf(state: VisitState): { step: number; steps: number } | null {
  const asked = QUESTIONS.filter((question) => question !== 'frequency' || state.howOften);
  const at = asked.findIndex((question) => question === stepOf(state));
  return at < 0 ? null : { step: at + 1, steps: asked.length };
}

/** True on the first screen of a visit: its back arrow leaves for the landing, which is not a step of the visit. */
export function leavesVisit(state: VisitState): boolean {
  return stepOf(state) === 'partner' && state.editing === null;
}

/** True when the back arrow of the screen that is up leads somewhere: a screen before it, or out to the landing. */
export function hasWayBack(state: VisitState): boolean {
  return leavesVisit(state) || stepBack(state) !== state;
}

/** Sends an event to the journey. The same state comes back when the journey did not move. */
function inJourney(state: VisitState, event: JourneyEvent): VisitState {
  const journey = journeyReducer(state.journey, event);
  return journey === state.journey ? state : { ...state, journey };
}

/** Back on the plan, with the row that was being changed set. */
function backToAnswers(state: VisitState): VisitState {
  return { ...state, aside: 'answers', editing: null, calendar: false };
}

function forward(state: VisitState, moments: number, anchor: string | null): VisitState {
  if (state.calendar) return state;
  const step = stepOf(state);

  if (state.editing) {
    switch (step) {
      case 'partner':
      case 'scene':
      case 'frequency':
        return backToAnswers(state);
      case 'moments':
        // "How often?" follows the moments. It is asked now if it was passed over before.
        if (moments > 0 && !state.howOften) return { ...state, aside: 'frequency', howOften: true };
        return { ...backToAnswers(state), howOften: moments > 0 };
      case 'setup':
        // A new moment is a new reminder: the sheet comes up again. The same moment goes straight back.
        return anchor !== state.editing.anchor ? { ...state, calendar: true } : backToAnswers(state);
      default:
        return state;
    }
  }

  switch (step) {
    case 'partner':
      return { ...state, aside: 'guess' };
    case 'guess':
      return { ...state, aside: 'fact' };
    case 'fact':
      // The journey is up from here: the child speaks first.
      return { ...state, aside: null };
    case 'change':
      return { ...state, aside: 'name' };
    case 'name':
      return { ...state, aside: 'age' };
    case 'age':
      return { ...state, aside: 'moments' };
    case 'moments':
      return { ...state, aside: moments > 0 ? 'frequency' : 'scene', howOften: moments > 0 };
    case 'frequency':
      return { ...state, aside: 'scene' };
    case 'scene':
      return { ...inJourney(state, { type: 'continue' }), aside: null };
    case 'setup':
      return { ...state, calendar: true };
    case 'answers':
      return { ...inJourney(state, { type: 'finish_setup' }), aside: null };
    default:
      return state;
  }
}

function stepBack(state: VisitState): VisitState {
  if (state.calendar) return state;
  const step = stepOf(state);

  if (state.editing) {
    // "How often?" was reached from the moments, and goes back to them. Every other question was reached from the plan.
    if (step === 'frequency') return { ...state, aside: 'moments' };
    return step === 'partner' || step === 'scene' || step === 'moments' || step === 'setup' ? backToAnswers(state) : state;
  }

  switch (step) {
    case 'guess':
      return { ...state, aside: 'partner' };
    case 'fact':
      return { ...state, aside: 'guess' };
    case 'opener':
      return { ...state, aside: 'fact' };
    case 'opener_reveal':
    case 'ready1':
    case 'lesson':
      return inJourney(state, { type: 'back' });
    case 'name':
      // The before and after is still the journey's phase.
      return { ...state, aside: null };
    case 'age':
      return { ...state, aside: 'name' };
    case 'moments':
      return { ...state, aside: 'age' };
    case 'frequency':
      return { ...state, aside: 'moments' };
    case 'scene':
      return { ...state, aside: state.howOften ? 'frequency' : 'moments' };
    case 'setup': {
      const back = inJourney(state, { type: 'back' });
      return back === state ? state : { ...back, aside: 'scene' };
    }
    case 'answers':
      return { ...state, aside: null };
    default:
      // The first screen leaves for the landing (leavesVisit); a round, a result and the plan draw no back arrow.
      return state;
  }
}

export function visitReducer(state: VisitState, event: VisitEvent): VisitState {
  switch (event.type) {
    case 'forward':
      return forward(state, event.moments ?? 0, event.anchor ?? null);
    case 'step_back':
      return stepBack(state);
    case 'leave_lesson':
      if (stepOf(state) !== 'lesson') return state;
      // A finished lesson ends on "Ready for round two." itself, so that tap starts the round.
      return lessonDone(state.journey) ? inJourney(state, { type: 'begin_round2' }) : { ...state, beforeRound2: true };
    case 'begin_round2': {
      if (state.aside !== null) return state;
      const begun = inJourney(state, event);
      return begun === state ? state : { ...begun, beforeRound2: false };
    }
    case 'restart':
      // A fresh pair of rounds. The answers already given stay where they are, in the profile.
      return stepOf(state) === 'change' ? { ...inJourney(state, event), beforeRound2: false } : state;
    case 'edit':
      if (stepOf(state) !== 'answers') return state;
      return { ...state, aside: event.question === 'setup' ? null : event.question, editing: { anchor: event.anchor } };
    case 'calendar_closed':
      if (!state.calendar) return state;
      return event.stay ? { ...state, calendar: false } : backToAnswers(state);
    default:
      // An event of the journey reaches it only while the journey's own screen is up.
      return state.aside === null && !state.calendar ? inJourney(state, event) : state;
  }
}
