'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { PlanId } from '@/client/entitlement';
import { CHILDREN, forChild } from '@/components/child';
import { Button, Icon, IconButton, Pattern, Portrait, SplitScreen, cn } from '@/components/kit';
import type { PartnerId } from '@/lib/types';
import { PLANS, lengthOf, perDayOf, planOf, priceOf, termsLine } from './plans';
import { PlanOption } from './PlanOption';

/**
 * How the one action works. `stripe`: it opens Stripe's hosted test checkout. `demo`: no payment is taken on the
 * site, so it gives access at once and the screen says so.
 */
export type CheckoutMode = 'stripe' | 'demo';

export interface PaywallScreenProps {
  checkout: CheckoutMode;
  partner: PartnerId;
  /** False until this device has been read (the profile, today's date): the picture and the words wait for it. */
  ready: boolean;
  /** The parent's own answers over the headline ("Five minutes after dinner, with blocks."), or null. */
  moment: string | null;
  planId: PlanId;
  onPlan(id: PlanId): void;
  /** Today on this device, YYYY-MM-DD. The renewal date is counted from it. */
  today: string | null;
  /** The checkout is being opened (27:507). */
  opening?: boolean;
  /** The visitor came back from the checkout without paying (27:599). */
  cancelled?: boolean;
  /** Why the checkout did not open, as one sentence (27:552). */
  error?: string | null;
  /** The one action. */
  onContinue(): void;
  /** Access with no payment, labelled as a demo. Only reached in `stripe` mode. */
  onDemo(): void;
  onClose(): void;
}

/** Beside the pay button, by mode. The test card stays on one line. */
const FINE_PRINT: Record<CheckoutMode, ReactNode> = {
  stripe: (
    <>
      Test mode. No real card is charged. Use <span className="whitespace-nowrap">4242 4242 4242 4242</span>, any future date, any CVC.
    </>
  ),
  demo: 'Demo. No payment is taken on this site.',
};

/**
 * The paywall (Figma 27:462 on phones, 33:171 from 1024px) and its states: opening the checkout (27:507),
 * the checkout did not open (27:552), back without paying (27:599). Props only: the page holds the state.
 *
 * The action sits 12px under the terms, closer than the 16px the shell keeps over its action slot, so it is
 * placed with the words. The phone frames are flat violet; the bars come with the desktop block.
 * The two states with more words draw a smaller picture (150px against 200px).
 */
export function PaywallScreen({
  checkout,
  partner,
  ready,
  moment,
  planId,
  onPlan,
  today,
  opening = false,
  cancelled = false,
  error = null,
  onContinue,
  onDemo,
  onClose,
}: PaywallScreenProps) {
  const group = useId();
  const headline = useRef<HTMLHeadingElement>(null);
  const child = CHILDREN[partner];
  const plan = planOf(planId);
  const failed = checkout === 'stripe' && error !== null;
  const closed = checkout === 'stripe' && cancelled && !failed;

  // The page before this one stays in the document, hidden, with the control that was pressed there, and the next
  // Tab would start from it and miss this screen. So the headline takes the focus, without a ring: a screen reader
  // reads it and the next Tab reaches the plans. A control the visitor already moved to keeps the focus.
  useEffect(() => {
    if (ready && document.activeElement === document.body) headline.current?.focus({ preventScroll: true });
  }, [ready]);

  return (
    <SplitScreen
      rest="bottom"
      pattern={<Pattern kind="bars" size={1440} className="hidden lg:block" />}
      bar={
        <IconButton label="Close" variant="on-violet" onClick={onClose}>
          <Icon name="close" />
        </IconButton>
      }
      picture={
        ready ? (
          <Portrait
            partner={partner}
            pose="leaning"
            size={460}
            priority
            className={cn(failed || closed ? 'size-[150px]' : 'size-[200px]', 'lg:size-[min(460px,52dvh)]')}
          />
        ) : null
      }
    >
      <div className={cn('flex flex-col', !ready && 'invisible')}>
        <div className="flex flex-col gap-[14px]">
          {moment ? <p className="text-label text-gray">{moment}</p> : null}
          <h1 ref={headline} tabIndex={-1} className="text-title outline-none">
            Keep practicing with {child.name}.
          </h1>
          {closed ? <p className="text-body text-gray">Checkout was closed. Nothing was charged.</p> : null}

          <div role="radiogroup" aria-label="Choose your plan" className="flex flex-col gap-[10px]">
            {PLANS.map((one) => (
              <PlanOption
                key={one.id}
                name={group}
                value={one.id}
                title={lengthOf(one)}
                perDay={perDayOf(one)}
                price={priceOf(one)}
                tag={one.tag}
                detail={forChild(one.detail, partner)}
                selected={one.id === planId}
                onSelect={() => onPlan(one.id)}
              />
            ))}
          </div>

          <p className="text-small text-gray">{termsLine(plan, today)}</p>
        </div>

        <div className="flex flex-col gap-[10px] pt-[12px]">
          {/*
            While the checkout opens the pill is the ink one at 45%, as drawn (27:547), and stays in the tab order
            so the focus is not lost; the page ignores a second press.
          */}
          <Button
            fullWidth
            onClick={onContinue}
            aria-disabled={opening || undefined}
            aria-busy={opening || undefined}
            className={cn(opening && 'pointer-events-none opacity-45')}
          >
            {opening ? 'Opening checkout…' : `Continue with ${priceOf(plan)}`}
          </Button>

          {/* Words only in the live region, so a checkout that did not open is read out. */}
          <div role="status">
            {failed ? (
              <p className="text-center text-label text-ink">{error} Nothing was charged.</p>
            ) : (
              <p className="text-center text-small text-gray">
                <span className="block">{FINE_PRINT[checkout]}</span>
                <span className="block">Skill practice, not therapy.</span>
              </p>
            )}
          </div>

          {failed ? (
            <>
              <Button variant="soft" fullWidth onClick={onDemo}>
                Unlock in demo mode
              </Button>
              <p className="text-center text-small text-gray">Skill practice, not therapy.</p>
            </>
          ) : null}

          {/* The jury's way past the test checkout. When the checkout did not open, the soft button above is that way. */}
          {checkout === 'stripe' && !failed ? (
            <Button variant="ghost" onClick={onDemo}>
              Jury: unlock without paying (demo)
            </Button>
          ) : null}
        </div>
      </div>
    </SplitScreen>
  );
}
