/**
 * Props of the personalization screens of the first visit. Each is props-only; the flow holds the answers and
 * writes them to the profile (client/profileStore.ts). Frame ids are the Figma frames (images in docs/figma/frames/).
 */
import type { Habit, HowOften, Lever, PartnerId, PlayGuess } from '@/lib/types';

/** What every quiz screen shows in its top row: the way back and how far along the parent is. */
export interface QuizStepProps {
  /** 1-based position of this screen, for the progress segments. */
  step: number;
  steps: number;
  onBack(): void;
}

/** "What is your child called?" Mobile 49:998. The name stays on this device. */
export interface QuizNameProps extends QuizStepProps {
  value: string;
  onChange(name: string): void;
  onNext(): void;
  onSkip(): void;
}

/** "How old is {name}?" Mobile 49:1045, desktop 54:908. One tap picks and moves on. */
export interface QuizAgeProps extends QuizStepProps {
  /** Null when the name was skipped: the question then reads "How old is your child?". */
  childName: string | null;
  value: number | null;
  onPick(age: number): void;
}

/** "Which moments are hardest?" Mobile 49:1099, desktop 54:955. Several can be picked. */
export interface QuizMomentsProps extends QuizStepProps {
  value: string[];
  onChange(moments: string[]): void;
  onNext(): void;
}

/** "How often do they happen?" Mobile 49:1163. One tap picks and moves on. */
export interface QuizHowOftenProps extends QuizStepProps {
  value: HowOften | null;
  onPick(value: HowOften): void;
}

/** "What do you say most in play?" Mobile 49:1218. One tap picks and moves on. */
export interface QuizGuessProps extends QuizStepProps {
  value: PlayGuess | null;
  onPick(value: PlayGuess): void;
}

/** One fact with its source, on violet. Mobile 49:1273, desktop 54:1010. */
export interface QuizFactProps extends QuizStepProps {
  onNext(): void;
}

/** "What does {name} play with most?" Mobile 49:1412. One tap picks the scene and moves on. */
export interface SceneProps extends QuizStepProps {
  childName: string | null;
  partner: PartnerId;
  /** Scene id: 'blocks' or 'drawing' (lib/child/scenes.ts). */
  value: string;
  onPick(sceneId: string): void;
}

/** Which row of the plan the parent wants to change. */
export type PlanRowKey = 'partner' | 'scene' | 'praise' | 'moment' | 'focus';

/** "Your plan, from your answers." Mobile 49:1573. Every value is derived from what the parent did and said. */
export interface PlanFromAnswersProps extends QuizStepProps {
  partner: PartnerId;
  sceneId: string;
  /** The behavior to praise first, derived from the hardest moments. Null when none were picked. */
  praise: Habit | null;
  /** The daily moment. Null until chosen. */
  anchor: string | null;
  /** The one thing to work on first: the lever of round one. Null when round one met the pace. */
  focus: Lever | null;
  /**
   * A row was tapped: the flow goes back to that question. Without it no row leads anywhere.
   * It is never called with 'focus': the first focus is counted from round one, so no question sets it.
   */
  onEdit?(row: Exclude<PlanRowKey, 'focus'>): void;
  onNext(): void;
}

/** "Put five minutes in your calendar." Mobile 62:1460. A sheet over the plan. */
export interface CalendarSheetProps {
  open: boolean;
  /** The daily moment, for example "After dinner". */
  anchor: string | null;
  /** Days left in the plan, 1 to 28: the reminder repeats daily for that many days. */
  daysLeft: number;
  onClose(): void;
}
