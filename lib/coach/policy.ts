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
  /** She is whining or melting down on the current beat. Left out, she is calm. */
  outburst?: boolean;
  /** The wait_out line is on screen, or has already gone up on this outburst beat. */
  waitOutShown?: boolean;
  /** An outburst has passed, she is calm now, and no specific praise has followed yet. */
  calmAgain?: boolean;
  /**
   * False when her current line cannot be said back: it has no content word ("No!") or it was part
   * of an outburst. Left out, it can.
   */
  canReflect?: boolean;
  /** Live play with the parent's own child: the lines say "your child" and "they", not "she". Left out, practice with Mia. */
  live?: boolean;
}

/** Shortest pause between a praise or a hint for a sentence and the previous line. Swap lines do not wait. */
export const REACT_GAP = 8;
/** Shortest pause between unprompted nudges. */
export const NUDGE_GAP = 15;
export const PRAISE_OVERDUE = 40;
export const REFLECT_WITHIN = 5;

const SWAP: Partial<Record<Code, string>> = {
  question: "Questions are natural. Try it as a statement: “You're …”",
  command: 'Follow her lead for now. Say what she chose to do.',
  criticism: 'Let small things pass. Praise the opposite when you see it.',
};
const SWAP_LIVE: Partial<Record<Code, string>> = {
  ...SWAP,
  command: 'Let your child lead for now. Say what they chose to do.',
};

/** Shown on a whine or a meltdown. The method does not answer an outburst: the parent stays near and waits for calm. */
export const WAIT_OUT_TEXT = 'She is upset. Stay close and quiet, then praise the first calm thing she does.';
/** Shown on the first calm beat after an outburst. */
export const CALM_PRAISE_TEXT = 'She is calm again. Praise that: “Thank you for using your calm voice.”';

const PRAISE_PARENT: Partial<Record<Code, string>> = {
  specific_praise: 'Nice specific praise. She knows exactly what you liked.',
  reflection: 'Good reflection. She heard that you were listening.',
  description: 'Nice description. You named exactly what she did.',
};
const PRAISE_PARENT_LIVE: Partial<Record<Code, string>> = {
  specific_praise: 'Nice specific praise. Your child knows exactly what you liked.',
  reflection: 'Good reflection. Your child heard that you were listening.',
  description: 'Nice description. You named exactly what your child did.',
};
const ADD_WHAT = 'Warm. Now add exactly what she did: “Good job stacking so gently.”';
const ADD_WHAT_LIVE = 'Warm. Now add exactly what your child did: “Good job stacking so gently.”';
const PRAISE_NOW = 'Praise one exact thing she just did.';
const PRAISE_NOW_LIVE = 'Praise one exact thing your child just did.';

export function coachPrompt(i: CoachInput): CoachPrompt | null {
  const since = i.lastPromptSec === null ? Infinity : i.nowSec - i.lastPromptSec;

  if (i.justCoded) {
    // A to-swap sentence always gets its swap line, whatever is showing: a question typed a moment after
    // another line is still a question, and silence there reads as approval.
    const swap = (i.live ? SWAP_LIVE : SWAP)[i.justCoded.code];
    if (swap) return { kind: 'swap', text: swap };
    // During an outburst the one line that matters is "stay close and quiet": no praise for talking through it.
    if (i.outburst) return null;
    if (since < REACT_GAP) return null;
    const praise = (i.live ? PRAISE_PARENT_LIVE : PRAISE_PARENT)[i.justCoded.code];
    if (praise) return { kind: 'praise_parent', text: praise };
    if (i.justCoded.code === 'general_praise') {
      return { kind: 'swap', text: i.live ? ADD_WHAT_LIVE : ADD_WHAT };
    }
    return null;
  }

  // An outburst is not answered: no "say it back", no "praise now". The line goes up once and at once.
  if (i.outburst) return i.waitOutShown ? null : { kind: 'wait_out', text: WAIT_OUT_TEXT };

  // The first calm moment is the one to praise. It takes over from the wait_out line at once, and
  // otherwise leaves a line about the parent's own sentence its few seconds.
  if (i.calmAgain && (i.waitOutShown || since >= REACT_GAP)) return { kind: 'praise_now', text: CALM_PRAISE_TEXT };

  if (since < NUDGE_GAP) return null;

  if (i.canReflect !== false && i.childSpokeSec !== null && !i.reflectedSinceChildSpoke && i.nowSec - i.childSpokeSec >= REFLECT_WITHIN) {
    return { kind: 'reflect_now', text: 'Say back what she just said.' };
  }

  const sincePraise = i.lastSpecificPraiseSec === null ? i.nowSec : i.nowSec - i.lastSpecificPraiseSec;
  if (sincePraise >= PRAISE_OVERDUE) {
    return { kind: 'praise_now', text: i.live ? PRAISE_NOW_LIVE : PRAISE_NOW };
  }

  return null;
}
