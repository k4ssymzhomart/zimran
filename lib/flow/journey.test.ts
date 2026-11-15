import { describe, expect, it } from 'vitest';
import { savedSentences } from '../../hooks/useRound';
import { codeTurn } from '../coding/classify';
import { summarizeRound } from '../progress/targets';
import { initialRound, roundReducer, type RoundEvent, type RoundState } from '../round/session';
import {
  activeTask,
  afterDispute,
  canStepBack,
  initialJourney,
  journeyReducer,
  lastTry,
  lessonDone,
  openerInsight,
  ROUND1,
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
  it('a to-swap sentence in the same turn takes the headline before any skill', () => {
    // It used to open with praise for the reflection: "You said her words back."
    const rude = run([{ type: 'answer_opener', text: 'You made a tower. Now shut up.' }]);
    expect(rude.opener.first.map((c) => c.code)).toEqual(['reflection', 'criticism']);
    expect(rude.opener.insight?.headline).toBe('That one corrected her.');
    const turns: [string, string][] = [
      ['You made a tower! What is it?', 'That was a question.'],
      ['You made a tower. Now put the blue one on top.', 'That was a suggestion.'],
      ['I love how carefully you stacked it. Is it a castle?', 'That was a question.'],
      ["You're stacking the blocks. Not like that.", 'That one corrected her.'],
      // A correction comes before a command, and a command before a question, whatever the order they were said in.
      ['What is it? Put it here. No, not like that.', 'That one corrected her.'],
      ['Is it a tower? Put it here.', 'That was a suggestion.'],
    ];
    for (const [text, headline] of turns) {
      expect(run([{ type: 'answer_opener', text }]).opener.insight?.headline, text).toBe(headline);
    }
  });
  it('with no to-swap sentence, the skills keep their order: her words back, then praise, then description', () => {
    const turns: [string, string][] = [
      ['Nice! You made a tower!', 'You said her words back.'],
      ["You're stacking the blocks. I love how carefully you did that.", 'You named exactly what you liked.'],
      ["Good job! You're stacking the blocks.", 'You said what she did.'],
      ['Hmm. Good job!', 'Warm, and a little vague.'],
    ];
    for (const [text, headline] of turns) {
      expect(run([{ type: 'answer_opener', text }]).opener.insight?.headline, text).toBe(headline);
    }
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
  it('goes from the read answer to the screen before round one, and from there into the round', () => {
    const read = run([{ type: 'answer_opener', text: 'What is it?' }, { type: 'try_reflection', text: 'You made a tower.' }]);
    const ready = run([{ type: 'ready' }], read);
    expect(ready.phase).toBe('ready1');
    // Nothing but the phase moves: the first answer and its reading stay as they were.
    expect(ready.opener).toBe(read.opener);
    expect(run([{ type: 'begin_round1' }], ready).phase).toBe('round1');
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

describe('a dispute after the round', () => {
  const play = (events: RoundEvent[]): RoundState => events.reduce(roundReducer, initialRound());
  const say = (text: string): RoundEvent => ({ type: 'say', text });
  const start: RoundEvent = { type: 'start', sceneId: ROUND1.sceneId, seconds: ROUND1.seconds, seed: 1 };
  /** A round the parent ended early: its result is measured over the time played, its targets over the planned minute. */
  const endedEarly = play([
    start,
    say('What is it?'),
    { type: 'tick', dtSec: 9 },
    say('You made a tower!'),
    say('Wow, good job! Is that a tower?'),
    { type: 'tick', dtSec: 12 },
    say('Put it on top.'),
    say("You're stacking the red block."),
    { type: 'tick', dtSec: 13 },
    { type: 'end' },
  ]);
  const playedOut = play([start, say('Is that a tower?'), say('You made a tower!'), { type: 'tick', dtSec: ROUND1.seconds }]);

  it('gives the result the round engine gives, whichever sentence is disputed', () => {
    for (const round of [endedEarly, playedOut]) {
      expect(round.phase).toBe('ended');
      const saved = savedSentences(round.sentences);
      expect(saved.length).toBeGreaterThan(1);
      saved.forEach((_, index) => {
        const engine = roundReducer(round, { type: 'dispute', index });
        const mine = afterDispute(saved, index, ROUND1.seconds, round.result!.seconds);
        expect(mine?.result).toEqual(engine.result);
        expect(mine?.sentences).toStrictEqual(savedSentences(engine.sentences));
      });
    }
  });
  it('keeps the time the round was measured over and the targets of the planned minute', () => {
    const saved = savedSentences(endedEarly.sentences);
    const mine = afterDispute(saved, 0, ROUND1.seconds, endedEarly.result!.seconds)!;
    expect(mine.result.seconds).toBe(34);
    expect(mine.result.targets).toEqual(endedEarly.result!.targets);
    // The disputed question is out of the count; nothing else moved.
    expect(mine.result.counts.question).toBe(endedEarly.result!.counts.question - 1);
    expect(mine.result.counts.avoid).toBe(endedEarly.result!.counts.avoid - 1);
    expect(mine.result.counts.target).toBe(endedEarly.result!.counts.target);
  });
  it('puts the sentence back on a second tap', () => {
    const saved = savedSentences(endedEarly.sentences);
    const once = afterDispute(saved, 1, ROUND1.seconds, endedEarly.result!.seconds)!;
    expect(once.sentences[1].disputed).toBe(true);
    const twice = afterDispute(once.sentences, 1, ROUND1.seconds, endedEarly.result!.seconds)!;
    expect(twice.sentences).toStrictEqual(saved);
    expect(twice.result).toEqual(endedEarly.result);
  });
  it('does nothing for an index that is not a sentence, and never edits its input', () => {
    const saved = savedSentences(endedEarly.sentences);
    const frozen = JSON.stringify(saved);
    expect(afterDispute(saved, saved.length, ROUND1.seconds, 34)).toBeNull();
    expect(afterDispute(saved, -1, ROUND1.seconds, 34)).toBeNull();
    afterDispute(saved, 0, ROUND1.seconds, 34);
    expect(JSON.stringify(saved)).toBe(frozen);
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
      { type: 'ready' },
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
      { type: 'ready' },
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

describe('the back arrow', () => {
  const back: JourneyEvent = { type: 'back' };
  const read = run([{ type: 'answer_opener', text: 'What is it?' }, { type: 'try_reflection', text: 'Nice.' }]);
  const atChange = run(
    [{ type: 'begin_round1' }, { type: 'round_ended', result: weakRound }, { type: 'begin_round2' }, { type: 'round_ended', result: betterRound }],
    initialJourney(1, 'ready1'),
  );

  it('from the read answer: the first answer is given again, with nothing left of the old one', () => {
    const s = run([back], read);
    expect(s.phase).toBe('opener');
    expect(s.opener).toEqual(initialJourney().opener);
    // The same child says the same line: the seed stays.
    expect(s.seed).toBe(read.seed);
    expect(run([{ type: 'answer_opener', text: 'You made a tower!' }], s).opener.reflected).toBe(true);
  });
  it('from the screen before round one: the reading is still there, tries and all', () => {
    const ready = run([{ type: 'try_reflection', text: 'You made a tower.' }, { type: 'ready' }], read);
    const s = run([back], ready);
    expect(s.phase).toBe('opener_reveal');
    expect(s.opener).toBe(ready.opener);
    expect(run([{ type: 'ready' }], s).phase).toBe('ready1');
  });
  it('after "Play again" the screen before round one has nothing to go back to', () => {
    const again = run([{ type: 'restart' }], atChange);
    expect(again.phase).toBe('ready1');
    expect(canStepBack(again)).toBe(false);
    expect(run([back], again)).toBe(again);
  });
  it('from the lesson: the result of round one, and the lesson keeps its answers', () => {
    const lesson = run(
      [{ type: 'begin_round1' }, { type: 'round_ended', result: weakRound }, { type: 'begin_lesson' }, { type: 'answer_task', text: 'What?' }],
      initialJourney(1, 'ready1'),
    );
    const s = run([back], lesson);
    expect(s.phase).toBe('result1');
    expect(s.tries).toBe(lesson.tries);
    expect(run([{ type: 'begin_lesson' }], s)).toEqual(lesson);
  });
  it('from "when you play": the before and after, with both rounds and the chosen moment kept', () => {
    const setup = run([{ type: 'continue' }, { type: 'set_setup', patch: { anchor: 'After dinner' } }], atChange);
    const s = run([back], setup);
    expect(s.phase).toBe('change');
    expect(s.round1).toBe(atChange.round1);
    expect(s.round2).toBe(atChange.round2);
    expect(s.change).toBe(atChange.change);
    expect(run([{ type: 'continue' }], s).setup).toEqual({ anchor: 'After dinner' });
  });
  it('leads nowhere from a round, a result or the plan', () => {
    const round1 = initialJourney(1, 'round1');
    const result1 = run([{ type: 'round_ended', result: weakRound }], round1);
    const plan = run([{ type: 'continue' }, { type: 'finish_setup' }], atChange);
    for (const s of [initialJourney(), round1, result1, atChange, plan]) {
      expect(canStepBack(s)).toBe(false);
      expect(run([back], s)).toBe(s);
    }
  });
});
