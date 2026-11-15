'use client';

import { useId, type KeyboardEvent, type MouseEvent } from 'react';
import { Art, NumberTile } from '@/components/kit';
import type { QuizAgeProps } from '../quizTypes';
import { QuizQuestion } from './QuizName';

/** The ages the question offers (Figma 49:1045). The profile takes the same range. */
const AGES = [2, 3, 4, 5, 6, 7];

/** True when an event came from the radio of the age already chosen. Such a radio fires no change when used again. */
function isChosenRadio(target: EventTarget, value: number): boolean {
  return target instanceof HTMLInputElement && target.type === 'radio' && target.value === String(value);
}

/**
 * "How old is {name}?" (Figma 49:1045, 54:908). There is no Next: one tap on an age picks it and moves on.
 * That holds for the age that is already chosen too, so a parent who came back can keep it and go on.
 */
export function QuizAge({ step, steps, onBack, childName, value, onPick }: QuizAgeProps) {
  const titleId = useId();
  const noteId = useId();
  const group = useId();

  /**
   * A pick leaves the screen, so the arrow keys must not pick: they move the focus from age to age, and Space or
   * Enter picks the age in focus (Enter is the kit's). Left to the browser, an arrow would choose the next radio.
   */
  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    /* With a modifier the arrow is the browser's (Alt and Left goes back a page). */
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const move = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (move === 0) return;
    const radios = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    const at = radios.findIndex((radio) => radio === event.target);
    if (at < 0) return;
    event.preventDefault();
    radios[(at + move + radios.length) % radios.length].focus();
  }

  /** A tap, or Enter, on the age already chosen. */
  function pickAgain(event: MouseEvent<HTMLDivElement>) {
    if (value !== null && isChosenRadio(event.target, value)) onPick(value);
  }

  /** Space on the age already chosen. Browsers disagree on whether that clicks the radio, so the key is taken here. */
  function pickAgainOnSpace(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== ' ' || value === null || !isChosenRadio(event.target, value)) return;
    event.preventDefault();
    onPick(value);
  }

  return (
    <QuizQuestion
      step={step}
      steps={steps}
      onBack={onBack}
      title={childName ? `How old is ${childName}?` : 'How old is your child?'}
      titleId={titleId}
      art="cake"
      support={
        <>
          <Art name="nametag" size={110} className="absolute top-[66.67%] left-[8.33%]" />
          <Art name="teddies" size={120} className="absolute top-[14.44%] left-[75%]" />
        </>
      }
    >
      <div
        role="radiogroup"
        aria-labelledby={titleId}
        aria-describedby={noteId}
        onKeyDown={moveFocus}
        onKeyUp={pickAgainOnSpace}
        onClick={pickAgain}
        className="grid grid-cols-3 gap-[10px]"
      >
        {AGES.map((age) => (
          <NumberTile
            key={age}
            name={group}
            value={String(age)}
            label={String(age)}
            selected={value === age}
            onChange={() => onPick(age)}
            className="lg:text-title-xl"
          />
        ))}
      </div>
      <p id={noteId} className="text-small text-gray">
        Mia and Leo are four. The skills are the same from 2&nbsp;to&nbsp;7.
      </p>
    </QuizQuestion>
  );
}
