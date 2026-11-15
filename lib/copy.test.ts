import { describe, expect, it } from 'vitest';
import {
  BUCKET, CALENDAR_LINK_TEXT, candidateTasks, CHANGE_TEXT, checkAnswer, coachPrompt, CRISIS_LINES, DEMO_LABEL, initialJourney,
  journeyReducer, LABEL, lessonFor, LEVER_NAME, LEVER_TEXT, LISTENING_HINT, LIVE_NOTICE, MAX_TRIES, MESSAGES, MICRO_REACTION,
  openerInsight, PLAN, planDay, REPEAT_NOTE, SAFETY_NOTE, SCENES, skillMix, type Code, type CodedSentence, type Lever,
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
  for (const d of [...PLAN, planDay(29)]) out.push(d.title, d.teaser, d.theme);
  out.push(...Object.values(LEVER_TEXT), ...Object.values(LEVER_NAME), ...Object.values(CHANGE_TEXT), ...Object.values(LABEL));
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
    const insight = openerInsight([coded(code)]);
    out.push(insight.headline, insight.body);
    out.push(skillMix({ counts: { ...ZERO, [code === 'unknown' ? 'neutral' : code]: 2, target: BUCKET[code] === 'target' ? 2 : 0 } }).line ?? '');
  }
  out.push(coachPrompt({ ...base, justCoded: null, childSpokeSec: 90 })?.text ?? '');
  out.push(coachPrompt({ ...base, justCoded: null })?.text ?? '');
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

const BANNED_TONE = /\b(?:wrong|bad|badly|mistakes?|mistaken|should|shouldn['’]t|don['’]t|dont)\b/i;
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
});
