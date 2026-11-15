import { describe, expect, it } from 'vitest';
import { codeSentence } from '../coding/classify';
import type { SavedSession, SavedSentence } from '../types';
import { keepRewrites, MAX_REWRITES, parseSummaryInput, summaryInput, SUMMARY_SYSTEM, tidySummary } from './summary';

const said = (text: string, i: number, disputed = false): SavedSentence => ({
  text,
  code: codeSentence(text).code,
  startSec: i * 5,
  atSec: i * 5 + 2,
  ...(disputed ? { disputed } : {}),
});

function session(texts: string[], kind: SavedSession['kind'] = 'daily'): SavedSession {
  const sentences = texts.map((t, i) => said(t, i));
  return {
    id: 's1',
    kind,
    startedAt: '2026-11-15T10:00:00.000Z',
    date: '2026-11-15',
    durationSec: 300,
    sceneId: 'blocks',
    partner: kind === 'live' ? null : 'mia',
    counts: { specific_praise: 1, reflection: 0, description: 1, general_praise: 0, neutral: 0, question: 1, command: 1, criticism: 0, target: 2, avoid: 2 },
    targets: { specific_praise: 10, reflection: 10, description: 10, maxAvoid: 3 },
    met: false,
    input: 'typed',
    sentences,
  } as SavedSession;
}

const TALK = ['You are stacking the red block.', 'Thank you for sharing the yellow block.', 'What are you building?', 'Put it here.'];

describe('what is sent', () => {
  it('sends the counts, the pace and the coded sentences, and no name of the family', () => {
    const input = summaryInput(session(TALK), 'Mia');
    expect(input?.session).toBe('Daily five-minute practice with Mia, a simulated four-year-old');
    expect(input?.counts).toEqual({ praise: 1, reflect: 0, describe: 1, toSwap: 2 });
    expect(input?.clinicPace).toEqual({ praise: 10, reflect: 10, describe: 10, maxToSwap: 3 });
    expect(input?.sentences).toEqual([
      { said: 'You are stacking the red block.', code: 'Description' },
      { said: 'Thank you for sharing the yellow block.', code: 'Specific praise' },
      { said: 'What are you building?', code: 'Question, to swap' },
      { said: 'Put it here.', code: 'Command, to swap' },
    ]);
  });
  it('leaves out reflections in live play and sends nothing for a session without sentences', () => {
    const live = summaryInput(session(TALK, 'live'), 'Mia');
    expect(live?.counts.reflect).toBeNull();
    expect(live?.clinicPace.reflect).toBeNull();
    expect(live?.session).not.toMatch(/Mia/);
    expect(summaryInput(session([]), 'Mia')).toBeNull();
  });
  it('leaves out a disputed sentence', () => {
    const s = session(TALK);
    s.sentences[2] = { ...s.sentences[2], disputed: true };
    expect(summaryInput(s, 'Mia')?.sentences.map((x) => x.said)).not.toContain('What are you building?');
  });
  it('is accepted by the server check, which refuses anything else', () => {
    const input = summaryInput(session(TALK), 'Mia');
    expect(parseSummaryInput(JSON.parse(JSON.stringify(input)))).toEqual(input);
    expect(parseSummaryInput(null)).toBeNull();
    expect(parseSummaryInput({ ...input, sentences: [] })).toBeNull();
    expect(parseSummaryInput({ ...input, counts: { ...input!.counts, praise: -1 } })).toBeNull();
    expect(parseSummaryInput({ ...input, sentences: [{ said: 'x'.repeat(500), code: 'Description' }] })).toBeNull();
    expect(parseSummaryInput({ ...input, session: 'x'.repeat(300) })).toBeNull();
  });
});

describe("the rules check of the model's rewrites", () => {
  it('keeps a rewrite of a sentence to swap when the rules code it as a skill', () => {
    const kept = keepRewrites(
      [
        { original: 'what are you building', rewrite: "You're building a tall tower." },
        { original: 'Put it here.', rewrite: 'Thank you for putting the block on top.' },
      ],
      session(TALK),
    );
    expect(kept).toEqual([
      { original: 'What are you building?', rewrite: "You're building a tall tower." },
      { original: 'Put it here.', rewrite: 'Thank you for putting the block on top.' },
    ]);
  });
  it('drops a rewrite that is itself a question or a command, or answers a sentence that was not to swap', () => {
    const kept = keepRewrites(
      [
        { original: 'What are you building?', rewrite: 'What color is that block?' },
        { original: 'Put it here.', rewrite: 'Put the red one on top.' },
        { original: 'You are stacking the red block.', rewrite: "You're stacking it so carefully." },
        { original: 'Something never said.', rewrite: "You're building a tower." },
      ],
      session(TALK),
    );
    expect(kept).toEqual([]);
  });
  it('keeps one rewrite per sentence and at most three in all', () => {
    const many = ['What is that?', 'Why is it red?', 'Where does it go?', 'Who made it?'];
    const kept = keepRewrites(
      [
        { original: 'What is that?', rewrite: "You're building a red tower." },
        { original: 'What is that?', rewrite: "You're stacking the blocks." },
        ...many.slice(1).map((q) => ({ original: q, rewrite: "You're putting the block on top." })),
      ],
      session(many),
    );
    expect(kept).toHaveLength(MAX_REWRITES);
    expect(new Set(kept.map((k) => k.original)).size).toBe(MAX_REWRITES);
  });
});

describe('the answer and the instructions', () => {
  it('trims the answer to the sizes the review shows', () => {
    const tidy = tidySummary({ summary: `  ${'a'.repeat(900)}  `, rewrites: Array.from({ length: 9 }, () => ({ original: ' x ', rewrite: ' y ' })) });
    expect(tidy.summary).toHaveLength(700);
    expect(tidy.rewrites).toHaveLength(MAX_REWRITES * 2);
    expect(tidy.rewrites[0]).toEqual({ original: 'x', rewrite: 'y' });
  });
  it('tells the model the rules are final and the words the product never uses', () => {
    expect(SUMMARY_SYSTEM).toMatch(/The rules are final/);
    expect(SUMMARY_SYSTEM).toMatch(/do not use the words wrong, bad, mistake, should or don't/);
  });
});
