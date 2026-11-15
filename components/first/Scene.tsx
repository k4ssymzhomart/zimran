'use client';

import { useId, type KeyboardEvent, type ReactNode } from 'react';
import {
  Art,
  Icon,
  IconButton,
  Pattern,
  Portrait,
  QuizProgress,
  cn,
  focusRingWithin,
  type ArtName,
  type Pose,
} from '@/components/kit';
import { SCENES } from '@/lib/child/scenes';
import type { PartnerId } from '@/lib/types';
import type { QuizStepProps, SceneProps } from './quizTypes';

export interface QuizScreenProps extends QuizStepProps {
  /** The one 3D object on the violet block. */
  art: ArtName;
  /** The question and its answers, on white. */
  children: ReactNode;
  /** The one action. On phones it rests at the bottom of the screen. */
  action?: ReactNode;
}

/**
 * TODO kit: the shell of one quiz question. The kit SplitScreen gives the violet block all the height the words
 * leave. A question keeps the block short (Figma 49:1412: 170px under the status bar) with the way back and the
 * progress in its top row, the words take the rest, and the action rests at the bottom (49:1573).
 * From 1024px it is the split of SplitScreen with the 460px column of the quiz (54:955).
 * The personalization questions carry the same shell as QuizQuestion in ./quiz/QuizName.tsx: one of the two goes
 * when the kit has it. This one leaves the space under the question to the screen (18px here, 8px on the plan).
 */
export function QuizScreen({ step, steps, onBack, art, action, children }: QuizScreenProps) {
  return (
    <div className="split-root flex flex-col lg:flex-row">
      <div className="relative flex h-[calc(170px+env(safe-area-inset-top))] shrink-0 flex-col overflow-clip bg-violet pt-[env(safe-area-inset-top)] text-white lg:sticky lg:top-0 lg:h-dvh lg:w-1/2">
        <Pattern kind="reps" className="lg:[--pattern-size:1440px]" />
        <div className="relative z-[1] flex h-[44px] shrink-0 items-center gap-[6px] pl-[12px] pr-[24px] lg:h-[80px] lg:gap-[12px] lg:pl-[28px] lg:pr-[40px]">
          <IconButton label="Back" variant="on-violet" onClick={onBack}>
            <Icon name="back" />
          </IconButton>
          <QuizProgress steps={steps} current={step} className="min-w-0 flex-1 lg:gap-[6px]" />
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center pb-[10px] lg:pb-[80px]">
          <Art name={art} size={300} priority className="size-[100px] lg:size-[min(300px,40dvh)]" />
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-white pb-[max(24px,env(safe-area-inset-bottom))] lg:min-w-0 lg:items-center lg:justify-center lg:px-[24px] lg:py-[40px]">
        {/* Between a phone and 1024px the words keep the width they have on desktop, in a centered column. */}
        <div className="mx-auto flex w-full max-w-[508px] flex-1 flex-col lg:max-w-[460px] lg:flex-none">
          <div className="flex-1 px-[24px] pt-[24px] lg:flex-none lg:px-0 lg:pt-0">{children}</div>
          {action ? <div className="px-[24px] pt-[12px] lg:px-0 lg:pt-[24px]">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

interface ScenePicture {
  /** The object on the violet block. */
  art: ArtName;
  /** The child's full-body pose on the card. */
  pose: Record<PartnerId, Pose>;
}

/**
 * The pictures of each scene in lib/child/scenes.ts. Leo has no pose with blocks or with crayons yet
 * (components/kit/art-manifest.ts), and the kit's fallback would put one picture on both cards. Until the two are
 * drawn he waves, with no toy in his hands, on the blocks card, so the picture never shows a toy the card does not
 * name, and he holds up his drawing on the other.
 */
const PICTURES = new Map<string, ScenePicture>([
  ['blocks', { art: 'blocks', pose: { mia: 'body-blocks', leo: 'body-waving' } }],
  ['drawing', { art: 'drawing', pose: { mia: 'body-drawing', leo: 'body-showing' } }],
]);

/** For a saved scene id that has no card here: the block shows the blocks and no card is marked. */
const NO_PICTURE: ScenePicture = { art: 'blocks', pose: { mia: 'body-showing', leo: 'body-showing' } };

/**
 * The scenes the question offers: the ones whose pictures are drawn, which are the two of the frame.
 * The engine also plays a kitchen and a clean-up scene (lib/child/scenes.ts). Neither child has a pose for them
 * yet, and a stand-in would put one picture on several cards, so they get a card when they get a line in PICTURES.
 */
const OFFERED = SCENES.filter((scene) => PICTURES.has(scene.id));

/**
 * "What does {name} play with most?" (Figma 49:1412). The two scene cards are one question with no Next: a tap on a
 * card picks its scene and moves on. That holds for the scene already chosen too, so a parent who came back can
 * keep it and go on.
 *
 * As drawn, the chosen card carries a 3px ink border inside its 240px: it is 6px wider than the other card and its
 * label sits 3px in.
 */
export function Scene({ step, steps, onBack, childName, partner, value, onPick }: SceneProps) {
  const titleId = useId();
  const group = useId();
  const who = childName?.trim() || 'your child';

  /**
   * A pick leaves the screen, so the arrow keys must not pick: they move the focus from card to card, and Space or
   * Enter picks the card in focus, as on the other one-tap questions of the quiz. Left to the browser an arrow
   * would choose the next radio, Space would do nothing on the radio already chosen, and Enter nothing at all.
   * So all three are taken here: Enter picks on the way down, Space on the way up, as a button does.
   */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const radio = event.target;
    if (!(radio instanceof HTMLInputElement) || event.altKey || event.ctrlKey || event.metaKey) return;
    const move = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (move !== 0) {
      const radios = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
      event.preventDefault();
      radios[(radios.indexOf(radio) + move + radios.length) % radios.length].focus();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat) onPick(radio.value);
    } else if (event.key === ' ') {
      event.preventDefault();
    }
  }

  function onKeyUp(event: KeyboardEvent<HTMLDivElement>) {
    const radio = event.target;
    if (event.key !== ' ' || !(radio instanceof HTMLInputElement)) return;
    event.preventDefault();
    onPick(radio.value);
  }

  return (
    <QuizScreen step={step} steps={steps} onBack={onBack} art={(PICTURES.get(value) ?? NO_PICTURE).art}>
      <h1 id={titleId} className="text-title wrap-break-word lg:text-title-xl">
        What does {who} play with most?
      </h1>
      <div
        role="radiogroup"
        aria-labelledby={titleId}
        className="mt-[18px] flex gap-[12px] lg:mt-[24px]"
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        {OFFERED.map((scene) => {
          const selected = scene.id === value;
          const picture = PICTURES.get(scene.id) ?? NO_PICTURE;
          return (
            <label
              key={scene.id}
              className={cn(
                'relative flex h-[240px] min-w-0 flex-1 cursor-pointer flex-col items-start overflow-clip rounded-[28px] bg-violet pl-[18px] pt-[16px] text-white',
                selected && 'border-3 border-ink',
                focusRingWithin,
              )}
            >
              {/* The pattern starts at the card's outer corner, under the border of the chosen card too. */}
              <span aria-hidden="true" className={cn('absolute', selected ? '-inset-[3px]' : 'inset-0')}>
                <Pattern kind="reps" size={864} />
              </span>
              <input
                type="radio"
                name={group}
                value={scene.id}
                checked={selected}
                className="sr-only"
                onChange={() => onPick(scene.id)}
                onClick={() => {
                  // A tap on the card already chosen changes nothing, so no change event comes. It still moves on.
                  if (selected) onPick(scene.id);
                }}
              />
              <span className="relative shrink-0 text-heading">{scene.title}</span>
              <span className="relative flex min-h-0 w-full flex-1 items-end justify-center overflow-clip">
                {/* 150px as drawn, a little wider than the room beside the label's inset: the card clips it. Under 360px it gives way instead. */}
                <Portrait partner={partner} pose={picture.pose[partner]} size={150} className="max-w-none max-[359px]:max-w-full" />
              </span>
            </label>
          );
        })}
      </div>
    </QuizScreen>
  );
}
