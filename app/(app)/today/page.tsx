'use client';

import { useSyncExternalStore } from 'react';
import { todayISO } from '@/client/progressStore';
import { CHILDREN, forChild } from '@/components/child';
import { Button, LastSessionCard, Logo, Pattern, Portrait, SplitScreen, WeekStrip, type WeekDay } from '@/components/kit';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/hooks/useSessions';
import { PLAN_DAYS, planDay } from '@/lib/progress/plan';
import { monthGrid, planDayOf } from '@/lib/progress/sessions';
import { ROUTES } from '@/lib/routes';
import type { SavedSession } from '@/lib/types';
import { countsLine, whenLabel } from '../labels';

/** The local day is read on this device only. The server and the first paint get null, so nothing can mismatch. */
const never = () => () => {};
const noDay = () => null;

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** This week, Monday to Sunday, as the pegs of the week strip. */
function weekOf(sessions: readonly SavedSession[], today: string): WeekDay[] {
  const [year, month] = today.split('-').map(Number);
  const week = monthGrid(sessions, year, month - 1, today).find((row) => row.some((day) => day.isToday)) ?? [];
  return week.map((day, i) => ({
    date: day.date,
    label: WEEKDAYS[i][0],
    name: `${WEEKDAYS[i]}, ${day.sessions > 0 ? 'played' : 'not played'}`,
    played: day.sessions > 0,
    today: day.isToday,
  }));
}

/**
 * Today (Figma 47:665, 54:137): the practice partner, the plan day counted from the first saved session, the way
 * into the daily five minutes, this week and the last session. Until a session is saved it says so and offers a
 * first round.
 * TODO: the streak row and the done-for-today and locked states.
 */
export default function TodayPage() {
  const { profile, ready: profileReady } = useProfile();
  const { sessions, ready: sessionsReady } = useSessions();
  const today = useSyncExternalStore(never, todayISO, noDay);

  if (!profileReady || !sessionsReady || today === null) {
    return (
      <SplitScreen embedded picture={null}>
        {null}
      </SplitScreen>
    );
  }

  const partner = CHILDREN[profile.partner];
  const last = sessions.at(-1);
  const day = planDay(planDayOf(sessions, today));

  return (
    <SplitScreen
      embedded
      rest="bottom"
      pattern={<Pattern kind="reps" className="lg:[--pattern-size:1440px]" />}
      bar={<Logo tone="white" className="px-[8px] lg:hidden" />}
      picture={
        <Portrait partner={profile.partner} pose="body-waving" size={420} alt={partner.name} priority className="size-[212px] lg:size-[420px]" />
      }
      action={
        <Button href={last ? ROUTES.daily : ROUTES.start} fullWidth>
          {last ? 'Start five minutes' : 'Start a round'}
        </Button>
      }
      below={
        last && (
          <div className="flex flex-col gap-[16px]">
            <WeekStrip days={weekOf(sessions, today)} />
            <LastSessionCard when={whenLabel(last.date, today)} headline={`${countsLine(last)}.`} href={ROUTES.session(last.id)} />
          </div>
        )
      }
    >
      <p className="text-label text-gray">{last ? `Day ${day.day} of ${PLAN_DAYS}` : 'Today'}</p>
      <h1 className="mt-[6px] text-title lg:text-title-xl">{last ? forChild(day.title, profile.partner) : 'No sessions yet.'}</h1>
    </SplitScreen>
  );
}
