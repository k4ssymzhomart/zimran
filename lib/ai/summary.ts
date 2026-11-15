/**
 * The optional AI summary of one session (FEATURES.aiSummary), the pure part: what is sent, and what of the
 * answer is kept. The rules have coded every sentence and computed every count before the model sees anything;
 * the model only puts them into words. A rewrite it proposes is shown only when the same rules code it as one of
 * the three skills. Nothing here touches the network: the request goes through app/api/summary/route.ts.
 */
import { codeSentence, normalize } from '../coding/classify';
import { BUCKET, LABEL, type SavedSession } from '../types';

/** At most this many sentences are sent, each cut to this many characters. */
export const SUMMARY_MAX_SENTENCES = 80;
export const SUMMARY_MAX_CHARS = 240;
/** At most this many rewrites are shown on the review. */
export const MAX_REWRITES = 3;
/** The summary is cut at this many characters; a rewrite at REWRITE_MAX_CHARS. */
const SUMMARY_MAX_LENGTH = 700;
const REWRITE_MAX_CHARS = 120;

/** What leaves the device: the session in words, the counts, and the parent's sentences with their codes. No names of the family, no audio. */
export interface SummaryInput {
  session: string;
  /** null for reflections in live play, where they are not counted. */
  counts: { praise: number; reflect: number | null; describe: number; toSwap: number };
  clinicPace: { praise: number; reflect: number | null; describe: number; maxToSwap: number };
  sentences: { said: string; code: string }[];
}

export interface Rewrite {
  original: string;
  rewrite: string;
}

export interface AiSummary {
  summary: string;
  rewrites: Rewrite[];
}

const KIND_WORDS: Record<SavedSession['kind'], string> = {
  first_before: 'First practice round',
  first_after: 'Second practice round, after a short lesson',
  daily: 'Daily five-minute practice',
  practice: 'Practice round',
  live: "Five minutes of live play with the parent's own child (reflections are not counted in live play)",
};

/**
 * The request for one session, or null when there is nothing to summarize (a session moved over from the old
 * progress keeps no sentences). `childName` is the simulated child the parent practiced with, Mia or Leo.
 */
export function summaryInput(session: SavedSession, childName: string): SummaryInput | null {
  const said = session.sentences.filter((s) => !s.disputed && s.code !== 'unknown');
  if (said.length === 0) return null;
  const live = session.kind === 'live';
  return {
    session: live ? KIND_WORDS.live : `${KIND_WORDS[session.kind]} with ${childName}, a simulated four-year-old`,
    counts: {
      praise: session.counts.specific_praise,
      reflect: live ? null : session.counts.reflection,
      describe: session.counts.description,
      toSwap: session.counts.avoid,
    },
    clinicPace: {
      praise: session.targets.specific_praise,
      reflect: live ? null : session.targets.reflection,
      describe: session.targets.description,
      maxToSwap: session.targets.maxAvoid,
    },
    sentences: said.slice(0, SUMMARY_MAX_SENTENCES).map((s) => ({
      said: s.text.slice(0, SUMMARY_MAX_CHARS),
      code: BUCKET[s.code] === 'avoid' ? `${LABEL[s.code]}, to swap` : LABEL[s.code],
    })),
  };
}

// ---------- the server's checks ----------

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isCount = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 10_000;
const isCountOrNull = (x: unknown): x is number | null => x === null || isCount(x);

/** The posted body, checked field by field. Anything else is refused before a model is called. */
export function parseSummaryInput(x: unknown): SummaryInput | null {
  if (!isObject(x) || typeof x.session !== 'string' || x.session.length === 0 || x.session.length > 200) return null;
  const { counts, clinicPace, sentences } = x;
  if (!isObject(counts) || !isCount(counts.praise) || !isCountOrNull(counts.reflect) || !isCount(counts.describe) || !isCount(counts.toSwap)) {
    return null;
  }
  if (
    !isObject(clinicPace) ||
    !isCount(clinicPace.praise) ||
    !isCountOrNull(clinicPace.reflect) ||
    !isCount(clinicPace.describe) ||
    !isCount(clinicPace.maxToSwap)
  ) {
    return null;
  }
  if (!Array.isArray(sentences) || sentences.length === 0 || sentences.length > SUMMARY_MAX_SENTENCES) return null;
  const clean: SummaryInput['sentences'] = [];
  for (const s of sentences) {
    if (!isObject(s) || typeof s.said !== 'string' || typeof s.code !== 'string') return null;
    if (s.said.length === 0 || s.said.length > SUMMARY_MAX_CHARS || s.code.length > 40) return null;
    clean.push({ said: s.said, code: s.code });
  }
  return {
    session: x.session,
    counts: { praise: counts.praise, reflect: counts.reflect, describe: counts.describe, toSwap: counts.toSwap },
    clinicPace: { praise: clinicPace.praise, reflect: clinicPace.reflect, describe: clinicPace.describe, maxToSwap: clinicPace.maxToSwap },
    sentences: clean,
  };
}

/** The model's answer, trimmed to the sizes the review shows. */
export function tidySummary(answer: AiSummary): AiSummary {
  return {
    summary: answer.summary.trim().slice(0, SUMMARY_MAX_LENGTH),
    rewrites: answer.rewrites.slice(0, MAX_REWRITES * 2).map((r) => ({
      original: r.original.trim().slice(0, SUMMARY_MAX_CHARS),
      rewrite: r.rewrite.trim().slice(0, REWRITE_MAX_CHARS),
    })),
  };
}

// ---------- the rules check of the model's rewrites ----------

const comparable = (s: string): string => normalize(s).replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The rewrites the review may show: each one answers a sentence of this session that the rules put "to swap",
 * and the same rules code the rewrite as specific praise, a reflection or a description. A rewrite that fails
 * either test is dropped, so the model can suggest but never decide what counts.
 */
export function keepRewrites(rewrites: readonly Rewrite[], session: SavedSession): Rewrite[] {
  const toSwap = new Map<string, string>();
  for (const s of session.sentences) {
    if (!s.disputed && BUCKET[s.code] === 'avoid') toSwap.set(comparable(s.text), s.text);
  }
  const kept: Rewrite[] = [];
  for (const r of rewrites) {
    const original = toSwap.get(comparable(r.original));
    if (!original || kept.some((k) => k.original === original)) continue;
    if (BUCKET[codeSentence(r.rewrite).code] !== 'target') continue;
    kept.push({ original, rewrite: r.rewrite });
    if (kept.length === MAX_REWRITES) break;
  }
  return kept;
}

// ---------- the instructions ----------

/** The system prompt. The JSON shape of the answer is enforced by the API (structured outputs). */
export const SUMMARY_SYSTEM = `You write the short summary a parent reads after practicing child-directed play, the five-minute play skill that parent-child interaction therapy clinics teach. For five minutes the clinic pace is 10 specific praises, 10 reflections and 10 descriptions, with 3 or fewer questions, commands and corrections.

You receive one session as JSON: what kind of session it was, the counts, the clinic pace for its length, and every sentence the parent said with the code that rules on the parent's device gave it. The rules are final. Never recount, never recode a sentence, never contradict a number.

"summary": two or three short sentences in plain, warm American English, speaking to the parent as "you".
1. One concrete thing that went well. Quote one of the parent's sentences coded as specific praise, reflection or description when there is one.
2. One pattern in the sentences, such as which kind came most often or what the questions had in common.
3. One thing to try next time, built on the skill furthest from the clinic pace.
Do not diagnose, do not say how the child feels or will behave, do not promise results, and do not use the words wrong, bad, mistake, should or don't.

"rewrites": for up to three sentences marked "to swap", something the parent could say instead. Copy "original" exactly as it was said. Make "rewrite" either a short description of what the child is doing ("You're stacking the red block.") or a specific praise that names one thing ("Thank you for handing me the blue one."), under 12 words. When nothing is marked "to swap", return an empty list.`;
