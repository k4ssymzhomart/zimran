import { describe, expect, it } from 'vitest';
import { BLOCKS, DRAWING } from '../child/scenes';
import { initialChild } from '../child/model';
import { NUDGE_GAP, REACT_GAP } from '../coach/policy';
import { CRISIS_LINES } from '../coding/safety';
import { initialRound, measuredSeconds, REPEAT_WINDOW_SEC, ringProgress, roundReducer, type RoundEvent, type RoundState } from './session';

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
  it('answers an avoid sentence with a swap and keeps its gaps', () => {
    let s = run([START, tick(1), say('What are you building?')]);
    expect(s.coach?.kind).toBe('swap');
    expect(s.lastPromptSec).toBe(1);
    const first = s.coach;

    // Too soon for a second line. The old one is about another sentence now, so it is taken down.
    s = run([tick(REACT_GAP - 1), say('Put that down.')], s);
    expect(s.coach).toBeNull();
    expect(s.lastPromptSec).toBe(1);

    s = run([tick(1), say('Put that down.')], s);
    expect(s.coach?.kind).toBe('swap');
    expect(s.coach?.text).not.toBe(first?.text);
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
    // Two seconds later a question: too soon for the coach to speak again, and the praise no longer fits.
    s = run([tick(2), say('What are you making?')], s);
    expect(s.sentences[1].code).toBe('question');
    expect(s.coach).toBeNull();
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
