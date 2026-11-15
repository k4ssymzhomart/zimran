'use client';

import type { ReactNode } from 'react';
import { CHILDREN } from '@/components/child';
import { Art, Button, Icon, IconButton, Pattern, Portrait, SplitScreen, type ArtName } from '@/components/kit';
import type { PartnerId } from '@/lib/types';
import type { ReadyProps } from './types';

/** Desktop violet blocks of the talking screens carry the sentences pattern (32:91, 32:212); the phone frames are flat. */
export const TALKING_PATTERN = <Pattern kind="sentences" size={1440} className="hidden lg:block" />;

const COUNTED = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** "One minute", "Five minutes". A round that is not a whole number of minutes is said in seconds. */
function lengthInWords(seconds: number): string {
  const minutes = seconds / 60;
  if (!Number.isInteger(minutes) || minutes < 1) return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  return `${COUNTED[minutes - 1] ?? minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

/**
 * One screen before the clock starts. Round one (21:95): how long, and the three things that fill a ring.
 * Round two (24:375): the child leans in and there is one thing left to do.
 */
export function Ready({ partner, round, seconds, onStart, onBack }: ReadyProps) {
  if (round === 2) return <RoundTwoReady partner={partner} onStart={onStart} />;
  return <RoundOneReady partner={partner} seconds={seconds} onStart={onStart} onBack={onBack} />;
}

function RoundOneReady({ partner, seconds, onStart, onBack }: Omit<ReadyProps, 'round'>) {
  const child = CHILDREN[partner];
  const skills: { art: ArtName; name: string; how: string }[] = [
    { art: 'praise', name: 'Praise', how: `Name what ${child.they} did well.` },
    { art: 'reflect', name: 'Reflect', how: `Say ${child.their} words back.` },
    { art: 'describe', name: 'Describe', how: `Say what ${child.they} is doing.` },
  ];

  return (
    <SplitScreen
      rest="bottom"
      pattern={TALKING_PATTERN}
      bar={
        onBack && (
          <IconButton label="Back" variant="on-violet" onClick={onBack}>
            <Icon name="back" />
          </IconButton>
        )
      }
      picture={
        // 480 is the size the screens before this one ask for, so the same file is already on the device.
        <Portrait partner={partner} pose="smiling" size={480} priority className="size-[min(230px,30dvh)] lg:size-[min(380px,43dvh)]" />
      }
      action={
        <Button fullWidth onClick={onStart}>
          Start
        </Button>
      }
    >
      <div className="flex flex-col gap-[18px] pb-[8px] pt-[4px] lg:pt-0">
        <h1 className="text-title">
          {lengthInWords(seconds)} with {child.name}.
        </h1>
        <ul className="flex flex-col gap-[14px]">
          {skills.map((skill) => (
            <li key={skill.name} className="flex items-center gap-[14px]">
              <Art name={skill.art} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-body-strong">{skill.name}</p>
                <p className="text-label text-gray">{skill.how}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SplitScreen>
  );
}

/** The picture of "Ready for round two.", for a screen before it to fetch ahead. */
export const ROUND_TWO_PORTRAIT = { pose: 'leaning', size: 480 } as const;

export interface RoundTwoReadyProps {
  partner: PartnerId;
  /** What the last answer of the lesson did, above the headline. The lesson passes it; the plain screen has none. */
  note?: ReactNode;
  onStart(): void;
}

/**
 * The screen before this one is gone with the field or the button that was used. The headline takes the focus,
 * without a ring: a screen reader reads it, and the next Tab reaches the action.
 */
function takeFocus(heading: HTMLElement | null) {
  heading?.focus({ preventScroll: true });
}

/** "Ready for round two." (24:375). It is both the ready screen of round two and the end of the lesson. */
export function RoundTwoReady({ partner, note, onStart }: RoundTwoReadyProps) {
  return (
    <SplitScreen
      rest="bottom"
      pattern={TALKING_PATTERN}
      picture={
        <Portrait
          partner={partner}
          pose={ROUND_TWO_PORTRAIT.pose}
          size={ROUND_TWO_PORTRAIT.size}
          priority
          className="size-[min(280px,36dvh)] lg:size-[min(460px,52dvh)]"
        />
      }
      action={
        <Button fullWidth onClick={onStart}>
          Start round two
        </Button>
      }
    >
      <div className="pb-[8px] pt-[4px] lg:pt-0">
        {note}
        <h1 ref={takeFocus} tabIndex={-1} className="text-title outline-none">
          Ready for round two.
        </h1>
      </div>
    </SplitScreen>
  );
}
