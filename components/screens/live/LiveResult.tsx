'use client';

import { useEffect, useRef, type MouseEvent } from 'react';
import { forChild } from '@/components/child';
import { Art, Button, Pattern, SplitScreen } from '@/components/kit';
import type { RoundDone } from '@/components/round/types';
import { isEmptyResult } from '@/lib/progress/history';
import { SHORT_ROUND_NOTE } from '@/lib/round/session';
import { ROUTES } from '@/lib/routes';
import type { PartnerId } from '@/lib/types';

/**
 * The end of a live session, in the words and counts of the daily result (components/daily/SessionResult.tsx).
 * Live play counts praise and descriptions only: reflections need the child's words, and the microphone cannot
 * tell the child's voice from the parent's. Every number comes from the RoundDone the round screen handed over.
 */

export interface LiveResultProps {
  done: RoundDone;
  /** The id the session was saved under; null when nothing was said and nothing was saved. */
  id: string | null;
  /** The simulated child whose name the coaching lines use. */
  partner: PartnerId;
  /** Back to the page before the five minutes, after a session in which nothing was heard. */
  onAgain(): void;
}

/**
 * One count of the session, with the pace it is measured against when there is one.
 * TODO kit: the same piece as the Stat of SessionResult and RoundOneResult.
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

/** The result takes no tap for this long: a tap meant for the round as its clock ran out is not a choice made here. */
const QUIET_MS = 500;

export function LiveResult({ done, id, partner, onAgain }: LiveResultProps) {
  const { result } = done;
  const { counts, targets } = result;
  const empty = isEmptyResult(result) || id === null;
  const lever = forChild(result.leverText, partner);
  const title = empty ? 'Nothing was counted.' : result.met ? 'You met the clinic pace.' : result.short ? 'Ended early.' : 'Live session done.';
  const heading = useRef<HTMLHeadingElement>(null);
  const shownAt = useRef(Number.POSITIVE_INFINITY);

  // The round is gone with the field that had the focus: the result opens at its top, the keyboard at its heading.
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

  const action =
    empty || id === null ? (
      <div className="flex flex-col items-center gap-[4px]" onClickCapture={settle}>
        <Button fullWidth onClick={onAgain}>
          Start again
        </Button>
        <Button href={ROUTES.today} variant="ghost">
          Back to my plan
        </Button>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-[4px]" onClickCapture={settle}>
        <Button href={ROUTES.today} fullWidth>
          Back to my plan
        </Button>
        <Button href={ROUTES.session(id)} variant="ghost">
          Review
        </Button>
      </div>
    );

  return (
    <SplitScreen
      pattern={<Pattern kind="sentences" size={1440} className="hidden lg:block" />}
      picture={
        <Art
          name={result.met ? 'trophy' : 'earbud'}
          size={384}
          priority
          className="size-[min(200px,26dvh)] lg:size-[min(320px,44dvh)]"
        />
      }
      action={action}
    >
      <div className="flex flex-col gap-[20px]">
        <h1 ref={heading} tabIndex={-1} className="text-title text-ink outline-none">
          {title}
        </h1>
        {empty ? (
          <p className="text-body text-gray">
            The coach heard no sentences, so this session was not saved. Check that the browser may use the microphone,
            or type what you say.
          </p>
        ) : (
          <>
            <dl className="flex items-start gap-[8px]">
              <Stat label="Praise" value={counts.specific_praise} of={targets.specific_praise} />
              <Stat label="Describe" value={counts.description} of={targets.description} />
              <Stat label="To swap" value={counts.avoid} />
            </dl>
            <p className="text-body text-gray">Live play counts praise and descriptions. Reflections are not counted yet.</p>
            {result.short && <p className="text-body text-gray">{SHORT_ROUND_NOTE}</p>}
            {lever && (
              <div className="flex flex-col gap-[4px]">
                <h2 className="text-label text-gray">Next time</h2>
                <p className="text-body-strong text-ink">{lever}</p>
              </div>
            )}
          </>
        )}
      </div>
    </SplitScreen>
  );
}
