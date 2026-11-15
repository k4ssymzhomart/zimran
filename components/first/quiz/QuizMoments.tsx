'use client';

import { useId } from 'react';
import { ART, Art, Button, ChoiceTile } from '@/components/kit';
import type { QuizMomentsProps } from '../quizTypes';
import { MOMENTS } from './moments';
import { QuizQuestion } from './QuizName';

/** "Which moments are hardest?" (Figma 49:1099, 54:955). Any number of the six can be picked, none included. */
export function QuizMoments({ step, steps, onBack, value, onChange, onNext }: QuizMomentsProps) {
  const titleId = useId();

  /** The ids stay in the order the parent picked them: the first one tapped is first in the list. */
  function toggle(id: string, picked: boolean) {
    const rest = value.filter((other) => other !== id);
    onChange(picked ? [...rest, id] : rest);
  }

  return (
    <QuizQuestion
      step={step}
      steps={steps}
      onBack={onBack}
      title="Which moments are hardest?"
      titleId={titleId}
      art="moon"
      compact
      support={
        <>
          <Art name="sun" size={110} className="absolute top-[14.44%] left-[9.72%]" />
          <Art name="teddies" size={120} className="absolute top-[68.89%] left-[73.61%]" />
        </>
      }
      action={
        <Button fullWidth onClick={onNext}>
          Next
        </Button>
      }
    >
      {/* Under 360px (an iPhone with Display Zoom on) the tiles take 8px of each gutter, so "Mealtimes" stays inside its tile. */}
      <div role="group" aria-labelledby={titleId} className="grid grid-cols-2 gap-[10px] max-[359px]:-mx-[8px]">
        {MOMENTS.map((moment) => (
          <ChoiceTile
            key={moment.id}
            multiple
            value={moment.id}
            label={moment.label}
            art={ART[moment.art].src}
            selected={value.includes(moment.id)}
            onChange={(picked) => toggle(moment.id, picked)}
          />
        ))}
      </div>
    </QuizQuestion>
  );
}
