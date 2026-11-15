'use client';

import { Fragment, useState } from 'react';
import { dayLabel } from '@/app/(app)/labels';
import { isLocked } from '@/client/entitlement';
import { CHILDREN } from '@/components/child';
import { Button, Divider, Icon, IconButton, Pattern, PatternRow, Rings, Tag, TranscriptRow, cn, focusRing, type RingStat } from '@/components/kit';
import { useEntitlement } from '@/hooks/useEntitlement';
import { ROUTES } from '@/lib/routes';
import type { SavedSession } from '@/lib/types';
import { reviewHeadline, reviewRows, signed } from './numbers';

/** Sentences shown before "Show all". */
const FIRST_SHOWN = 5;

/** "Tuesday 10 November", from the saved day. Midday keeps the date from slipping across time zones. */
function longDay(date: string): string {
  const day = new Date(`${date}T12:00:00`);
  const part = (options: Intl.DateTimeFormatOptions) => day.toLocaleDateString('en-US', options);
  return `${part({ weekday: 'long' })} ${day.getDate()} ${part({ month: 'long' })}`;
}

const KIND: Record<SavedSession['kind'], string> = {
  first_before: 'First round',
  first_after: 'Second round',
  daily: 'Daily session',
  practice: 'Practice',
  live: 'Live with your child',
};

/**
 * "Daily session with Mia, typed": what kind, with whom, how the parent answered. The length is left out: a round
 * ended early is measured as at least half its planned length (lib/round/session.ts), so the stored seconds are not
 * how long it was played.
 */
function summaryOf(session: SavedSession): string {
  if (session.kind === 'live') return KIND.live;
  const who = session.partner ? ` with ${CHILDREN[session.partner].name}` : '';
  const how = session.input === 'typed' ? ', typed' : session.input === 'mixed' ? ', typed and spoken' : '';
  return `${KIND[session.kind]}${who}${how}`;
}

export interface SessionReviewProps {
  session: SavedSession;
  /** The session saved before this one. The change is shown only when both ran the same length. */
  previous?: SavedSession;
}

/**
 * Session review (Figma 48:1117 the typed session, 54:725 from 1024px): the counts against the clinic pace, the
 * sentences as the rules coded them, and the patterns in them. A session moved over from the old progress has no
 * sentences: its counts stay, and the review says the sentences were not kept.
 * Left out while their switches in lib/features.ts are off: the player and the AI summary. Left out for now: the
 * share card, the sentence rewrites and "Change label".
 */
export function SessionReview({ session, previous }: SessionReviewProps) {
  const { entitlement, ready } = useEntitlement();
  const [all, setAll] = useState(false);

  const { counts, targets } = session;
  const same = previous && previous.durationSec === session.durationSec ? previous : undefined;
  const change = (now: number, before: number | undefined) => (before === undefined ? undefined : signed(now - before));
  /** A ring is full at the clinic pace for the length of this session. */
  const ring = (count: number, target: number, before: number | undefined): RingStat => ({
    value: count,
    progress: target > 0 ? Math.min(1, count / target) : 0,
    delta: change(count, before),
  });

  const sentences = [...session.sentences].sort((a, b) => a.startSec - b.startSec);
  const shown = all ? sentences : sentences.slice(0, FIRST_SHOWN);
  const rows = reviewRows(session);
  const headline = reviewHeadline(session);
  const summary = summaryOf(session);
  const practice = ready && !isLocked('daily', entitlement) ? ROUTES.daily : ROUTES.practice;

  return (
    <div className="flex flex-1 flex-col bg-white lg:flex-row">
      {/* From 1024px the day and the headline sit on a violet half with the talking pattern. */}
      <aside className="relative hidden shrink-0 flex-col overflow-clip bg-violet px-[72px] py-[24px] text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-1/2">
        <Pattern kind="sentences" size={1440} />
        <IconButton href={ROUTES.progress} label="Back to Progress" variant="on-violet" className="relative -ml-[40px] self-start">
          <Icon name="back" />
        </IconButton>
        <div className="relative mt-[160px] flex flex-col gap-[16px]">
          <p className="text-lead">{longDay(session.date)}</p>
          <h1 className="text-display-xl">{headline}</h1>
          <p className="text-lead">{summary}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="grid h-[56px] grid-cols-[44px_1fr_44px] items-center px-[12px] lg:hidden">
          <IconButton href={ROUTES.progress} label="Back to Progress">
            <Icon name="back" />
          </IconButton>
          <p className="text-center text-body-strong">{dayLabel(session.date)}</p>
        </div>

        <div className="flex w-full flex-1 flex-col gap-[24px] px-[24px] pb-[24px] lg:mx-auto lg:max-w-[528px] lg:px-0 lg:py-[64px]">
          <div className="flex flex-col gap-[6px] lg:hidden">
            <p className="text-label text-gray">{summary}</p>
            <h1 className="text-title">{headline}</h1>
          </div>

          <Rings
            praise={ring(counts.specific_praise, targets.specific_praise, same?.counts.specific_praise)}
            // Reflections are not measured in live play: a dash, never a zero.
            reflect={
              session.kind === 'live'
                ? { value: '–', progress: 0 }
                : ring(counts.reflection, targets.reflection, same && same.kind !== 'live' ? same.counts.reflection : undefined)
            }
            describe={ring(counts.description, targets.description, same?.counts.description)}
            swap={{ value: counts.avoid, delta: change(counts.avoid, same?.counts.avoid) }}
            size={60}
            className="justify-between"
          />

          <section className="flex flex-col gap-[8px]">
            <h2 className="text-heading">Your sentences</h2>
            <Tag tone="quiet" className="self-start">
              Coded by rules on this device
            </Tag>
            {sentences.length === 0 ? (
              <p className="pt-[8px] text-body text-gray">The sentences of this session were not kept. Its counts are above.</p>
            ) : (
              <ol>
                {shown.map((sentence, i) => (
                  <li key={`${sentence.startSec}-${i}`}>
                    <TranscriptRow sentence={sentence} />
                  </li>
                ))}
              </ol>
            )}
            {!all && sentences.length > FIRST_SHOWN && (
              <button type="button" onClick={() => setAll(true)} className={cn('ml-[46px] self-start rounded-[8px] py-[10px] text-label text-violet', focusRing)}>
                Show all {sentences.length} sentences
              </button>
            )}
          </section>

          {rows.length > 0 && (
            <section className="flex flex-col">
              <h2 className="pb-[4px] text-heading">Patterns</h2>
              {rows.map((row, i) => (
                <Fragment key={row.label}>
                  {i > 0 && <Divider />}
                  <PatternRow label={row.label} value={row.value} />
                </Fragment>
              ))}
            </section>
          )}

          <Button href={practice} fullWidth className="mt-auto">
            Practice this
          </Button>
        </div>
      </div>
    </div>
  );
}
