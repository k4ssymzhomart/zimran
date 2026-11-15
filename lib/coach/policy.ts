/**
 * Coach policy. Deterministic. The coach talks to the parent the way the parent is learning to talk
 * to the child: specific praise, no criticism, no orders, and never more than one line at a time.
 */
import type { CoachPrompt, Code, CodedSentence } from '../types';

export interface CoachInput {
  /** Seconds since the round started. */
  nowSec: number;
  /** When the coach last spoke, or null. */
  lastPromptSec: number | null;
  /** When the parent last gave a specific praise, or null. */
  lastSpecificPraiseSec: number | null;
  /** When the child last spoke, or null. */
  childSpokeSec: number | null;
  /** Whether the parent has reflected since the child last spoke. */
  reflectedSinceChildSpoke: boolean;
  /** The sentence that was just coded, or null on a timer tick. */
  justCoded: CodedSentence | null;
}

/** Shortest pause between a reaction to a sentence and the previous line. */
export const REACT_GAP = 8;
/** Shortest pause between unprompted nudges. */
export const NUDGE_GAP = 15;
export const PRAISE_OVERDUE = 40;
export const REFLECT_WITHIN = 5;

const SWAP: Partial<Record<Code, string>> = {
  question: "Questions are natural. Try it as a statement: “You're …”",
  command: 'Let her lead for now. Say what she chose to do.',
  criticism: 'Let small things pass. Praise the opposite when you see it.',
};

const PRAISE_PARENT: Partial<Record<Code, string>> = {
  specific_praise: 'Nice specific praise. She knows exactly what you liked.',
  reflection: 'Good reflection. She heard that you were listening.',
  description: 'Nice description. You named exactly what she did.',
};

export function coachPrompt(i: CoachInput): CoachPrompt | null {
  const since = i.lastPromptSec === null ? Infinity : i.nowSec - i.lastPromptSec;

  if (i.justCoded) {
    if (since < REACT_GAP) return null;
    const swap = SWAP[i.justCoded.code];
    if (swap) return { kind: 'swap', text: swap };
    const praise = PRAISE_PARENT[i.justCoded.code];
    if (praise) return { kind: 'praise_parent', text: praise };
    if (i.justCoded.code === 'general_praise') {
      return { kind: 'swap', text: 'Warm! Now add exactly what she did: “Good job stacking so gently.”' };
    }
    return null;
  }

  if (since < NUDGE_GAP) return null;

  if (i.childSpokeSec !== null && !i.reflectedSinceChildSpoke && i.nowSec - i.childSpokeSec >= REFLECT_WITHIN) {
    return { kind: 'reflect_now', text: 'Say back what she just said.' };
  }

  const sincePraise = i.lastSpecificPraiseSec === null ? i.nowSec : i.nowSec - i.lastSpecificPraiseSec;
  if (sincePraise >= PRAISE_OVERDUE) {
    return { kind: 'praise_now', text: 'Praise one exact thing she just did.' };
  }

  return null;
}
