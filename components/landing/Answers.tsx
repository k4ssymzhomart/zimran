'use client';

import { useId, useState, type ReactNode } from 'react';
// The helpers and the icon come from their own files, so this client component does not pull the whole kit into the browser.
import { cn, focusRing } from '@/components/kit/cn';
import { Icon } from '@/components/kit/Icon';
import { FEATURES } from '@/lib/features';
import { Section } from './Section';

/**
 * Landing section 12, "Straight answers." (Figma 66:1796 on phones, 64:549 from 1024px).
 * An accordion: one answer is open at a time, the first one when the page loads.
 * Every answer says what the code does today. Where each one was checked is noted beside it.
 */

interface Answer {
  id: string;
  question: string;
  answer: ReactNode;
  /** The phone frame has five questions and leaves this one out; the desktop frame has six. */
  fromDesktop?: boolean;
}

const ANSWERS: Answer[] = [
  {
    // README.md, "Not therapy".
    id: 'therapy',
    question: 'Is this therapy?',
    answer: (
      <>
        No. It is skill practice. For a certified therapist, see{' '}
        <a
          href="https://www.pcit.org"
          target="_blank"
          rel="noopener noreferrer"
          className={cn('rounded-[4px] underline underline-offset-[3px]', focusRing)}
        >
          pcit.org
        </a>
        .
      </>
    ),
  },
  // True while nothing records: sentences are saved as text (client/sessionStore.ts), the only recorder is the
  // one that does nothing (components/round/noopRecorder.ts), and speech becomes text in the browser
  // (hooks/useSpeech.ts). With the recording flag on, this answer is no longer true, so it leaves with its question.
  ...(FEATURES.recording
    ? []
    : [
        {
          id: 'record',
          question: 'Do you record me?',
          answer:
            'No. PlayReps keeps your sentences as text on this device and keeps no audio. If you use the microphone, your browser turns speech into text; in Chrome that happens on Google’s speech service.',
        },
      ]),
  // True while no language model is called: rules code each sentence (lib/coding/classify.ts) and move the child
  // (lib/child/model.ts). With the AI summary flag on, this answer is no longer true, so it leaves with its question.
  ...(FEATURES.aiSummary
    ? []
    : [
        {
          id: 'ai',
          question: 'Is there AI?',
          answer:
            'No language model. Rules written in code label every sentence and decide how Mia reacts. The microphone uses your browser’s speech recognition.',
        },
      ]),
  {
    // The quiz asks for an age from 2 to 7 (Profile.childAge in lib/types.ts); both partners are four.
    id: 'ages',
    question: 'What ages is it for?',
    answer: 'It is made for parents of children aged 2\u00a0to\u00a07. Mia and Leo are simulated four-year-olds.',
  },
  {
    // A 60-second round (lib/flow/journey.ts), the thirty-second lesson, which has no clock (lib/lesson/lesson.ts),
    // and 300 seconds a day (lib/progress/targets.ts).
    id: 'time',
    question: 'How much time does it take?',
    answer: 'A first round is one minute and a lesson takes about 30 seconds. The daily session is five minutes.',
    fromDesktop: true,
  },
  {
    // Day 28 is the check, and the plan then stays at five minutes a day (lib/progress/plan.ts).
    id: 'after',
    question: 'What happens after day 28?',
    answer: 'Day 28 is a five-minute check against the clinic numbers. After that you keep the same five minutes a day.',
  },
];

/**
 * The chevron of a question: 20px on phones, 24px from 1024px, turned over while its answer is open.
 * The kit's icon keeps its stroke at the size it is given, so each size is its own icon and the breakpoint shows one.
 */
function Chevron({ open }: { open: boolean }) {
  const turn = cn('text-faint transition-[rotate] duration-quick ease-out-quint motion-reduce:transition-none', open && 'rotate-180');
  return (
    <>
      <Icon name="chevron-down" size={20} className={cn('lg:hidden', turn)} />
      <Icon name="chevron-down" size={24} className={cn('max-lg:hidden', turn)} />
    </>
  );
}

export function Answers() {
  const base = useId();
  const [openId, setOpenId] = useState<string | null>(ANSWERS[0].id);

  return (
    <Section className="pt-[12px] pb-[36px] lg:pt-[40px]">
      <div className="flex flex-col gap-[8px] lg:flex-row lg:items-start lg:gap-[80px]">
        <h2 className="text-title lg:w-[360px] lg:shrink-0 lg:text-title-xl">Straight answers.</h2>

        <ul className="min-w-0 lg:flex-1">
          {ANSWERS.map((item) => {
            const open = item.id === openId;
            const buttonId = `${base}-q-${item.id}`;
            const panelId = `${base}-a-${item.id}`;
            return (
              <li
                key={item.id}
                className={cn(
                  'flex flex-col gap-[6px] border-b border-line py-[14px] lg:gap-[8px] lg:py-[22px]',
                  item.fromDesktop && 'max-lg:hidden',
                )}
              >
                <h3>
                  {/* The button is the line of the question, 8px wider at each side, so its focus ring stays clear
                      of the answer. Its ::before reaches over the row's padding: the whole row takes the tap. */}
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenId(open ? null : item.id)}
                    className={cn(
                      'relative -mx-[8px] flex w-[calc(100%+16px)] cursor-pointer items-center justify-between gap-[16px] rounded-[8px] px-[8px] text-left',
                      'before:absolute before:inset-x-0 before:-inset-y-[14px] lg:before:-inset-y-[22px]',
                      focusRing,
                    )}
                  >
                    <span className="text-body-strong lg:text-heading">{item.question}</span>
                    <Chevron open={open} />
                  </button>
                </h3>
                {/* `relative` keeps the answer, and the link in it, over the button's reach. */}
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!open}
                  className="relative text-body text-gray lg:text-lead"
                >
                  <p>{item.answer}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}
