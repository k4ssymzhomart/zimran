import { describe, expect, it } from 'vitest';
import { SCENES } from '../child/scenes';
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
        // A task that asks for two sentences (day 13) passes on two of them, and says so after one.
        const enough = (task.min ?? 1) > 1 ? `${sentence} ${task.example}` : sentence;
        expect(checkDayTask(day, enough).ok, enough).toBe(true);
        if ((task.min ?? 1) > 1) expect(checkDayTask(day, sentence), sentence).toMatchObject({ ok: false, code: alone.code });
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

  it('day 1 fits the scene the parent chose: descriptions that name no toy', () => {
    // The plan names no scene for day 1, so its round plays the parent's own scene, blocks or drawing.
    expect(PLAN[0].sceneId ?? null).toBeNull();
    const { say, task } = dayLesson(1);
    for (const sentence of [...say, task.example]) expect(codeTurn(sentence).map((s) => s.code), sentence).toEqual(['description']);
    expect([...say, task.setup, task.example].join(' ')).not.toMatch(/block|tower|stack|crayon|draw|paper|car\b/i);
    expect(checkDayTask(1, task.example)).toMatchObject({ ok: true, code: 'description' });
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
    // Changed by design: day 11, "Describe the calm moments", takes any skill. Its most natural answer names the
    // calm itself ("You're coloring so quietly."), and that reads as specific praise.
    for (let day = 8; day <= 14; day++) expect(dayLesson(day).task.want, String(day)).toBe(day === 11 ? 'any_target' : 'description');
    for (let day = 15; day <= 21; day++) {
      const lesson = dayLesson(day);
      expect(lesson.task.want).toBe('reflection');
      expect(lesson.task.miaSays).not.toBeNull();
      expect(lesson.task.setup).toContain(`“${lesson.task.miaSays}”`);
      expect(lesson.afterMia).toHaveLength(3);
    }
    for (let day = 22; day <= 26; day++) expect(dayLesson(day).task.want).toBe('specific_praise');
  });

  it('day 11 passes a calm moment named with its calm word', () => {
    expect(PLAN[10].title).toBe('Describe the calm moments');
    expect(checkDayTask(11, "You're coloring so quietly.")).toMatchObject({ ok: true, code: 'specific_praise' });
    expect(checkDayTask(11, "You're sitting so quietly and building.")).toMatchObject({ ok: true, code: 'specific_praise' });
    expect(checkDayTask(11, "You're coloring inside the circle.")).toMatchObject({ ok: true, code: 'description' });
    expect(checkDayTask(11, 'Good job!')).toMatchObject({ ok: false, code: 'general_praise' });
    expect(checkDayTask(11, 'Color quietly.')).toMatchObject({ ok: false });
  });

  it('day 13 asks for two descriptions and passes on two, not on one', () => {
    expect(PLAN[12].title).toBe('Descriptions back to back');
    expect(dayLesson(13).task.min).toBe(2);
    const one = checkDayTask(13, "You're drawing a house.");
    expect(one).toMatchObject({ ok: false, code: 'description' });
    expect(one.feedback).toBe("That is one description; write one “You're …” sentence for each thing she does.");
    expect(checkDayTask(13, "You're drawing a house. You're adding a red door.")).toMatchObject({ ok: true, code: 'description' });
    // Without punctuation, as spoken.
    expect(checkDayTask(13, "you're drawing a house you're adding a red door").ok).toBe(true);
    // Two sentences of which one is a question: not there yet.
    expect(checkDayTask(13, "You're drawing a house. Is that a door?")).toMatchObject({ ok: false, code: 'question' });
    // No other day asks for more than one.
    for (const day of ALL_DAYS) if (day !== 13) expect(dayLesson(day).task.min, String(day)).toBeUndefined();
  });

  // Changed by design: day 18 was "Reflect big feelings" and taught saying back "This is too hard!", the very
  // lines the coach says to wait out (day 6, and the wait_out line in a round). It now reflects what she says
  // in words when something goes sideways, and none of its lines is one of her whine beats.
  it('day 16 reflects a single word and day 18 a hard moment said in words', () => {
    expect(PLAN[15].title).toBe('Reflect a single word');
    expect(dayLesson(16).task.miaSays).toBe('Rainbow!');
    expect(checkDayTask(16, 'Rainbow!')).toMatchObject({ ok: true, code: 'reflection' });
    expect(checkDayTask(16, 'A rainbow.')).toMatchObject({ ok: true, code: 'reflection' });
    expect(checkDayTask(16, 'Is it a rainbow?')).toMatchObject({ ok: false, code: 'question' });

    expect(PLAN[17].title).toBe('Reflect the hard moments');
    expect(dayLesson(18).task.miaSays).toBe('It all spilled.');
    expect(checkDayTask(18, 'It all spilled.')).toMatchObject({ ok: true, code: 'reflection' });
    expect(checkDayTask(18, 'It spilled.')).toMatchObject({ ok: true, code: 'reflection' });
    expect(checkDayTask(18, 'No, it is fine.').ok).toBe(false);
    expect(dayLesson(18).idea).toContain('whining still gets the quiet wait');
    // None of the day's lines is a whine or a meltdown line of any scene.
    const outbursts = new Set(SCENES.flatMap((s) => [s.whine, ...(s.whineAlt ?? []), s.meltdown].map((a) => a.says)));
    for (const line of [dayLesson(18).task.miaSays, ...(dayLesson(18).afterMia ?? [])]) expect(outbursts.has(line ?? ''), line ?? '').toBe(false);
    // The classifier itself has not changed here: her complaint said back is still a reflection, not a correction of her.
    expect(codeTurn('This is too hard.', { childLastSaid: 'This is too hard!' }).map((c) => c.code)).toEqual(['reflection']);
    expect(codeTurn('It is too hard.', { childLastSaid: 'This is too hard!' }).map((c) => c.code)).toEqual(['reflection']);
  });

  it('weeks 2 to 4 pass the spoken variations of their own sentences', () => {
    // A noun with 's, as speech recognition writes it.
    expect(checkDayTask(20, "The dog's hungry. You're drawing him a bowl.")).toMatchObject({ ok: true, code: 'reflection' });
    expect(checkDayTask(17, "It's a long train.")).toMatchObject({ ok: true, code: 'reflection' });
    // The emphatic say-back.
    expect(checkDayTask(15, 'You did draw a cat!')).toMatchObject({ ok: true, code: 'reflection' });
    // The day's own example names what the parent did: a description, not a reflection of "This is our house."
    expect(checkDayTask(28, "You're drawing a house with a red door.")).toMatchObject({ ok: true, code: 'description' });
    expect(checkDayTask(28, "That's our house.")).toMatchObject({ ok: true, code: 'reflection' });
    // "You want to play cars now." is a statement: not there yet on day 4, and not called a question.
    expect(checkDayTask(4, 'You want to play cars now.')).toMatchObject({ ok: false, code: 'neutral' });
  });

  it('day 19 tells a reflection from the same words with a question mark', () => {
    expect(checkDayTask(19, 'You made a tower.')).toMatchObject({ ok: true, code: 'reflection' });
    expect(checkDayTask(19, 'You made a tower?')).toMatchObject({ ok: false, code: 'question' });
    // The hint fits a miss that already ends with a period.
    expect(checkDayTask(19, 'You built a tower.').feedback).toBe('That read as a description; say her words as a statement, with a period at the end: “You made a tower.”');
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

  it('the clean-up days ask nothing of her, and pass the warm things a parent says there', () => {
    // Nothing has to be put away in the child-led five minutes.
    expect(dayLesson(29).idea).toContain('Nothing has to get put away');
    expect(checkDayTask(29, 'Thank you for helping clean up.')).toMatchObject({ ok: true, code: 'specific_praise' });
    expect(checkDayTask(29, 'You put the car in the bin.')).toMatchObject({ ok: true, code: 'description' });
    expect(checkDayTask(29, 'Hurry up and get the rest.')).toMatchObject({ ok: false, code: 'command' });
    // Day 32: her "No!" answers nothing the parent asked for, and what is praised is her own next move.
    expect(dayLesson(32).task.setup).toContain('rolls one car over to you');
    expect(dayLesson(32).task.setup).not.toMatch(/toy bin|drops one car in/);
    expect(checkDayTask(32, 'Thank you for sharing the car.')).toMatchObject({ ok: true, code: 'specific_praise' });
    expect(checkDayTask(32, 'You rolled the car to me.')).toMatchObject({ ok: true, code: 'description' });
    expect(checkDayTask(32, 'Thank you for helping clean up the cars.')).toMatchObject({ ok: true, code: 'specific_praise' });
    expect(checkDayTask(32, 'Put the car in the bin.')).toMatchObject({ ok: false, code: 'command' });
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
