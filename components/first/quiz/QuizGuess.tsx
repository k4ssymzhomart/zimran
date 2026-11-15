'use client';

import type { PlayGuess } from '@/lib/types';
import type { QuizGuessProps } from '../quizTypes';
import { OneTapQuestion, type OneTapAnswer } from './QuizHowOften';

/** In the order of the frame. The values are PlayGuess in lib/types.ts and are stored in the profile: never rename one. */
const ANSWERS: ReadonlyArray<OneTapAnswer<PlayGuess>> = [
  { value: 'questions', label: 'Questions' },
  { value: 'instructions', label: 'Instructions' },
  { value: 'praise', label: 'Praise' },
  { value: 'unsure', label: 'Not sure' },
];

/**
 * "What do you say most in play?" (Figma 49:1218). The parent's guess, asked before they play: after round one it
 * is set against what they really said (Figma 49:1371). There is no Next: one tap on an answer picks it and moves on.
 */
export function QuizGuess({ step, steps, onBack, value, onPick }: QuizGuessProps) {
  return (
    <OneTapQuestion
      step={step}
      steps={steps}
      onBack={onBack}
      title="What do you say most in play?"
      art="bubbles"
      answers={ANSWERS}
      value={value}
      onPick={onPick}
    />
  );
}
