import { describe, expect, it } from 'vitest';
import { BLOCKS, DRAWING } from '../child/scenes';
import { initialChild } from '../child/model';
import { NUDGE_GAP, REACT_GAP } from '../coach/policy';
import { initialRound, measuredSeconds, ringProgress, roundReducer, type RoundEvent, type RoundState } from './session';

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

    // Too soon for a second line.
    s = run([tick(REACT_GAP - 1), say('Put that down.')], s);
    expect(s.coach).toBe(first);
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
