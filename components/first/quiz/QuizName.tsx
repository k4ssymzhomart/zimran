'use client';

import { useId, type ReactNode } from 'react';
import { Art, Button, Icon, IconButton, Pattern, QuizProgress, TextField, cn, type ArtName } from '@/components/kit';
import type { QuizNameProps, QuizStepProps } from '../quizTypes';

export interface QuizQuestionProps extends QuizStepProps {
  /** The question: the heading of the page. */
  title: string;
  /** Lets the answer name itself after the question (aria-labelledby). */
  titleId?: string;
  /** The one object on the violet block. */
  art: ArtName;
  /** For an answer that needs the room (six tiles): on a phone the block is 170px tall instead of 208 and the object 100px instead of 124. */
  compact?: boolean;
  /** Two small objects beside the main one, shown from 1024px only. Each is placed with `absolute` in the violet block. */
  support?: ReactNode;
  /** The answer, under the question. */
  children: ReactNode;
  /** The action at the foot of the page. A question that moves on with one tap has none. */
  action?: ReactNode;
}

/**
 * TODO kit: the shell of one quiz question (Figma 49:998, 49:1045, 49:1099 on phones; 54:908, 54:955 from 1024px).
 * The kit's SplitScreen gives the violet block all the height the words leave. A quiz question is the other way
 * round: a short violet block with the way back, the progress and one object, the question on white, and the action
 * at the foot of the page. It lives beside the first question until the kit has it; QuizAge and QuizMoments import it.
 */
export function QuizQuestion({ step, steps, onBack, title, titleId, art, compact = false, support, children, action }: QuizQuestionProps) {
  return (
    <div className="split-root flex flex-col lg:flex-row">
      <div className="relative flex shrink-0 flex-col overflow-clip bg-violet pt-[env(safe-area-inset-top)] text-white lg:sticky lg:top-0 lg:h-dvh lg:w-1/2">
        <Pattern kind="reps" className="lg:[--pattern-size:1440px]" />
        <div className="relative flex h-[44px] shrink-0 items-center gap-[6px] pl-[12px] pr-[24px] lg:h-[80px] lg:gap-[12px] lg:pl-[28px] lg:pr-[40px]">
          <IconButton label="Back" variant="on-violet" onClick={onBack}>
            <Icon name="back" />
          </IconButton>
          <QuizProgress steps={steps} current={step} className="min-w-0 flex-1 lg:gap-[6px]" />
        </div>
        <div
          className={cn(
            'relative flex shrink-0 items-center justify-center pb-[10px] lg:h-auto lg:min-h-0 lg:flex-1 lg:pb-[80px]',
            compact ? 'h-[126px]' : 'h-[164px]',
          )}
        >
          <Art name={art} size={300} priority className={cn('lg:size-[300px]', compact ? 'size-[100px]' : 'size-[124px]')} />
        </div>
        {support && <div className="hidden lg:block">{support}</div>}
      </div>

      <div className="flex flex-1 flex-col bg-white pb-[max(24px,env(safe-area-inset-bottom))] lg:min-w-0 lg:items-center lg:justify-center lg:px-[24px] lg:py-[40px]">
        {/* Between a phone and 1024px the words keep the width they have on desktop, in a centered column. */}
        <div className="mx-auto flex w-full max-w-[508px] flex-1 flex-col lg:max-w-[460px] lg:flex-none">
          <div className={cn('flex flex-1 flex-col px-[24px] pt-[24px] lg:flex-none lg:gap-[24px] lg:px-0 lg:pt-0', compact ? 'gap-[14px]' : 'gap-[18px]')}>
            <h1 id={titleId} className="text-title wrap-break-word lg:text-title-xl">
              {title}
            </h1>
            {children}
          </div>
          {action && <div className="flex flex-col gap-[2px] px-[24px] pt-[12px] lg:px-0 lg:pt-[24px]">{action}</div>}
        </div>
      </div>
    </div>
  );
}

/** "What is your child called?" (Figma 49:998). Next works with or without a name; what an empty name means is the flow's call. */
export function QuizName({ step, steps, onBack, value, onChange, onNext, onSkip }: QuizNameProps) {
  const formId = useId();
  return (
    <QuizQuestion
      step={step}
      steps={steps}
      onBack={onBack}
      title="What is your child called?"
      art="nametag"
      support={
        <>
          <Art name="cake" size={110} className="absolute top-[66.67%] left-[8.33%]" />
          <Art name="teddies" size={120} className="absolute top-[14.44%] left-[75%]" />
        </>
      }
      action={
        <>
          {/* Next sends the form, so the button, Enter in the field and the Next key of a phone keyboard are one path. */}
          <Button type="submit" form={formId} fullWidth>
            Next
          </Button>
          <Button variant="ghost" fullWidth onClick={onSkip}>
            Skip
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          onNext();
        }}
      >
        <TextField
          label="Your child’s name"
          value={value}
          onChange={onChange}
          autoComplete="off"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          maxLength={24}
        />
      </form>
    </QuizQuestion>
  );
}
