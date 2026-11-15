import { describe, expect, it } from 'vitest';
import type { TimedSentence } from '../lib/round/session';
import {
  initialTracked,
  inputMode,
  roundDone,
  savedSentences,
  sessionDraft,
  trackedReducer,
  type TrackedEvent,
  type TrackedRound,
} from './useRound';

const AT = '2026-11-15T09:30:00.000Z';
const START: TrackedEvent = { type: 'start', sceneId: 'blocks', seconds: 60, seed: 7, at: AT };
const run = (events: TrackedEvent[], from: TrackedRound = initialTracked()): TrackedRound => events.reduce(trackedReducer, from);
const typed = (text: string): TrackedEvent => ({ type: 'say', text, via: 'typed' });
const spoken = (text: string): TrackedEvent => ({ type: 'say', text, via: 'spoken' });
const tick = (dtSec: number): TrackedEvent => ({ type: 'tick', dtSec });

const sentence = (text: string, atSec: number, disputed = false): TimedSentence => ({
  text,
  code: 'description',
  bucket: 'target',
  confidence: 1,
  rule: 'test-rule',
  atSec,
  disputed,
});

describe('trackedReducer', () => {
  it('notes when the round started', () => {
    const t = run([START]);
    expect(t.round.phase).toBe('running');
    expect(t.startedAt).toBe(AT);
    expect(t.via).toEqual([]);
  });

  it('keeps the first start time when start is sent again mid-round', () => {
    const t = run([START, tick(5), { ...START, at: '2026-11-15T09:31:00.000Z' }]);
    expect(t.startedAt).toBe(AT);
    expect(t.round.elapsedSec).toBe(5);
  });

  it('notes how every sentence arrived, one entry per sentence', () => {
    const t = run([START, tick(3), typed('You are stacking the blocks.'), tick(3), spoken('Good job. What is that?')]);
    expect(t.round.sentences.map((s) => s.text)).toHaveLength(3);
    expect(t.via).toEqual(['typed', 'spoken', 'spoken']);
  });

  it('returns the same object when the engine ignores the event', () => {
    const t = run([START]);
    expect(trackedReducer(t, typed('   '))).toBe(t);
    expect(trackedReducer(t, tick(0))).toBe(t);
  });

  it('starts the notes again with a new round', () => {
    const first = run([START, spoken('You are stacking the blocks.'), { type: 'end' }]);
    const second = trackedReducer(first, { ...START, seed: 8, at: '2026-11-15T09:40:00.000Z' });
    expect(second.via).toEqual([]);
    expect(second.startedAt).toBe('2026-11-15T09:40:00.000Z');
  });
});

describe('inputMode', () => {
  it('is typed, spoken or mixed', () => {
    expect(inputMode(['typed', 'typed'])).toBe('typed');
    expect(inputMode(['spoken'])).toBe('spoken');
    expect(inputMode(['typed', 'spoken'])).toBe('mixed');
  });

  it('is typed when nothing was said', () => {
    expect(inputMode([])).toBe('typed');
  });
});

describe('savedSentences', () => {
  it('keeps text, code, rule and the arrival time', () => {
    const [s] = savedSentences([sentence('You are stacking the red block', 12.26)]);
    expect(s).toEqual({ text: 'You are stacking the red block', code: 'description', startSec: 9.9, atSec: 12.3, rule: 'test-rule' });
  });

  it('starts a sentence before it arrived, but never before the turn before it', () => {
    const saved = savedSentences([sentence('You built a tall tower', 10), sentence('You are putting the blue block on top of it', 11)]);
    expect(saved[0].startSec).toBe(8);
    expect(saved[1].startSec).toBe(10);
    for (const s of saved) expect(s.startSec).toBeLessThanOrEqual(s.atSec);
  });

  it('never starts before the round', () => {
    expect(savedSentences([sentence('You are stacking the red block', 1)])[0].startSec).toBe(0);
  });

  it('lays the sentences of one turn out in the order they were said', () => {
    const saved = savedSentences([sentence('Nice tower', 20), sentence('You made it tall', 20)]);
    expect(saved.map((s) => s.startSec)).toEqual([17.6, 18.4]);
    expect(saved.map((s) => s.atSec)).toEqual([20, 20]);
  });

  it('marks a disputed sentence and leaves the others unmarked', () => {
    const saved = savedSentences([sentence('Nice tower', 5, true), sentence('You made it tall', 9)]);
    expect(saved[0].disputed).toBe(true);
    expect('disputed' in saved[1]).toBe(false);
  });
});

describe('roundDone', () => {
  it('is null until the round has ended', () => {
    expect(roundDone(initialTracked())).toBeNull();
    expect(roundDone(run([START, typed('You are stacking the blocks.')]))).toBeNull();
  });

  it('hands over the result, the sentences, the input mode and the times', () => {
    const t = run([START, tick(4), typed('You are stacking the blocks.'), tick(4), spoken('You made a tower!'), tick(60)]);
    const done = roundDone(t);
    expect(done).not.toBeNull();
    expect(done!.result).toBe(t.round.result);
    expect(done!.sentences.map((s) => s.text)).toEqual(t.round.sentences.map((s) => s.text));
    expect(done!.sentences.map((s) => s.atSec)).toEqual([4, 8]);
    expect(done!.input).toBe('mixed');
    expect(done!.startedAt).toBe(AT);
    expect(done!.durationSec).toBe(60);
    expect('audioId' in done!).toBe(false);
  });

  it('measures a round ended early the way the engine does', () => {
    const t = run([START, tick(45), { type: 'end' }]);
    expect(roundDone(t)!.durationSec).toBe(t.round.result!.seconds);
    expect(roundDone(t)!.durationSec).toBe(45);
  });

  it('follows a dispute made after the round', () => {
    const ended = run([START, tick(4), typed('You are stacking the blocks.'), { type: 'end' }]);
    const disputed = trackedReducer(ended, { type: 'dispute', index: 0 });
    expect(roundDone(disputed)!.sentences[0].disputed).toBe(true);
    expect(roundDone(disputed)!.result.counts.description).toBe(roundDone(ended)!.result.counts.description - 1);
  });
});

describe('sessionDraft', () => {
  const done = roundDone(run([START, tick(4), spoken('You are stacking the blocks.'), tick(60)]))!;
  const about = { kind: 'daily', date: '2026-11-15', sceneId: 'blocks', partner: 'leo' } as const;

  it('joins the round with what the caller knows', () => {
    expect(sessionDraft(done, about)).toEqual({
      kind: 'daily',
      startedAt: AT,
      date: '2026-11-15',
      durationSec: 60,
      sceneId: 'blocks',
      partner: 'leo',
      counts: done.result.counts,
      targets: done.result.targets,
      met: done.result.met,
      input: 'spoken',
      sentences: done.sentences,
    });
  });

  it('carries the audio key only when a recording was kept', () => {
    expect('audioId' in sessionDraft(done, about)).toBe(false);
    expect(sessionDraft({ ...done, audioId: 'audio-1' }, about).audioId).toBe('audio-1');
  });
});
