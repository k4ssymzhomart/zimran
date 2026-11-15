import { describe, expect, it } from 'vitest';
// The adapter every screen passes engine copy through when the parent practises with Leo. It is the team's;
// the engine's lines have to survive it, so they are checked against the real thing.
import { forChild } from '../components/child';
import {
  BUCKET, CALENDAR_LINK_TEXT, CALM_PRAISE_TEXT, candidateTasks, CHANGE_TEXT, checkAnswer, checkDayTask, coachPrompt, CRISIS_LINES, dayLesson, DEMO_LABEL, DISPUTES_USED_NOTE,
  GOOGLE_CALENDAR_LINK_TEXT, initialJourney,
  journeyReducer, LABEL, lessonFor, LEVER_NAME, LEVER_NAME_LIVE, LEVER_TEXT, LEVER_TEXT_LIVE, LISTENING_HINT, LIVE_NOTICE, MAX_TRIES, MESSAGES, MICRO_REACTION,
  openerInsight, PLAN, planDay, REPEAT_NOTE, SAFETY_NOTE, SCENES, SHORT_ROUND_NOTE, skillMix, TURN_CAP_NOTE, WAIT_OUT_TEXT, type Code, type CodedSentence, type Lever,
} from './index';

/**
 * The tone and spelling rules of DESIGN.md, checked on every line the engine hands to a screen.
 * Sentences quoted as what a parent might say ("instead of ...") and Mia's own words are examples of talk,
 * not the product speaking, so the tone rule is not applied to them; the spelling rule is.
 */

const LEVERS: Lever[] = ['question', 'command', 'criticism', 'description', 'reflection', 'specific_praise'];
const CODES = Object.keys(LABEL) as Code[];
const coded = (code: Code): CodedSentence => ({ text: 'x', code, bucket: BUCKET[code], confidence: 1, rule: 'test' });

/** What the product itself says to the parent. */
function productVoice(): string[] {
  const out: string[] = [];
  for (const d of [...PLAN, ...[29, 30, 31, 32, 33, 34, 35].map(planDay)]) out.push(d.title, d.teaser, d.theme);
  out.push(WAIT_OUT_TEXT, CALM_PRAISE_TEXT, TURN_CAP_NOTE, SHORT_ROUND_NOTE, GOOGLE_CALENDAR_LINK_TEXT, DISPUTES_USED_NOTE);
  for (let day = 1; day <= 35; day++) {
    const lesson = dayLesson(day);
    out.push(lesson.idea, lesson.task.setup, lesson.task.hint);
    // What the task answers: to its own example, to a miss, and to one sentence where two are asked for.
    out.push(checkDayTask(day, lesson.task.example).feedback, checkDayTask(day, 'Hmm.').feedback, checkDayTask(day, lesson.say[0]).feedback);
  }
  out.push(...Object.values(LEVER_TEXT), ...Object.values(LEVER_NAME), ...Object.values(CHANGE_TEXT), ...Object.values(LABEL));
  out.push(...Object.values(LEVER_TEXT_LIVE), ...Object.values(LEVER_NAME_LIVE));
  out.push(...Object.values(MICRO_REACTION), ...Object.values(MESSAGES), ...Object.values(LIVE_NOTICE), LISTENING_HINT);
  out.push(SAFETY_NOTE.headline, SAFETY_NOTE.body, ...CRISIS_LINES, REPEAT_NOTE, DEMO_LABEL, CALENDAR_LINK_TEXT);
  for (const scene of SCENES) {
    out.push(scene.title, scene.intro, ...Object.values(scene.farewell));
    for (const a of [...scene.actions, scene.wander, scene.whine, ...(scene.whineAlt ?? []), scene.meltdown]) out.push(a.does);
  }
  for (const lever of LEVERS) {
    const lesson = lessonFor(lever);
    out.push(lesson.title, lesson.why, ...lesson.pairs.map((p) => p.say));
    for (const task of candidateTasks(lever)) {
      out.push(task.situation, task.modelAnswer, task.hint);
      // The feedback for a good answer, and for the answer the lesson is there to replace.
      out.push(checkAnswer(task, task.modelAnswer).feedback, checkAnswer(task, task.insteadOf).feedback.replace(task.hint, ''));
    }
  }
  const base = { nowSec: 100, lastPromptSec: null, lastSpecificPraiseSec: null, childSpokeSec: null, reflectedSinceChildSpoke: false };
  for (const code of CODES) {
    out.push(coachPrompt({ ...base, justCoded: coded(code) })?.text ?? '');
    out.push(coachPrompt({ ...base, live: true, justCoded: coded(code) })?.text ?? '');
    const insight = openerInsight([coded(code)]);
    out.push(insight.headline, insight.body);
    out.push(skillMix({ counts: { ...ZERO, [code === 'unknown' ? 'neutral' : code]: 2, target: BUCKET[code] === 'target' ? 2 : 0 } }).line ?? '');
  }
  out.push(coachPrompt({ ...base, justCoded: null, childSpokeSec: 90 })?.text ?? '');
  out.push(coachPrompt({ ...base, justCoded: null })?.text ?? '');
  out.push(coachPrompt({ ...base, live: true, justCoded: null })?.text ?? '');
  // The opener's own lines, and what it answers to each try at saying her words back.
  let journey = journeyReducer(initialJourney(1, 'opener'), { type: 'answer_opener', text: 'Wow, good job! What is it?' });
  out.push(journey.opener.does, journey.opener.insight?.headline ?? '', journey.opener.insight?.body ?? '');
  for (let i = 0; i < MAX_TRIES; i++) {
    journey = journeyReducer(journey, { type: 'try_reflection', text: 'Nice.' });
    out.push(journey.opener.reflectionFeedback ?? '');
  }
  out.push(journeyReducer(journey, { type: 'try_reflection', text: journey.opener.childSaid }).opener.reflectionFeedback ?? '');
  return out.filter((line) => line !== '');
}

const ZERO = {
  specific_praise: 0, reflection: 0, description: 0, general_praise: 0, neutral: 0, question: 0, command: 0, criticism: 0, target: 0, avoid: 0,
};

/** Talk that is quoted, not said by the product: Mia's lines and the "instead of" sentences. */
function quotedTalk(): string[] {
  const out: string[] = [];
  for (const scene of SCENES) {
    for (const a of [...scene.actions, scene.wander, scene.whine, ...(scene.whineAlt ?? []), scene.meltdown]) if (a.says) out.push(a.says);
  }
  for (const lever of LEVERS) {
    out.push(...lessonFor(lever).pairs.flatMap((p) => [p.insteadOf, p.childSaid ?? '']));
    out.push(...candidateTasks(lever).flatMap((t) => [t.insteadOf, t.childSaid ?? '']));
  }
  return out.filter((line) => line !== '');
}

const BANNED_TONE = /\b(?:wrong|bad|badly|mistakes?|mistaken|fail\w*|should|shouldn['’]t|don['’]t|dont)\b/i;
const BRITISH =
  /\b(?:practis\w*|programmes?|behaviour\w*|paediatric\w*|labell\w+|colour\w*|favourite\w*|centre[ds]?|recognis\w*|organis\w*|realis\w*|apologis\w*|cancell\w+|grey|mum|mummy|whilst|learnt|nappy|nappies|tidying)\b/i;

describe('what the engine says to a parent', () => {
  const voice = productVoice();

  it('covers the plan, the lessons, the coach, the scenes and the notices', () => {
    expect(voice.length).toBeGreaterThan(300);
    expect(voice).toContain('Say back what she just said.');
    expect(voice).toContain(planDay(28).teaser);
  });

  it('never says wrong, bad, mistake, should or don\'t', () => {
    for (const line of voice) expect(BANNED_TONE.test(line), line).toBe(false);
  });

  it('is in US spelling, quoted talk included', () => {
    for (const line of [...voice, ...quotedTalk()]) expect(BRITISH.test(line), line).toBe(false);
  });

  it('quotes with curly marks, never with straight ones', () => {
    for (const line of voice) expect(line, line).not.toContain('"');
  });

  it('spells clean-up one way', () => {
    for (const line of voice) expect(line, line).not.toMatch(/\bcleanup\b/i);
  });

  it('calls the skill "specific praise" where it counts sentences', () => {
    for (const line of voice.filter((l) => /sentences? w(?:as|ere)\b/.test(l) && /praise/.test(l))) expect(line).toContain('specific praise');
  });
});

describe('what the coach says during a round', () => {
  const base = { nowSec: 100, lastPromptSec: null, lastSpecificPraiseSec: null, childSpokeSec: null, reflectedSinceChildSpoke: false };
  const lines: string[] = [WAIT_OUT_TEXT, CALM_PRAISE_TEXT, DISPUTES_USED_NOTE, ...Object.values(LEVER_TEXT), ...Object.values(LEVER_TEXT_LIVE)];
  for (const live of [false, true]) {
    for (const code of CODES) lines.push(coachPrompt({ ...base, live, justCoded: coded(code) })?.text ?? '');
    lines.push(coachPrompt({ ...base, live, justCoded: null })?.text ?? '', coachPrompt({ ...base, live, justCoded: null, childSpokeSec: 90 })?.text ?? '');
  }

  it('has no exclamation mark outside a quoted example', () => {
    for (const line of lines.filter(Boolean)) expect(line.replace(/“[^”]*”/g, ''), line).not.toContain('!');
  });
});

describe('with Leo chosen, the engine\'s lines stay grammatical', () => {
  const voice = productVoice();
  /** What may come after "him": the rest of a clause, never a thing he owns ("him bear", "him sportscaster"). */
  const AFTER_HIM = new Set(['doing', 'you', 'what', 'to', 'keep', 'in', 'fully', 'exactly', 'choose', 'lead', 'know', 'and', 'so']);

  it('leaves no "she", "her" or "Mia" behind', () => {
    for (const line of voice) expect(forChild(line, 'leo'), line).not.toMatch(/\b(?:she|She|her|Her|hers|herself|Mia)\b/);
  });

  it('never turns a "her" that owns something into "him", nor a "her" that is led into "his"', () => {
    for (const line of voice) {
      const out = forChild(line, 'leo');
      // "Let her lead" used to come out as "Let his lead".
      expect(out, line).not.toMatch(/\b[Ll]et his\b/);
      for (const m of out.matchAll(/\b[Hh]im\b(?:\s+([A-Za-z’']+))?/g)) {
        if (m[1] !== undefined && !/[.,:;!?”]/.test(out.charAt((m.index ?? 0) + 3))) expect(AFTER_HIM.has(m[1].toLowerCase()), `${line} -> ${out}`).toBe(true);
      }
    }
  });

  it('reads right in the lines a reviewer saw broken', () => {
    const coach = (text: string): string => forChild(coachPrompt({ nowSec: 100, lastPromptSec: null, lastSpecificPraiseSec: null, childSpokeSec: null, reflectedSinceChildSpoke: false, justCoded: { text, code: 'command', bucket: 'avoid', confidence: 1, rule: 'test' } })?.text ?? '', 'leo');
    expect(coach('Put it here.')).toBe('Follow his lead for now. Say what he chose to do.');
    expect(forChild(LEVER_TEXT.command, 'leo')).toBe('Follow his lead: describe what he chose instead of telling him what to do.');
    expect(forChild(`Last session your biggest lever was ${LEVER_NAME.command}.`, 'leo')).toBe('Last session your biggest lever was following his lead.');
    expect(forChild(lessonFor('command').title, 'leo')).toBe('Follow his lead');
    expect(forChild(PLAN[7].title, 'leo')).toBe('Be the sportscaster');
    expect(forChild(planDay(7).teaser, 'leo')).toBe('Tomorrow: week 2 begins, and you become the sportscaster.');
    expect(forChild(dayLesson(5).task.hint, 'leo')).toBe("Start with “You're …” and name the move.");
    expect(forChild(dayLesson(16).task.hint, 'leo')).toBe('Say the one word back: “A …”.');
    expect(forChild(dayLesson(21).task.hint, 'leo')).toBe("Turn “I'm” into “You're”: “You're making …”.");
    expect(forChild(dayLesson(23).task.setup, 'leo')).toBe('Leo lays the doll in the bin very gently. Praise the gentle hands.');
    expect(forChild(dayLesson(32).task.setup, 'leo')).toContain('Leo hugs the bear and says “No!”');
    const cleanup = SCENES.find((s) => s.id === 'cleanup');
    expect((cleanup?.whineAlt ?? []).map((a) => forChild(a.does, 'leo'))).toEqual(['Leo hugs the bear and turns away from the bin.', 'Leo drops a car and stomps.']);
  });

  it('leaves Mia\'s wording as it is written', () => {
    for (const line of voice) expect(forChild(line, 'mia')).toBe(line);
  });
});
