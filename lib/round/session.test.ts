import { describe, expect, it } from 'vitest';
import { BLOCKS, DRAWING, SCENES } from '../child/scenes';
import { COPY_CONNECTION_CEILING, initialChild, isOutburst } from '../child/model';
import { CALM_PRAISE_TEXT, NUDGE_GAP, REACT_GAP, WAIT_OUT_TEXT } from '../coach/policy';
import { CRISIS_LINES } from '../coding/safety';
import {
  DISPUTES_USED_NOTE,
  initialRound,
  MAX_COUNTED_PER_TURN,
  MAX_DISPUTES,
  MAX_SAME_PER_ROUND,
  measuredSeconds,
  REPEAT_WINDOW_SEC,
  repeatKey,
  ringProgress,
  roundReducer,
  SHORT_ROUND_NOTE,
  skeletonKey,
  TURN_CAP_NOTE,
  type RoundEvent,
  type RoundState,
} from './session';

const START: RoundEvent = { type: 'start', sceneId: 'blocks', seconds: 300, seed: 7 };
const run = (events: RoundEvent[], from: RoundState = initialRound()): RoundState => events.reduce(roundReducer, from);
const say = (text: string): RoundEvent => ({ type: 'say', text });
const tick = (dtSec: number): RoundEvent => ({ type: 'tick', dtSec });

/** Recursively freeze, so any mutation inside the reducer throws. */
function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.values(o).forEach(deepFreeze);
    Object.freeze(o);
  }
  return o;
}

describe('start', () => {
  it('starts idle and empty', () => {
    const s = initialRound();
    expect(s.phase).toBe('idle');
    expect(s.beats).toEqual([]);
    expect(s.result).toBeNull();
  });

  it('lets the child speak first', () => {
    const s = run([START]);
    expect(s.phase).toBe('running');
    expect(s.beats).toEqual([{ kind: 'play', does: BLOCKS.actions[0].does, says: 'I made a tower!', atSec: 0 }]);
    expect(s.child.lastSaid).toBe('I made a tower!');
    expect(s.childSpokeSec).toBe(0);
    expect(s.nextBeatAtSec).toBe(7);
    expect({ ...s.child, lastSaid: null }).toEqual(initialChild(7));
  });

  it('uses the chosen scene and falls back to blocks for an unknown one', () => {
    expect(run([{ ...START, sceneId: 'drawing' }]).beats[0].does).toBe(DRAWING.actions[0].does);
    const s = run([{ ...START, sceneId: 'no-such-scene' }]);
    expect(s.sceneId).toBe('blocks');
    expect(s.beats[0].does).toBe(BLOCKS.actions[0].does);
  });

  it('ignores a beat interval that could never advance', () => {
    expect(run([{ ...START, beatEverySec: 0 }]).beatEverySec).toBe(7);
    expect(run([{ ...START, beatEverySec: 3 }]).nextBeatAtSec).toBe(3);
  });
});

describe('say', () => {
  it('fills the rings and changes the child', () => {
    const before = run([START]);
    const s = run([say('You are stacking the blocks. Great job stacking so gently.')], before);
    expect(s.sentences.map((x) => x.code)).toEqual(['description', 'specific_praise']);
    expect(s.sentences.every((x) => x.atSec === 0 && !x.disputed)).toBe(true);
    const rings = ringProgress(s);
    expect(rings.description).toEqual({ count: 1, target: 10 });
    expect(rings.specific_praise).toEqual({ count: 1, target: 10 });
    expect(rings.avoid).toEqual({ count: 0, max: 3 });
    expect(s.child.connection).toBeGreaterThan(before.child.connection);
    expect(s.child.focus).toBeGreaterThan(before.child.focus);
    expect(s.child.habits.gentle).toBeGreaterThan(before.child.habits.gentle);
    expect(s.lastSpecificPraiseSec).toBe(0);
    expect(s.microReaction).toBe('Mia grins and holds it up for you to see.');
  });

  it('codes her words said back as a reflection, not a description', () => {
    const s = run([START, say('You made a tower.')]);
    expect(s.sentences[0].code).toBe('reflection');
    expect(s.reflectedSinceChildSpoke).toBe(true);
    expect(ringProgress(s).reflection.count).toBe(1);
    expect(ringProgress(s).description.count).toBe(0);
  });

  it('counts a combo of target sentences and resets it on an avoid', () => {
    let s = run([START, say('You are stacking the blocks.'), say('You made a tower.')]);
    expect(s.combo).toBe(2);
    s = run([say('Good job!')], s);
    expect(s.combo).toBe(2);
    s = run([say('What is that?')], s);
    expect(s.combo).toBe(0);
    s = run([say('You are building a bridge.')], s);
    expect(s.combo).toBe(1);
  });

  it('ignores empty text and never throws on odd input', () => {
    const started = run([START]);
    expect(run([say('')], started)).toBe(started);
    expect(run([say('   \n\t ')], started)).toBe(started);
    for (const text of ['Ты строишь башню. Молодец!', '你好', '?!...', '😀😀', 'You are stacking. '.repeat(280), 'a'.repeat(5000)]) {
      expect(() => run([say(text), tick(1)], started)).not.toThrow();
    }
    const foreign = run([say('Ты строишь башню.')], started);
    expect(foreign.sentences.every((x) => x.code === 'unknown')).toBe(true);
    expect(foreign.microReaction).toBe('');
    expect(foreign.child).toEqual(started.child);
  });
});

describe('tick', () => {
  it('brings a beat every beatEverySec, in small steps or one big step', () => {
    const small = run([START, ...Array.from({ length: 120 }, () => tick(0.25))]);
    const big = run([START, tick(30)]);
    expect(small.elapsedSec).toBe(30);
    expect(small.beats.map((b) => b.atSec)).toEqual([0, 7, 14, 21, 28]);
    expect(big.beats).toEqual(small.beats);
    expect(big.child).toEqual(small.child);
    expect(big.nextBeatAtSec).toBe(35);
  });

  it('tracks when the child last spoke', () => {
    const s = run([START, say('You made a tower.'), tick(60)]);
    const spoken = s.beats.filter((b) => b.says !== null);
    expect(s.childSpokeSec).toBe(spoken[spoken.length - 1].atSec);
    // Her line stays for one silent beat so a slightly late reflection still counts, then it expires.
    const lastSpokenIndex = s.beats.lastIndexOf(spoken[spoken.length - 1]);
    const silentBeatsSince = s.beats.length - 1 - lastSpokenIndex;
    expect(s.child.lastSaid).toBe(silentBeatsSince < 2 ? spoken[spoken.length - 1].says : null);
  });

  it('credits a reflection typed one beat late', () => {
    // Opening line at 0 s; one beat passes at 7 s before the parent answers.
    let s = run([{ ...START, seed: 1 }]);
    const opening = s.beats[0].says!;
    s = run([tick(8)], s);
    if (s.beats[1].says === null) {
      s = run([say('You made a tower.')], s);
      expect(opening).toBe('I made a tower!');
      expect(s.sentences[0].code).toBe('reflection');
    } else {
      // She said something new on that beat: the new line is the one that can be reflected.
      expect(s.child.lastSaid).toBe(s.beats[1].says);
    }
  });

  it('ignores a tick that does not move time forward', () => {
    const s = run([START]);
    expect(run([tick(0)], s)).toBe(s);
    expect(run([tick(-5)], s)).toBe(s);
    expect(run([tick(Number.NaN)], s)).toBe(s);
  });

  it('ends on time with a result and a farewell', () => {
    const s = run([{ ...START, seconds: 60 }, say('You are stacking the blocks.'), tick(45), tick(45)]);
    expect(s.phase).toBe('ended');
    expect(s.elapsedSec).toBe(60);
    expect(s.beats.every((b) => b.atSec < 60)).toBe(true);
    expect(s.result?.seconds).toBe(60);
    expect(s.result?.counts.description).toBe(1);
    expect(s.result?.met).toBe(false);
    expect(Object.values(BLOCKS.farewell)).toContain(s.farewell);
  });

  it('measures a round ended early over the time it ran, with the targets of the planned length', () => {
    const s = run([{ ...START, seconds: 60 }, say('You are stacking the blocks.'), tick(45), { type: 'end' }]);
    expect(s.phase).toBe('ended');
    expect(s.result?.seconds).toBe(45);
    expect(measuredSeconds(s)).toBe(45);
    // The rings showed "of 2" during play; the result keeps those targets.
    expect(s.result?.targets).toEqual(run([{ ...START, seconds: 60 }, tick(60)]).result?.targets);
  });

  it('never measures a round over less than half its planned length', () => {
    const quick = run([{ ...START, seconds: 60 }, say('You are stacking the blocks.'), tick(5), { type: 'end' }]);
    expect(quick.result?.seconds).toBe(30);
    const atOnce = run([START, { type: 'end' }]);
    expect(atOnce.result?.seconds).toBe(150);
    // One description in five seconds is not twelve a minute.
    const perMinute = ((quick.result?.counts.description ?? 0) * 60) / (quick.result?.seconds ?? 1);
    expect(perMinute).toBe(2);
  });

  it('keeps the measured time when a sentence is disputed after an early end', () => {
    const ended = run([{ ...START, seconds: 60 }, say('What is that?'), tick(40), { type: 'end' }]);
    const disputed = run([{ type: 'dispute', index: 0 }], ended);
    expect(disputed.result?.seconds).toBe(40);
    expect(disputed.result?.counts.question).toBe(0);
  });
});

describe('coach', () => {
  // Changed with E2: this used to expect no line for a second avoid sentence inside REACT_GAP.
  it('answers every avoid sentence with its swap line, with no gap', () => {
    let s = run([START, tick(1), say('What are you building?')]);
    expect(s.coach?.kind).toBe('swap');
    expect(s.lastPromptSec).toBe(1);
    const first = s.coach;

    // One second later: the command still gets its own line, in place of the one that was showing.
    s = run([tick(1), say('Put that down.')], s);
    expect(s.coach?.kind).toBe('swap');
    expect(s.coach?.text).not.toBe(first?.text);
    expect(s.lastPromptSec).toBe(2);

    s = run([say("Don't throw it.")], s);
    expect(s.coach).toEqual({ kind: 'swap', text: 'Let small things pass. Praise the opposite when you see it.' });
    expect(s.lastPromptSec).toBe(2);
  });

  it('gives the swap line for a to-swap sentence anywhere in the turn', () => {
    const s = run([START, tick(1), say('What are you building? You are stacking the blocks.')]);
    expect(s.sentences.map((x) => x.code)).toEqual(['question', 'description']);
    expect(s.coach).toEqual({ kind: 'swap', text: "Questions are natural. Try it as a statement: “You're …”" });
    // Mia still reacts to the last thing she heard.
    expect(s.microReaction).toBe('Mia stays with it, concentrating.');
  });

  it('keeps the gap for lines that praise the parent', () => {
    let s = run([START, tick(1), say('You are stacking the blocks.')]);
    expect(s.coach?.kind).toBe('praise_parent');
    s = run([tick(REACT_GAP - 1), say('You put the red one on top.')], s);
    expect(s.coach).toBeNull();
    expect(s.lastPromptSec).toBe(1);
    s = run([tick(1), say('You are lining up the cars.')], s);
    expect(s.coach?.kind).toBe('praise_parent');
    expect(s.lastPromptSec).toBe(1 + REACT_GAP);
  });

  it('praises the parent for a target sentence', () => {
    expect(run([START, say('You are stacking the blocks.')]).coach?.kind).toBe('praise_parent');
  });

  it('nudges to reflect when the child spoke and nobody answered', () => {
    const quiet = run([START, tick(4)]);
    expect(quiet.coach).toBeNull();
    const nudged = run([tick(1)], quiet);
    expect(nudged.coach?.kind).toBe('reflect_now');
    expect(nudged.lastPromptSec).toBe(5);
    // No second nudge until NUDGE_GAP has passed.
    expect(run([tick(NUDGE_GAP - 1)], nudged).lastPromptSec).toBe(5);
  });
});

describe('the coach line does not go stale', () => {
  const FIRST: RoundEvent = { type: 'start', sceneId: 'blocks', seconds: 60, seed: 1 };

  it('takes down "Say back what she just said" once it is done', () => {
    let s = run([FIRST, tick(5)]);
    expect(s.coach?.kind).toBe('reflect_now');
    s = run([tick(1), say('You made a tower!')], s);
    expect(s.sentences[0].code).toBe('reflection');
    expect(s.coach?.kind).not.toBe('reflect_now');
    expect(run([tick(0.5)], s).coach?.kind).not.toBe('reflect_now');
  });

  it('takes it down once her line has gone, with the parent silent', () => {
    let s = run([FIRST, tick(5)]);
    expect(s.coach?.kind).toBe('reflect_now');
    let sawQuoteGone = false;
    for (let t = 5; t < 59; t += 0.5) {
      s = run([tick(0.5)], s);
      if (s.phase !== 'running') break;
      if (s.child.lastSaid === null) {
        sawQuoteGone = true;
        expect(s.coach?.kind, `at ${s.elapsedSec}s`).not.toBe('reflect_now');
      }
    }
    expect(sawQuoteGone).toBe(true);
  });

  it('never asks to say back a line while nothing of hers can be said back', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let s = run([{ ...FIRST, seed }]);
      while (s.phase === 'running') {
        s = run([tick(1)], s);
        if (s.phase === 'running' && s.coach?.kind === 'reflect_now') expect(s.child.lastSaid, `seed ${seed} at ${s.elapsedSec}s`).not.toBeNull();
      }
    }
  });

  it('a new sentence with no new line clears the old one', () => {
    let s = run([FIRST, tick(3), say('You are stacking the red block.')]);
    expect(s.coach?.kind).toBe('praise_parent');
    // Two seconds later small talk: too soon for the coach to speak again, and the praise no longer fits.
    // (Changed with E2: this used a question, which now always gets its swap line.)
    s = run([tick(2), say('That is a red one.')], s);
    expect(s.sentences[1].code).toBe('neutral');
    expect(s.coach).toBeNull();
    s = run([tick(1), say('What are you making?')], s);
    expect(s.sentences[2].code).toBe('question');
    expect(s.coach?.kind).toBe('swap');
  });

  it('answers input with no English words with one calm line', () => {
    const started = run([FIRST, tick(2)]);
    for (const text of ['Ты строишь башню.', 'Сен мұнара салып жатырсың', '你好']) {
      const s = run([say(text)], started);
      expect(s.coach?.text, text).toBe('This practice reads English sentences. Try a short one.');
      expect(s.lastPromptSec).toBe(2);
      expect(ringProgress(s)).toEqual(ringProgress(started));
      expect(s.child).toEqual(started.child);
    }
    expect(run([say('You are stacking. Молодец!')], started).coach?.kind).toBe('praise_parent');
  });

  it('digits and emoji alone get no line about English', () => {
    const started = run([FIRST, tick(2)]);
    for (const text of ['12345', '1, 2, 3!', '😀😀']) {
      const s = run([say(text)], started);
      expect(s.coach, text).toEqual(started.coach);
      expect(s.sentences[s.sentences.length - 1]).toMatchObject({ code: 'unknown', rule: 'no_english_words' });
      expect(ringProgress(s)).toEqual(ringProgress(started));
      expect(s.child).toEqual(started.child);
    }
  });

  it('never scolds', () => {
    const s = run([FIRST, say('You made a tower.'), tick(REACT_GAP), say('You made a tower.')]);
    for (const line of [s.coach?.text ?? '', run([say('你好')], s).coach?.text ?? '']) {
      expect(line.length).toBeGreaterThan(0);
      expect(line).not.toMatch(/\b(wrong|bad|mistake|should|don't|dont)\b/i);
    }
  });
});

describe('repeats do not fill the rings', () => {
  const TRIPLE = "You made a tower. Nice stacking. You're stacking.";

  it('the same description ten times counts once', () => {
    const pasted = run([START, say('You are stacking the blocks. '.repeat(10))]);
    expect(pasted.sentences).toHaveLength(10);
    expect(ringProgress(pasted).description.count).toBe(1);
    expect(pasted.sentences.filter((x) => x.repeat)).toHaveLength(9);

    const typed = run([START, ...Array.from({ length: 10 }, () => [say('You are stacking the blocks.'), tick(1)]).flat()]);
    expect(ringProgress(typed).description.count).toBe(1);
  });

  it('marks a repeat as neutral talk that moves neither the rings nor the child', () => {
    const once = run([START, say('You are stacking the blocks.')]);
    const twice = run([say('you are stacking the blocks!!')], once);
    expect(twice.sentences[1]).toMatchObject({ code: 'neutral', bucket: 'neutral', rule: 'repeat', repeat: true, disputed: false });
    expect(twice.sentences[0].repeat).toBe(false);
    expect(twice.child).toEqual(once.child);
    expect(twice.combo).toBe(once.combo);
    expect(run([{ type: 'end' }], twice).result?.counts).toMatchObject({ description: 1, target: 1, neutral: 1 });
  });

  it('a paste of many sentences does not close a ring by repetition', () => {
    const s = run([START, say(`${TRIPLE} `.repeat(12)), { type: 'end' }]);
    expect(s.sentences).toHaveLength(36);
    expect(s.result?.counts).toMatchObject({ reflection: 1, specific_praise: 1, description: 1, target: 3 });
    expect(s.result?.met).toBe(false);
    // The one-minute first round asks for two of each: one line pasted twice does not get there either.
    const first = run([{ ...START, seconds: 60 }, say(`${TRIPLE} ${TRIPLE}`), { type: 'end' }]);
    expect(first.result?.met).toBe(false);
    expect(first.result?.counts.target).toBe(3);
  });

  it('one line from Mia is reflected once', () => {
    const s = run([START, ...Array.from({ length: 10 }, () => say('You made a tower.'))]);
    expect(ringProgress(s).reflection.count).toBe(1);
    expect(ringProgress(s).description.count).toBe(0);
    expect(s.sentences.slice(1).every((x) => x.repeat)).toBe(true);
    // Her talk bar moved once, not ten times.
    expect(s.child.talk).toBe(run([START, say('You made a tower.')]).child.talk);
  });

  it('a second saying-back in other words is read without her line', () => {
    const s = run([START, say('You made a tower.'), say('You made a tall red tower.'), say('The tower you made.')]);
    expect(s.sentences.map((x) => [x.code, x.repeat])).toEqual([
      ['reflection', false],
      // a real description still counts as a description
      ['description', false],
      // nothing but her words again
      ['neutral', true],
    ]);
    expect(ringProgress(s).reflection.count).toBe(1);
  });

  it('her own complaint said back twice is a repeat, never a criticism', () => {
    const s = run([START, tick(1)]);
    const whining: RoundState = { ...s, child: { ...s.child, lastSaid: 'This is too hard.' }, reflectedSinceChildSpoke: false };
    const twice = run([say('This is too hard.'), say("It's too hard.")], whining);
    expect(twice.sentences.map((x) => x.code)).toEqual(['reflection', 'neutral']);
    expect(ringProgress(twice).avoid.count).toBe(0);
  });

  it('her next line can be reflected again', () => {
    let s = run([{ ...START, seed: 1, seconds: 60 }, say('You made a tower.'), tick(8)]);
    expect(s.child.lastSaid).toBe('All clean.');
    s = run([say("It's all clean.")], s);
    expect(ringProgress(s).reflection.count).toBe(2);
  });

  it('a line she says twice can be reflected twice, inside the repeat window', () => {
    // The paid session of plan day 1: the play kitchen, where she says "The tea is hot." at 7 s and again at 14 s.
    let s = run([{ type: 'start', sceneId: 'kitchen', seconds: 300, seed: 1001 }, tick(11)]);
    expect(s.beats.filter((b) => b.says !== null).map((b) => [b.atSec, b.says]).slice(-1)).toEqual([[7, 'The tea is hot.']]);
    s = run([say('The tea is hot.'), tick(7)], s);
    expect(s.beats[s.beats.length - 1]).toMatchObject({ atSec: 14, says: 'The tea is hot.' });
    s = run([say('The tea is hot.')], s);
    expect(s.sentences.map((x) => [x.code, x.repeat])).toEqual([
      ['reflection', false],
      ['reflection', false],
    ]);
    expect(ringProgress(s).reflection.count).toBe(2);
    expect(s.reflectedSinceChildSpoke).toBe(true);
    // A third saying-back of the same line, before she speaks again, is still a repeat.
    s = run([say('The tea is hot.')], s);
    expect(s.sentences[2]).toMatchObject({ code: 'neutral', repeat: true });
    expect(ringProgress(s).reflection.count).toBe(2);
  });

  it('the same sentence counts again once the window has passed', () => {
    const s = run([START, say('You are stacking the blocks.'), tick(REPEAT_WINDOW_SEC + 1), say('You are stacking the blocks.')]);
    expect(ringProgress(s).description.count).toBe(2);
    // Said every few seconds it keeps being a repeat: the window runs from the last time it was said.
    const drip = run([START, ...Array.from({ length: 8 }, () => [say('You are stacking the blocks.'), tick(REPEAT_WINDOW_SEC - 5)]).flat()]);
    expect(ringProgress(drip).description.count).toBe(1);
  });

  it('avoid sentences are never hidden as repeats', () => {
    const s = run([START, say('What is that? What is that? What is that?')]);
    expect(ringProgress(s).avoid.count).toBe(3);
    expect(s.sentences.some((x) => x.repeat)).toBe(false);
  });

  it('filler said again keeps its code and does not warm her twice', () => {
    const once = run([{ ...START, seconds: 60 }, say('ok')]);
    expect(once.child.connection).toBeGreaterThan(run([{ ...START, seconds: 60 }]).child.connection);
    const many = run(Array.from({ length: 39 }, () => say('ok')), once);
    expect(many.sentences.every((x) => x.code === 'neutral' && !x.repeat)).toBe(true);
    expect(many.child).toEqual(once.child);
    const praise = run([START, say('Good job!')]);
    const praised = run(Array.from({ length: 9 }, () => say('Good job!')), praise);
    expect(run([{ type: 'end' }], praised).result?.counts.general_praise).toBe(10);
    expect(praised.child).toEqual(praise.child);
    // Once the window has passed, the same words reach her again.
    expect(run([tick(REPEAT_WINDOW_SEC + 1), say('Good job!')], praise).child.connection).toBeGreaterThan(run([tick(REPEAT_WINDOW_SEC + 1)], praise).child.connection);
  });

  it('tells the parent once, calmly, when a turn was only a repeat', () => {
    const s = run([START, say('You are stacking the blocks.'), tick(REACT_GAP), say('You are stacking the blocks.')]);
    expect(s.coach?.text).toBe('That one is already counted. Say something new you see.');
  });
});

describe('typing grace for a reflection', () => {
  const FIRST: RoundEvent = { type: 'start', sceneId: 'blocks', seconds: 60, seed: 1 };

  it('still credits her previous line said back just after she moved on', () => {
    const moved = run([FIRST, tick(9)]);
    // Every new visitor (seed 1) hears a second line at 7 s: the opening line is no longer the current one.
    expect(moved.beats).toHaveLength(2);
    expect(moved.child.lastSaid).toBe(moved.beats[1].says);
    expect(moved.child.lastSaid).not.toBe('I made a tower!');
    expect(moved.prevSaid).toBe('I made a tower!');
    expect(moved.prevSaidUntilSec).toBe(14);
    const s = run([say('You made a tower!')], moved);
    expect(s.sentences[0].code).toBe('reflection');
    expect(ringProgress(s).reflection.count).toBe(1);
  });

  it('closes the window one beat later: the same words are then a description', () => {
    const s = run([FIRST, tick(16), say('You made a tower!')]);
    expect(s.sentences[0].code).toBe('description');
  });

  it('leaves her current line open for its own reflection', () => {
    const moved = run([FIRST, tick(9)]);
    const s = run([say('You made a tower!'), say(moved.child.lastSaid!)], moved);
    expect(s.sentences.map((x) => x.code)).toEqual(['reflection', 'reflection']);
    expect(s.reflectedSinceChildSpoke).toBe(true);
    expect(s.prevReflected).toBe(true);
  });

  it('does not credit the previous line twice', () => {
    const early = run([FIRST, tick(3), say('You made a tower!'), tick(6)]);
    expect(early.prevReflected).toBe(true);
    // Different words, so it is not caught as the same sentence: without the grace it is a plain description.
    const s = run([say('You made a big tower.')], early);
    expect(s.sentences.map((x) => x.code)).toEqual(['reflection', 'description']);
    const late = run([FIRST, tick(9), say('You made a tower!'), say('You made a big tower.')]);
    expect(late.sentences.map((x) => x.code)).toEqual(['reflection', 'description']);
  });

  it('never turns a question into a reflection', () => {
    const s = run([FIRST, tick(9), say('You made a tower?')]);
    expect(s.sentences[0].code).toBe('question');
  });

  it('live play has no lines of hers, so no grace', () => {
    const s = run([{ ...FIRST, live: true }, tick(9), say('You made a tower!')]);
    expect(s.prevSaid).toBeNull();
    expect(s.sentences[0].code).toBe('description');
  });
});

describe('a sentence that is not play talk', () => {
  it('is not coded, fills no ring, leaves the child alone and raises the support flag', () => {
    const started = run([START, tick(2)]);
    expect(started.safety).toBe(false);
    const s = run([say("I'm going to spank you.")], started);
    expect(s.sentences[0]).toMatchObject({ code: 'unknown', bucket: 'none', rule: 'safety' });
    expect(ringProgress(s)).toEqual(ringProgress(started));
    expect(s.child).toEqual(started.child);
    expect(s.safety).toBe(true);
    for (const line of CRISIS_LINES) expect(s.coach?.text).toContain(line);
    expect(run([{ type: 'end' }], s).result?.counts).toMatchObject({ target: 0, avoid: 0, neutral: 0 });
  });

  it('keeps the flag for the rest of the round and still codes the other sentences', () => {
    const s = run([START, say("You are stacking. I can't do this anymore."), tick(10), say('You put it on top.')]);
    expect(s.sentences.map((x) => x.code)).toEqual(['description', 'unknown', 'description']);
    expect(s.safety).toBe(true);
    expect(run([START]).safety).toBe(false);
  });

  it('stays silent aloud in live play, where the coach may be read out next to the child', () => {
    const s = run([{ ...START, live: true }, say("I'm going to spank you.")]);
    expect(s.safety).toBe(true);
    expect(s.coach).toBeNull();
  });

  it('does not fire on ordinary play talk', () => {
    const s = run([START, say("The car hit the wall. Don't hit the tower.")]);
    expect(s.safety).toBe(false);
    expect(s.sentences.map((x) => x.code)).toEqual(['neutral', 'criticism']);
  });
});

describe('a harder scene', () => {
  it('starts her a little wound up, and blocks stay as calm as before', () => {
    expect(run([{ ...START, sceneId: 'cleanup' }]).child.tension).toBeGreaterThan(run([START]).child.tension);
    expect(run([START]).child.tension).toBe(initialChild(7).tension);
  });
});

describe('copy, wait, dispute, end', () => {
  it('copy warms the child and wait sets a calm reaction', () => {
    const started = run([START]);
    const copied = run([{ type: 'copy' }], started);
    expect(copied.child.connection).toBeGreaterThan(started.child.connection);
    expect(copied.microReaction).toContain('giggles');
    expect(run([{ type: 'wait' }], started).microReaction).toBe('You stay calm and wait.');
  });

  it('a disputed sentence leaves the counts, and comes back when toggled again', () => {
    const s = run([START, say('What is that?'), say('You are stacking the blocks.')]);
    expect(ringProgress(s).avoid.count).toBe(1);
    const disputed = run([{ type: 'dispute', index: 0 }], s);
    expect(disputed.sentences[0].disputed).toBe(true);
    expect(ringProgress(disputed).avoid.count).toBe(0);
    expect(ringProgress(disputed).description.count).toBe(1);
    expect(disputed.child).toEqual(s.child);
    expect(run([{ type: 'end' }], disputed).result?.counts.question).toBe(0);
    expect(ringProgress(run([{ type: 'dispute', index: 0 }], disputed)).avoid.count).toBe(1);
    expect(run([{ type: 'dispute', index: 99 }], s)).toBe(s);
  });

  it('a dispute after the round updates the result', () => {
    const ended = run([START, say('What is that?'), { type: 'end' }]);
    expect(ended.result?.counts.avoid).toBe(1);
    expect(run([{ type: 'dispute', index: 0 }], ended).result?.counts.avoid).toBe(0);
  });

  it('end gives a result and a farewell, and the result leaves out disputed and uncoded sentences', () => {
    const s = run([START, say('You made a tower.'), say('你好'), { type: 'end' }]);
    expect(s.phase).toBe('ended');
    expect(s.result?.counts.reflection).toBe(1);
    expect(s.result?.counts.target).toBe(1);
    expect(s.result?.lever).not.toBeNull();
    expect(s.farewell).toBeTruthy();
  });
});

describe('reducer contract', () => {
  it('returns the same state for events in the wrong phase', () => {
    const idle = initialRound();
    for (const e of [tick(1), say('Nice tower!'), { type: 'copy' }, { type: 'wait' }, { type: 'end' }, { type: 'dispute', index: 0 }] as RoundEvent[]) {
      expect(roundReducer(idle, e)).toBe(idle);
    }
    const running = run([START]);
    expect(roundReducer(running, { ...START, seed: 99 })).toBe(running);
    const ended = run([{ type: 'end' }], running);
    for (const e of [tick(1), say('Nice tower!'), { type: 'copy' }, { type: 'end' }] as RoundEvent[]) {
      expect(roundReducer(ended, e)).toBe(ended);
    }
    expect(roundReducer(ended, START).phase).toBe('running');
  });

  const SCRIPT: RoundEvent[] = [
    START,
    say('You made a tower.'),
    tick(9),
    say('Great job stacking so gently. What is that?'),
    { type: 'copy' },
    tick(20.5),
    { type: 'wait' },
    { type: 'dispute', index: 2 },
    tick(100),
    say('Stop that!'),
    tick(400),
    { type: 'dispute', index: 0 },
  ];

  it('gives deeply equal states for the same events', () => {
    const a = run(SCRIPT);
    expect(a.phase).toBe('ended');
    expect(run(SCRIPT)).toEqual(a);
    expect(run(SCRIPT.map((e) => (e.type === 'start' ? { ...e, seed: 8 } : e))).beats).not.toEqual(a.beats);
  });

  it('never mutates its input', () => {
    let s = deepFreeze(initialRound());
    for (const e of SCRIPT) s = deepFreeze(roundReducer(s, e));
    expect(s.phase).toBe('ended');
  });
});

describe('live play with a real child', () => {
  const LIVE: RoundEvent = { type: 'start', sceneId: 'blocks', seconds: 60, seed: 3, live: true };

  it('has no simulated child: no opening line and no beats', () => {
    const s = [LIVE, { type: 'tick', dtSec: 30 } as RoundEvent].reduce(roundReducer, initialRound());
    expect(s.live).toBe(true);
    expect(s.beats).toHaveLength(0);
    expect(s.child.lastSaid).toBeNull();
    expect(s.childSpokeSec).toBeNull();
  });
  it('codes the parent and judges the round without reflections', () => {
    const events: RoundEvent[] = [
      LIVE,
      { type: 'say', text: "You're stacking the blocks." },
      { type: 'say', text: 'You put the red one on top.' },
      { type: 'say', text: 'Great job stacking so gently.' },
      { type: 'say', text: 'Nice job waiting your turn.' },
      { type: 'tick', dtSec: 60 },
    ];
    const s = events.reduce(roundReducer, initialRound());
    expect(s.phase).toBe('ended');
    expect(s.result?.targets.reflection).toBe(0);
    expect(s.result?.met).toBe(true);
    expect(s.result?.lever).toBeNull();
    expect(s.farewell).toBeNull();
    expect(ringProgress(s).reflection.target).toBe(0);
  });
  it('never names reflections as the lever in live play', () => {
    const s = [LIVE, { type: 'say', text: 'Nice tower!' } as RoundEvent, { type: 'end' } as RoundEvent].reduce(roundReducer, initialRound());
    expect(s.result?.lever).not.toBe('reflection');
    expect(s.result?.lever).toBe('description');
  });
  it("still nudges for specific praise, and never asks to say back the child's words, which it cannot tell from the parent's", () => {
    let s = [LIVE].reduce(roundReducer, initialRound());
    s = roundReducer(s, { type: 'tick', dtSec: 41 });
    expect(s.coach?.kind).toBe('praise_now');
  });
});

describe('outbursts are waited out, not answered (E1)', () => {
  const latest = (s: RoundState) => s.beats[s.beats.length - 1];
  /** Eight sharp corrections in the first second drive her to a meltdown on the next beat. */
  const scolded = (sceneId: string): RoundState => {
    let s = run([{ type: 'start', sceneId, seconds: 300, seed: 1001 }]);
    for (let n = 1; n <= 8; n++) s = run([say(`Stop that number ${n}`)], s);
    return s;
  };

  it('shows wait_out and never reflect_now while she melts down, in all four scenes', () => {
    for (const scene of SCENES) {
      let s = scolded(scene.id);
      expect(s.sentences.map((x) => x.code), scene.id).toEqual(Array(8).fill('criticism'));
      let meltdowns = 0;
      let outbursts = 0;
      for (let t = 0; t < 120 * 4; t++) {
        s = run([tick(0.25)], s);
        const at = `${scene.id} at ${s.elapsedSec}s`;
        if (latest(s).kind === 'meltdown') {
          meltdowns += 1;
          expect(latest(s).says, at).toBe('No!');
          expect(s.coach, at).toEqual({ kind: 'wait_out', text: WAIT_OUT_TEXT });
        }
        if (isOutburst(latest(s).kind)) {
          outbursts += 1;
          expect(s.coach?.kind, at).toBe('wait_out');
        }
        expect(isOutburst(latest(s).kind) && s.coach?.kind === 'reflect_now', at).toBe(false);
      }
      expect(meltdowns, scene.id).toBeGreaterThan(0);
      expect(outbursts, scene.id).toBeGreaterThan(meltdowns);
    }
  });

  it('puts the line up at once on the outburst beat, and once for a run of outburst beats', () => {
    let s = run([tick(7)], scolded('blocks'));
    expect(latest(s)).toMatchObject({ kind: 'meltdown', atSec: 7 });
    // The swap line for the last "Stop that" went up at 0 s; the outburst does not wait for any gap.
    expect(s.coach).toEqual({ kind: 'wait_out', text: 'She is upset. Stay close and quiet, then praise the first calm thing she does.' });
    expect(s.lastPromptSec).toBe(7);
    const line = s.coach;
    s = run([tick(7), tick(7)], s);
    expect(s.beats.slice(-3).every((b) => isOutburst(b.kind))).toBe(true);
    // Same line object, not a new prompt: nothing is announced a second time.
    expect(s.coach).toBe(line);
    expect(s.lastPromptSec).toBe(7);
  });

  it('a swap line takes its place, and wait_out comes back on her next outburst beat', () => {
    let s = run([tick(8), say('Stop it right now.')], scolded('blocks'));
    expect(s.coach?.kind).toBe('swap');
    s = run([tick(5)], s);
    expect(s.coach?.kind).toBe('swap');
    s = run([tick(1)], s);
    expect(latest(s)).toMatchObject({ kind: 'meltdown', atSec: 14 });
    expect(s.coach?.kind).toBe('wait_out');
  });

  it('holds its praise for the parent during an outburst; her complaint said back is still a reflection', () => {
    // Blocks: she whines on beat 5 whatever the parent did.
    let s = run([START, tick(35)]);
    expect(latest(s).kind).toBe('scripted_whine');
    expect(s.coach?.kind).toBe('wait_out');
    const before = ringProgress(s).reflection.count;
    s = run([tick(1), say(latest(s).says!)], s);
    expect(s.sentences[s.sentences.length - 1].code).toBe('reflection');
    expect(ringProgress(s).reflection.count).toBe(before + 1);
    expect(s.coach?.kind).toBe('wait_out');
    // Praise during the outburst is counted, and is not the praise for calm the coach will ask for.
    s = run([tick(1), say('Great job stacking so gently.')], s);
    expect(s.sentences[s.sentences.length - 1].code).toBe('specific_praise');
    expect(s.coach?.kind).toBe('wait_out');
    expect(s.calmPraiseDue).toBe(true);
  });

  it('asks for praise on the first calm beat, once, and not after the parent has praised her calm', () => {
    let s = scolded('blocks');
    while (isOutburst(latest(s).kind) || s.beats.length === 1) s = run([tick(0.25)], s);
    expect(s.elapsedSec).toBe(latest(s).atSec);
    expect(s.coach).toEqual({ kind: 'praise_now', text: 'She is calm again. Praise that: “Thank you for using your calm voice.”' });
    expect(s.coach?.text).toBe(CALM_PRAISE_TEXT);
    expect(s.calmPraiseDue).toBe(false);
    const askedAt = s.lastPromptSec;
    // The quoted example is specific praise when the parent says it.
    const praised = run([tick(REACT_GAP), say('Thank you for using your calm voice.')], s);
    expect(praised.sentences[praised.sentences.length - 1].code).toBe('specific_praise');
    expect(praised.coach?.kind).toBe('praise_parent');
    // With the parent silent it is not asked a second time for this outburst.
    let quiet = s;
    for (let t = 0; t < 14 * 4 && !isOutburst(latest(quiet).kind); t++) {
      quiet = run([tick(0.25)], quiet);
      if (quiet.coach?.text === CALM_PRAISE_TEXT) expect(quiet.lastPromptSec).toBe(askedAt);
    }
  });

  it('praise given once she is calm, before the line could go up, cancels it', () => {
    // A swap line a moment before the calm beat gets its few seconds first; the parent praises in that time.
    // In blocks she is upset from 7 s and calm again on the beat at 56 s.
    let s = run([tick(55.75)], scolded('blocks'));
    expect(isOutburst(latest(s).kind)).toBe(true);
    s = run([say('What is that?'), tick(0.25)], s);
    expect(latest(s).atSec).toBe(56);
    expect(isOutburst(latest(s).kind)).toBe(false);
    expect(s.coach?.kind).toBe('swap');
    expect(s.calmPraiseDue).toBe(true);
    const praised = run([tick(1), say('Thank you for using your calm voice.')], s);
    expect(praised.calmPraiseDue).toBe(false);
    expect(run([tick(REACT_GAP)], praised).coach?.text).not.toBe(CALM_PRAISE_TEXT);
    // Left alone, the line goes up once the swap line has had its time.
    expect(run([tick(REACT_GAP)], s).coach?.text).toBe(CALM_PRAISE_TEXT);
  });

  it('never asks to say back a whine, a meltdown or a line with no content word, whatever the seed', () => {
    let asked = 0;
    for (const scene of SCENES) {
      for (let seed = 1; seed <= 25; seed++) {
        // A silent parent, and one who snaps every ten seconds.
        for (const snaps of [false, true]) {
          let s = run([{ type: 'start', sceneId: scene.id, seconds: 120, seed }]);
          while (s.phase === 'running') {
            if (snaps && s.elapsedSec % 10 === 0) s = run([say('No, not like that.')], s);
            s = run([tick(0.5)], s);
            if (s.phase !== 'running' || s.coach?.kind !== 'reflect_now') continue;
            asked += 1;
            const at = `${scene.id} seed ${seed} at ${s.elapsedSec}s`;
            const spoke = [...s.beats].reverse().find((b) => b.says !== null)!;
            expect(isOutburst(latest(s).kind), at).toBe(false);
            expect(isOutburst(spoke.kind), at).toBe(false);
            expect(spoke.says, at).not.toBe('No!');
          }
        }
      }
    }
    // The nudge itself is still there for her play lines.
    expect(asked).toBeGreaterThan(100);
  });

  it('does not ask to say back a line with no content word, even on a calm beat', () => {
    const started = run([START]);
    expect(run([tick(5)], started).coach?.kind).toBe('reflect_now');
    // The same moment with "No!" as her line: nothing said back could be a reflection, so it is not asked for.
    const no: RoundState = { ...started, child: { ...started.child, lastSaid: 'No!' }, beats: [{ ...started.beats[0], says: 'No!' }] };
    let s = no;
    for (let t = 0; t < 6.75; t += 0.25) {
      s = run([tick(0.25)], s);
      expect(s.coach?.kind, `at ${s.elapsedSec}s`).not.toBe('reflect_now');
    }
    // A reflect_now that was showing comes down when her line turns into one that cannot be said back.
    const showing = run([tick(5)], started);
    const turned: RoundState = { ...showing, child: { ...showing.child, lastSaid: 'No!' } };
    expect(run([tick(0.25)], turned).coach).toBeNull();
  });

  it('does not ask to say back a whine once she is calm, at any beat pace; said back, it is still a reflection', () => {
    const started = run([{ ...START, beatEverySec: 30 }]);
    const whine: RoundState['beats'][number] = { kind: 'whine', does: BLOCKS.whine.does, says: "I can't do it!", atSec: 0 };
    const calm: RoundState['beats'][number] = { kind: 'play', does: BLOCKS.actions[4].does, says: null, atSec: 0 };
    const after: RoundState = { ...started, child: { ...started.child, lastSaid: "I can't do it!" }, beats: [whine, calm] };
    let s = after;
    for (let t = 0; t < 29; t++) {
      s = run([tick(1)], s);
      expect(s.coach?.kind, `at ${s.elapsedSec}s`).not.toBe('reflect_now');
    }
    // The same state with a play line of hers does get the nudge.
    const play: RoundState = { ...after, child: { ...after.child, lastSaid: 'It is wobbly.' }, beats: [{ ...calm, says: 'It is wobbly.' }] };
    expect(run([tick(5)], play).coach?.kind).toBe('reflect_now');
    const saidBack = run([tick(2), say("You can't do it.")], after);
    expect(saidBack.sentences[0].code).toBe('reflection');
    expect(ringProgress(saidBack).avoid.count).toBe(0);
  });

  it('live play has no simulated outbursts and no wait_out', () => {
    let s = run([{ ...START, live: true }]);
    for (let t = 0; t < 300 && s.phase === 'running'; t++) {
      s = run([tick(1)], s);
      expect(s.coach?.kind).not.toBe('wait_out');
    }
    expect(s.calmPraiseDue).toBe(false);
  });
});

describe('one turn counts at most three target sentences (E3)', () => {
  const TEN = [
    'You are stacking the blocks.',
    'You put the red one on top.',
    'You are lining up the cars.',
    'You picked a green block.',
    'You are pushing the train.',
    'You found the blue one.',
    'You are rolling the ball.',
    'You opened the box.',
    'You are filling the cup.',
    'You closed the lid.',
  ];

  it('counts the first three of a paste of ten descriptions and keeps the rest as neutral talk', () => {
    expect(MAX_COUNTED_PER_TURN).toBe(3);
    expect(TURN_CAP_NOTE).toBe('One turn counts up to three sentences.');
    const started = run([START, tick(1)]);
    const s = run([say(TEN.join(' '))], started);
    expect(s.sentences).toHaveLength(10);
    expect(s.sentences.slice(0, 3).map((x) => [x.code, x.capped])).toEqual(Array(3).fill(['description', false]));
    for (const x of s.sentences.slice(3)) expect(x).toMatchObject({ code: 'neutral', bucket: 'neutral', rule: 'turn_cap', capped: true, repeat: false });
    expect(ringProgress(s).description.count).toBe(3);
    expect(run([{ type: 'end' }], s).result?.counts).toMatchObject({ description: 3, target: 3, neutral: 7 });
    // The seven beyond the cap do not move Mia or the combo, and the coach still answers the last counted one.
    const three = run([say(TEN.slice(0, 3).join(' '))], started);
    expect(s.child).toEqual(three.child);
    expect(s.combo).toBe(3);
    expect(s.coach?.kind).toBe('praise_parent');
    expect(s.microReaction).toBe(three.microReaction);
  });

  it('counts across the three skills together, not three of each', () => {
    const s = run([START, say('You made a tower. Great job stacking so gently. You are lining up the cars. You are pushing the train. Nice job waiting your turn.')]);
    expect(s.sentences.map((x) => [x.code, x.capped])).toEqual([
      ['reflection', false],
      ['specific_praise', false],
      ['description', false],
      ['neutral', true],
      ['neutral', true],
    ]);
    // The praise beyond the cap named a habit; it does not shape her either.
    expect(s.child.habits.patient).toBe(run([START]).child.habits.patient);
  });

  it('always counts questions, commands and criticism, however many', () => {
    const s = run([START, say(`${TEN.slice(0, 4).join(' ')} What is that? Why is it red? Put it down. Give it to me. No, not like that.`)]);
    expect(s.sentences.filter((x) => x.capped)).toHaveLength(1);
    expect(ringProgress(s).description.count).toBe(3);
    expect(ringProgress(s).avoid.count).toBe(5);
    expect(s.sentences.filter((x) => x.bucket === 'avoid').every((x) => !x.capped && !x.repeat)).toBe(true);
  });

  it('a sentence beyond the cap counts when it is said again as its own turn', () => {
    let s = run([START, say(TEN.join(' '))]);
    s = run([tick(2), say(TEN[5])], s);
    expect(s.sentences[10]).toMatchObject({ code: 'description', capped: false, repeat: false });
    expect(ringProgress(s).description.count).toBe(4);
    // Three turns of three fill the ring as fast as typing them would.
    expect(ringProgress(run([START, say(TEN.slice(0, 3).join(' ')), say(TEN.slice(3, 6).join(' ')), say(TEN.slice(6, 9).join(' '))])).description.count).toBe(9);
  });

  it('a repeat does not use up the cap', () => {
    const s = run([START, say(`${TEN[0]} ${TEN[0]} ${TEN[1]} ${TEN[2]} ${TEN[3]}`)]);
    expect(s.sentences.map((x) => [x.rule === 'repeat', x.capped])).toEqual([
      [false, false],
      [true, false],
      [false, false],
      [false, false],
      [false, true],
    ]);
  });
});

describe('near-repeats (E4)', () => {
  const each = (lines: string[]): RoundState => run([{ ...START, live: true }, ...lines.flatMap((l) => [say(l), tick(1)])]);

  it('changing the article, the number or the name does not make a description new', () => {
    const s = each(['You are stacking the block.', 'You are stacking a block.', 'You are stacking that block.', 'You are stacking blocks.', "You're stacking the blocks, Mia."]);
    expect(ringProgress(s).description.count).toBe(1);
    expect(s.sentences.slice(1).every((x) => x.repeat && x.rule === 'repeat')).toBe(true);
  });

  it('changing the praise word does not make a praise new', () => {
    const s = each(['Nice stacking.', 'Great stacking.', 'Good stacking.', 'Nice stacking Mia.', 'Really nice stacking, sweetie.']);
    expect(s.sentences[0].code).toBe('specific_praise');
    expect(ringProgress(s).specific_praise.count).toBe(1);
    expect(s.sentences.slice(1).every((x) => x.repeat)).toBe(true);
  });

  it('folds -ing and -ed: the same thing in another tense is the same thing', () => {
    expect(ringProgress(each(['You are stacking the blocks.', 'You stacked the blocks.'])).description.count).toBe(1);
    expect(ringProgress(each(['You are putting the cars in the bin.', 'You put the car in the bin.'])).description.count).toBe(1);
  });

  it('an honest different sentence still counts', () => {
    expect(ringProgress(each(['You are stacking the red block.', 'You are stacking the blue block.'])).description.count).toBe(2);
    expect(ringProgress(each(['You put it on top.', 'You put it next to the car.'])).description.count).toBe(2);
    expect(ringProgress(each(['You are stacking the blocks.', 'You are lining up the blocks.', 'You are stacking the cups.'])).description.count).toBe(3);
    expect(ringProgress(each(['Nice stacking.', 'Nice sharing.', 'Nice waiting.'])).specific_praise.count).toBe(3);
  });

  it('the window stays twenty seconds', () => {
    expect(REPEAT_WINDOW_SEC).toBe(20);
    const s = run([{ ...START, live: true }, say('You are stacking the block.'), tick(REPEAT_WINDOW_SEC + 1), say('You are stacking a block.')]);
    expect(ringProgress(s).description.count).toBe(2);
  });

  it('the key is the sorted set of content-word stems', () => {
    expect(repeatKey('You are stacking the blocks!')).toBe('block stack');
    expect(repeatKey('Blocks, you stacked, Mia')).toBe('block stack');
    expect(repeatKey('Great stacking.')).toBe(repeatKey('I love your stacking, honey.'));
    expect(repeatKey('You are stacking the red block.')).not.toBe(repeatKey('You are stacking the blue block.'));
    // Nothing but dropped words: the plain text is the key, so "ok" and "yes" stay two different things.
    expect(repeatKey('OK!')).toBe('ok');
    expect(repeatKey('ok')).not.toBe(repeatKey('yes'));
  });
});

describe('"Disagree?" has a limit (E5)', () => {
  const FIVE = [START, say('Put it here.'), say('Give me that.'), say('Sit down.'), say('No, not like that.'), say('Stop it.')];
  const disputeAt = (index: number): RoundEvent => ({ type: 'dispute', index });

  // Changed by design: a fourth tap used to return the very same state, so the button did nothing and said nothing.
  // It still changes no sentence and no count; while the round runs it now puts up one line that says why.
  it('sets aside at most three sentences a round; one more changes no count and says why', () => {
    expect(MAX_DISPUTES).toBe(3);
    const s = run(FIVE);
    expect(s.disputesLeft).toBe(3);
    expect(ringProgress(s).avoid.count).toBe(5);
    const three = run([disputeAt(0), disputeAt(1), disputeAt(2)], s);
    expect(three.disputesLeft).toBe(0);
    expect(ringProgress(three).avoid.count).toBe(2);
    for (const index of [3, 4]) {
      const refused = run([disputeAt(index)], three);
      expect(refused.sentences).toBe(three.sentences);
      expect(refused.disputesLeft).toBe(0);
      expect(ringProgress(refused)).toEqual(ringProgress(three));
      expect(refused.coach).toEqual({ kind: 'swap', text: DISPUTES_USED_NOTE });
      expect({ ...refused, coach: three.coach, lastPromptSec: three.lastPromptSec }).toEqual(three);
    }
    const ended = run([disputeAt(3), disputeAt(4), tick(300)], three);
    expect(ended.result?.counts.avoid).toBe(2);
    expect(ended.result?.disputed).toBe(3);
    // Nor in the replay after the round.
    expect(run([disputeAt(3)], ended)).toBe(ended);
  });

  it('taking a dispute back frees its slot', () => {
    const three = run([...FIVE, disputeAt(0), disputeAt(1), disputeAt(2)]);
    const undone = run([disputeAt(1)], three);
    expect(undone.disputesLeft).toBe(1);
    expect(undone.sentences[1].disputed).toBe(false);
    const again = run([disputeAt(4)], undone);
    expect(again.disputesLeft).toBe(0);
    expect(again.sentences.map((x) => x.disputed)).toEqual([true, false, true, false, true]);
  });

  it('a round cannot be disputed into meeting the pace', () => {
    const live: RoundEvent = { type: 'start', sceneId: 'blocks', seconds: 60, seed: 3, live: true };
    const play = [live, say("You're stacking the blocks."), say('You put the red one on top.'), say('Great job stacking so gently.'), say('Nice job waiting your turn.')];
    const commands = ['Put it here.', 'Give me that.', 'Sit down.', 'Come here.'].map(say);
    const s = run([...play, ...commands, disputeAt(4), disputeAt(5), disputeAt(6), disputeAt(7), tick(60)]);
    expect(s.result?.counts.avoid).toBe(1);
    expect(s.result?.met).toBe(false);
    expect(s.result?.disputed).toBe(3);
  });

  it('the result carries the number set aside only when there is one', () => {
    const none = run([...FIVE, { type: 'end' }]);
    expect(none.result).not.toHaveProperty('disputed');
    const one = run([disputeAt(0)], none);
    expect(one.result?.disputed).toBe(1);
    expect(run([disputeAt(0)], one).result).not.toHaveProperty('disputed');
    expect(run([START]).disputesLeft).toBe(3);
  });
});

describe('"Disagree?" on a sentence that counts for nothing is free', () => {
  const disputeAt = (index: number): RoundEvent => ({ type: 'dispute', index });

  it('a repeat set aside takes no place and changes no ring', () => {
    let s = run([START, tick(3), say('You are stacking the blocks.'), tick(2), say('You are stacking the blocks.')]);
    expect(s.sentences.map((x) => x.rule)).toEqual(['you_are_doing', 'repeat']);
    const before = ringProgress(s);
    s = run([disputeAt(1)], s);
    expect(s.sentences[1].disputed).toBe(true);
    expect(s.disputesLeft).toBe(MAX_DISPUTES);
    expect(ringProgress(s)).toEqual(before);
    // Taking it back gives no extra place either.
    s = run([disputeAt(1)], s);
    expect(s.sentences[1].disputed).toBe(false);
    expect(s.disputesLeft).toBe(MAX_DISPUTES);
  });

  it('capped sentences, neutral talk and general praise are free; a question and a command still take a place each', () => {
    const paste = 'You are stacking the red block. You are building a tall tower. You are lining up the green blocks. You are rolling the car. You are pouring juice.';
    let s = run([START, tick(3), say(paste), tick(7), say('Good job!'), tick(1), say('Hmm.'), tick(7), say('What is that?'), tick(7), say('Put it here.')]);
    expect(s.sentences.map((x) => x.rule).slice(3, 5)).toEqual(['turn_cap', 'turn_cap']);
    s = run([disputeAt(3), disputeAt(4), disputeAt(5), disputeAt(6)], s);
    expect(s.disputesLeft).toBe(3);
    expect(ringProgress(s).avoid.count).toBe(2);
    s = run([disputeAt(7)], s);
    expect(s.disputesLeft).toBe(2);
    expect(ringProgress(s).avoid.count).toBe(1);
    s = run([disputeAt(8)], s);
    expect(s.sentences[8].disputed).toBe(true);
    expect(s.disputesLeft).toBe(1);
    expect(ringProgress(s).avoid.count).toBe(0);
    // A description that filled a ring takes a place too.
    s = run([disputeAt(0)], s);
    expect(s.disputesLeft).toBe(0);
    expect(ringProgress(s).description.count).toBe(2);
  });

  it('the line for a refused tap is calm, and is not shown in the replay after the round', () => {
    expect(DISPUTES_USED_NOTE).not.toMatch(/\b(wrong|bad|mistake|fail\w*|should|don['’]t|dont)\b/i);
    expect(DISPUTES_USED_NOTE.replace(/“[^”]*”/g, '')).not.toContain('!');
    expect(DISPUTES_USED_NOTE.length).toBeLessThan(90);
    const ended = run([START, say('Put it here.'), say('Give me that.'), say('Sit down.'), say('Stop it.'), disputeAt(0), disputeAt(1), disputeAt(2), { type: 'end' }]);
    expect(run([disputeAt(3)], ended)).toBe(ended);
  });
});

describe('a description that names a toy from her line', () => {
  const at = (s: RoundState, sec: number): RoundState => run([tick(sec - s.elapsedSec)], s);

  it('is a description, and her real line said back after it is the reflection', () => {
    // The daily round as the screen starts it. At 70 s: "Mia slides the orange crayon over to you." / "You can have orange."
    let s = at(run([{ type: 'start', sceneId: 'drawing', seconds: 300, seed: 1002 }]), 72);
    expect(s.child.lastSaid).toBe('You can have orange.');
    s = run([say('You are sliding the orange crayon over to me.')], s);
    expect(s.sentences[0]).toMatchObject({ code: 'description', rule: 'you_are_doing' });
    s = run([say('You can have orange.')], at(s, 75));
    expect(s.sentences[1]).toMatchObject({ code: 'reflection', rule: 'echoes_child' });
    expect(ringProgress(s)).toMatchObject({ description: { count: 1 }, reflection: { count: 1 } });
  });

  it('holds through the typing grace for her previous line', () => {
    // She said "This block is for you.", then moved on to "This one goes on top."
    let s = run([START]);
    s = { ...s, child: { ...s.child, lastSaid: 'This one goes on top.' }, prevSaid: 'This block is for you.', prevSaidUntilSec: 30, prevReflected: false, elapsedSec: 10 };
    s = run([say('You are setting a blue block down very gently.')], s);
    expect(s.sentences[0].code).toBe('description');
    // The grace itself still works: her previous line said back is a reflection.
    s = run([say('This block is for me.')], s);
    expect(s.sentences[1].code).toBe('reflection');
    expect(s.prevReflected).toBe(true);
  });

  it('an honest round of describe, say back, praise fills all three rings', () => {
    const beats: Record<string, [string, string]> = {
      'I made a tower!': ['You are stacking a red block on the tower.', 'I love how carefully you stacked that block.'],
      'This one goes on top.': ['You are setting a blue block down very gently.', 'Great job setting it down so gently.'],
      'This block is for you.': ['You are handing me a yellow block.', 'Thank you for sharing the yellow block.'],
      'It is a train.': ['You are lining up three green blocks.', 'I like how you lined up the green blocks.'],
      'It is wobbly.': ['You are waiting for the tower.', 'Nice job waiting so patiently.'],
      'All clean.': ['You are putting the extra blocks back in the box.', 'Thank you for putting the blocks back.'],
      'The cars go under here.': ['You are building a little bridge.', 'I love the bridge you built.'],
      'Look, it stays!': ['You are balancing a small block on a big one.', 'Great job balancing the small block.'],
    };
    let s = run([{ type: 'start', sceneId: 'blocks', seconds: 300, seed: 11 }]);
    let answered = -1;
    for (let sec = 2; sec < 300; sec += 1) {
      s = at(s, sec);
      const beat = s.beats.length - 1;
      const line = s.child.lastSaid;
      if (beat === answered || line === null || !(line in beats) || sec - s.beats[beat].atSec < 2) continue;
      answered = beat;
      s = run([say(beats[line][0])], s);
      s = run([say(line)], at(s, sec + 2));
      s = run([say(beats[line][1])], at(s, sec + 4));
    }
    // Every description that followed a line of hers was coded as a description, never as that line said back.
    const described = s.sentences.filter((x) => /^You are /.test(x.text));
    expect(described.length).toBeGreaterThan(8);
    expect(described.filter((x) => x.code === 'reflection')).toEqual([]);
    const r = ringProgress(s);
    expect(r.description.count).toBeGreaterThanOrEqual(8);
    expect(r.reflection.count).toBeGreaterThanOrEqual(8);
    expect(r.avoid.count).toBe(0);
  });
});

describe('her last line can be said back until she says the next one', () => {
  const at = (s: RoundState, sec: number): RoundState => run([tick(sec - s.elapsedSec)], s);
  const first60: RoundEvent = { type: 'start', sceneId: 'blocks', seconds: 60, seed: 1 };

  it('her whine said back 14 seconds later is a reflection, not a correction of her', () => {
    // The first-visit round: the scripted whine at 35 s is "This is too hard."; she is silent at 42 s and 49 s.
    for (const sec of [48.75, 49, 52]) {
      let s = at(run([first60]), sec);
      expect(s.beats.filter((b) => b.says !== null).pop()?.says).toBe('This is too hard.');
      if (sec >= 49) expect(s.child.lastSaid).toBeNull();
      s = run([say('This is too hard.')], s);
      expect(s.sentences[0], String(sec)).toMatchObject({ code: 'reflection', rule: 'echoes_child' });
      expect(ringProgress(s).avoid.count).toBe(0);
      expect(s.coach?.text ?? '').not.toContain('Let small things pass');
    }
  });

  it('a line of hers that has left the screen is still hers', () => {
    let s = at(run([{ type: 'start', sceneId: 'drawing', seconds: 40, seed: 2 }]), 21);
    expect(s.child.lastSaid).toBeNull();
    expect(s.beats.filter((b) => b.says !== null).pop()).toMatchObject({ says: 'The dog is hungry.', atSec: 7 });
    s = run([say('The dog is hungry.')], s);
    expect(s.sentences[0].code).toBe('reflection');
    // One line of hers, one reflection: said back again it is a repeat.
    s = run([say('The dog is hungry.')], at(s, 23));
    expect(s.sentences[1]).toMatchObject({ code: 'neutral', rule: 'repeat' });
  });

  it('"You messed up." after her "I messed up." is never a correction, however late', () => {
    let s = run([{ type: 'start', sceneId: 'drawing', seconds: 300, seed: 1 }]);
    s = { ...s, child: { ...s.child, lastSaid: null }, beats: [...s.beats, { kind: 'whine', does: 'Mia presses the crayon down hard and huffs.', says: 'I messed up.', atSec: 7 }], elapsedSec: 40 };
    s = run([say('You messed up.')], s);
    expect(s.sentences[0].code).toBe('reflection');
  });

  it('a description typed while she is silent stays a description, and her bare "No!" said back stays neutral', () => {
    let s = at(run([first60]), 52);
    s = run([say('You are stacking a red block on the tower.')], s);
    expect(s.sentences[0].code).toBe('description');
    let no = run([START]);
    no = { ...no, child: { ...no.child, lastSaid: null }, beats: [...no.beats, { kind: 'meltdown', does: 'Mia throws a block across the room.', says: 'No!', atSec: 7 }], elapsedSec: 30 };
    no = run([say('No!')], no);
    expect(no.sentences[0]).toMatchObject({ code: 'neutral', rule: 'echoes_no' });
  });

  it('the nudge to say it back still stops when her line leaves the screen', () => {
    let s = at(run([first60]), 49);
    expect(s.child.lastSaid).toBeNull();
    s = at(s, 59);
    expect(s.coach?.kind).not.toBe('reflect_now');
  });
});

describe('a paste, a loop or a template does not meet the pace', () => {
  const at = (s: RoundState, sec: number): RoundState => run([tick(sec - s.elapsedSec)], s);
  const start300 = (live: boolean): RoundState => run([{ type: 'start', sceneId: 'blocks', seconds: 300, seed: 3, live }]);
  const X = [
    'stacking the red blocks', 'building a tall tower', 'lining up the green blocks', 'putting the blue block on top', 'making a long bridge',
    'rolling the yellow car', 'drawing a big circle', 'coloring the sun yellow', 'holding the orange crayon', 'pouring the juice',
  ];
  const PARAGRAPH = [...X.map((x) => `You are ${x}.`), ...X.map((x) => `I love how carefully you are ${x}.`)].join(' ');

  it('the same paragraph pasted twelve times is read four sentences deep, not three more each time', () => {
    for (const gap of [1, 7]) {
      let s = start300(true);
      for (let i = 0; i < 12; i++) s = run([say(PARAGRAPH)], at(s, 2 + i * gap));
      s = at(s, 300);
      expect(s.result?.counts.description, `gap ${gap}`).toBeLessThanOrEqual(MAX_COUNTED_PER_TURN + 1);
      expect(s.result?.counts.specific_praise).toBe(0);
      expect(s.result?.met).toBe(false);
    }
    // With her line said back in front of it, in practice.
    let s = start300(false);
    for (let i = 0; i < 12; i++) {
      s = at(s, 2 + i * 7);
      s = run([say(`${s.child.lastSaid ?? ''} ${PARAGRAPH}`)], s);
    }
    s = at(s, 300);
    expect(s.result?.counts.description).toBeLessThanOrEqual(MAX_COUNTED_PER_TURN + 1);
    expect(s.result?.met).toBe(false);
  });

  it('a turn of one repeat and three new sentences still counts all three', () => {
    let s = run([START, tick(2), say('You are stacking the blocks.'), tick(3)]);
    s = run([say('You are stacking the blocks. You are building a bridge. You are rolling the car. I love how gently you set that down.')], s);
    expect(s.sentences.slice(1).map((x) => x.rule)).toEqual(['repeat', 'you_are_doing', 'you_are_doing', 'praise_plus_what']);
    expect(ringProgress(s)).toMatchObject({ description: { count: 3 }, specific_praise: { count: 1 } });
  });

  it('the same two or three sentences said every 21 seconds stop filling their rings after four times', () => {
    expect(MAX_SAME_PER_ROUND).toBe(4);
    let sim = start300(false);
    for (let sec = 2; sec < 300; sec += 21) {
      sim = at(sim, sec);
      sim = run([say(`You are stacking the blocks. I love how carefully you are stacking. ${sim.child.lastSaid ?? ''}`)], sim);
    }
    sim = at(sim, 300);
    expect(sim.result?.counts).toMatchObject({ description: 4, specific_praise: 4 });
    expect(sim.result?.met).toBe(false);

    let live = start300(true);
    for (let sec = 2; sec < 300; sec += 21) live = run([say('You are stacking the blocks. I love how carefully you are stacking. You made a tower!')], at(live, sec));
    live = at(live, 300);
    expect(live.result?.counts).toMatchObject({ description: 8, specific_praise: 4 });
    expect(live.result?.met).toBe(false);

    let alternating = start300(true);
    let i = 0;
    for (let sec = 2; sec < 300; sec += 10.5) alternating = run([say(i++ % 2 ? 'I love how carefully you are stacking.' : 'You are stacking the blocks.')], at(alternating, sec));
    alternating = at(alternating, 300);
    expect(alternating.result?.counts).toMatchObject({ description: 4, specific_praise: 4 });
    expect(alternating.result?.met).toBe(false);
    // The fifth saying is listed as a repeat, with the note the chip shows.
    expect(alternating.sentences.filter((x) => x.repeat).length).toBeGreaterThan(10);
  });

  it('swapping a color, a number or a name does not make a new sentence all round long', () => {
    const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'brown'];
    const NUMBERS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    const NAMES = [', Mia', ', sweetie', ', honey', ', buddy', ', Anna', ', Tom', ', Aiden', ', Zoe', ', Leo'];
    const templates: [string, (i: number) => string][] = [
      ['color', (i) => `You are stacking the ${COLORS[i % 10]} block. I love how you are stacking the ${COLORS[i % 10]} block.`],
      ['number word', (i) => `You are stacking ${NUMBERS[i % 10]} blocks. I love how you are stacking ${NUMBERS[i % 10]} blocks.`],
      ['digit', (i) => `You are stacking ${i + 1} blocks. I love how you are stacking ${i + 1} blocks.`],
      ['name', (i) => `You are stacking the blocks${NAMES[i % 9]}. I love how you are stacking the blocks${NAMES[i % 9]}.`],
    ];
    for (const live of [false, true]) {
      for (const [label, template] of templates) {
        let s = start300(live);
        let i = 0;
        for (let sec = 2; sec < 300; sec += 7) {
          s = at(s, sec);
          s = run([say(`${template(i++)} ${live ? '' : (s.child.lastSaid ?? '')}`)], s);
        }
        s = at(s, 300);
        expect(s.result?.counts, `${label} ${live}`).toMatchObject({ description: MAX_SAME_PER_ROUND, specific_praise: MAX_SAME_PER_ROUND });
        expect(s.result?.met, `${label} ${live}`).toBe(false);
      }
    }
  });

  it('the skeleton drops what a template swaps and keeps what makes a sentence new', () => {
    expect(skeletonKey('You are stacking the red block.')).toBe(skeletonKey('You are stacking the blue block.'));
    expect(skeletonKey('You are stacking 3 blocks, Anna.')).toBe(skeletonKey('Tom, you are stacking ten blocks again.'));
    expect(skeletonKey('You are stacking the red block.')).not.toBe(skeletonKey('You are rolling the red block.'));
    expect(skeletonKey('You are stacking the red block.')).not.toBe(skeletonKey('You are stacking the red cup.'));
    // The repeat window still tells red from blue.
    expect(repeatKey('You put the red one on top.')).not.toBe(repeatKey('You put the blue one on top.'));
    // A sentence that is only a color keeps a key of its own.
    expect(skeletonKey('Red.')).not.toBe(skeletonKey('Blue.'));
  });

  it('an honest parent is not caught: another color within twenty seconds, and the same words up to four times a round', () => {
    let s = run([START, tick(2), say('You put the red one on top.'), tick(3), say('You put the blue one on top.')]);
    expect(s.sentences.map((x) => x.code)).toEqual(['description', 'description']);
    // Mia does the same thing again later, and the parent describes it again: four times count, the fifth is a repeat.
    s = run([START]);
    for (let n = 0; n < 5; n++) s = run([tick(REPEAT_WINDOW_SEC + 2), say('You are stacking the blocks.')], s);
    expect(s.sentences.map((x) => x.rule)).toEqual(['you_are_doing', 'you_are_doing', 'you_are_doing', 'you_are_doing', 'repeat']);
    // Her own line said back is not limited this way: each line of hers is a new chance.
    s = run([START]);
    for (let n = 0; n < 6; n++) {
      s = { ...s, child: { ...s.child, lastSaid: 'I made a tower!' }, reflectedSinceChildSpoke: false, elapsedSec: s.elapsedSec + 25 };
      s = run([say('You made a tower!')], s);
    }
    expect(s.sentences.map((x) => x.code)).toEqual(Array(6).fill('reflection'));
  });
});

describe('the coach line after a repeat and during an outburst', () => {
  const at = (s: RoundState, sec: number): RoundState => run([tick(sec - s.elapsedSec)], s);

  it('every repeat-only turn gets the "already counted" line, also right after another line', () => {
    let s = at(run([START]), 3);
    s = run([say('You are stacking the blocks.')], s);
    expect(s.coach?.kind).toBe('praise_parent');
    s = run([say('You are stacking the blocks.')], at(s, 7));
    expect(s.sentences[1]).toMatchObject({ code: 'neutral', rule: 'repeat' });
    expect(s.coach).toEqual({ kind: 'swap', text: 'That one is already counted. Say something new you see.' });
    // A near-repeat too.
    let near = at(run([START]), 3);
    near = run([say('You put the red block on top.')], near);
    near = run([say('You put a red block on the top!')], at(near, 9));
    expect(near.sentences[1].rule).toBe('repeat');
    expect(near.coach?.text).toBe('That one is already counted. Say something new you see.');
    // After the window the same sentence counts again.
    s = run([say('You are stacking the blocks.')], at(s, 7 + REPEAT_WINDOW_SEC + 5));
    expect(s.sentences[2].code).toBe('description');
    expect(ringProgress(s).description.count).toBe(2);
  });

  it('a swap line typed during the second outburst beat in a row stays until the next beat', () => {
    // Whine beats at 35 s and 42 s; "Don't do that." lands at 48 s.
    let s = run([{ type: 'start', sceneId: 'blocks', seconds: 300, seed: 1 }]);
    const turns = ['What are you building?', 'Good job!', 'Is that a tower?', 'Put it here.', 'Nice!', "Don't do that."];
    turns.forEach((text, i) => {
      s = run([say(text)], at(s, 8 * (i + 1)));
    });
    expect(s.beats.slice(-2).map((b) => [b.atSec, isOutburst(b.kind)])).toEqual([[35, true], [42, true]]);
    expect(s.coach?.kind).toBe('swap');
    const swap = s.coach;
    for (let sec = 48.25; sec < 49; sec += 0.25) {
      s = at(s, sec);
      expect(s.coach, String(sec)).toEqual(swap);
    }
  });

  it('wait_out still goes up at once on an outburst beat, and comes back on the next one after a swap line', () => {
    let s = at(run([{ type: 'start', sceneId: 'blocks', seconds: 300, seed: 1 }]), 35);
    expect(s.coach).toEqual({ kind: 'wait_out', text: WAIT_OUT_TEXT });
    s = run([say('Stop that.')], at(s, 37));
    expect(s.coach?.kind).toBe('swap');
    s = at(s, 41.75);
    expect(s.coach?.kind).toBe('swap');
    s = at(s, 42);
    expect(isOutburst(s.beats[s.beats.length - 1].kind)).toBe(true);
    expect(s.coach).toEqual({ kind: 'wait_out', text: WAIT_OUT_TEXT });
  });
});

describe('live play speaks of the parent’s own child', () => {
  const at = (s: RoundState, sec: number): RoundState => run([tick(sec - s.elapsedSec)], s);

  it('the coach says "your child" and "they" in live play, and "she" with Mia', () => {
    for (const live of [true, false]) {
      let s = run([{ type: 'start', sceneId: 'blocks', seconds: 300, seed: 1, live }]);
      const lines: string[] = [];
      for (const [sec, text] of [[2, 'Put it over there.'], [12, "You're stacking the blocks."], [22, 'Good job!']] as [number, string][]) {
        s = run([say(text)], at(s, sec));
        lines.push(s.coach?.text ?? '');
      }
      if (live) {
        expect(lines).toEqual([
          'Let your child lead for now. Say what they chose to do.',
          'Nice description. You named exactly what your child did.',
          'Warm. Now add exactly what your child did: “Good job stacking so gently.”',
        ]);
        s = at(s, 100);
        expect(s.coach?.text).toBe('Praise one exact thing your child just did.');
        s = at(s, 300);
        expect(s.result?.leverText).toBe('Praise one exact thing your child did, not just “good job”.');
        for (const line of [...lines, s.result?.leverText ?? '']) expect(line).not.toMatch(/\b(?:she|her|Mia)\b/i);
      } else {
        expect(lines[0]).toBe('Follow her lead for now. Say what she chose to do.');
        expect(lines[1]).toBe('Nice description. You named exactly what she did.');
      }
    }
  });

  it('a live round ended early names its lever for "your child" too', () => {
    const s = run([{ type: 'start', sceneId: 'blocks', seconds: 300, seed: 1, live: true }, tick(5), say('Put it here. Give me that. Sit down. Come here.'), { type: 'end' }]);
    expect(s.result).toMatchObject({ short: true, lever: 'command', leverText: 'Let your child lead: describe what they chose instead of telling them what to do.' });
  });
});

describe('the first-visit round of 40 seconds', () => {
  it('asks for one sentence of each skill, and one of each meets it', () => {
    // 40 seconds at the clinic pace is 1.33 of each skill. The round rounds to the nearest whole sentence:
    // typed on a phone, two of each in 40 seconds is out of reach, and this round is there to show a first step.
    const at = (s: RoundState, sec: number): RoundState => run([tick(sec - s.elapsedSec)], s);
    let s = run([{ type: 'start', sceneId: 'drawing', seconds: 40, seed: 7 }]);
    s = run([say('This is the grass.')], at(s, 3));
    s = run([say("You're drawing with the green crayon.")], at(s, 13));
    s = run([say('I love how carefully you are coloring.')], at(s, 23));
    expect(ringProgress(s)).toMatchObject({ specific_praise: { count: 1, target: 1 }, reflection: { count: 1, target: 1 }, description: { count: 1, target: 1 } });
    s = at(s, 40);
    expect(s.result?.met).toBe(true);
  });
});

describe('a round ended early has no pace verdict (E6)', () => {
  const ONE_MINUTE: RoundEvent = { type: 'start', sceneId: 'blocks', seconds: 60, seed: 1 };
  const end: RoundEvent = { type: 'end' };

  it('five sentences pasted at 0 s, one more at 7 s, ended at 8 s of 60', () => {
    expect(SHORT_ROUND_NOTE).toBe('This round ended before its halfway mark, so it cannot meet the clinic pace.');
    const s = run([
      ONE_MINUTE,
      say('You made a tower. You are stacking the blocks. Great job stacking so gently. You put the red one on top. Nice job waiting your turn.'),
      tick(7),
      say('You are lining up the cars.'),
      tick(1),
      end,
    ]);
    expect(s.phase).toBe('ended');
    expect(s.result?.short).toBe(true);
    expect(s.result?.met).toBe(false);
    // measuredSeconds is unchanged: never less than half the planned length.
    expect(s.result?.seconds).toBe(30);
  });

  it('gives no verdict even when the counts alone would meet the pace, and still names a lever when there is one', () => {
    // Two of each in eight seconds: her opening line and her line at 7 s are both said back.
    let s = run([ONE_MINUTE, say('You made a tower.'), say('You are stacking the blocks.'), say('Great job stacking so gently.'), tick(7)]);
    s = run([say(s.child.lastSaid!), say('You put the red one on top.'), say('Nice job waiting your turn.'), tick(1)], s);
    expect(ringProgress(s)).toMatchObject({ specific_praise: { count: 2, target: 2 }, reflection: { count: 2, target: 2 }, description: { count: 2, target: 2 }, avoid: { count: 0 } });
    const early = run([end], s);
    expect(early.result).toMatchObject({ short: true, met: false, lever: null, leverText: null });
    // The same play, left to run its full minute, meets the pace and is not short.
    const full = run([tick(60)], s);
    expect(full.result?.met).toBe(true);
    expect(full.result).not.toHaveProperty('short');

    const thin = run([ONE_MINUTE, say('You are stacking the blocks.'), tick(5), end]);
    expect(thin.result).toMatchObject({ short: true, met: false });
    expect(thin.result?.lever).not.toBeNull();
    expect(thin.result?.leverText).toBeTruthy();
  });

  it('half the planned length is enough for a verdict', () => {
    const play = [ONE_MINUTE, say('You are stacking the blocks.')];
    expect(run([...play, tick(29.75), end]).result?.short).toBe(true);
    expect(run([...play, tick(30), end]).result).not.toHaveProperty('short');
    expect(run([...play, tick(45), end]).result).not.toHaveProperty('short');
    expect(run([...play, tick(60)]).result).not.toHaveProperty('short');
  });

  it('live play: twenty phrases at second 0 and end', () => {
    const live: RoundEvent = { type: 'start', sceneId: 'blocks', seconds: 300, seed: 3, live: true };
    const toys = ['block', 'car', 'train', 'cup', 'ball', 'doll', 'bear', 'boat', 'truck', 'spoon'];
    const phrases = toys.flatMap((toy) => [`You are stacking the ${toy}.`, `Great job sharing the ${toy}.`]);
    const s = run([live, ...phrases.map(say), end]);
    expect(s.result?.counts).toMatchObject({ description: 10, specific_praise: 10, avoid: 0 });
    expect(s.result?.targets).toMatchObject({ description: 10, specific_praise: 10, reflection: 0 });
    expect(s.result).toMatchObject({ short: true, met: false, lever: null });
    // Said over the whole five minutes, the same phrases meet the pace.
    const spread = run([live, ...phrases.flatMap((p) => [say(p), tick(15)])]);
    expect(spread.phase).toBe('ended');
    expect(spread.result?.met).toBe(true);
    expect(spread.result).not.toHaveProperty('short');
  });

  it('stays short when a sentence is disputed after the round', () => {
    const ended = run([ONE_MINUTE, say('What is that?'), tick(3), end]);
    const disputed = run([{ type: 'dispute', index: 0 }], ended);
    expect(disputed.result).toMatchObject({ short: true, met: false, disputed: 1 });
  });
});

describe('"Copy her" counts once per beat (E7)', () => {
  it('a second copy in the same beat does nothing, and the next beat takes one again', () => {
    const started = run([START, tick(1)]);
    const once = run([{ type: 'copy' }], started);
    expect(once.child.connection).toBe(started.child.connection + 5);
    expect(run([{ type: 'copy' }], once)).toBe(once);
    expect(run([tick(5.75), { type: 'copy' }], once).child).toEqual(run([tick(5.75)], once).child);
    const nextBeat = run([tick(6)], once);
    expect(run([{ type: 'copy' }], nextBeat).child.connection).toBe(nextBeat.child.connection + 5);
  });

  it('twenty copies a second and no words do not win the round', () => {
    let s = run([{ type: 'start', sceneId: 'cleanup', seconds: 300, seed: 1001 }]);
    const tension: number[] = [];
    let warmest = 0;
    while (s.phase === 'running') {
      for (let i = 0; i < 20; i++) s = run([{ type: 'copy' }, tick(0.05)], s);
      tension.push(s.child.tension);
      warmest = Math.max(warmest, s.child.connection);
    }
    expect(tension).toHaveLength(300);
    expect(warmest).toBeLessThan(100);
    expect(warmest).toBeLessThanOrEqual(COPY_CONNECTION_CEILING);
    // Before: tension was pinned at 0 from the first second. Now she is never at 0, and she still whines on her scripted beat.
    expect(tension.filter((t) => t === 0)).toHaveLength(0);
    expect(Math.max(...tension)).toBeGreaterThanOrEqual(45);
    expect(s.beats.some((b) => b.kind === 'scripted_whine')).toBe(true);
    // One copy per beat is all that reached her.
    const paced = run([{ type: 'start', sceneId: 'cleanup', seconds: 300, seed: 1001 }, ...Array.from({ length: 300 }, (_, i) => (i % 7 === 0 ? [{ type: 'copy' } as RoundEvent, tick(1)] : [tick(1)])).flat()]);
    expect(s.child).toEqual(paced.child);
  });
});

describe('the line about English sentences (E9)', () => {
  const TEXT = 'This practice reads English sentences. Try a short one.';

  it('shows at most once per round', () => {
    let s = run([START, tick(2), say('Ты строишь башню.')]);
    expect(s.coach?.text).toBe(TEXT);
    expect(s.englishNoteShown).toBe(true);
    s = run([tick(REACT_GAP), say('You are stacking the blocks.')], s);
    expect(s.coach?.kind).toBe('praise_parent');
    const praise = s.coach;
    s = run([tick(REACT_GAP), say('Сен мұнара салып жатырсың')], s);
    expect(s.sentences[2].code).toBe('unknown');
    expect(s.coach).toBe(praise);
    expect(s.lastPromptSec).toBe(2 + REACT_GAP);
    // A new round starts over.
    expect(run([START, say('你好')], run([{ type: 'end' }], s)).coach?.text).toBe(TEXT);
  });

  it('never shows in live play, where the uncoded word may be a real child’s name', () => {
    let s = run([{ ...START, live: true }, tick(2)]);
    for (const text of ['Айгерім', 'Ты строишь башню.', '你好']) {
      s = run([say(text), tick(1)], s);
      expect(s.sentences[s.sentences.length - 1].code).toBe('unknown');
      expect(s.coach, text).toBeNull();
    }
    expect(s.englishNoteShown).toBe(false);
  });
});

describe('what the round says to the parent', () => {
  it('is calm, short and without scolding words or exclamation marks', () => {
    for (const line of [WAIT_OUT_TEXT, CALM_PRAISE_TEXT, TURN_CAP_NOTE, SHORT_ROUND_NOTE]) {
      expect(line).not.toMatch(/\b(wrong|bad|mistake|fail\w*|should|don['’]t|dont)\b/i);
      // An exclamation mark is allowed only inside a quoted example.
      expect(line.replace(/“[^”]*”/g, '')).not.toContain('!');
      expect(line.length).toBeLessThan(90);
    }
  });
});
