'use client';

import Link from 'next/link';
import { CHILDREN, forChild } from '@/components/child';
import { Composer, Pattern, Portrait } from '@/components/kit';
import { cn, focusRing } from '@/components/kit/cn';
import { initialJourney, ROUND1, ROUND2 } from '@/lib/flow/journey';
import { ROUTES } from '@/lib/routes';
import type { PartnerId } from '@/lib/types';
import { Section } from './Section';

/** The landing shows Mia, as drawn. The first visit asks who to practice with. */
const PARTNER: PartnerId = 'mia';

/** How the first visit opens: what the child does and says before the parent has answered. */
const OPENER = initialJourney().opener;

/** The lesson runs on tries, not on a clock. Thirty seconds is the length the product gives it by name. */
const LESSON_SECONDS = 30;

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The answer field in the phone is a picture of the field: it takes no typing. */
const still = () => {};

/**
 * Landing section 4, "A round, a 30-second lesson, a second round." (Figma 66:1362 on phones, 63:352 from 1024px).
 * The three steps of the first visit, with the lengths the flow really uses (ROUND1 and ROUND2 in lib/flow/journey),
 * beside the screen the visit opens on. The first step is the way in.
 */
export function FirstVisitSteps() {
  const child = CHILDREN[PARTNER];
  const steps = [
    { title: `One minute with ${child.name}`, note: 'Your starting numbers', seconds: ROUND1.seconds },
    { title: 'The one swap that helps most', note: 'Turn the question into a statement', seconds: LESSON_SECONDS },
    { title: 'Play again', note: 'Before and after, side by side', seconds: ROUND2.seconds },
  ];

  return (
    <Section>
      {/*
        Phones: the words, the phone, the steps. From 1024px the phone stands at the right, and the words with the
        steps are centered beside it: the two outer rows of the grid take up the height that is left over.
      */}
      <div className="flex flex-col gap-[20px] lg:grid lg:grid-cols-[minmax(0,1fr)_460px] lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-[48px] lg:gap-y-[36px] xl:gap-x-[80px]">
        <h2 className="text-title lg:col-start-1 lg:row-start-2 lg:text-title-xl">
          A round, a <span className="whitespace-nowrap">{LESSON_SECONDS}-second</span> lesson, a second round.
        </h2>

        <Phone className="lg:col-start-2 lg:row-span-4 lg:row-start-1" />

        <ol role="list" className="flex flex-col gap-[20px] lg:col-start-1 lg:row-start-3 lg:gap-[14px]">
          {steps.map((step, i) => (
            <Step key={step.title} number={i + 1} title={step.title} note={step.note} time={clock(step.seconds)} start={i === 0} />
          ))}
        </ol>
      </div>
    </Section>
  );
}

const ROW =
  'flex h-[60px] items-center gap-[12px] rounded-[20px] px-[14px] lg:h-auto lg:gap-[16px] lg:rounded-[24px] lg:px-[20px] lg:py-[18px]';
/** Only the fill eases on a press: the focus ring shows in its own color at once. */
const PRESS_MOTION = 'transition-[background-color] duration-quick ease-out-quint motion-reduce:transition-none';

interface StepProps {
  number: number;
  title: string;
  /** The gray second line, shown from 1024px. */
  note: string;
  time: string;
  /** The step the visit starts with: it is the link into the first visit. */
  start: boolean;
}

// TODO kit: a numbered step row with a length, plain or as the one that starts.
function Step({ number, title, note, time, start }: StepProps) {
  const row = (
    <>
      <span
        className={cn(
          'grid size-[32px] shrink-0 place-items-center rounded-full text-label lg:size-[40px] lg:text-body-strong',
          start ? 'bg-violet text-white' : 'bg-mist text-ink',
        )}
      >
        {number}
      </span>
      <span className="flex min-w-0 flex-1 flex-col lg:gap-[2px]">
        <span className="text-label text-ink lg:text-body-strong">{title}</span>
        <span className="hidden text-label text-gray lg:block">{note}</span>
      </span>
      <span
        className={cn(
          'shrink-0 text-label text-gray lg:flex lg:h-[34px] lg:items-center lg:rounded-[17px] lg:px-[16px] lg:text-ink',
          start ? 'lg:bg-white' : 'lg:bg-mist',
        )}
      >
        {time}
      </span>
    </>
  );

  if (start) {
    return (
      <li>
        <Link href={ROUTES.start} className={cn(ROW, 'border-2 border-violet bg-lilac active:bg-lilac-2', PRESS_MOTION, focusRing)}>
          {row}
        </Link>
      </li>
    );
  }
  return <li className={cn(ROW, 'border border-line bg-white')}>{row}</li>;
}

/**
 * The screen the first visit opens on, built from the kit at its real size (390 by 844) and scaled to the phone
 * in the frame: 0.55 on phones, 0.74 from 1024px. It is a picture: nothing in it can be focused or typed into.
 */
function Phone({ className }: { className?: string }) {
  const child = CHILDREN[PARTNER];
  const does = forChild(OPENER.does, PARTNER);
  const says = `“${forChild(OPENER.childSaid, PARTNER)}”`;

  return (
    <div
      className={cn(
        'relative flex h-[520px] shrink-0 items-center justify-center overflow-clip rounded-[32px] bg-violet lg:h-[700px] lg:w-[460px] lg:rounded-[40px]',
        className,
      )}
    >
      <Pattern kind="reps" className="[--pattern-size:864px] lg:[--pattern-size:1440px]" />

      <div role="img" aria-label={`${does} ${says}`} className="relative h-[464.2px] w-[214.5px] lg:h-[624.56px] lg:w-[288.6px]">
        {/*
          The screen is violet with one white block at its foot. A white screen under a violet block would show
          as a hairline around the block once the picture is scaled to a fraction of a pixel.
        */}
        <div
          inert
          className="absolute top-0 left-0 flex h-[844px] w-[390px] origin-top-left scale-[0.55] flex-col overflow-clip rounded-[40px] bg-violet lg:scale-[0.74]"
        >
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[4px] px-[24px] pb-[28px] text-center text-white">
            <Portrait partner={PARTNER} pose="smiling" size={240} />
            <p className="text-label">{does}</p>
            <p className="text-title">{says}</p>
          </div>
          <div className="shrink-0 bg-white px-[16px] pt-[16px]">
            <Composer value="" onChange={still} onSubmit={still} onMic={still} placeholder={`Say something to ${child.name}`} />
            <div className="flex h-[34px] items-end justify-center pb-[8px]">
              <span className="h-[5px] w-[134px] rounded-[3px] bg-ink" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
