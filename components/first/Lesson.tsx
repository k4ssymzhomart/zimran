'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CHILDREN, forChild } from '@/components/child';
import { Art, Button, Composer, Icon, IconButton, Portrait, SplitScreen, cn, colorMotion, type FacePose, type MicState } from '@/components/kit';
import { useSpeech } from '@/hooks/useSpeech';
import type { TaskTry } from '@/lib/flow/journey';
import { checkAnswer, type LessonTask } from '@/lib/lesson/lesson';
import type { PartnerId } from '@/lib/types';
import { ROUND_TWO_PORTRAIT, RoundTwoReady, TALKING_PATTERN } from './Ready';
import type { LessonProps } from './types';

/** The frames draw two examples (24:216, 32:212). A third pushes the action under the fold on a small phone. */
const PAIRS_SHOWN = 2;

/**
 * The portrait of a task: 200px when it stands alone (24:255), 180px beside a spoken line or feedback
 * (24:292, 24:331), 380px from 1024px (as 32:91). On a short screen it gives way to the words.
 */
const PORTRAIT = {
  size: 380,
  roomy: 'size-[min(200px,24dvh)] lg:size-[min(380px,43dvh)]',
  compact: 'size-[min(180px,22dvh)] lg:size-[min(380px,43dvh)]',
};

/** The child beams while saying something, and after an answer that was there (24:331); otherwise smiles (24:255). */
function poseFor(task: LessonTask, lastTry: TaskTry | null): FacePose {
  return task.childSaid !== null || lastTry?.ok ? 'beaming' : 'smiling';
}

/**
 * Engine text on its way to the screen: about the chosen child, with the typographic apostrophe the frames use.
 * TODO components/child.tsx: forChild turns the title "Let her lead" into "Let his lead". Corrected here until it is
 * corrected there.
 */
function shown(text: string, partner: PartnerId): string {
  return forChild(text, partner)
    .replace(/\bLet his lead\b/g, 'Let him lead')
    .replace(/'/g, '’');
}

/**
 * A step of the lesson that was just opened: the control that opened it is gone, and the focus with it. The
 * heading of the new step takes it, without a ring: a screen reader reads it, and the next Tab reaches what follows.
 */
function takeFocus(heading: HTMLElement | null) {
  heading?.focus({ preventScroll: true });
}

/**
 * The 30-second lesson between the two rounds. Three steps in one component: the idea (24:216, 32:212), one task
 * at a time (24:255, 24:292, 24:331), and "Ready for round two" when both tasks are behind (24:375).
 * The props say which task is open; the idea in front of the first task is a step held here.
 */
export function Lesson({ partner, lesson, taskIndex, lastTry, done, onAnswer, onNext, onBack }: LessonProps) {
  const child = CHILDREN[partner];
  const say = (text: string) => shown(text, partner);
  // A lesson that already has an answer opens on its task, not on the idea again.
  const [step, setStep] = useState<'idea' | 'task'>(taskIndex > 0 || lastTry !== null ? 'task' : 'idea');
  const [focusField, setFocusField] = useState(false);
  const answer = useAnswer(onAnswer);
  const task = lesson.tasks[taskIndex] ?? null;

  // The last try is about the open task only when it was not there yet and tries remain: then the engine's own
  // check of that answer against this task gives the same line. Otherwise it is about the task before.
  // Both lines are compared as shown, so it holds whether or not the flow has already rewritten them for the child.
  const hintHere = useMemo(
    () =>
      task !== null &&
      lastTry !== null &&
      !lastTry.ok &&
      shown(checkAnswer(task, lastTry.answer).feedback, partner) === shown(lastTry.feedback, partner),
    [task, lastTry, partner],
  );

  function skip() {
    answer.rest();
    onNext();
  }

  if (done || task === null) {
    return <RoundTwoReady partner={partner} note={lastTry && <LastNote last={lastTry} partner={partner} />} onStart={onNext} />;
  }

  if (step === 'idea') {
    return (
      <SplitScreen
        pattern={TALKING_PATTERN}
        bar={
          <>
            {onBack ? (
              <IconButton
                label="Back"
                variant="on-violet"
                onClick={() => {
                  answer.rest();
                  onBack();
                }}
              >
                <Icon name="back" />
              </IconButton>
            ) : (
              // Without a way back the arrow of the frame is not drawn; "Skip" keeps its place at the right.
              <span aria-hidden="true" className="size-[44px]" />
            )}
            <SkipButton onClick={skip} />
          </>
        }
        picture={
          // The shell keeps 28px under a centered picture on phones; this frame keeps 20px (24:236).
          <div className="-mb-[8px] lg:mb-0">
            <Art name="lightbulb" size={260} priority className="size-[150px] lg:size-[260px]" />
            <Ahead partner={partner} poses={['smiling', 'beaming']} />
          </div>
        }
        action={
          <Button
            fullWidth
            onClick={() => {
              // On a phone the keyboard waits for a tap, so the child and the sentence are read first.
              setFocusField(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
              setStep('task');
            }}
          >
            Try it
          </Button>
        }
      >
        <div className="-mb-[4px] flex flex-col gap-[10px]">
          <h1 ref={takeFocus} tabIndex={-1} className="text-title outline-none">
            {say(lesson.title)}.
          </h1>
          <p className="text-body text-gray">{say(lesson.why)}</p>
          <ul className="pt-[6px]">
            {lesson.pairs.slice(0, PAIRS_SHOWN).map((pair, i) => (
              <li key={i} className="flex flex-col gap-[2px] border-t border-line py-[12px]">
                {pair.childSaid && (
                  <p className="text-label text-gray">
                    {child.name}: “{say(pair.childSaid)}”
                  </p>
                )}
                <p className="text-label text-faint">
                  <span className="sr-only">Instead of: </span>
                  {say(pair.insteadOf)}
                </p>
                <p className="text-body-strong">
                  <span className="sr-only">Say: </span>
                  {say(pair.say)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </SplitScreen>
    );
  }

  const note = lastTry !== null && !hintHere ? <LastNote last={lastTry} partner={partner} /> : null;
  const compact = task.childSaid !== null || lastTry !== null;

  return (
    <SplitScreen
      pattern={TALKING_PATTERN}
      bar={
        <>
          <IconButton
            label="Back to the idea"
            variant="on-violet"
            onClick={() => {
              answer.rest();
              setStep('idea');
            }}
          >
            <Icon name="back" />
          </IconButton>
          <p className="text-body-strong">
            <span className="sr-only">Your turn, </span>
            {taskIndex + 1} of {lesson.tasks.length}
          </p>
          <SkipButton onClick={skip} />
        </>
      }
      picture={
        <div className="flex flex-col items-center gap-[4px] text-center lg:gap-[10px] lg:px-[32px]">
          <Portrait
            partner={partner}
            pose={poseFor(task, lastTry)}
            size={PORTRAIT.size}
            priority
            className={compact ? PORTRAIT.compact : PORTRAIT.roomy}
          />
          <p className="text-label lg:text-lead">{say(task.situation)}</p>
          {task.childSaid !== null && <p className="text-title lg:text-title-xl">“{say(task.childSaid)}”</p>}
          <Ahead partner={partner} poses={['beaming']} roundTwo />
        </div>
      }
      dock={
        <>
          <Composer
            value={answer.value}
            onChange={answer.change}
            onSubmit={answer.send}
            placeholder="You say…"
            onMic={answer.toggleMic}
            micState={answer.micState}
            autoFocus={focusField}
          />
          {answer.micNote && (
            <p role="status" className="px-[8px] text-small text-gray lg:px-0">
              {answer.micNote}
            </p>
          )}
        </>
      }
    >
      <div className={cn('flex flex-col gap-[4px]', note !== null && '-mt-[4px] lg:mt-0')}>
        {note}
        <p className="text-body text-gray">Instead of</p>
        {/* Where the field takes the focus itself (a mouse and a keyboard), the heading leaves it there. */}
        <h1 ref={focusField ? undefined : takeFocus} tabIndex={-1} className="text-title outline-none">
          “{say(task.insteadOf)}”
        </h1>
        {hintHere && lastTry !== null && (
          <p role="status" className="pt-[12px] text-body">
            {say(lastTry.feedback)}
          </p>
        )}
      </div>
    </SplitScreen>
  );
}

/**
 * The answer field: typed, or one spoken sentence dropped into the field for the parent to read and send.
 * Listening stops with the first sentence, so a pause in the middle of a thought never spends a try.
 */
function useAnswer(onAnswer: (text: string) => void) {
  const [text, setText] = useState('');
  const stopListening = useRef<(() => void) | null>(null);
  const { state, start, stop } = useSpeech((sentence) => {
    stopListening.current?.();
    setText(sentence);
  });
  useEffect(() => {
    stopListening.current = stop;
  }, [stop]);

  const listening = state.wanted;
  const micState: MicState = state.status === 'unsupported' ? 'unavailable' : listening ? 'listening' : 'idle';

  return {
    value: listening ? state.interim : text,
    micState,
    /** Why the microphone went quiet, once the parent has asked for it. */
    micNote: state.status === 'denied' || state.status === 'failed' ? state.message : null,
    change(value: string) {
      if (listening) stop();
      setText(value);
    },
    send(sentence: string) {
      if (listening) stop();
      setText('');
      onAnswer(sentence);
    },
    toggleMic() {
      if (listening) stop();
      else start();
    },
    /** Leaving the task: the microphone goes off. */
    rest() {
      if (listening) stop();
    },
  };
}

/**
 * What the last answer did, above the next thing to do (the "Well done" row of 24:331).
 * An answer that was there gets the check. One that ran out of tries is said plainly, with one way to say it.
 */
function LastNote({ last, partner }: { last: TaskTry; partner: PartnerId }) {
  const line = shown(last.feedback, partner);
  if (!last.ok) {
    return (
      <p role="status" className="pb-[14px] text-label">
        {line}
      </p>
    );
  }
  return (
    <div role="status" className="flex items-start gap-[10px] pb-[14px]">
      <span aria-hidden="true" className="flex size-[24px] shrink-0 items-center justify-center rounded-[12px] bg-violet text-white">
        {/* 14px with a 3px line, as the frame draws it (24:359). */}
        <Icon name="check" size={14} strokeWidth={3} />
      </span>
      <p className="min-w-0 flex-1 text-label">{line}</p>
    </div>
  );
}

/**
 * Fetched ahead and not shown: the pictures of the steps that follow, so a step never opens on an empty block.
 * They are asked for at the size the step itself uses, which makes them the same files.
 */
function Ahead({ partner, poses, roundTwo = false }: { partner: PartnerId; poses: FacePose[]; roundTwo?: boolean }) {
  return (
    <>
      {poses.map((pose) => (
        <Portrait key={pose} partner={partner} pose={pose} size={PORTRAIT.size} priority className="hidden" />
      ))}
      {roundTwo && <Portrait partner={partner} pose={ROUND_TWO_PORTRAIT.pose} size={ROUND_TWO_PORTRAIT.size} priority className="hidden" />}
    </>
  );
}

/** TODO kit: a text action on a violet block. The kit's ghost button is gray, for white. */
function SkipButton({ onClick }: { onClick(): void }) {
  return (
    <button
      type="button"
      aria-label="Skip to round two"
      onClick={onClick}
      className={cn(
        '-ml-[12px] inline-flex h-[44px] shrink-0 cursor-pointer items-center rounded-[22px] px-[12px] text-label text-white',
        'active:bg-violet-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
        colorMotion,
      )}
    >
      Skip
    </button>
  );
}
