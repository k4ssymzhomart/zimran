'use client';

import { useEffect, useRef, type MouseEvent } from 'react';
import { forChild } from '@/components/child';
import { Goodbye } from '@/components/first/RoundOneResult';
import { Button, Pattern, SplitScreen } from '@/components/kit';
import type { RoundDone } from '@/components/round/types';
import { SHORT_ROUND_NOTE } from '@/lib/round/session';
import type { PartnerId } from '@/lib/types';

/**
 * The end of a daily session or a practice round (Figma 15.4, 25:704; from 1024px the split of 32:164).
 * The counts are measured against the pace of the round as it was planned: 10 of each skill for five minutes.
 * Every number comes from the RoundDone the round screen handed over.
 */

export interface SessionResultProps {
  done: RoundDone;
  partner: PartnerId;
  /** The heading when the round ran its length without meeting the pace: "Day 5 done." */
  heading: string;
  /** The one action: back where the parent came from. */
  back: { href: string; label: string };
  /** The review of the session that was just saved; null when nothing was said and nothing was saved. */
  review: string | null;
}

/**
 * One count of the round, with the pace it is measured against when there is one.
 * TODO kit: the frame draws the counts as numbers (25:704); RoundOneResult carries the same piece.
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

/** The portrait gives way on a short screen, so the goodbye line and the action stay in view. */
const FACE = 'size-[min(210px,25dvh)] lg:size-[min(380px,52dvh)]';

/** The result takes no tap for this long: a tap meant for the round as its clock ran out is not a choice made here. */
const QUIET_MS = 500;

export function SessionResult({ done, partner, heading, back, review }: SessionResultProps) {
  const { result, farewell } = done;
  const { counts, targets } = result;
  const lever = forChild(result.leverText, partner);
  // A round ended before half its length has no pace verdict: it says so, and does not claim the day.
  const title = result.met ? 'You met the clinic pace.' : result.short ? 'Ended early.' : heading;
  const heading1 = useRef<HTMLHeadingElement>(null);
  const shownAt = useRef(Number.POSITIVE_INFINITY);

  // The round is gone with the field that had the focus: the result opens at its top, the keyboard at its heading.
  useEffect(() => {
    shownAt.current = performance.now();
    window.scrollTo(0, 0);
    heading1.current?.focus({ preventScroll: true });
  }, []);

  function settle(event: MouseEvent) {
    if (performance.now() - shownAt.current >= QUIET_MS) return;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <SplitScreen
      pattern={<Pattern kind="sentences" size={1440} className="hidden lg:block" />}
      picture={<Goodbye partner={partner} farewell={farewell} pose={result.met ? 'beaming' : 'smiling'} className={FACE} />}
      action={
        <div className="flex flex-col items-center gap-[4px]" onClickCapture={settle}>
          <Button href={back.href} fullWidth>
            {back.label}
          </Button>
          {review ? (
            <Button href={review} variant="ghost">
              Review
            </Button>
          ) : (
            <p className="py-[10px] text-small text-gray">Nothing was said, so this round was not saved.</p>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-[20px]">
        <h1 ref={heading1} tabIndex={-1} className="text-title text-ink outline-none">
          {title}
        </h1>
        <dl className="flex items-start gap-[8px]">
          <Stat label="Praise" value={counts.specific_praise} of={targets.specific_praise} />
          <Stat label="Reflect" value={counts.reflection} of={targets.reflection} />
          <Stat label="Describe" value={counts.description} of={targets.description} />
          <Stat label="To swap" value={counts.avoid} />
        </dl>
        {result.short && <p className="text-body text-gray">{SHORT_ROUND_NOTE}</p>}
        {lever && (
          <div className="flex flex-col gap-[4px]">
            <h2 className="text-label text-gray">Next time</h2>
            <p className="text-body-strong text-ink">{lever}</p>
          </div>
        )}
      </div>
    </SplitScreen>
  );
}
