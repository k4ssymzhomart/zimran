import { describe, expect, it } from 'vitest';
import type { ChildState, Move } from '../types';
import { actionWeights, applyMove, EFFECTS, farewell, initialChild, tick, view } from './model';
import { BLOCKS, CLEANUP, DRAWING, KITCHEN, sceneForDay, SCENES } from './scenes';

describe('each skill has its own effect', () => {
  const base = initialChild();
  it('reflection makes her talk more than anything else does', () => {
    const talk = (m: Move) => applyMove(base, m).talk - base.talk;
    expect(talk('reflection')).toBeGreaterThan(talk('description'));
    expect(talk('reflection')).toBeGreaterThan(talk('specific_praise'));
  });
  it('description keeps her with the toy more than anything else does', () => {
    const focus = (m: Move) => applyMove(base, m).focus - base.focus;
    expect(focus('description')).toBeGreaterThan(focus('reflection'));
    expect(focus('description')).toBeGreaterThan(focus('specific_praise'));
  });
  it('specific praise builds the most connection', () => {
    const connection = (m: Move) => applyMove(base, m).connection - base.connection;
    expect(connection('specific_praise')).toBeGreaterThan(connection('reflection'));
    expect(connection('specific_praise')).toBeGreaterThan(connection('general_praise'));
  });
  it('questions, commands and criticism raise tension, in that order', () => {
    const tension = (m: Move) => applyMove(base, m).tension - base.tension;
    expect(tension('question')).toBeGreaterThan(0);
    expect(tension('command')).toBeGreaterThan(tension('question'));
    expect(tension('criticism')).toBeGreaterThan(tension('command'));
  });
  it('every target move lowers tension and every avoid move lowers focus', () => {
    for (const m of ['specific_praise', 'reflection', 'description'] as Move[]) expect(EFFECTS[m][3]).toBeLessThan(0);
    for (const m of ['question', 'command', 'criticism'] as Move[]) expect(EFFECTS[m][1]).toBeLessThan(0);
  });
});

describe('praise shapes behavior', () => {
  it('naming a behavior makes it more likely, and only that one', () => {
    let s = initialChild();
    const before = actionWeights(BLOCKS, s);
    for (let i = 0; i < 4; i++) s = applyMove(s, 'specific_praise', 'gentle');
    const after = actionWeights(BLOCKS, s);
    const gentle = BLOCKS.actions.findIndex((a) => a.habit === 'gentle');
    const sharing = BLOCKS.actions.findIndex((a) => a.habit === 'sharing');
    expect(after[gentle]).toBeGreaterThan(before[gentle]);
    expect(after[sharing]).toBe(before[sharing]);
  });
  it('rough play becomes likelier as tension rises', () => {
    const calm = actionWeights(BLOCKS, { ...initialChild(), tension: 10 });
    const tense = actionWeights(BLOCKS, { ...initialChild(), tension: 45 });
    const rough = BLOCKS.actions.findIndex((a) => a.rough);
    expect(tense[rough]).toBeGreaterThan(calm[rough]);
  });
});

describe('beats', () => {
  const run = (seed: number, moves: Move[], beats: number): { state: ChildState; log: string[] } => {
    let state = initialChild(seed);
    const log: string[] = [];
    for (let i = 0; i < beats; i++) {
      const out = tick(state, BLOCKS);
      state = out.state;
      log.push(`${out.beat.kind}|${out.beat.does}|${out.beat.says ?? ''}`);
      if (moves[i]) state = applyMove(state, moves[i]);
    }
    return { state, log };
  };

  it('is deterministic for a seed and a sequence of moves', () => {
    const moves: Move[] = ['description', 'question', 'reflection', 'specific_praise', 'command'];
    expect(run(7, moves, 12).log).toEqual(run(7, moves, 12).log);
  });
  it('different seeds give different play', () => {
    expect(run(1, [], 4).log).not.toEqual(run(2, [], 4).log);
  });
  it('she whines on the scripted beat whatever the parent said', () => {
    const good: Move[] = ['specific_praise', 'reflection', 'description', 'specific_praise'];
    let state = initialChild(3);
    let kind = '';
    for (let i = 0; i < BLOCKS.scriptedWhineBeat; i++) {
      const out = tick(state, BLOCKS);
      state = applyMove(out.state, good[i % good.length]);
      kind = out.beat.kind;
    }
    expect(kind).toBe('scripted_whine');
  });
  it('a stream of commands and criticism ends in a meltdown', () => {
    const { log } = run(5, Array(10).fill('criticism'), 10);
    expect(log.some((l) => l.startsWith('meltdown'))).toBe(true);
  });
  it('warm play never melts down outside the scripted moment', () => {
    const warm: Move[] = Array(12).fill('description');
    const { log } = run(5, warm, 12);
    expect(log.some((l) => l.startsWith('meltdown'))).toBe(false);
  });
  it('her line stays for one silent beat, then expires', () => {
    // talk 0 keeps her silent, so only the line we plant is in play
    const quiet = { ...initialChild(9), talk: 0, lastSaid: 'I made a tower!', lastSaidBeat: 0 };
    const one = tick(quiet, DRAWING).state;
    expect(one.lastSaid).toBe('I made a tower!');
    const two = tick({ ...one, talk: 0 }, DRAWING).state;
    expect(two.lastSaid).toBeNull();
  });
  it('a new line replaces the old one at once', () => {
    let state = { ...initialChild(9), talk: 100 };
    for (let i = 0; i < 3; i++) {
      const out = tick({ ...state, talk: 100 }, BLOCKS);
      state = out.state;
      if (out.beat.says !== null) {
        expect(state.lastSaid).toBe(out.beat.says);
        expect(state.lastSaidBeat).toBe(state.beat);
      }
    }
  });
});

describe('waiting quietly', () => {
  it('lowers tension two beats later when she is whining', () => {
    const whining = { ...initialChild(), tension: 55 };
    let s = applyMove(whining, 'wait');
    expect(s.waitArmed).toBe(2);
    s = tick(s, DRAWING).state;
    s = tick(s, DRAWING).state;
    // beat 1: drift +1, she whines; beat 2: the whine vents -8, drift +1, the wait pays off -6
    expect(s.tension).toBe(55 + 1 - 8 + 1 - 6);
  });
  it('an outburst passes: one whine does not loop for the rest of the round', () => {
    let s = { ...initialChild(), tension: 52 };
    const kinds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const out = tick(s, { ...BLOCKS, scriptedWhineBeat: 99 });
      s = out.state;
      kinds.push(out.beat.kind);
    }
    expect(kinds[0]).toBe('whine');
    expect(kinds).toContain('play');
  });
  it('two whines in a row do not repeat the same line', () => {
    let s = { ...initialChild(), tension: 68 };
    const first = tick(s, { ...BLOCKS, scriptedWhineBeat: 99 });
    s = { ...first.state, tension: 68, pendingVent: 0 };
    const second = tick(s, { ...BLOCKS, scriptedWhineBeat: 99 });
    expect(first.beat.kind).toBe('whine');
    expect(second.beat.kind).toBe('whine');
    expect(second.beat.says).not.toBe(first.beat.says);
  });
  it('does nothing in calm play', () => {
    expect(applyMove(initialChild(), 'wait').waitArmed).toBe(0);
  });
  it('is canceled by talking at her', () => {
    const s = applyMove(applyMove({ ...initialChild(), tension: 55 }, 'wait'), 'command');
    expect(s.waitArmed).toBe(0);
  });
});

describe('view and farewell', () => {
  it('keeps every value inside 0..100', () => {
    let s = initialChild();
    for (let i = 0; i < 40; i++) s = applyMove(s, 'criticism');
    expect(s.connection).toBe(0);
    expect(s.tension).toBe(100);
    for (let i = 0; i < 60; i++) s = applyMove(s, 'specific_praise');
    expect(s.connection).toBe(100);
    expect(s.tension).toBe(0);
  });
  it('shows tension through the face', () => {
    expect(view({ ...initialChild(), tension: 80 }).face).toBe('crying');
    expect(view({ ...initialChild(), tension: 55 }).face).toBe('pouting');
    expect(view({ ...initialChild(), connection: 80 }).face).toBe('beaming');
    expect(view({ ...initialChild(), connection: 80 }).posture).toBe('leaning_in');
    expect(view({ ...initialChild(), connection: 20 }).posture).toBe('turned_away');
  });
  it('picks the goodbye from how the round went', () => {
    expect(farewell({ ...initialChild(), connection: 85, tension: 10 }, BLOCKS)).toBe(BLOCKS.farewell.high);
    expect(farewell({ ...initialChild(), connection: 55, tension: 30 }, BLOCKS)).toBe(BLOCKS.farewell.mid);
    expect(farewell({ ...initialChild(), connection: 30, tension: 70 }, BLOCKS)).toBe(BLOCKS.farewell.low);
  });
  it('every scene has all four habits and a scripted moment', () => {
    for (const scene of SCENES) {
      for (const habit of ['gentle', 'sharing', 'patient', 'tidy'])
        expect(scene.actions.some((a) => a.habit === habit)).toBe(true);
      expect(scene.scriptedWhineBeat).toBeGreaterThan(0);
    }
  });
});

describe('the four scenes', () => {
  it('are four different scenes, each complete', () => {
    expect(SCENES.map((s) => s.id)).toEqual(['blocks', 'drawing', 'kitchen', 'cleanup']);
    for (const scene of SCENES) {
      expect(scene.title.length).toBeGreaterThan(0);
      expect(scene.intro).toContain('Mia');
      // She speaks first, so there is always something to say back.
      expect(scene.actions[0].says).toBeTruthy();
      expect(scene.actions[0].rough).toBeFalsy();
      expect(scene.actions.length).toBeGreaterThanOrEqual(10);
      expect(scene.actions.filter((a) => a.rough).length).toBeGreaterThanOrEqual(2);
      expect(new Set(scene.actions.map((a) => a.says)).size).toBe(scene.actions.length);
      for (const a of [...scene.actions, scene.wander, scene.whine, ...(scene.whineAlt ?? []), scene.meltdown]) expect(a.does.startsWith('Mia ')).toBe(true);
      expect(scene.wander.says).toBeUndefined();
      expect(scene.whine.says).toBeTruthy();
      expect(scene.whineAlt?.length).toBeGreaterThanOrEqual(2);
      expect(new Set(Object.values(scene.farewell)).size).toBe(3);
    }
  });

  const play = (scene: typeof BLOCKS, seed: number, move: Move | null, beats: number): string[] => {
    let state: ChildState = { ...initialChild(seed), tension: scene.startTension ?? initialChild(seed).tension };
    const kinds: string[] = [];
    for (let i = 0; i < beats; i++) {
      if (move) state = applyMove(state, move);
      const out = tick(state, scene);
      state = out.state;
      kinds.push(out.beat.kind);
    }
    return kinds;
  };

  it('warm play never melts down in any scene, and she whines on the scripted beat', () => {
    for (const scene of SCENES) {
      for (let seed = 1; seed <= 20; seed++) {
        const kinds = play(scene, seed, 'description', 40);
        expect(kinds, `${scene.id} seed ${seed}`).not.toContain('meltdown');
        expect(kinds[scene.scriptedWhineBeat - 1]).toBe('scripted_whine');
      }
    }
  });

  it('a stream of commands ends in a meltdown in any scene', () => {
    for (const scene of SCENES) expect(play(scene, 5, 'command', 10), scene.id).toContain('meltdown');
  });

  it('clean-up is the harder one: she starts wound up and whines earlier, whatever the parent does', () => {
    expect(CLEANUP.startTension ?? 0).toBeGreaterThan(initialChild().tension);
    expect(CLEANUP.scriptedWhineBeat).toBeLessThan(Math.min(BLOCKS.scriptedWhineBeat, DRAWING.scriptedWhineBeat, KITCHEN.scriptedWhineBeat));
    expect(CLEANUP.actions.filter((a) => a.rough).length).toBeGreaterThan(BLOCKS.actions.filter((a) => a.rough).length);
    // With a silent parent she whines again within the first minute; in blocks she does not.
    const firstMinute = (scene: typeof BLOCKS) => play(scene, 1, null, 8).filter((k) => k === 'whine' || k === 'scripted_whine').length;
    expect(firstMinute(CLEANUP)).toBeGreaterThan(firstMinute(BLOCKS));
    // One command in the first seconds costs more there than in blocks.
    const afterOneCommand = (scene: typeof BLOCKS) => {
      let s: ChildState = { ...initialChild(1), tension: scene.startTension ?? initialChild(1).tension };
      s = applyMove(s, 'command');
      const kinds: string[] = [];
      for (let i = 0; i < 4; i++) {
        const out = tick(s, scene);
        s = out.state;
        kinds.push(out.beat.kind);
      }
      return kinds.filter((k) => k !== 'play').length;
    };
    expect(afterOneCommand(CLEANUP)).toBeGreaterThan(afterOneCommand({ ...BLOCKS, scriptedWhineBeat: 2 }));
  });

  it('the kitchen is the calm one: the scripted whine comes latest', () => {
    expect(KITCHEN.startTension).toBeUndefined();
    expect(KITCHEN.scriptedWhineBeat).toBeGreaterThan(Math.max(BLOCKS.scriptedWhineBeat, DRAWING.scriptedWhineBeat, CLEANUP.scriptedWhineBeat));
  });
});

describe('the scene of the day', () => {
  it('does not replay the free first visit on paid day 1 or day 2', () => {
    // The first visit plays blocks, then drawing.
    expect(['blocks', 'drawing']).not.toContain(sceneForDay(1).id);
    expect(['blocks', 'drawing']).not.toContain(sceneForDay(2).id);
  });
  it('never repeats a scene on consecutive days and comes round to all four', () => {
    for (let day = 1; day <= 60; day++) expect(sceneForDay(day).id, `day ${day}`).not.toBe(sceneForDay(day + 1).id);
    expect(new Set([1, 2, 3, 4].map((d) => sceneForDay(d).id))).toEqual(new Set(SCENES.map((s) => s.id)));
    for (let day = 1; day <= 28; day++) expect(sceneForDay(day + 4)).toBe(sceneForDay(day));
  });
  it('shows three different scenes on the three days the jury can jump to', () => {
    expect(new Set([2, 9, 28].map((d) => sceneForDay(d).id)).size).toBe(3);
    expect(sceneForDay(2)).toBe(CLEANUP);
    expect(sceneForDay(9)).toBe(KITCHEN);
  });
  it('plays day 1 for anything that is not a day number', () => {
    for (const odd of [0, -3, Number.NaN, Number.POSITIVE_INFINITY, 0.4]) expect(sceneForDay(odd)).toBe(sceneForDay(1));
    expect(sceneForDay(2.9)).toBe(sceneForDay(2));
  });
});
