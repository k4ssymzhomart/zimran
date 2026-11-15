import { describe, expect, it } from 'vitest';
import { codeTurn } from '../coding/classify';
import { summarizeRound } from '../progress/targets';
import { hasWayBack, initialVisit, leavesVisit, placeOf, QUESTIONS, stepOf, visitReducer, type VisitEvent, type VisitState, type VisitStep } from './visit';

const run = (events: VisitEvent[], from: VisitState = initialVisit()): VisitState => events.reduce(visitReducer, from);

const result = (lines: string[], seconds: number) => summarizeRound(lines.flatMap((l) => codeTurn(l)), seconds);
const round1 = result(['What is it?', 'Is that a tower?', 'Put it on top.', 'Nice!'], 60);
const round2 = result(["You're drawing a line.", 'You picked the yellow one.', 'Nice sun!'], 40);

const forward: VisitEvent = { type: 'forward' };
const back: VisitEvent = { type: 'step_back' };

/** The three screens before the first answer. */
const toOpener: VisitEvent[] = [forward, forward, forward];
/** From the first answer to the before and after, the lesson skipped. */
const toChange: VisitEvent[] = [
  { type: 'answer_opener', text: 'What is it?' },
  { type: 'try_reflection', text: 'You made a tower.' },
  { type: 'ready' },
  { type: 'begin_round1' },
  { type: 'round_ended', result: round1 },
  { type: 'begin_lesson' },
  { type: 'leave_lesson' },
  { type: 'begin_round2' },
  { type: 'round_ended', result: round2 },
];
const atChange = run([...toOpener, ...toChange]);
/** From the before and after to "Your plan, from your answers.", with two hardest moments and a daily moment. */
const toAnswers: VisitEvent[] = [
  forward, // the before and after -> name
  forward, // name -> age
  forward, // age -> moments
  { type: 'forward', moments: 2 }, // moments -> how often
  forward, // how often -> scene
  forward, // scene -> when you play
  { type: 'set_setup', patch: { anchor: 'After dinner' } },
  { type: 'forward', anchor: 'After dinner' }, // the calendar sheet comes up
  { type: 'calendar_closed' },
];
const atAnswers = run(toAnswers, atChange);

/** Every screen passed, in order, while the events are played. */
function walk(events: VisitEvent[], from: VisitState = initialVisit()): VisitStep[] {
  const steps = [stepOf(from)];
  let state = from;
  for (const event of events) {
    state = visitReducer(state, event);
    if (stepOf(state) !== steps[steps.length - 1]) steps.push(stepOf(state));
  }
  return steps;
}

describe('the order of the first visit', () => {
  it('asks three things, reaches the first answer, and builds the plan after the before and after', () => {
    expect(walk([...toOpener, ...toChange, ...toAnswers, forward])).toEqual([
      'partner',
      'guess',
      'fact',
      'opener',
      'opener_reveal',
      'ready1',
      'round1',
      'result1',
      'lesson',
      'ready2',
      'round2',
      'change',
      'name',
      'age',
      'moments',
      'frequency',
      'scene',
      'setup',
      'answers',
      'plan',
    ]);
  });
  it('a finished lesson starts round two itself, with no screen in between', () => {
    let s = run([...toOpener, ...toChange.slice(0, 6)]);
    expect(stepOf(s)).toBe('lesson');
    for (const task of s.journey.lesson!.tasks) s = run([{ type: 'answer_task', text: task.modelAnswer }], s);
    expect(stepOf(run([{ type: 'leave_lesson' }], s))).toBe('round2');
  });
  it('passes over "How often?" when no moment was picked', () => {
    const s = run([forward, forward, forward, { type: 'forward', moments: 0 }], atChange);
    expect(stepOf(s)).toBe('scene');
    expect(s.howOften).toBe(false);
  });
  it('keeps both rounds while the questions after them are answered', () => {
    expect(atAnswers.journey.round1).toBe(round1);
    expect(atAnswers.journey.round2).toBe(round2);
    expect(atAnswers.journey.setup).toEqual({ anchor: 'After dinner' });
    expect(run([forward], atAnswers).journey.phase).toBe('plan');
  });
  it('the calendar sheet comes up over "When can you play?" and closing it moves on', () => {
    const setup = run(toAnswers.slice(0, 7), atChange);
    expect(stepOf(setup)).toBe('setup');
    const sheet = run([{ type: 'forward', anchor: 'After dinner' }], setup);
    expect(stepOf(sheet)).toBe('setup');
    expect(sheet.calendar).toBe(true);
    // The sheet is modal: nothing behind it moves.
    expect(run([forward], sheet)).toBe(sheet);
    expect(run([back], sheet)).toBe(sheet);
    expect(run([{ type: 'set_setup', patch: { anchor: 'Before bath' } }], sheet)).toBe(sheet);
    const closed = run([{ type: 'calendar_closed' }], sheet);
    expect(stepOf(closed)).toBe('answers');
    expect(closed.calendar).toBe(false);
  });
  it('the Moment row of the sheet closes it and stays on the question', () => {
    const sheet = run(toAnswers.slice(0, 8), atChange);
    const stayed = run([{ type: 'calendar_closed', stay: true }], sheet);
    expect(stepOf(stayed)).toBe('setup');
    expect(stayed.calendar).toBe(false);
  });
  it('"Play again" starts a fresh pair of rounds from the screen before round one', () => {
    const again = run([{ type: 'restart' }], atChange);
    expect(stepOf(again)).toBe('ready1');
    expect(again.journey.round1).toBeNull();
    expect(again.journey.seed).toBe(atChange.journey.seed + 2);
    expect(hasWayBack(again)).toBe(false);
    // Only the before and after offers it.
    expect(run([{ type: 'restart' }], atAnswers)).toBe(atAnswers);
  });
  it('an event of the journey does nothing while a personalization screen is up', () => {
    const s = initialVisit();
    expect(run([{ type: 'answer_opener', text: 'What is it?' }], s)).toBe(s);
    expect(run([{ type: 'begin_round2' }], s)).toBe(s);
    expect(run([{ type: 'leave_lesson' }], s)).toBe(s);
  });
});

describe('the way back', () => {
  it('leaves for the landing from the first screen only', () => {
    const s = initialVisit();
    expect(leavesVisit(s)).toBe(true);
    expect(hasWayBack(s)).toBe(true);
    expect(run([back], s)).toBe(s);
    expect(leavesVisit(run([forward], s))).toBe(false);
  });
  it('goes one screen back through the three opening questions and the first answer', () => {
    const read = run([...toOpener, { type: 'answer_opener', text: 'What is it?' }]);
    expect(walk([back, back, back, back], read)).toEqual(['opener_reveal', 'opener', 'fact', 'guess', 'partner']);
    // The first answer is given again.
    expect(run([back], read).journey.opener.first).toEqual([]);
  });
  it('goes back from every question after the rounds, as far as the before and after', () => {
    expect(walk([back, back, back, back, back, back, back], atAnswers)).toEqual(['answers', 'setup', 'scene', 'frequency', 'moments', 'age', 'name', 'change']);
    const change = run([back, back, back, back, back, back, back], atAnswers);
    // Nothing of the two rounds is lost on the way, nor the moment that was chosen.
    expect(change.journey.round1).toBe(round1);
    expect(change.journey.change).toBe(atChange.journey.change);
    expect(change.journey.setup).toEqual({ anchor: 'After dinner' });
    expect(hasWayBack(change)).toBe(false);
  });
  it('goes forward again the same way', () => {
    const change = run([back, back, back, back, back, back, back], atAnswers);
    expect(walk(toAnswers, change)).toEqual(['change', 'name', 'age', 'moments', 'frequency', 'scene', 'setup', 'answers']);
  });
  it('from the scene, skips "How often?" when it was not asked', () => {
    const scene = run([forward, forward, forward, { type: 'forward', moments: 0 }], atChange);
    expect(stepOf(run([back], scene))).toBe('moments');
    // A moment picked after all: the question is asked on the way forward.
    expect(stepOf(run([back, { type: 'forward', moments: 1 }], scene))).toBe('frequency');
  });
  it('has no way back from a round, a result or the plan', () => {
    const inRound = run([...toOpener, ...toChange.slice(0, 4)]);
    const onResult = run([...toOpener, ...toChange.slice(0, 5)]);
    const onPlan = run([forward], atAnswers);
    for (const s of [inRound, onResult, atChange, onPlan]) {
      expect(hasWayBack(s)).toBe(false);
      expect(run([back], s)).toBe(s);
    }
  });
});

describe('the progress segments', () => {
  const place = (state: VisitState) => placeOf(state);

  it('counts every personalization screen: three before the rounds, seven after', () => {
    expect(QUESTIONS).toHaveLength(10);
    const seen: Array<{ step: number; steps: number } | null> = [];
    let s = initialVisit();
    seen.push(place(s));
    for (const event of [...toOpener, ...toChange, ...toAnswers]) {
      const next = visitReducer(s, event);
      if (stepOf(next) !== stepOf(s)) seen.push(place(next));
      s = next;
    }
    expect(seen.filter((p) => p !== null)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((step) => ({ step, steps: 10 })));
  });
  it('has no place for the screens of the journey', () => {
    expect(place(run(toOpener))).toBeNull();
    expect(place(atChange)).toBeNull();
    expect(place(run([forward], atAnswers))).toBeNull();
  });
  it('has one segment fewer once "How often?" is passed over', () => {
    const moments = run([forward, forward, forward], atChange);
    // Until the parent leaves the question, "How often?" is still ahead.
    expect(place(moments)).toEqual({ step: 6, steps: 10 });
    const scene = run([{ type: 'forward', moments: 0 }], moments);
    expect(place(scene)).toEqual({ step: 7, steps: 9 });
    const setup = run([forward], scene);
    expect(place(setup)).toEqual({ step: 8, steps: 9 });
    const answers = run([{ type: 'forward', anchor: 'After dinner' }, { type: 'calendar_closed' }], setup);
    expect(place(answers)).toEqual({ step: 9, steps: 9 });
    // Back at the start of the questions the count is the same nine.
    expect(place(run([back, back, back, back], answers))).toEqual({ step: 5, steps: 9 });
  });
});

describe('changing a row of the plan', () => {
  const edit = (question: 'partner' | 'scene' | 'moments' | 'setup', from: VisitState = atAnswers): VisitState =>
    run([{ type: 'edit', question, anchor: 'After dinner' }], from);

  it('opens the question of the row, and its answer leads back to the plan', () => {
    for (const question of ['partner', 'scene'] as const) {
      const s = edit(question);
      expect(stepOf(s)).toBe(question);
      const answered = run([forward], s);
      expect(stepOf(answered)).toBe('answers');
      expect(answered.editing).toBeNull();
    }
  });
  it('the back arrow of that question leads back to the plan too, and never out of the visit', () => {
    for (const question of ['partner', 'scene', 'moments', 'setup'] as const) {
      const s = edit(question);
      expect(leavesVisit(s)).toBe(false);
      expect(hasWayBack(s)).toBe(true);
      const returned = run([back], s);
      expect(stepOf(returned)).toBe('answers');
      expect(returned.editing).toBeNull();
    }
  });
  it('is offered on the plan only', () => {
    expect(edit('partner', atChange)).toBe(atChange);
  });
  it('the moments lead back to the plan, and to "How often?" first when that was passed over', () => {
    expect(stepOf(run([{ type: 'forward', moments: 3 }], edit('moments')))).toBe('answers');

    const none = run([forward, forward, forward, { type: 'forward', moments: 0 }, forward, { type: 'forward', anchor: 'After dinner' }, { type: 'calendar_closed' }], atChange);
    expect(placeOf(none)).toEqual({ step: 9, steps: 9 });
    const asked = run([{ type: 'forward', moments: 1 }], edit('moments', none));
    expect(stepOf(asked)).toBe('frequency');
    expect(stepOf(run([back], asked))).toBe('moments');
    const returned = run([forward], asked);
    expect(stepOf(returned)).toBe('answers');
    expect(placeOf(returned)).toEqual({ step: 10, steps: 10 });
  });
  it('moments taken away again leave "How often?" out of the count', () => {
    const s = run([{ type: 'forward', moments: 0 }], edit('moments'));
    expect(stepOf(s)).toBe('answers');
    expect(placeOf(s)).toEqual({ step: 9, steps: 9 });
  });
  it('the same daily moment goes straight back; a new one brings the calendar sheet up again', () => {
    const same = run([{ type: 'forward', anchor: 'After dinner' }], edit('setup'));
    expect(stepOf(same)).toBe('answers');
    expect(same.calendar).toBe(false);

    const other = run([{ type: 'set_setup', patch: { anchor: 'Before bath' } }, { type: 'forward', anchor: 'Before bath' }], edit('setup'));
    expect(stepOf(other)).toBe('setup');
    expect(other.calendar).toBe(true);
    const closed = run([{ type: 'calendar_closed' }], other);
    expect(stepOf(closed)).toBe('answers');
    expect(closed.editing).toBeNull();
    expect(closed.journey.setup).toEqual({ anchor: 'Before bath' });
  });
});

describe('the reducer itself', () => {
  it('never mutates its input and is deterministic', () => {
    const events = [...toOpener, ...toChange, ...toAnswers, forward];
    const start = initialVisit();
    const frozen = JSON.stringify(start);
    expect(run(events, start)).toEqual(run(events, initialVisit()));
    expect(JSON.stringify(start)).toBe(frozen);
  });
});
