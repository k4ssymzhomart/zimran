'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { forChild } from '@/components/child';
import {
  Art,
  Button,
  Divider,
  Icon,
  IconButton,
  PageScreen,
  Pattern,
  Portrait,
  SplitScreen,
  Tag,
  cn,
  focusRing,
  type FacePose,
  type TagTone,
} from '@/components/kit';
import { SCENES } from '@/lib/child/scenes';
import { BUCKET, LABEL, type Counts, type PartnerId, type PlayGuess, type SavedSentence } from '@/lib/types';
import type { RoundOneResultProps } from './types';

/**
 * Round one is over. Three steps in one component, because the frames draw the last two as pushed screens:
 *   the result (mobile 21:543, desktop 32:164): the counts against the pace of this round, the one thing to work on;
 *   the quiz answer set against the round (49:1371), on the way to the lesson, only when there was an answer;
 *   the parent's sentences as they were read (21:598), with "Disagree?" on each.
 * Every number comes from `result` and `sentences`.
 */

type Step = 'result' | 'guess' | 'sentences';

// ---------- the violet block, shared with BeforeAfter ----------

/** The goodbye lines after which the child has walked off: the picture then shows the child turned away, as the words say. */
const WALKED_OFF = new Set(SCENES.map((scene) => scene.farewell.low));

/** The engine writes straight quotation marks; the screens set them the way the frames do. */
const quoted = (text: string): string => text.replace(/"([^"]*)"/g, '“$1”');

export interface GoodbyeProps {
  partner: PartnerId;
  /** What the child did and said as the round ended, as the engine wrote it. Without it the portrait stands alone. */
  farewell?: string | null;
  /** The face the frame draws. */
  pose: FacePose;
  /** The size of the portrait on a phone and from 1024px. */
  className: string;
}

/** The child, and the child's goodbye line under the portrait. */
export function Goodbye({ partner, farewell, pose, className }: GoodbyeProps) {
  return (
    <div className="flex flex-col items-center gap-[4px] lg:gap-[10px] lg:px-[32px]">
      <Portrait partner={partner} pose={farewell && WALKED_OFF.has(farewell) ? 'away' : pose} size={380} priority className={className} />
      {farewell && <p className="text-center text-label text-white lg:text-lead">{quoted(forChild(farewell, partner))}</p>}
    </div>
  );
}

// ---------- the quiz answer against the round ----------

type Kind = Exclude<PlayGuess, 'unsure'>;

const KINDS: readonly Kind[] = ['questions', 'instructions', 'praise'];
const ONE: Record<Kind, string> = { questions: 'question', instructions: 'instruction', praise: 'praise' };
const MANY: Record<Kind, string> = { questions: 'questions', instructions: 'instructions', praise: 'praises' };
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/** "six questions", "one praise", "no instructions". */
function amount(count: number, kind: Kind): string {
  const noun = count === 1 || (count === 0 && kind === 'praise') ? ONE[kind] : MANY[kind];
  return `${WORDS[count] ?? count} ${noun}`;
}

/**
 * The quiz asked "What do you say most in play?". This sets the answer against round one in the words of frame
 * 49:1371: "You said praise. Round one: one praise, six questions." Praise is specific praise, the count the
 * Praise tile of the result shows; an instruction is what the coding calls a command. "Not sure" gets the three
 * counts alone. A guess is called only when its kind alone was said most: a tie lists the tied kinds after the
 * guess ("You said praise. Round one: one praise, one instruction.").
 * Null when none of the three was said in the round: there is nothing to set the answer against.
 */
function guessLine(guess: PlayGuess, counts: Counts): string | null {
  const said: Record<Kind, number> = {
    questions: counts.question,
    instructions: counts.command,
    praise: counts.specific_praise,
  };
  const most = Math.max(...KINDS.map((kind) => said[kind]));
  if (most === 0) return null;
  if (guess === 'unsure') {
    const all = [...KINDS].sort((a, b) => said[b] - said[a]).map((kind) => amount(said[kind], kind));
    return `Round one: ${all.join(', ')}.`;
  }
  const top = KINDS.filter((kind) => said[kind] === most);
  if (top.length === 1 && top[0] === guess) return `You said ${guess}. You called it: ${amount(said[guess], guess)}.`;
  const shown = [guess, ...top.filter((kind) => kind !== guess)];
  return `You said ${guess}. Round one: ${shown.map((kind) => amount(said[kind], kind)).join(', ')}.`;
}

// ---------- the pieces of the result ----------

/**
 * One count of the round, with the pace it is measured against when there is one.
 * TODO kit: the frame draws the counts as numbers (21:561); the kit's Rings draws circles.
 */
function Stat({ label, value, of }: { label: string; value: number; of?: number }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col-reverse gap-[2px]">
      <dt className="text-small whitespace-nowrap text-gray">{label}</dt>
      <dd className="flex items-baseline gap-px whitespace-nowrap">
        <span className="text-title text-ink">{value}</span>
        {of !== undefined && of > 0 && (
          <>
            <span aria-hidden="true" className="text-body text-faint">
              /{of}
            </span>
            <span className="sr-only"> of {of}</span>
          </>
        )}
      </dd>
    </div>
  );
}

/** The label of a sentence, in the tone of its bucket. A sentence to swap is calm gray, never an alarm. */
function tagOf(sentence: SavedSentence): { tone: TagTone; label: string } {
  const bucket = BUCKET[sentence.code];
  if (bucket === 'target') return { tone: 'skill', label: LABEL[sentence.code] };
  if (bucket === 'avoid') return { tone: 'swap', label: `${LABEL[sentence.code]}, to swap` };
  return { tone: 'quiet', label: LABEL[sentence.code] };
}

// ---------- the screen ----------

/** The portrait: 210px on a phone and 380px from 1024px, as drawn. On a short screen it gives way, so the goodbye line stays in view. */
const FACE = 'size-[min(210px,25dvh)] lg:size-[min(380px,52dvh)]';

export function RoundOneResult({ result, sentences, guess, partner = 'mia', farewell, onDispute, onNext }: RoundOneResultProps) {
  const [step, setStep] = useState<Step>('result');
  const root = useRef<HTMLDivElement>(null);
  const shown = useRef<Step>('result');
  const id = useId();

  // A step that was just opened starts at its top, for the eyes and for the keyboard.
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    window.scrollTo(0, 0);
    root.current?.focus({ preventScroll: true });
  }, [step]);

  const { counts, targets } = result;
  const against = guess ? guessLine(guess, counts) : null;
  const lever = forChild(result.leverText, partner);
  const toResult = () => setStep('result');

  let screen: ReactNode;
  if (step === 'guess' && against) {
    /*
     * 49:1371, and from 1024px the layout of the quiz fact (54:1010): the words and the action at the left, the object at the right.
     * The frame also draws the 12-segment bar of the quiz. These props carry no step, so it is left out.
     * TODO kit: a full violet screen. The quiz fact (components/first/quiz/QuizFact.tsx) writes the same shell.
     */
    screen = (
      <div className="split-root relative flex flex-col overflow-clip bg-violet pt-[env(safe-area-inset-top)] pb-[max(24px,env(safe-area-inset-bottom))] text-white">
        <Pattern kind="bars" className="lg:[--pattern-size:1440px]" />
        <div className="relative flex h-[44px] shrink-0 items-center px-[12px] lg:h-[80px] lg:px-[28px]">
          <IconButton label="Back" variant="on-violet" onClick={toResult}>
            <Icon name="back" />
          </IconButton>
        </div>
        <div className="relative flex flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-[1440px] lg:flex-row lg:items-center lg:justify-between lg:gap-[80px] lg:px-[64px] lg:pb-[80px] min-[90rem]:px-[140px]">
          <div className="flex flex-1 flex-col lg:max-w-[760px] lg:min-w-0">
            <div className="flex flex-1 flex-col items-start justify-center gap-[22px] px-[28px] lg:flex-none lg:px-0">
              <Art name="search-speech" size={150} className="lg:hidden" />
              <h1 className="text-display text-white lg:text-display-xl">{against}</h1>
            </div>
            <div className="px-[24px] lg:px-0 lg:pt-[36px]">
              <Button variant="white" fullWidth className="lg:w-auto lg:min-w-[220px]" onClick={onNext}>
                {result.lever !== null && BUCKET[result.lever] === 'avoid' ? 'Learn the swap in 30 seconds' : 'Learn it in 30 seconds'}
              </Button>
            </div>
          </div>
          <Art name="search-speech" size={280} className="hidden lg:block" />
        </div>
      </div>
    );
  } else if (step === 'sentences' && sentences.length > 0) {
    /* 21:598. A plain page on phones; from 1024px the child stays at the left, as on the result. */
    screen = (
      <PageScreen
        title="Your sentences"
        // TODO kit: under a bar the frame sets the title 12px down; PageScreen gives 6px.
        className="max-lg:[&_header]:pt-[12px]"
        bar={
          <IconButton label="Back" onClick={toResult}>
            <Icon name="back" />
          </IconButton>
        }
        pattern={<Pattern kind="sentences" size={1440} />}
        picture={<Goodbye partner={partner} farewell={farewell} pose="smiling" className={FACE} />}
      >
        {/* TODO kit: a sentence with its label and "Disagree?". TranscriptRow has a time column and no dispute. */}
        <ul className="w-full pt-[2px]">
          {sentences.map((sentence, index) => {
            const tag = tagOf(sentence);
            const said = `${id}-${index}`;
            return (
              <li key={index} className="flex items-center justify-between gap-[12px] border-b border-line py-[14px]">
                <div className="flex min-w-0 flex-1 flex-col items-start gap-[6px]">
                  <p id={said} className={cn('w-full text-body break-words', sentence.disputed ? 'text-faint line-through' : 'text-ink')}>
                    {sentence.disputed && <span className="sr-only">Not counted: </span>}“{sentence.text}”
                  </p>
                  <Tag tone={tag.tone}>{tag.label}</Tag>
                </div>
                {onDispute && (
                  /* 20px of text inside a 44px touch target. A second tap puts the sentence back in the count. */
                  <button
                    type="button"
                    onClick={() => onDispute(index)}
                    aria-describedby={said}
                    className={cn('-my-[12px] -mr-[8px] shrink-0 cursor-pointer rounded-[8px] px-[8px] py-[12px] text-label text-violet', focusRing)}
                  >
                    {sentence.disputed ? 'Count it' : 'Disagree?'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </PageScreen>
    );
  } else {
    /* 21:543 and 32:164. The phone frame is flat violet; the desktop frame carries the sentences pattern. */
    screen = (
      <SplitScreen
        pattern={<Pattern kind="sentences" size={1440} className="hidden lg:block" />}
        picture={<Goodbye partner={partner} farewell={farewell} pose="smiling" className={FACE} />}
      >
        <div className="flex flex-col gap-[20px] pt-[4px] lg:pt-0">
          <h1 className="text-title text-ink">Round one</h1>
          <dl className="flex items-start gap-[8px]">
            <Stat label="Praise" value={counts.specific_praise} of={targets.specific_praise} />
            <Stat label="Reflect" value={counts.reflection} of={targets.reflection} />
            <Stat label="Describe" value={counts.description} of={targets.description} />
            <Stat label="To swap" value={counts.avoid} />
          </dl>
          <div className="flex flex-col gap-[4px]">
            <h2 className="text-label text-gray">{lever ? 'Biggest lever' : 'Clinic pace'}</h2>
            <p className="text-body-strong text-ink">{lever ?? 'You met it in this round.'}</p>
          </div>
          {sentences.length > 0 && (
            <div>
              <Divider />
              <button
                type="button"
                onClick={() => setStep('sentences')}
                className={cn('flex h-[52px] w-full cursor-pointer items-center justify-between rounded-[8px] text-left', focusRing)}
              >
                <span className="text-body text-ink">Your sentences</span>
                <span className="flex items-center gap-[6px] text-body text-gray">
                  {sentences.length}
                  <Icon name="chevron-right" size={20} className="text-faint" />
                </span>
              </button>
            </div>
          )}
        </div>
        {/* The one action sits 8px under the row, as drawn; the `action` slot of the shell would set it at 16px. */}
        <div className={sentences.length > 0 ? 'pt-[8px]' : 'pt-[20px]'}>
          <Button fullWidth onClick={against ? () => setStep('guess') : onNext}>
            Learn it in 30 seconds
          </Button>
        </div>
      </SplitScreen>
    );
  }

  return (
    <div ref={root} tabIndex={-1} className="outline-none">
      {screen}
    </div>
  );
}
