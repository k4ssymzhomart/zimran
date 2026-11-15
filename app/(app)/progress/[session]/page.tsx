'use client';

import { Suspense, use } from 'react';
import { CHILDREN } from '@/components/child';
import { IconButton, PageScreen, Rings, TranscriptRow } from '@/components/kit';
import { useSessions } from '@/hooks/useSessions';
import { sessionPatterns } from '@/lib/progress/sessions';
import { ROUTES } from '@/lib/routes';
import type { SavedSession, SessionKind } from '@/lib/types';
import { clock, dayLabel } from '../../labels';

type Params = Promise<{ session: string }>;

const KIND: Record<SessionKind, string> = {
  first_before: 'First round',
  first_after: 'Round two',
  daily: 'Daily session',
  practice: 'Practice',
  live: 'Live',
};

const back = (
  <IconButton href={ROUTES.progress} label="Back to Progress">
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[24px] fill-none stroke-current" strokeWidth="2">
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </IconButton>
);

/**
 * Session review (Figma 48:894, 54:725): one saved session read back from this device. A pushed screen: no tab
 * bar, no rail, its own way back. The id is not known until the request, so the part that reads it waits in Suspense.
 * TODO: the player, the sentence rewrites and the AI summary, behind their switches in lib/features.ts.
 */
export default function SessionPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <Review params={params} />
    </Suspense>
  );
}

function Review({ params }: { params: Params }) {
  const { session: id } = use(params);
  const { sessions, ready } = useSessions();
  if (!ready) return null;

  const session = sessions.find((s) => s.id === id);
  if (!session) {
    return (
      <PageScreen embedded bar={back} title="Session not found">
        {null}
      </PageScreen>
    );
  }

  const { counts, targets, sentences } = session;
  const patterns = sessionPatterns(session);
  /** A ring is full at the clinic pace for the length of this session. */
  const ring = (count: number, target: number) => ({ value: count, progress: target > 0 ? count / target : 0 });

  return (
    <PageScreen embedded bar={back} title={dayLabel(session.date)}>
      <div className="flex w-full max-w-[640px] flex-col gap-[24px]">
        <p className="text-label text-gray">{summaryLine(session)}</p>

        <Rings
          praise={ring(counts.specific_praise, targets.specific_praise)}
          // Reflections are not measured in live play: a dash, never a zero.
          reflect={session.kind === 'live' ? { value: '–', progress: 0 } : ring(counts.reflection, targets.reflection)}
          describe={ring(counts.description, targets.description)}
          swap={{ value: counts.avoid }}
          size={60}
          className="justify-between"
        />

        {patterns.length > 0 && (
          <section>
            <h2 className="text-heading">Patterns</h2>
            <ul className="divide-y divide-line">
              {patterns.map((pattern) => (
                <li key={pattern.id} className="flex flex-col gap-[2px] py-[12px]">
                  <span className="text-body-strong">{pattern.title}</span>
                  <span className="text-small text-gray">{pattern.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {sentences.length > 0 && (
          <section>
            <h2 className="text-heading">Your sentences</h2>
            <ol>
              {sentences.map((sentence, i) => (
                <li key={i}>
                  <TranscriptRow sentence={sentence} />
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </PageScreen>
  );
}

/** "Practice with Mia, 5:00": what kind of session, with whom, how long. */
function summaryLine(session: SavedSession): string {
  const who = session.partner ? ` with ${CHILDREN[session.partner].name}` : '';
  return `${KIND[session.kind]}${who}, ${clock(session.durationSec)}`;
}
