'use client';

import type { KeyboardEvent } from 'react';
import { CHILDREN } from '@/components/child';
import { Chip, Icon, IconButton, Pattern, Portrait, cn, focusRing } from '@/components/kit';
import type { PartnerId } from '@/lib/types';
import type { PickPartnerProps } from './types';
import { useWayBack } from './useWayBack';

const PARTNERS: readonly PartnerId[] = ['mia', 'leo'];

/** The arrow keys move between the two cards, as in any radio group. They do not pick: a pick leaves the screen. */
function moveFocus(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
  const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
  if (!forward && !backward) return;
  event.preventDefault();
  const cards = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? []);
  const next = cards.indexOf(event.currentTarget) + (forward ? 1 : -1);
  cards[(next + cards.length) % cards.length]?.focus();
}

/**
 * Who to practice with: Mia or Leo, one tap picks and moves on.
 * Phones are Figma 49:1316 (a violet top row, the cards stacked, the tag on each card); from 1024px it is 32:74
 * (a white top row, the cards side by side). The words are the words of each frame.
 * The props carry no step of the quiz, so the progress segments of 49:1336 are not drawn.
 */
export function PickPartner({ value, onPick }: PickPartnerProps) {
  const back = useWayBack();

  return (
    <div className="split-root flex flex-col">
      <div className="relative shrink-0 overflow-clip bg-violet pt-[env(safe-area-inset-top)] lg:bg-white">
        <Pattern kind="reps" className="lg:hidden" />
        <div className="relative flex h-[44px] items-center pl-[12px] pr-[24px] lg:h-[80px] lg:px-[28px]">
          <IconButton
            label="Back"
            variant="on-violet"
            onClick={back}
            className="lg:text-ink lg:focus-visible:outline-violet lg:active:bg-line"
          >
            <Icon name="back" />
          </IconButton>
        </div>
        <div className="h-[10px] lg:hidden" />
      </div>

      <h1 className="px-[24px] pt-[22px] text-title lg:px-[56px] lg:pt-0 lg:pb-[28px] lg:text-title-xl">
        <span className="lg:hidden">Pick your practice partner.</span>
        <span className="hidden lg:inline">Who do you practice with?</span>
      </h1>

      <div
        role="radiogroup"
        aria-label="Practice partner"
        className="flex flex-1 flex-col gap-[12px] px-[24px] pt-[16px] pb-[max(24px,calc(12px_+_env(safe-area-inset-bottom)))] lg:flex-row lg:gap-[24px] lg:px-[56px] lg:pt-0 lg:pb-[56px]"
      >
        {PARTNERS.map((id) => {
          const checked = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onPick(id)}
              onKeyDown={moveFocus}
              className={cn(
                'relative flex min-w-0 flex-1 cursor-pointer items-end justify-between overflow-clip rounded-[28px] bg-violet pl-[24px] pr-[10px] pt-[20px] text-left text-white',
                'lg:rounded-[32px] lg:pl-[44px] lg:pr-[24px] lg:pt-[32px]',
                'transition-[scale] duration-quick ease-out-quint motion-reduce:transition-none motion-safe:active:scale-[0.98]',
                focusRing,
              )}
            >
              <Pattern kind="reps" className="[--pattern-size:864px] lg:[--pattern-size:1440px]" />
              <span className="relative flex shrink-0 flex-col items-start gap-[10px] self-stretch">
                <span className="text-display lg:text-display-xl">{CHILDREN[id].name}</span>
                <Chip tone="on-violet" className="lg:hidden">
                  Simulated child
                </Chip>
              </span>
              {/*
                As drawn, the portrait follows the name and runs a little under the card's right edge.
                It gives way on a short screen, so both cards stay in view, and on a narrow one, so the face stays in the card.
              */}
              <Portrait
                partner={id}
                pose="smiling"
                size={520}
                priority
                className="relative size-[clamp(120px,min(calc((100dvh_-_240px)_/_2),calc((100vw_-_205px)_*_1.146)),212px)] lg:size-[clamp(200px,min(calc(100dvh_-_248px),calc(50vw_-_200px)),520px)]"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
