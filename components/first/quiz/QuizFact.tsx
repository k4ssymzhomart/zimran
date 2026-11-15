'use client';

import { Art, Button, Chip, Icon, IconButton, Pattern, QuizProgress } from '@/components/kit';
import type { QuizFactProps } from '../quizTypes';

/*
 * The words of the fact, as drawn. They say in words what the engine counts toward, so they are only true while
 * NORM_PER_SKILL is 10, MAX_AVOID_5MIN is 3 and NORM_SECONDS is 300 in lib/progress/targets.ts.
 * fact.test.ts fails when one of the three changes: change the words here together with the number.
 */
const TITLE = 'Clinics count ten, ten, ten in five minutes.';
const BODY = 'Ten praises, ten reflections, ten descriptions, and at most three questions or commands.';
const SOURCE = 'PCIT protocol, Eyberg & Funderburk, 2011';

/**
 * One fact with its source, on violet, between two questions of the quiz (Figma 49:1273, 54:1010).
 *
 * On a phone the scales stand over the words and Next is at the foot of the page. From 1024px the words are on the
 * left with Next under them, and the scales stand at the right with the graduation cap over them.
 * The desktop frame draws no top row. It is kept there, as wide as on the questions (54:908), so the way back and
 * the progress do not vanish for one step; the 80px under the page balance it, so the words stay where they are drawn.
 */
export function QuizFact({ step, steps, onBack, onNext }: QuizFactProps) {
  return (
    <div className="split-root relative flex flex-col overflow-clip bg-violet pt-[env(safe-area-inset-top)] pb-[max(24px,env(safe-area-inset-bottom))] text-white lg:pb-[80px]">
      <Pattern kind="bars" className="lg:[--pattern-size:1440px]" />

      {/* TODO kit: the top row of the quiz. The same row is written inside QuizQuestion (QuizName.tsx). */}
      <div className="relative flex h-[44px] shrink-0 items-center gap-[6px] pl-[12px] pr-[24px] lg:h-[80px] lg:w-1/2 lg:gap-[12px] lg:pl-[28px] lg:pr-[40px]">
        <IconButton label="Back" variant="on-violet" onClick={onBack}>
          <Icon name="back" />
        </IconButton>
        <QuizProgress steps={steps} current={step} className="min-w-0 flex-1 lg:gap-[6px]" />
      </div>

      {/*
        One set of elements for both layouts. On a phone: a column, the picture and the words centered in the room
        over the action; between a phone and 1024px it keeps the width the questions keep there (QuizQuestion).
        From 1024px: a grid, the words and the action in the left column, centered as one group between two equal
        rows, and the picture in the right column. At 1440 the columns sit where the frame has them.
      */}
      <div className="relative mx-auto flex w-full max-w-[508px] flex-1 flex-col lg:grid lg:max-w-[1440px] lg:grid-cols-[minmax(0,760px)_320px] lg:grid-rows-[1fr_auto_auto_1fr] lg:justify-between lg:gap-x-[40px] lg:pl-[64px] lg:pr-[48px] min-[90rem]:pl-[140px] min-[90rem]:pr-[110px]">
        <div className="flex flex-1 flex-col items-start justify-center gap-[22px] px-[28px] py-[16px] lg:contents">
          <div className="relative lg:col-start-2 lg:row-span-full lg:self-center">
            {/* 150px as drawn. On a short phone the scales give way, so Next stays on the page without scrolling. */}
            <Art name="scales" size={320} priority className="size-[clamp(88px,calc(100dvh_-_480px),150px)] lg:size-[320px]" />
            {/* The cap stands 170px over the scales, so it needs a page tall enough to hold it. */}
            <Art name="gradcap" size={130} className="absolute -top-[170px] left-[170px] hidden lg:[@media(min-height:700px)]:block" />
          </div>
          <div className="flex flex-col items-start gap-[22px] lg:col-start-1 lg:row-start-2 lg:gap-[26px]">
            <h1 className="text-display lg:text-display-xl">{TITLE}</h1>
            <p className="text-body lg:text-lead">{BODY}</p>
            {/* The kit chip keeps its words on one line. This line is wider than a small phone, so there it may wrap. */}
            <Chip
              tone="on-violet"
              className="max-w-full max-[390px]:h-auto max-[390px]:min-h-[34px] max-[390px]:py-[7px] max-[390px]:whitespace-normal"
            >
              <span className="sr-only">Source: </span>
              {SOURCE}
            </Chip>
          </div>
        </div>
        <div className="px-[24px] lg:col-start-1 lg:row-start-3 lg:px-0 lg:pt-[36px]">
          <Button variant="white" fullWidth className="lg:w-[220px]" onClick={onNext}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
