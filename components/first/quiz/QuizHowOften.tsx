'use client';

import { useId, type KeyboardEvent, type MouseEvent } from 'react';
import { Option, type ArtName } from '@/components/kit';
import type { HowOften } from '@/lib/types';
import type { QuizHowOftenProps, QuizStepProps } from '../quizTypes';
import { QuizQuestion } from './QuizName';

export interface OneTapAnswer<T extends string> {
  /** What is stored. */
  value: T;
  /** What the parent reads. */
  label: string;
}

export interface OneTapQuestionProps<T extends string> extends QuizStepProps {
  /** The question: the heading of the page. */
  title: string;
  /** The one object on the violet block. */
  art: ArtName;
  /** In the order they are drawn. */
  answers: ReadonlyArray<OneTapAnswer<T>>;
  value: T | null;
  onPick(value: T): void;
}

/** True when an event came from the radio of the answer already chosen. Such a radio fires no change when used again. */
function isChosenRadio(target: EventTarget, value: string): boolean {
  return target instanceof HTMLInputElement && target.type === 'radio' && target.value === value;
}

/**
 * A quiz question with a short list of answers and no Next: one tap on an answer picks it and moves on
 * (Figma 49:1163, 49:1218). That holds for the answer that is already chosen too, so a parent who came back can
 * keep it and go on. It sits in the shell of the other questions (QuizQuestion, beside QuizName until the kit has it).
 * QuizGuess imports it from here.
 */
export function OneTapQuestion<T extends string>({ step, steps, onBack, title, art, answers, value, onPick }: OneTapQuestionProps<T>) {
  const titleId = useId();
  const group = useId();

  /**
   * A pick leaves the screen, so the arrow keys must not pick: they move the focus from answer to answer, and Space
   * or Enter picks the answer in focus (Enter is the kit's). Left to the browser, an arrow would choose the next radio.
   */
  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const move = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
    if (move === 0) return;
    const radios = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    const at = radios.findIndex((radio) => radio === event.target);
    if (at < 0) return;
    event.preventDefault();
    radios[(at + move + radios.length) % radios.length].focus();
  }

  /** A tap, or Enter, on the answer already chosen. */
  function pickAgain(event: MouseEvent<HTMLDivElement>) {
    if (value !== null && isChosenRadio(event.target, value)) onPick(value);
  }

  /** Space on the answer already chosen. Browsers disagree on whether that clicks the radio, so the key is taken here. */
  function pickAgainOnSpace(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== ' ' || value === null || !isChosenRadio(event.target, value)) return;
    event.preventDefault();
    onPick(value);
  }

  return (
    <QuizQuestion step={step} steps={steps} onBack={onBack} title={title} titleId={titleId} art={art}>
      <div
        role="radiogroup"
        aria-labelledby={titleId}
        onKeyDown={moveFocus}
        onKeyUp={pickAgainOnSpace}
        onClick={pickAgain}
        className="flex flex-col gap-[10px]"
      >
        {answers.map((answer) => (
          <Option
            key={answer.value}
            name={group}
            value={answer.value}
            label={answer.label}
            selected={value === answer.value}
            onChange={() => onPick(answer.value)}
          />
        ))}
      </div>
    </QuizQuestion>
  );
}

/** In the order of the frame. The values are HowOften in lib/types.ts and are stored in the profile: never rename one. */
const ANSWERS: ReadonlyArray<OneTapAnswer<HowOften>> = [
  { value: 'rarely', label: 'Rarely' },
  { value: 'some_days', label: 'Some days' },
  { value: 'most_days', label: 'Most days' },
  { value: 'every_day', label: 'Every day' },
];

/**
 * "How often do they happen?" (Figma 49:1163). "They" are the hardest moments of the question before it.
 * There is no Next: one tap on an answer picks it and moves on.
 */
export function QuizHowOften({ step, steps, onBack, value, onPick }: QuizHowOftenProps) {
  return (
    <OneTapQuestion
      step={step}
      steps={steps}
      onBack={onBack}
      title="How often do they happen?"
      art="cloud"
      answers={ANSWERS}
      value={value}
      onPick={onPick}
    />
  );
}
