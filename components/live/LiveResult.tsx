'use client';

import { useEffect, useRef, type MouseEvent } from 'react';
import { Art, Button, Pattern, SplitScreen } from '@/components/kit';
import type { RoundDone } from '@/components/round/types';
import { ROUTES } from '@/lib/routes';

/** What a live session cannot count: one microphone does not tell the parent from the child (27:931). */
const NO_REFLECTIONS = 'Reflections are not counted in live play.';
/** SHORT_ROUND_NOTE of lib/round/session.ts, in the words of a live session. */
const SHORT_NOTE = 'This session ended early, so it has no pace verdict.';

/** The result takes no tap for this long: a tap meant for the session as its clock ran out is not a choice made here. */
const QUIET_MS = 500;

/**
 * One count of the session, with the pace it is measured against when there is one.
 * TODO kit: the same piece as the Stat of components/daily/SessionResult.tsx, which does not export it.
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

export interface LiveResultProps {
  done: RoundDone;
  /** The review of the session that was just saved; null when nothing was said and nothing was saved. */
  review: string | null;
}

/**
 * 17.5, the live result (Figma 27:931). The counts are measured against the five-minute pace; reflections are
 * not counted live, and the screen says so. Every number comes from the RoundDone the round screen handed over.
 */
export function LiveResult({ done, review }: LiveResultProps) {
  const { result } = done;
  const { counts, targets } = result;
  const title = result.met ? 'You met the clinic pace.' : 'Session saved.';
  const heading = useRef<HTMLHeadingElement>(null);
  const shownAt = useRef(Number.POSITIVE_INFINITY);

  // The session is gone with the field that had the focus: the result opens at its top, the keyboard at its heading.
  useEffect(() => {
    shownAt.current = performance.now();
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, []);

  function settle(event: MouseEvent) {
    if (performance.now() - shownAt.current >= QUIET_MS) return;
    event.preventDefault();
    event.stopPropagation();
  }

  // The second tap of a double tap on "End session" lands here: it neither selects a word nor moves the focus.
  function still(event: MouseEvent) {
    if (performance.now() - shownAt.current < QUIET_MS) event.preventDefault();
  }

  return (
    <div onMouseDownCapture={still}>
      <SplitScreen
        pattern={<Pattern kind="sentences" size={1440} className="hidden lg:block" />}
        picture={<Art name="medal" size={380} priority className="size-[min(170px,24dvh)] lg:size-[min(380px,52dvh)]" />}
        action={
          <div className="flex flex-col items-center gap-[4px]" onClickCapture={settle}>
            <Button href={ROUTES.today} fullWidth>
              Back to my plan
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
          <h1 ref={heading} tabIndex={-1} className="text-title text-ink outline-none">
            {title}
          </h1>
          <dl className="flex items-start gap-[8px]" aria-label="Your five minutes">
            <Stat label="Praise" value={counts.specific_praise} of={targets.specific_praise} />
            <Stat label="Describe" value={counts.description} of={targets.description} />
            <Stat label="To swap" value={counts.avoid} />
          </dl>
          <p className="text-body text-gray">{NO_REFLECTIONS}</p>
          {result.short && <p className="text-body text-gray">{SHORT_NOTE}</p>}
          {result.leverText && (
            <div className="flex flex-col gap-[4px]">
              <h2 className="text-label text-gray">Next time</h2>
              <p className="text-body-strong text-ink">{result.leverText}</p>
            </div>
          )}
        </div>
      </SplitScreen>
    </div>
  );
}
