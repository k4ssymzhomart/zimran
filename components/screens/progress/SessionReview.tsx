'use client';

import { Fragment, useState } from 'react';
import { dayLabel } from '@/app/(app)/labels';
import { isLocked } from '@/client/entitlement';
import { CHILDREN } from '@/components/child';
import {
  AiSummaryCard, Art, Button, Divider, Icon, IconButton, Pattern, PatternRow, RewriteCard, Rings, Sheet, Tag, TranscriptRow, cn, focusRing, type RingStat,
} from '@/components/kit';
import { useAiSummary } from '@/hooks/useAiSummary';
import { useEntitlement } from '@/hooks/useEntitlement';
import { ROUTES } from '@/lib/routes';
import type { SavedSession } from '@/lib/types';
import { reviewHeadline, reviewRows, signed } from './numbers';

/** Sentences shown before "Show all". */
const FIRST_SHOWN = 5;

/** "Tuesday, November 10", from the saved day. Midday keeps the date from slipping across time zones. */
function longDay(date: string): string {
  const day = new Date(`${date}T12:00:00`);
  const part = (options: Intl.DateTimeFormatOptions) => day.toLocaleDateString('en-US', options);
  return `${part({ weekday: 'long' })}, ${part({ month: 'long' })} ${day.getDate()}`;
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
  const ai = useAiSummary(session);

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

          <div className="flex flex-col gap-[12px]">
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
            {/* The target follows the planned length, so the same count fills a short round's ring further. */}
            <p className="text-small text-gray">A full ring is the clinic pace for this length: {targets.specific_praise} of each skill.</p>
          </div>

          <section className="flex flex-col gap-[8px]">
            <h2 className="text-heading">Your sentences</h2>
            <Tag tone="quiet" className="self-start">
              Coded by rules on this device
            </Tag>
            {sentences.length === 0 ? (
              <p className="pt-[8px] text-body text-gray">The sentences of this session were not kept. Its counts are above.</p>
            ) : (
              <ol>
                {shown.map((sentence, i) => {
                  // A rewrite the model suggested and the rules coded as a skill (lib/ai/summary.ts).
                  const rewrite = ai.rewriteFor(sentence.text);
                  const why = ai.available && sentence.code !== 'unknown' ? ai.whyFor(sentence) : null;
                  return (
                    <li key={`${sentence.startSec}-${i}`}>
                      <TranscriptRow sentence={sentence} />
                      {rewrite && <RewriteCard text={rewrite} source="AI tip, checked by the rules" className="mb-[8px] ml-[46px]" />}
                      {ai.available && sentence.code !== 'unknown' && (
                        <div className="mb-[8px] ml-[46px] flex flex-col gap-[6px]">
                          {why === null && (
                            <button
                              type="button"
                              onClick={() => ai.askWhy(sentence)}
                              className={cn('self-start rounded-[8px] py-[4px] text-label text-violet', focusRing)}
                            >
                              Why this label?
                            </button>
                          )}
                          {why?.status === 'loading' && (
                            <p role="status" className="text-small text-gray">
                              Asking the AI…
                            </p>
                          )}
                          {why?.status === 'error' && (
                            <p role="status" className="text-small text-gray">
                              {why.message}
                            </p>
                          )}
                          {why?.status === 'done' && (
                            <>
                              <p className="rounded-[12px] bg-lilac px-[12px] py-[10px] text-small text-ink">
                                <span className="font-semibold">Why: </span>
                                {why.why}
                                <span className="block pt-[4px] text-gray">Explained by AI. The label stays as the rules set it.</span>
                              </p>
                              {why.tryInstead && !rewrite && <RewriteCard text={why.tryInstead} source="AI tip, checked by the rules" />}
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
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

          {ai.available &&
            (ai.summary ? (
              <AiSummaryCard text={ai.summary} />
            ) : (
              <div className="flex flex-col gap-[6px]">
                <Button variant="soft" fullWidth onClick={ai.ask} disabled={ai.phase === 'loading'}>
                  {ai.phase === 'loading' ? 'Writing the summary…' : 'Write an AI summary'}
                </Button>
                {ai.error && (
                  <p role="status" className="text-center text-small text-gray">
                    {ai.error}
                  </p>
                )}
              </div>
            ))}

          <Button href={practice} fullWidth className="mt-auto">
            Practice this
          </Button>

          {/* Figma 48:1092: asked once, before the first summary. */}
          <Sheet
            open={ai.phase === 'consent'}
            onClose={ai.decline}
            title={ai.consentFor === 'why' ? 'Explain with AI?' : 'Write an AI summary?'}
            art={<Art name="sparkle" size={64} />}
            primary={{ label: ai.consentFor === 'why' ? 'Explain' : 'Write summary', onClick: ai.accept }}
            secondary={{ label: 'Not now', onClick: ai.decline }}
          >
            <dl className="flex flex-col">
              {[
                ['Sent', 'Your sentence text'],
                ['Never sent', "Audio, your child's name"],
                ['Counts', 'Stay as the rules coded them'],
              ].map(([term, detail], i) => (
                <Fragment key={term}>
                  {i > 0 && <Divider />}
                  <div className="flex items-center justify-between gap-[16px] py-[12px]">
                    <dt className="text-body text-gray">{term}</dt>
                    <dd className="text-right text-body-strong text-ink">{detail}</dd>
                  </div>
                </Fragment>
              ))}
            </dl>
            <p className="pt-[8px] text-small text-gray">Written by Anthropic&apos;s Claude. Fammy keeps no copy on a server.</p>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
