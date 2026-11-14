import { describe, expect, it } from 'vitest';
import { codeTurn } from '../coding/classify';
import type { Lever } from '../types';
import { candidateTasks, checkAnswer, lessonFor } from './lesson';

const LEVERS: Lever[] = ['question', 'command', 'criticism', 'specific_praise', 'reflection', 'description'];
const AVOID_LEVERS: Lever[] = ['question', 'command', 'criticism'];
const SCOLDING = /wrong|bad|mistake|should|don't|dont/i;

describe.each(LEVERS)('lesson for %s', (lever) => {
  const lesson = lessonFor(lever);
  const all = candidateTasks(lever);

  it('has a title, a why, two or three pairs and exactly two distinct tasks', () => {
    expect(lesson.lever).toBe(lever);
    expect(lesson.title).not.toBe('');
    expect(lesson.why).not.toBe('');
    expect(lesson.pairs.length).toBeGreaterThanOrEqual(2);
    expect(lesson.pairs.length).toBeLessThanOrEqual(3);
    expect(lesson.tasks).toHaveLength(2);
    expect(lesson.tasks[0].id).not.toBe(lesson.tasks[1].id);
  });

  it('has at least four candidate tasks with unique ids', () => {
    expect(all.length).toBeGreaterThanOrEqual(4);
    expect(new Set(all.map((t) => t.id)).size).toBe(all.length);
  });

  it('picks two distinct tasks for every seed, the same ones each time', () => {
    for (const seed of [0, 1, 2, 3, 4, 5, 7, 11, 12, 99, 1000, -3, 2.7, NaN, Infinity]) {
      const a = lessonFor(lever, seed);
      expect(a.tasks).toHaveLength(2);
      expect(a.tasks[0].id).not.toBe(a.tasks[1].id);
      expect(lessonFor(lever, seed)).toEqual(a);
    }
  });

  it('reaches every candidate task and more than one pairing across seeds', () => {
    const seen = new Set<string>();
    const pairings = new Set<string>();
    for (let seed = 0; seed < 12; seed++) {
      const [a, b] = lessonFor(lever, seed).tasks;
      seen.add(a.id).add(b.id);
      pairings.add(`${a.id}+${b.id}`);
    }
    expect(seen.size).toBe(all.length);
    expect(pairings.size).toBeGreaterThan(all.length);
  });

  it('every model answer passes its own task', () => {
    for (const task of all) {
      const result = checkAnswer(task, task.modelAnswer);
      expect(result.ok, `${task.id}: ${task.modelAnswer} -> ${result.coded.map((s) => s.code)}`).toBe(true);
    }
  });

  it('every "say" example is coded as a target', () => {
    for (const pair of lesson.pairs) {
      const coded = codeTurn(pair.say, { childLastSaid: pair.childSaid ?? null });
      expect(coded, pair.say).toHaveLength(1);
      expect(coded[0].bucket, `${pair.say} -> ${coded[0].code}`).toBe('target');
      expect(all[0].accept, pair.say).toContain(coded[0].code);
    }
  });

  it('the sentence to replace is what the lesson says it is', () => {
    const sentences = [...lesson.pairs.map((p) => ({ text: p.insteadOf, childSaid: p.childSaid ?? null })),
      ...all.map((t) => ({ text: t.insteadOf, childSaid: t.childSaid }))];
    for (const { text, childSaid } of sentences) {
      const codes = codeTurn(text, { childLastSaid: childSaid }).map((s) => s.code);
      if (AVOID_LEVERS.includes(lever)) {
        // Avoid levers: it really is a question, command or criticism.
        expect(codes, text).toEqual([lever]);
      } else {
        // Skill levers: it is harmless, and it is not yet the skill.
        expect(codes, text).not.toContain(lever);
        expect(codeTurn(text).every((s) => s.bucket !== 'avoid'), text).toBe(true);
      }
    }
  });

  it('the sentence to replace does not pass the task, and the reply is the gentle hint', () => {
    for (const task of all) {
      const result = checkAnswer(task, task.insteadOf);
      expect(result.ok, task.insteadOf).toBe(false);
      expect(result.feedback).toContain(task.hint);
    }
  });

  it('never scolds', () => {
    expect(lesson.title).not.toMatch(SCOLDING);
    expect(lesson.why).not.toMatch(SCOLDING);
    for (const task of all) {
      expect(task.hint).not.toMatch(SCOLDING);
      for (const answer of [task.modelAnswer, task.insteadOf, 'What is that?', 'Put it here.', "No, that's wrong.", '']) {
        expect(checkAnswer(task, answer).feedback).not.toMatch(SCOLDING);
      }
    }
  });
});

describe('checkAnswer', () => {
  const [question] = candidateTasks('question');
  const [command] = candidateTasks('command');
  const [criticism] = candidateTasks('criticism');
  const [praise] = candidateTasks('specific_praise');
  const [reflection] = candidateTasks('reflection');

  it('praises the parent for what they did', () => {
    expect(checkAnswer(question, "You're building a tower.").feedback).toMatch(/named exactly what she is doing/);
    expect(checkAnswer(reflection, 'The cars go under here.').feedback).toMatch(/her own words back/);
    expect(checkAnswer(praise, 'I love how you shared the block.').feedback).toMatch(/exactly what you liked/);
  });

  it('names an avoid sentence gently and adds the hint', () => {
    const q = checkAnswer(question, 'Are you building a tower?');
    expect(q.ok).toBe(false);
    expect(q.feedback).toBe(`That one is still a question. ${question.hint}`);

    const c = checkAnswer(command, 'Put the green ones in a line.');
    expect(c.ok).toBe(false);
    expect(c.feedback).toBe(`That one is still a command. ${command.hint}`);

    const k = checkAnswer(criticism, "Don't throw the blocks.");
    expect(k.ok).toBe(false);
    expect(k.feedback).toContain(criticism.hint);
  });

  it('a good sentence followed by a question is not there yet', () => {
    const result = checkAnswer(question, "You're stacking the blocks. What is it going to be?");
    expect(result.coded.map((s) => s.code)).toEqual(['description', 'question']);
    expect(result.ok).toBe(false);
  });

  it('general praise is warm but not yet specific', () => {
    const result = checkAnswer(praise, 'Good job!');
    expect(result.ok).toBe(false);
    expect(result.feedback).toBe(praise.hint);
  });

  it('a description is not a reflection, and a reflection needs her words', () => {
    expect(checkAnswer(reflection, "You're building a bridge.").ok).toBe(false);
    expect(checkAnswer(reflection, 'That is interesting.').ok).toBe(false);
  });

  it('a target that the task does not ask for gets the hint', () => {
    const result = checkAnswer(command, 'I love how gently you lined them up.');
    expect(result.ok).toBe(false);
    expect(result.feedback).toBe(command.hint);
  });

  it('empty and odd answers do not throw', () => {
    for (const answer of ['', '   ', '\n\n', '???', '...', '12345', '🙂', 'Привет', 'a'.repeat(5000), 'you '.repeat(500)]) {
      const result = checkAnswer(question, answer);
      expect(result.ok).toBe(false);
      expect(result.feedback).toContain(question.hint);
    }
    expect(checkAnswer(question, '').coded).toEqual([]);
  });
});
