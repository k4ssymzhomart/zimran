/**
 * "Why?" next to a coded sentence (FEATURES.aiSummary), the pure part: what is sent, and what of the answer is kept.
 * The rules have already coded the sentence; the model only says in plain words what made it that code, and may
 * suggest something to say instead. The suggestion is shown only when the same rules code it as a skill.
 */
import { codeSentence } from '../coding/classify';
import { BUCKET, LABEL, type Code, type SavedSentence } from '../types';

const MAX_SAID = 240;
const MAX_RULE = 40;
const MAX_WHY = 400;
const MAX_TRY = 120;

/** What leaves the device for one sentence: its text, the code the rules gave it and the name of the rule. */
export interface ExplainInput {
  said: string;
  code: string;
  rule: string | null;
}

export interface Explanation {
  why: string;
  /** Something to say instead, already checked by the rules; null for a sentence that is already a skill. */
  tryInstead: string | null;
}

export function explainInput(sentence: SavedSentence): ExplainInput | null {
  if (sentence.code === 'unknown' || !sentence.text.trim()) return null;
  return { said: sentence.text.slice(0, MAX_SAID), code: LABEL[sentence.code], rule: sentence.rule?.slice(0, MAX_RULE) ?? null };
}

const LABELS = new Set(Object.values(LABEL));

/** The posted body, checked field by field. Anything else is refused before a model is called. */
export function parseExplainInput(x: unknown): ExplainInput | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const { said, code, rule } = x as Record<string, unknown>;
  if (typeof said !== 'string' || said.trim().length === 0 || said.length > MAX_SAID) return null;
  if (typeof code !== 'string' || !LABELS.has(code) || code === LABEL.unknown) return null;
  if (!(rule === null || (typeof rule === 'string' && rule.length <= MAX_RULE))) return null;
  return { said, code, rule };
}

/** The model's answer, trimmed to the sizes the review shows. */
export function tidyExplanation(answer: { why: string; tryInstead: string | null }): Explanation {
  const tryInstead = answer.tryInstead?.trim().slice(0, MAX_TRY) || null;
  return { why: answer.why.trim().slice(0, MAX_WHY), tryInstead };
}

/** Codes that are already one of the three skills: nothing to suggest instead. */
const SKILL: ReadonlySet<Code> = new Set(['specific_praise', 'reflection', 'description']);

/**
 * The explanation the review may show. A suggestion is kept only for a sentence that is not already a skill, and
 * only when the same rules code the suggestion as specific praise or a description; the model never decides.
 */
export function keepExplanation(answer: Explanation, sentence: SavedSentence): Explanation {
  const suggestion = answer.tryInstead;
  const keep = suggestion !== null && !SKILL.has(sentence.code) && BUCKET[codeSentence(suggestion).code] === 'target';
  return { why: answer.why, tryInstead: keep ? suggestion : null };
}

/** The system prompt. The JSON shape of the answer is enforced by the API (structured outputs). */
export const EXPLAIN_SYSTEM = `You explain to a parent why the rules of a practice app coded one sentence the way they did. The parent is practicing child-directed play, the five-minute play skill that parent-child interaction therapy clinics teach, with a simulated four-year-old.

You receive the sentence, the code the rules gave it and the name of the rule that fired. The code is final: never say it is wrong and never suggest a different code.

The codes: Specific praise names exactly what the child did well. General praise is praise that does not say what. Reflection says the child's own words back right after the child spoke. Description says what the child is doing right now. Neutral talk is anything else. Question asks the child something, which takes the lead away from the child. Command tells the child what to do, including orders phrased as questions or suggestions. Correction says no, criticizes or points out what is not right.

"why": one or two short sentences in plain, warm American English, speaking to the parent as "you". Say what in the sentence made it this code, in everyday words; do not name the rule.
"tryInstead": for a sentence coded Question, Command, Correction, General praise or Neutral talk, one short sentence the parent could say instead in the same moment: a description of what the child is doing ("You're stacking the red block.") or a specific praise that names one thing ("Thank you for handing me the blue one."), under 12 words. For Specific praise, Reflection or Description, null.
Never use the words wrong, bad, mistake, should or don't.`;
