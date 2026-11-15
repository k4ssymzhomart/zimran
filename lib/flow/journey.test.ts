import { describe, expect, it } from 'vitest';
import { codeTurn } from '../coding/classify';
import { summarizeRound } from '../progress/targets';
import {
  activeTask,
  initialJourney,
  journeyReducer,
  lastTry,
  lessonDone,
  openerInsight,
  type JourneyEvent,
  type JourneyState,
} from './journey';

const run = (events: JourneyEvent[], from: JourneyState = initialJourney()): JourneyState =>
  events.reduce(journeyReducer, from);

const result = (lines: string[], seconds: number) => summarizeRound(lines.flatMap((l) => codeTurn(l)), seconds);
const weakRound = result(['What is it?', 'Is that a tower?', 'Put it on top.', 'Nice!'], 60);
const betterRound = result(["You're drawing a line.", 'You picked the yellow one.', 'Nice sun!'], 40);

describe('opener', () => {
  it('starts with Mia speaking first', () => {
    const s = initialJourney();
    expect(s.phase).toBe('opener');
    expect(s.opener.childSaid).toBe('I made a tower!');
  });
  it('codes the first answer and explains the strongest thing in it', () => {
    const s = run([{ type: 'answer_opener', text: 'Wow, good job! What is it?' }]);
    expect(s.phase).toBe('opener_reveal');
    expect(s.opener.first.map((c) => c.code)).toEqual(['general_praise', 'question']);
    expect(s.opener.insight?.headline).toBe('That was a question.');
    // A question is not a fault: the five minutes are the exception, not the rule.
    expect(s.opener.insight?.body).toContain('Questions are great the rest of the day.');
    expect(s.opener.reflected).toBe(false);
  });
  it('does not code or teach on a sentence that is not play talk, and says where support is', () => {
    const s = run([{ type: 'answer_opener', text: "I can't do this anymore." }]);
    expect(s.phase).toBe('opener_reveal');
    expect(s.opener.first.map((c) => [c.code, c.rule])).toEqual([['unknown', 'safety']]);
    expect(s.opener.insight?.body).toContain('988');
    expect(s.opener.insight?.body).toContain('1-800-422-4453');
    expect(s.opener.reflected).toBe(false);
  });
  it('recognizes a reflection on the first answer', () => {
    const s = run([{ type: 'answer_opener', text: 'You made a tower!' }]);
    expect(s.opener.reflected).toBe(true);
    expect(s.opener.insight?.headline).toBe('You said her words back.');
  });
  it('lets the parent try the reflection and shows a model answer after two tries', () => {
    let s = run([{ type: 'answer_opener', text: 'What is it?' }, { type: 'try_reflection', text: 'Nice.' }]);
    expect(s.opener.reflected).toBe(false);
    expect(s.opener.reflectionFeedback).toContain('her own words');
    s = run([{ type: 'try_reflection', text: 'Cool.' }], s);
    expect(s.opener.reflectionFeedback).toContain('You made a tower!');
    s = run([{ type: 'try_reflection', text: 'You made a tower.' }], s);
    expect(s.opener.reflected).toBe(true);
    expect(s.opener.reflectionFeedback).toBe('Yes. She heard that you listened.');
  });
  it('ignores an empty answer', () => {
    const s = initialJourney();
    expect(run([{ type: 'answer_opener', text: '   ' }], s)).toBe(s);
  });
  it('has an insight for every kind of first answer and none of them scolds', () => {
    const answers = ['You made a tower!', 'No, not like that.', 'Put it here.', 'What is it?', 'Nice tower!', "You're stacking.", 'Good job!', 'That is red.', 'Молодец'];
    for (const a of answers) {
      const insight = openerInsight(codeTurn(a, { childLastSaid: 'I made a tower!' }));
      expect(insight.headline.length).toBeGreaterThan(0);
      expect(`${insight.headline} ${insight.body}`).not.toMatch(/\b(wrong|bad|mistake|should|don't)\b/i);
    }
  });
});

describe('rounds and lesson', () => {
  const afterRound1 = run([{ type: 'begin_round1' }, { type: 'round_ended', result: weakRound }], initialJourney(1, 'ready1'));

  it('moves from round 1 to its result and picks the lesson for the lever', () => {
    expect(afterRound1.phase).toBe('result1');
    expect(afterRound1.round1).toBe(weakRound);
    expect(afterRound1.lesson?.lever).toBe(weakRound.lever);
    expect(afterRound1.lesson?.tasks).toHaveLength(2);
  });
  it('a round that met the pace still gets a lesson', () => {
    const met = { ...weakRound, met: true, lever: null, leverText: null };
    const s = run([{ type: 'begin_round1' }, { type: 'round_ended', result: met }], initialJourney(1, 'ready1'));
    expect(s.lesson?.lever).toBe('reflection');
  });
  it('checks lesson answers, advances on a good one, and finishes after both tasks', () => {
    let s = run([{ type: 'begin_lesson' }], afterRound1);
    expect(s.phase).toBe('lesson');
    const first = activeTask(s)!;
    s = run([{ type: 'answer_task', text: first.modelAnswer }], s);
    expect(s.taskIndex).toBe(1);
    expect(lastTry(s)?.ok).toBe(true);
    const second = activeTask(s)!;
    s = run([{ type: 'answer_task', text: second.modelAnswer }], s);
    expect(lessonDone(s)).toBe(true);
    expect(activeTask(s)).toBeNull();
  });
  it('shows a model answer and moves on after two tries that are not there yet', () => {
    let s = run([{ type: 'begin_lesson' }, { type: 'answer_task', text: 'What are you doing?' }], afterRound1);
    expect(s.taskIndex).toBe(0);
    expect(lastTry(s)?.ok).toBe(false);
    s = run([{ type: 'answer_task', text: 'What is that?' }], s);
    expect(s.taskIndex).toBe(1);
    expect(lastTry(s)?.feedback).toContain('One way to say it');
  });
  it('compares the two rounds when round 2 ends', () => {
    const s = run([{ type: 'begin_lesson' }, { type: 'begin_round2' }, { type: 'round_ended', result: betterRound }], afterRound1);
    expect(s.phase).toBe('change');
    expect(s.change?.improved).toBe(true);
    expect(s.change?.verdict).toBe('improved');
    expect(s.change?.lines.length).toBeGreaterThan(0);
  });
  it('does not praise a second round in which nothing was said', () => {
    const silent = result([], 40);
    const s = run([{ type: 'begin_round2' }, { type: 'round_ended', result: silent }], afterRound1);
    expect(s.change).toMatchObject({ improved: false, verdict: 'silent' });
  });
  it('lets the lesson be skipped', () => {
    expect(run([{ type: 'begin_round2' }], afterRound1).phase).toBe('round2');
  });
  it('follows a result that changed after a dispute', () => {
    const revised = result(['Is that a tower?', 'Nice!'], 60);
    const s = run([{ type: 'result_updated', result: revised }], afterRound1);
    expect(s.phase).toBe('result1');
    expect(s.round1).toBe(revised);
  });
});

describe('setup and plan', () => {
  const atChange = run(
    [{ type: 'begin_round1' }, { type: 'round_ended', result: weakRound }, { type: 'begin_round2' }, { type: 'round_ended', result: betterRound }],
    initialJourney(1, 'ready1'),
  );
  it('collects the setup answers and reaches the plan', () => {
    const s = run(
      [
        { type: 'continue' },
        { type: 'set_setup', patch: { anchor: 'After breakfast' } },
        { type: 'set_setup', patch: { anchor: 'After dinner' } },
        { type: 'finish_setup' },
      ],
      atChange,
    );
    expect(s.phase).toBe('plan');
    expect(s.setup).toEqual({ anchor: 'After dinner' });
  });
  it('restart begins a fresh round with a new seed', () => {
    const s = run([{ type: 'restart' }], atChange);
    expect(s.phase).toBe('ready1');
    // Not seed + 1: that was round 2 of the visit just played.
    expect(s.seed).toBe(atChange.seed + 2);
    // The hook tells rounds apart by seed: the new visit must not reuse either seed of the old one.
    expect([atChange.seed, atChange.seed + 1]).not.toContain(s.seed);
    expect([atChange.seed, atChange.seed + 1]).not.toContain(s.seed + 1);
    expect(s.round1).toBeNull();
    expect(s.round2).toBeNull();
    expect(s.change).toBeNull();
  });
});

describe('guards', () => {
  it('ignores events that do not belong to the current phase', () => {
    const s = initialJourney();
    for (const e of [
      { type: 'try_reflection', text: 'You made a tower.' },
      { type: 'round_ended', result: weakRound },
      { type: 'begin_lesson' },
      { type: 'answer_task', text: 'x' },
      { type: 'continue' },
      { type: 'finish_setup' },
    ] as JourneyEvent[]) {
      expect(journeyReducer(s, e)).toBe(s);
    }
  });
  it('never mutates its input and is deterministic', () => {
    const events: JourneyEvent[] = [
      { type: 'answer_opener', text: 'What is it?' },
      { type: 'try_reflection', text: 'You made a tower.' },
      { type: 'begin_round1' },
      { type: 'round_ended', result: weakRound },
      { type: 'begin_lesson' },
      { type: 'answer_task', text: 'hmm' },
    ];
    const start = initialJourney();
    const frozen = JSON.stringify(start);
    expect(run(events, start)).toEqual(run(events, initialJourney()));
    expect(JSON.stringify(start)).toBe(frozen);
  });
});
