'use client';

import { useState } from 'react';
import { countsLine, dayLabel } from '@/app/(app)/labels';
import { Art, Button, MonthCalendar, Pattern, SessionRow, type TagTone } from '@/components/kit';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useSessions } from '@/hooks/useSessions';
import { PLAN_DAYS } from '@/lib/progress/plan';
import { bestStreakOf, monthGrid, planDayOf, streakOf, type Streak } from '@/lib/progress/sessions';
import { ROUTES } from '@/lib/routes';
import type { SavedSession } from '@/lib/types';
import { monthName, shiftMonth } from './dates';
import { backToToday, ColumnScreen, startAction, useToday } from './shared';

const pattern = <Pattern kind="reps" />;

/** At most one tag on a row, as on Progress: a live session says so, a session at the clinic pace says so. */
function tagOf(session: SavedSession): { label: string; tone: TagTone } | undefined {
  if (session.kind === 'live') return { label: 'Live', tone: 'quiet' };
  return session.met ? { label: 'Pace met', tone: 'skill' } : undefined;
}

/**
 * The free-day rule as streakOf counts it: one missed day in any seven is skipped and the streak goes on;
 * a second miss inside those seven days ends it. While today is still open the count runs to yesterday.
 */
function freeDayLine({ days, freeDayUsed, activeToday }: Streak): string {
  if (days === 0) return 'Play today to start a streak. One missed day in any seven is free.';
  if (freeDayUsed) return 'Free day used. A second missed day within seven days starts the count over.';
  if (!activeToday) return 'Today is still open. One missed day in any seven is free.';
  return 'One missed day in any seven is free: the streak goes on.';
}

/**
 * Streak (Figma 57:1145, 57:1348): days in a row, this month's calendar of play, the best streak and the plan day.
 * A played day opens its sessions under the calendar. A pushed screen: its own way back, no tab bar.
 */
export function StreakScreen() {
  const { sessions, ready } = useSessions();
  const { entitlement, ready: accessReady } = useEntitlement();
  const today = useToday();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  if (!ready || !accessReady || today === null) {
    return <ColumnScreen pattern={pattern} bar={backToToday} />;
  }

  const medal = <Art name="medal-flame" size={128} priority className="size-[112px]" />;

  if (sessions.length === 0) {
    const start = startAction(false, entitlement);
    return (
      <ColumnScreen
        pattern={pattern}
        bar={backToToday}
        picture={medal}
        action={
          <Button href={start.href} fullWidth>
            {start.label}
          </Button>
        }
      >
        <p className="text-label text-gray">Streak</p>
        <h1 className="mt-[6px] text-title">No sessions yet.</h1>
        <p className="mt-[12px] text-body text-gray">Each day you play adds one. One missed day in any seven is free.</p>
      </ColumnScreen>
    );
  }

  const streak = streakOf(sessions, today);
  const best = bestStreakOf(sessions);
  const thisMonth = today.slice(0, 7);
  const month = shiftMonth(thisMonth, offset);
  const [year, m] = month.split('-').map(Number);
  const days = monthGrid(sessions, year, m - 1, today)
    .flat()
    .filter((day) => day.inMonth);
  const played = days.filter((day) => day.sessions > 0).map((day) => day.date);
  const dotted = days.filter((day) => day.met).map((day) => day.date);
  const monthSessions = days.reduce((sum, day) => sum + day.sessions, 0);
  const firstMonth = sessions.reduce((min, s) => (s.date < min ? s.date : min), sessions[0].date).slice(0, 7);
  const open = selected ? sessions.filter((s) => s.date === selected) : [];

  const goTo = (by: number) => {
    setOffset(offset + by);
    setSelected(null);
  };

  return (
    <ColumnScreen
      pattern={pattern}
      bar={backToToday}
      picture={
        <div className="flex items-center gap-[20px]">
          {medal}
          <h1 className="flex flex-col">
            <span className="text-number">{streak.days}</span>
            <span className="text-body-strong">{streak.days === 1 ? 'day in a row' : 'days in a row'}</span>
          </h1>
        </div>
      }
    >
      <MonthCalendar
        month={month}
        played={played}
        dotted={dotted}
        today={today}
        selected={selected ?? undefined}
        onPrev={month > firstMonth ? () => goTo(-1) : undefined}
        onNext={offset < 0 ? () => goTo(1) : undefined}
        onSelectDay={(date) => setSelected(date === selected ? null : date)}
      />

      {open.length > 0 ? (
        <ul className="mt-[20px] flex flex-col gap-[8px]" aria-label={`Sessions on ${dayLabel(open[0].date)}`}>
          {open.map((session, i) => (
            <li key={session.id} className="rounded-[16px] bg-mist px-[16px]">
              <SessionRow
                title={open.length > 1 ? `${dayLabel(session.date)}, session ${i + 1}` : dayLabel(session.date)}
                detail={countsLine(session)}
                href={ROUTES.session(session.id)}
                tag={tagOf(session)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <dl className="mt-[20px] grid grid-cols-3 gap-[12px]">
            <Stat value={String(best)} label="Best streak" />
            <Stat value={String(monthSessions)} label={offset === 0 ? 'Sessions this month' : `Sessions in ${monthName(month)}`} />
            <Stat value={`${planDayOf(sessions, today)} of ${PLAN_DAYS}`} label="Plan day" />
          </dl>
          <p className="mt-[16px] text-small text-gray">{freeDayLine(streak)}</p>
        </>
      )}
    </ColumnScreen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    // The label comes first for screen readers; the number stands on top, level across the row.
    <div className="flex flex-col-reverse justify-end gap-[4px]">
      <dt className="text-small text-gray">{label}</dt>
      <dd className="text-heading text-ink">{value}</dd>
    </div>
  );
}
