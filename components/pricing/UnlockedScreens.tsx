'use client';

import { Button, Pattern, Portrait, SplitScreen, type FacePose } from '@/components/kit';
import { ROUTES } from '@/lib/routes';
import type { PartnerId } from '@/lib/types';

/**
 * The three screens the visitor can land on after the paywall. Props only: components/pricing/Unlocked.tsx
 * decides which one is true.
 */

interface ResultProps {
  partner: PartnerId;
  pose: FacePose;
  title: string;
  line: string;
  action: string;
  href: string;
}

/**
 * The screen before this one is gone with the button that was pressed. The headline takes the focus, without a
 * ring: a screen reader reads it, and the next Tab reaches the action.
 */
function takeFocus(heading: HTMLElement | null) {
  heading?.focus({ preventScroll: true });
}

/**
 * One result of the checkout: the child rests on the violet block, two lines of words, the one action.
 * Phones are Figma 27:664 (28px over the words, 24px over the action), from 1024px it is 33:204.
 * The phone frames are flat violet; the bars come with the desktop block.
 */
function Result({ partner, pose, title, line, action, href }: ResultProps) {
  return (
    <SplitScreen
      rest="bottom"
      pattern={<Pattern kind="bars" size={1440} className="hidden lg:block" />}
      picture={<Portrait partner={partner} pose={pose} size={500} priority className="size-[280px] lg:size-[min(500px,56dvh)]" />}
      action={
        <Button fullWidth href={href}>
          {action}
        </Button>
      }
    >
      <div className="flex flex-col gap-[8px] pb-[8px] pt-[4px] lg:pt-0">
        <h1 ref={takeFocus} tabIndex={-1} className="text-title outline-none">
          {title}
        </h1>
        <p className="text-body text-gray">{line}</p>
      </div>
    </SplitScreen>
  );
}

export interface YoureInProps {
  partner: PartnerId;
  /** True when access came with no payment at all; false after a test payment. The line under the headline says which. */
  demo: boolean;
}

/** Access is on (27:664, 33:204). The one action opens the plan. */
export function YoureIn({ partner, demo }: YoureInProps) {
  return (
    <Result
      partner={partner}
      pose="leaning"
      title="You’re in."
      line={demo ? 'Demo access. No payment was taken.' : 'Test mode. No real charge was made.'}
      action="Open my plan"
      href={ROUTES.today}
    />
  );
}

/** The checkout did not end in a payment (27:687). The one action leads back to the plans. */
export function NotCompleted({ partner }: { partner: PartnerId }) {
  return (
    <Result
      partner={partner}
      pose="neutral"
      title="The payment was not completed."
      line="Nothing was charged."
      action="Back to plans"
      href={ROUTES.pricing}
    />
  );
}

/**
 * TODO kit: the waiting ring, as drawn (27:658): 56px, a 5.04px line, a little over a quarter of it violet,
 * starting at the top. It turns once a second and stands still for people who ask for less motion.
 */
function Spinner() {
  return (
    <svg viewBox="0 0 56 56" width="56" height="56" fill="none" aria-hidden="true" className="shrink-0 animate-spin">
      <circle cx="28" cy="28" r="25.48" strokeWidth="5.04" className="stroke-line" />
      <circle cx="28" cy="28" r="25.48" strokeWidth="5.04" strokeDasharray="45.15 160.1" transform="rotate(-90 28 28)" className="stroke-violet" />
    </svg>
  );
}

/** The server is asked whether the checkout was completed (27:645). Nothing to press. */
export function Confirming() {
  return (
    <div className="split-root flex flex-col items-center justify-center gap-[24px] px-[32px] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Spinner />
      <h1 className="max-w-[326px] text-center text-title">Confirming your test payment…</h1>
    </div>
  );
}
