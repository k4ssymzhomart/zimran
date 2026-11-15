'use client';

import { Art, Button, PageScreen, SessionRow, type TagTone } from '@/components/kit';
import { useSessions } from '@/hooks/useSessions';
import { ROUTES } from '@/lib/routes';
import type { SavedSession } from '@/lib/types';
import { countsLine, dayLabel } from '../labels';

/** At most one tag on a row: a live session says so, a session at the clinic pace says so. */
function tagOf(session: SavedSession): { label: string; tone: TagTone } | undefined {
  if (session.kind === 'live') return { label: 'Live', tone: 'quiet' };
  return session.met ? { label: 'Pace met', tone: 'skill' } : undefined;
}

/**
 * Progress (Figma 47:1270, 47:1375): every saved session, newest first, each opening its review; or the empty state.
 * TODO: the Trends half, the filter chips and the week groups (Figma 47:1125, 60:223).
 */
export default function ProgressPage() {
  const { sessions, ready } = useSessions();

  if (!ready) return <PageScreen embedded title="Progress">{null}</PageScreen>;

  if (sessions.length === 0) {
    return (
      <PageScreen embedded title="Progress">
        <div className="flex flex-1 flex-col items-center justify-center gap-[16px] px-[8px] pb-[40px]">
          <div className="flex size-[148px] items-center justify-center overflow-hidden rounded-[36px] bg-violet">
            <Art name="clipboard" size={92} />
          </div>
          <p className="text-center text-title">No sessions yet.</p>
        </div>
        <Button href={ROUTES.daily} fullWidth className="lg:mx-auto lg:w-[342px]">
          Start today’s session
        </Button>
      </PageScreen>
    );
  }

  return (
    <PageScreen embedded title="Progress">
      <ul className="w-full max-w-[640px] divide-y divide-line">
        {[...sessions].reverse().map((session) => (
          <li key={session.id}>
            <SessionRow title={dayLabel(session.date)} detail={countsLine(session)} href={ROUTES.session(session.id)} tag={tagOf(session)} />
          </li>
        ))}
      </ul>
    </PageScreen>
  );
}
