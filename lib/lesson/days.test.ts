import { describe, expect, it } from 'vitest';
import { codeTurn } from '../coding/classify';
import { PLAN, PLAN_DAYS, planDay } from '../progress/plan';
import { BUCKET } from '../types';
import { checkDayTask, dayLesson } from './days';

/** The 28 days of the plan and the seven days of the cycle after it. */
const ALL_DAYS = Array.from({ length: PLAN_DAYS + 7 }, (_, i) => i + 1);
const BANNED = /\b(?:wrong|bad|badly|mistakes?|mistaken|fail\w*|should|shouldn['’]t|don['’]t|dont)\b/i;
const BRITISH =
  /\b(?:practis\w*|programmes?|behaviour\w*|labell\w+|colour\w*|favourite\w*|centre[ds]?|recognis\w*|organis\w*|realis\w*|apologis\w*|cancell\w+|grey|mum|mummy|whilst|learnt|tidying)\b/i;
/** What is left of a line once the quoted examples are taken out. */
const unquoted = (s: string): string => s.replace(/“[^”]*”/g, '');
const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

describe.each(ALL_DAYS)('lesson for day %i', (day) => {
  const lesson = dayLesson(day);
  const plan = planDay(day);
  const { task } = lesson;

  it('teaches one idea in one or two plain sentences of at most 220 characters', () => {
    expect(lesson.day).toBe(day);
    expect(lesson.idea.length, lesson.idea).toBeLessThanOrEqual(220);
    expect(lesson.idea.length).toBeGreaterThan(40);
    const sentences = unquoted(lesson.idea).match(/[.!?](?:\s|$)/g) ?? [];
    expect(sentences.length, lesson.idea).toBeLessThanOrEqual(2);
  });

  it('gives three different sentences to say, each one of the three skills for today\'s classifier', () => {
    expect(new Set(lesson.say).size).toBe(3);
    lesson.say.forEach((sentence, i) => {
      const coded = codeTurn(sentence, { childLastSaid: lesson.afterMia?.[i] ?? null });
      expect(coded, sentence).toHaveLength(1);
      expect(coded[0].bucket, `${sentence} -> ${coded[0].code} (${coded[0].rule})`).toBe('target');
      // A sentence that answers a line of Mia's is that line said back.
      if (lesson.afterMia?.[i]) expect(coded[0].code, sentence).toBe('reflection');
    });
  });

  it('has a task whose example is all skill sentences and passes the check', () => {
    const coded = codeTurn(task.example, { childLastSaid: task.miaSays });
    expect(coded.length).toBeGreaterThan(0);
    for (const s of coded) expect(s.bucket, `${s.text} -> ${s.code} (${s.rule})`).toBe('target');
    const checked = checkDayTask(day, task.example);
    expect(checked.ok, `${task.example} -> ${checked.code}`).toBe(true);
    if (task.want !== 'any_target') expect(checked.code).toBe(task.want);
    expect(checked.feedback).toMatch(/^That is (?:a description|a reflection|specific praise): /);
  });

  it('lets the sentences to say pass the task where they answer it', () => {
    lesson.say.forEach((sentence, i) => {
      if (lesson.afterMia?.[i]) return; // it answers its own line of Mia's, not the task's
      const [alone] = codeTurn(sentence);
      if (task.want === 'any_target' || task.want === alone.code) {
        expect(checkDayTask(day, sentence).ok, sentence).toBe(true);
      }
    });
  });

  it('asks for the skill of its plan day', () => {
    const skill = ['specific_praise', 'reflection', 'description'].includes(plan.focus) ? plan.focus : 'description';
    if (plan.isMasteryCheck || task.want === 'any_target') return;
    expect(task.want).toBe(skill);
  });

  it('answers a miss in one calm sentence: what was heard, then the hint', () => {
    expect(task.hint).toMatch(/^[A-Z][a-z]+ /);
    const heard: [string, string, string][] = [
      ['What is that?', 'question', 'That read as a question; '],
      ['Put it here.', 'command', 'That read as a command; '],
      ['No, not like that.', 'criticism', 'That read as a correction; '],
      ['Good job!', 'general_praise', 'That read as general praise; '],
      ['Hmm.', 'neutral', 'That read as neutral talk; '],
      ['', 'unknown', 'That one could not be read; '],
      ['Молодец!', 'unknown', 'That one could not be read; '],
    ];
    for (const [answer, code, start] of heard) {
      const checked = checkDayTask(day, answer);
      expect(checked.ok, answer).toBe(false);
      expect(checked.code, answer).toBe(code);
      expect(checked.feedback, answer).toBe(start + lowerFirst(task.hint));
    }
  });

  it('does not pass a good sentence that is followed by a question', () => {
    const checked = checkDayTask(day, `${task.example} What is it?`);
    expect(checked).toMatchObject({ ok: false, code: 'question' });
  });

  it('never scolds, never shouts, and is in US spelling', () => {
    const replies = [task.example, 'What is that?', 'Put it here.', "No, that's wrong.", 'Good job!', ''].map((a) => checkDayTask(day, a).feedback);
    const voice = [lesson.idea, task.setup, task.hint, ...replies];
    for (const line of voice) {
      expect(BANNED.test(line), line).toBe(false);
      // An exclamation mark belongs to a quoted example only.
      expect(unquoted(line), line).not.toContain('!');
    }
    for (const line of [...voice, ...lesson.say, task.example, task.miaSays ?? '', ...(lesson.afterMia ?? []).map((l) => l ?? '')]) {
      expect(BRITISH.test(line), line).toBe(false);
      expect(BANNED.test(line), line).toBe(false);
    }
  });
});

describe('the lessons follow the plan', () => {
  it('has a different idea and a different task for each of the 28 days and the 7 after', () => {
    expect(new Set(ALL_DAYS.map((d) => dayLesson(d).idea)).size).toBe(35);
    expect(new Set(ALL_DAYS.map((d) => dayLesson(d).task.setup)).size).toBe(35);
  });

  it('week 1 turns a question or an order into a statement', () => {
    for (const day of [1, 2, 3, 4, 7]) {
      const { task } = dayLesson(day);
      const quoted = task.setup.match(/“([^”]+)”/)?.[1] ?? '';
      const [coded] = codeTurn(quoted);
      expect(['question', 'command'], `${day}: ${quoted}`).toContain(coded.code);
      expect(task.want).toBe('description');
      // The sentence to turn around does not pass, and the reply names it.
      expect(checkDayTask(day, quoted)).toMatchObject({ ok: false, code: coded.code });
    }
    for (const d of PLAN.slice(0, 7)) expect(dayLesson(d.day).task.miaSays).toBeNull();
  });

  it('day 5 is the wordless copy plus a description', () => {
    const { task } = dayLesson(5);
    expect(PLAN[4].title).toBe('Copy what she does');
    expect(task.setup).toContain('without a word');
    expect(task.want).toBe('description');
    expect(checkDayTask(5, "You're rolling the block.").ok).toBe(true);
    expect(checkDayTask(5, 'Roll it to me.')).toMatchObject({ ok: false, code: 'command' });
  });

  it('day 6: she whines, the parent waits, she does one calm thing, the parent praises or describes it', () => {
    const { idea, task } = dayLesson(6);
    expect(PLAN[5].title).toBe('Wait quietly');
    expect(idea).toContain('stay quiet');
    expect(task.setup).toMatch(/whines.*quiet.*block/);
    expect(task.want).toBe('any_target');
    expect(checkDayTask(6, 'You put the block on the tower.')).toMatchObject({ ok: true, code: 'description' });
    expect(checkDayTask(6, 'Thank you for trying again.')).toMatchObject({ ok: true, code: 'specific_praise' });
    expect(checkDayTask(6, 'Stop whining.')).toMatchObject({ ok: false, code: 'criticism' });
  });

  it('week 2 asks for descriptions, week 3 for her words back, week 4 for specific praise', () => {
    for (let day = 8; day <= 14; day++) expect(dayLesson(day).task.want).toBe('description');
    for (let day = 15; day <= 21; day++) {
      const lesson = dayLesson(day);
      expect(lesson.task.want).toBe('reflection');
      expect(lesson.task.miaSays).not.toBeNull();
      expect(lesson.task.setup).toContain(`“${lesson.task.miaSays}”`);
      expect(lesson.afterMia).toHaveLength(3);
    }
    for (let day = 22; day <= 26; day++) expect(dayLesson(day).task.want).toBe('specific_praise');
  });

  it('day 16 reflects a single word and day 18 a big feeling', () => {
    expect(PLAN[15].title).toBe('Reflect a single word');
    expect(dayLesson(16).task.miaSays).toBe('Rainbow!');
    expect(checkDayTask(16, 'Rainbow!')).toMatchObject({ ok: true, code: 'reflection' });
    expect(checkDayTask(16, 'A rainbow.')).toMatchObject({ ok: true, code: 'reflection' });
    expect(checkDayTask(16, 'Is it a rainbow?')).toMatchObject({ ok: false, code: 'question' });

    expect(PLAN[17].title).toBe('Reflect big feelings');
    expect(dayLesson(18).task.miaSays).toBe('This is too hard!');
    // Her complaint said back is a reflection, not a correction of her.
    expect(checkDayTask(18, 'This is too hard.')).toMatchObject({ ok: true, code: 'reflection' });
    expect(checkDayTask(18, 'It is too hard.')).toMatchObject({ ok: true, code: 'reflection' });
    expect(checkDayTask(18, 'No, it is easy.').ok).toBe(false);
  });

  it('day 19 tells a reflection from the same words with a question mark', () => {
    expect(checkDayTask(19, 'You made a tower.')).toMatchObject({ ok: true, code: 'reflection' });
    expect(checkDayTask(19, 'You made a tower?')).toMatchObject({ ok: false, code: 'question' });
  });

  it('day 25 praises waiting and day 26 the opposite', () => {
    expect(PLAN[24].title).toBe('Praise waiting');
    expect(dayLesson(25).task.setup).toContain('waits');
    expect(checkDayTask(25, 'Nice job waiting for your turn.')).toMatchObject({ ok: true, code: 'specific_praise' });
    expect(checkDayTask(25, 'Good job!')).toMatchObject({ ok: false, code: 'general_praise' });

    expect(PLAN[25].title).toBe('Praise the opposite');
    expect(dayLesson(26).task.setup).toContain('praise the opposite');
    expect(checkDayTask(26, 'I love how gently you set that block down.')).toMatchObject({ ok: true, code: 'specific_praise' });
    expect(checkDayTask(26, 'Stop banging the blocks.')).toMatchObject({ ok: false, code: 'criticism' });
  });

  it('the dress rehearsal and both skill checks take any of the three skills', () => {
    for (const day of [27, 28, 35]) {
      expect(dayLesson(day).task.want).toBe('any_target');
      for (const answer of ["You're building a bridge.", 'I love how carefully you built that.', dayLesson(day).task.miaSays ?? '']) {
        const checked = checkDayTask(day, answer);
        expect(checked.ok, `${day}: ${answer}`).toBe(true);
        expect(BUCKET[checked.code]).toBe('target');
      }
    }
  });

  it('after day 28 follows the seven-day cycle of the plan, again and again', () => {
    expect(dayLesson(29).idea).toContain('Clean-up');
    expect(planDay(29).title).toContain('clean-up');
    for (const day of [30, 33]) {
      // The two live days speak of the parent's own child, not of Mia.
      expect(planDay(day).live).toBe(true);
      expect(`${dayLesson(day).idea} ${dayLesson(day).task.setup}`).toMatch(/your (?:own )?child/i);
      expect(`${dayLesson(day).idea} ${dayLesson(day).task.setup}`).not.toContain('Mia');
    }
    expect(dayLesson(34).idea).toContain('your own numbers');
    expect(dayLesson(35).idea).toContain('clinic pace');
    for (let day = 29; day <= 35; day++) {
      expect(dayLesson(day + 7)).toEqual({ ...dayLesson(day), day: day + 7 });
      expect(dayLesson(day + 70)).toEqual({ ...dayLesson(day), day: day + 70 });
    }
  });

  it('promises no new clinical content after day 28', () => {
    for (let day = 29; day <= 35; day++) {
      const lesson = dayLesson(day);
      expect(`${lesson.idea} ${lesson.task.setup} ${lesson.task.hint}`).not.toMatch(/new skill|new lesson|unlock|next level|phase|cure|treat|therap|diagnos|time-?out/i);
    }
  });

  it('clamps odd day numbers and hands out copies', () => {
    for (const day of [0, -3, Number.NaN, 1.9]) expect(dayLesson(day)).toEqual(dayLesson(1));
    const first = dayLesson(1);
    first.say[0] = 'changed';
    first.task.hint = 'changed';
    expect(dayLesson(1).say[0]).not.toBe('changed');
    expect(dayLesson(1).task.hint).not.toBe('changed');
  });

  it('answers a sentence that is not play talk with where support is, and no hint', () => {
    const checked = checkDayTask(3, "I can't do this anymore.");
    expect(checked.ok).toBe(false);
    expect(checked.code).toBe('unknown');
    expect(checked.feedback).toContain('988');
    expect(checked.feedback).not.toContain(lowerFirst(dayLesson(3).task.hint));
  });

  it('does not throw on empty and odd answers', () => {
    for (const answer of ['', '   ', '\n\n', '???', '...', '12345', '🙂', 'a'.repeat(5000), 'you '.repeat(500)]) {
      for (const day of [1, 15, 22, 28, 31]) expect(checkDayTask(day, answer).feedback.length).toBeGreaterThan(0);
    }
  });
});
