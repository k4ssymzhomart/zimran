'use client';

import { useId } from 'react';
import { ART, Art, Button, Icon, IconButton, Option, Pattern, type ArtName } from '@/components/kit';
import type { WhenYouPlayProps } from './types';

/**
 * The four moments the product offers, as the frame lists them. The label is the answer itself: it is what the
 * flow saves, and lib/progress/calendar.ts knows a usual hour for each.
 */
const MOMENTS: ReadonlyArray<{ label: string; art: ArtName }> = [
  { label: 'After breakfast', art: 'breakfast' },
  { label: 'After daycare', art: 'daycare' },
  { label: 'After dinner', art: 'dinner' },
  { label: 'Before bath', art: 'bath' },
];

/** On the violet half until a moment is picked. The frame draws only the picked state (dinner). */
const NOTHING_PICKED: ArtName = 'timer';

/** A saved moment may differ from a label in case or spacing ("after dinner"). */
const sameMoment = (saved: string, label: string): boolean => saved.trim().replace(/\s+/g, ' ').toLowerCase() === label.toLowerCase();

/**
 * The screen before this one is gone with the button that was pressed. The question takes the focus, without a
 * ring: a screen reader reads it, and the next Tab reaches the answers.
 */
function takeFocus(heading: HTMLElement | null) {
  heading?.focus({ preventScroll: true });
}

/**
 * The one setup question: when the five minutes happen. Phones are Figma 24:523, from 1024px it is 32:240.
 * Picking an answer tells the flow at once; the one action is there once an answer is picked.
 * The question does not name the child, so `partner` is not read.
 *
 * TODO kit: the shell of a plain question. It is a white page on phones and a split from 1024px, with the way back
 * on the violet half (32:242). PageScreen comes close, but its title sits 6px under the top with 14px to the page,
 * and its split has no top row on violet.
 *
 * The back arrow is on white on phones and on the violet half from 1024px, as drawn. Without `onBack` there is
 * none, and its row stays empty on phones: the question sits where it is drawn.
 */
export function WhenYouPlay({ value, onChange, onNext, onBack }: WhenYouPlayProps) {
  const titleId = useId();
  const group = useId();
  const picked = value === null ? null : (MOMENTS.find((moment) => sameMoment(value, moment.label)) ?? null);

  return (
    <div className="split-root flex flex-col lg:flex-row">
      {/* From 1024px the picked moment is the picture. Phones have no violet block. */}
      <div className="relative hidden shrink-0 items-center justify-center overflow-clip bg-violet text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-1/2">
        <Pattern kind="reps" size={1440} />
        {onBack && (
          <div className="absolute inset-x-0 top-0 z-[1] flex h-[80px] items-center px-[28px]">
            <IconButton label="Back" variant="on-violet" onClick={onBack}>
              <Icon name="back" />
            </IconButton>
          </div>
        )}
        <Art name={picked?.art ?? NOTHING_PICKED} size={320} className="relative size-[min(320px,43dvh)] object-contain" />
      </div>

      <div className="flex flex-1 flex-col bg-white pt-[env(safe-area-inset-top)] pb-[max(24px,env(safe-area-inset-bottom))] lg:min-w-0 lg:items-center lg:justify-center lg:px-[40px] lg:py-[64px]">
        <div className="flex w-full flex-1 flex-col lg:max-w-[440px] lg:flex-none">
          <div className="flex h-[44px] shrink-0 items-center px-[12px] lg:hidden">
            {onBack && (
              <IconButton label="Back" onClick={onBack}>
                <Icon name="back" />
              </IconButton>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-[24px] px-[24px] pt-[12px] lg:flex-none lg:px-0 lg:pt-0">
            <h1 id={titleId} ref={takeFocus} tabIndex={-1} className="text-title outline-none">
              When can you play for five minutes?
            </h1>
            <div role="radiogroup" aria-labelledby={titleId} className="flex flex-col gap-[10px]">
              {MOMENTS.map((moment) => (
                <Option
                  key={moment.label}
                  name={group}
                  value={moment.label}
                  label={moment.label}
                  art={ART[moment.art].src}
                  selected={moment === picked}
                  onChange={() => onChange(moment.label)}
                />
              ))}
            </div>
          </div>
          <div className="px-[24px] pt-[24px] lg:px-0">
            <Button fullWidth disabled={picked === null} onClick={onNext}>
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
