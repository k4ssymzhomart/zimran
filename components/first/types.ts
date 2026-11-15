/**
 * Props of every screen of the first visit (/start). Each screen is props-only: the flow in
 * hooks/useFirstVisit.ts holds the state (lib/flow/journey.ts) and passes it down, and no screen reads a store.
 * Frame ids are the Figma frames each screen is built from (images in docs/figma/frames/).
 */
import type { Insight, TaskTry } from '@/lib/flow/journey';
import type { Lesson } from '@/lib/lesson/lesson';
import type { CodedSentence, PartnerId, PlayGuess, RoundChange, RoundResult, SavedSentence } from '@/lib/types';

/** Who to practice with. Mobile 49:1316, desktop 32:74. One tap picks and moves on. */
export interface PickPartnerProps {
  value: PartnerId;
  onPick(partner: PartnerId): void;
  /** 1-based place of this screen among the personalization screens, for the progress segments the phone frame draws. */
  step?: number;
  steps?: number;
  /** The back arrow. Without it there is none. */
  onBack?(): void;
}

/** The child speaks first and the parent answers in their own words. Mobile 20:74, desktop 32:91. */
export interface FirstAnswerProps {
  partner: PartnerId;
  /** What the child is doing, from the engine ("Mia stacks a red block on the tower."). Pass it through forChild. */
  does: string;
  /** What the child says ("I made a tower!"). */
  childSaid: string;
  /** A sentence the visitor already typed on the landing; it is sent as the answer without typing it again. */
  carried?: string | null;
  onAnswer(text: string): void;
  /** The back arrow. Without it there is none. */
  onBack?(): void;
}

/**
 * What the first answer did, then one try at saying the child's words back.
 * Mobile 20:109 (how it was read), 20:156 (she heard you), 20:178 (close, one way to say it).
 */
export interface AnswerReadProps {
  partner: PartnerId;
  childSaid: string;
  /** The first answer, coded by the engine. */
  first: CodedSentence[];
  insight: Insight | null;
  /** True once a reflection was said, in the first answer or in a try. */
  reflected: boolean;
  tries: number;
  feedback: string | null;
  /** True when the parent reflected or used up the tries: show the one action that starts round one. */
  canMoveOn: boolean;
  onTry(text: string): void;
  onNext(): void;
  /** The back arrow of 20:109: back to the first answer, to give it again. Without it there is none. */
  onBack?(): void;
}

/** One screen before the clock starts. Mobile 21:95 (round one) and 24:375 (ready for round two). */
export interface ReadyProps {
  partner: PartnerId;
  round: 1 | 2;
  seconds: number;
  onStart(): void;
  /** The back arrow of round one (21:95). Without it there is none: after "Play again" nothing is behind this screen. */
  onBack?(): void;
}

/**
 * Round one is over. Mobile 21:543 (result), 49:1371 (the guess against the count), 21:598 (your sentences);
 * desktop 32:164. Developer B builds the final version in components/round with these same props.
 */
export interface RoundOneResultProps {
  result: RoundResult;
  sentences: SavedSentence[];
  /**
   * The parent's answer to the quiz question "What do you say most in play?" (questions, instructions, praise, or
   * unsure). Frame 49:1371 sets it against the round: "You said praise. Round one: one praise, six questions."
   * Null when the quiz was skipped: then that screen is not shown at all.
   */
  guess: PlayGuess | null;
  partner?: PartnerId;
  /** What the child said as the round ended. */
  farewell?: string | null;
  /** "Disagree?": takes one sentence out of the count. The flow recomputes the result. */
  onDispute?(index: number): void;
  onNext(): void;
}

/** The 30-second lesson. Mobile 24:216, 24:255, 24:292, 24:331; desktop 32:212. */
export interface LessonProps {
  partner: PartnerId;
  lesson: Lesson;
  /** Index of the task being answered; equals lesson.tasks.length when the lesson is done. */
  taskIndex: number;
  /** The most recent try, for its feedback line. */
  lastTry: TaskTry | null;
  done: boolean;
  onAnswer(text: string): void;
  /** Starts round two. Offered as the main action when done, and as "Skip" before that. */
  onNext(): void;
  /** The back arrow of the idea (24:216): back to the result of round one. Without it there is none. */
  onBack?(): void;
}

/** Round one against round two. Mobile 24:477. Developer B builds the final version with these same props. */
export interface BeforeAfterProps {
  before: RoundResult;
  after: RoundResult;
  change?: RoundChange | null;
  partner?: PartnerId;
  farewell?: string | null;
  onNext(): void;
  /** "Play again". */
  onAgain?(): void;
}

/** The one setup question: when the five minutes happen. Mobile 24:523, desktop 32:240. */
export interface WhenYouPlayProps {
  partner: PartnerId;
  value: string | null;
  onChange(anchor: string): void;
  onNext(): void;
  /** The back arrow. Without it there is none. */
  onBack?(): void;
}

/** Day 1 is done and the 28 days are laid out. Mobile 24:568, desktop 32:272. */
export interface PlanResultProps {
  partner: PartnerId;
  anchor: string | null;
  /** Day of the plan, 1 to 28, from the saved sessions. */
  day: number;
  /** On to the plans and their price (the paywall): "Unlock daily sessions". */
  onNext(): void;
  /** "Open my plan": on to the plan itself, the Today tab. Without it the screen has the one way on, to the plans. */
  onOpenPlan?(): void;
}
