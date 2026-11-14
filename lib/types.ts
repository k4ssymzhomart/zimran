/**
 * Shared contract between the engine (/lib) and the screens (/app).
 * Agree on this file first; everything else is built against it.
 */

// ---------- coding of the parent's sentences ----------

export type Code =
  | 'specific_praise'
  | 'reflection'
  | 'description'
  | 'general_praise'
  | 'neutral'
  | 'question'
  | 'command'
  | 'criticism'
  | 'unknown';

/** target = fills a ring, avoid = goes to the "to swap" tray, neutral = no effect, none = not counted. */
export type Bucket = 'target' | 'neutral' | 'avoid' | 'none';

/** Behaviours a parent can name in a specific praise; the simulated child then shows them more often. */
export type Habit = 'gentle' | 'sharing' | 'patient' | 'tidy';

export interface CodedSentence {
  text: string;
  code: Code;
  bucket: Bucket;
  /** 0..1: how sure the rule that fired is. */
  confidence: number;
  /** Name of the rule that fired. Shown in the replay and checked in tests. */
  rule: string;
  /** For specific praise: which behaviour was named, if recognised. */
  namedBehavior?: Habit;
}

export interface CodingContext {
  /** What the child said on the current beat, or null. Needed to detect reflections. */
  childLastSaid?: string | null;
}

export const BUCKET: Record<Code, Bucket> = {
  specific_praise: 'target',
  reflection: 'target',
  description: 'target',
  general_praise: 'neutral',
  neutral: 'neutral',
  question: 'avoid',
  command: 'avoid',
  criticism: 'avoid',
  unknown: 'none',
};

export const LABEL: Record<Code, string> = {
  specific_praise: 'Specific praise',
  reflection: 'Reflection',
  description: 'Description',
  general_praise: 'General praise',
  neutral: 'Neutral talk',
  question: 'Question',
  command: 'Command',
  criticism: 'Criticism',
  unknown: 'Not coded',
};

// ---------- simulated child ----------

/** Everything the parent can do on a turn: say a coded sentence, or use one of two wordless moves. */
export type Move = Code | 'copy' | 'wait';

export type Face = 'beaming' | 'smiling' | 'neutral' | 'pouting' | 'crying';
export type Posture = 'leaning_in' | 'at_toy' | 'turned_away';
export type BeatKind = 'play' | 'wander' | 'whine' | 'scripted_whine' | 'meltdown';

export interface ChildState {
  /** Warmth toward the parent, 0..100. */
  connection: number;
  /** How absorbed she is in the play, 0..100. */
  focus: number;
  /** How much she speaks on her own, 0..100. */
  talk: number;
  /** Frustration, 0..100. Shown through the face, never as a bar. */
  tension: number;
  habits: Record<Habit, number>;
  /** Beats elapsed in this round. */
  beat: number;
  /** PRNG state; same seed and same moves give the same child. */
  seed: number;
  /** Beats left until a "wait quietly" pays off; 0 = not waiting. */
  waitArmed: number;
  /**
   * Her latest line, or null. Feed this into CodingContext. It stays for one silent beat,
   * so a parent who says her words back a few seconds late is still credited.
   */
  lastSaid: string | null;
  /** The beat on which she said `lastSaid`. */
  lastSaidBeat: number;
  /** Tension she lets go of on the next beat, after a whine or a meltdown. Outbursts pass. */
  pendingVent: number;
}

export interface Beat {
  kind: BeatKind;
  does: string;
  says: string | null;
  habit?: Habit;
}

export interface ChildView {
  face: Face;
  posture: Posture;
  connection: number;
  focus: number;
  talk: number;
}

export interface SceneAction {
  does: string;
  says?: string;
  habit?: Habit;
  /** Rough actions become likelier as tension rises. */
  rough?: boolean;
}

export interface Scene {
  id: string;
  title: string;
  intro: string;
  actions: SceneAction[];
  wander: SceneAction;
  whine: SceneAction;
  /** Other ways she whines, so two whines in a row do not repeat the same line. */
  whineAlt?: SceneAction[];
  meltdown: SceneAction;
  /** On this beat she whines whatever the parent said. Not every tantrum is the parent's doing. */
  scriptedWhineBeat: number;
  farewell: { high: string; mid: string; low: string };
}

// ---------- targets and results ----------

export interface Targets {
  specific_praise: number;
  reflection: number;
  description: number;
  /** Largest allowed total of questions + commands + criticism. */
  maxAvoid: number;
}

export type Counts = Record<Exclude<Code, 'unknown'>, number> & { target: number; avoid: number };

export type Lever = 'question' | 'command' | 'criticism' | 'specific_praise' | 'reflection' | 'description';

export interface RoundResult {
  /** The time the counts are measured over, for per-minute rates (see measuredSeconds in round/session.ts). */
  seconds: number;
  counts: Counts;
  targets: Targets;
  /** True when the round meets the clinic pace. */
  met: boolean;
  /** The one thing to work on next, or null when the round met the pace. */
  lever: Lever | null;
  leverText: string | null;
}

export interface RoundChange {
  /** Per-minute change, round 2 minus round 1, rounded to one decimal. */
  perMinute: Record<'specific_praise' | 'reflection' | 'description' | 'avoid', number>;
  /** Short lines for the change summary, best news first. */
  lines: string[];
  improved: boolean;
}

// ---------- coach ----------

export type PromptKind = 'swap' | 'praise_parent' | 'reflect_now' | 'praise_now';

export interface CoachPrompt {
  kind: PromptKind;
  text: string;
}
