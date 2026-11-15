'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { isLocked } from '@/client/entitlement';
import { todayISO } from '@/client/progressStore';
import { CHILDREN, forChild } from '@/components/child';
import { Art, Button, LastSessionCard, Logo, Pattern, Portrait, SplitScreen, WeekStrip, type Pose, type WeekDay } from '@/components/kit';
import { StreakRow } from '@/components/screens/today/StreakRow';
import { todayState, type TodayState } from '@/components/screens/today/todayState';
import { WeekCheckIn } from '@/components/screens/today/WeekCheckIn';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/hooks/useSessions';
import { PLAN_DAYS, planDay } from '@/lib/progress/plan';
import { monthGrid, planDayOf, streakOf } from '@/lib/progress/sessions';
import { ROUTES } from '@/lib/routes';
import type { PartnerId, SavedSession } from '@/lib/types';
import { countsLine, whenLabel } from '../labels';

/** The local day is read on this device only. The server and the first paint get null, so nothing can mismatch. */
const never = () => () => {};
const noDay = () => null;

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** This week, Monday to Sunday, as the pegs of the week strip. A played day opens the last session of that day. */
function weekOf(sessions: readonly SavedSession[], today: string): WeekDay[] {
  const [year, month] = today.split('-').map(Number);
  const week = monthGrid(sessions, year, month - 1, today).find((row) => row.some((day) => day.isToday)) ?? [];
  // Oldest first, so the last session of a day is the one that stays.
  const lastOfDay = new Map(sessions.map((s) => [s.date, s.id]));
  return week.map((day, i) => {
    const played = day.sessions > 0;
    const id = lastOfDay.get(day.date);
    return {
      date: day.date,
      label: WEEKDAYS[i][0],
      name: `${WEEKDAYS[i]}, ${played ? 'played' : 'not played'}`,
      played,
      today: day.isToday,
      href: played && id ? ROUTES.session(id) : undefined,
    };
  });
}

/** The child as drawn for each Today: playing (47:665), jumping when the day is done (47:749), waving otherwise. */
function poseFor(kind: TodayState['kind'], partner: PartnerId): Pose {
  if (kind === 'done') return 'body-jumping';
  if (kind === 'today') return partner === 'mia' ? 'body-blocks' : 'body-car';
  return 'body-waving';
}

/**
 * Today (Figma row 47:661, desktop 54:137): the practice partner, the plan day counted from the first saved session
 * (planDayOf, the same day the daily session opens), the way into the daily five minutes, the streak, this week and
 * the last session. Four more faces of the same screen, all read from what is saved on this device:
 * - nothing saved yet: says so and offers a first round (or the five minutes, with access);
 * - the plan is locked (47:842): the plan day, the way to unlock it and a free round;
 * - done for today (47:749): the review of today's session, the streak, this week, the weekly check-in and
 *   one line about tomorrow;
 * - welcome back (62:1176): the last session is more than a day ago.
 */
export default function TodayPage() {
  const { profile, ready: profileReady } = useProfile();
  const { sessions, ready: sessionsReady } = useSessions();
  const { entitlement, ready: entitlementReady } = useEntitlement();
  const today = useSyncExternalStore(never, todayISO, noDay);

  if (!profileReady || !sessionsReady || !entitlementReady || today === null) {
    return (
      <SplitScreen embedded picture={null}>
        {null}
      </SplitScreen>
    );
  }

  const partner = profile.partner;
  const state = todayState(sessions, today, entitlement);
  const day = planDay(planDayOf(sessions, today));
  const week = weekOf(sessions, today);
  const streak = streakOf(sessions, today);
  const last = sessions.at(-1);

  const title: Record<TodayState['kind'], string> = {
    empty: 'No sessions yet.',
    locked: forChild(day.title, partner),
    done: 'Done for today.',
    back: 'Welcome back.',
    today: forChild(day.title, partner),
  };

  const streakRow = streak.days > 0 ? <StreakRow days={streak.days} href={ROUTES.streak} /> : null;

  let action: ReactNode;
  let below: ReactNode = null;
  switch (state.kind) {
    case 'empty':
      action = isLocked('daily', entitlement) ? (
        <Button href={ROUTES.start} fullWidth>
          Play your first round
        </Button>
      ) : (
        <Button href={ROUTES.daily} fullWidth>
          Start five minutes
        </Button>
      );
      break;
    case 'locked':
      action = (
        // The quiet way in sits right under the pill, and the week follows it closely (47:842).
        <div className="flex flex-col items-stretch gap-[2px]">
          <Button href={ROUTES.pricing} fullWidth>
            Unlock the plan
          </Button>
          <Button href={ROUTES.practiceRound} variant="ghost" fullWidth className="-mb-[16px]">
            Practice a free round
          </Button>
        </div>
      );
      below = <WeekStrip days={week} />;
      break;
    case 'done':
      action = (
        <Button href={ROUTES.session(state.session.id)} fullWidth>
          Review today’s session
        </Button>
      );
      below = (
        <div className="flex flex-col gap-[16px]">
          {streakRow}
          <WeekStrip days={week} />
          <WeekCheckIn today={today} monday={week[0]?.date ?? today} className="mt-[4px]" />
        </div>
      );
      break;
    case 'back':
      action = (
        <Button href={ROUTES.daily} fullWidth>
          Start five minutes
        </Button>
      );
      below = <WeekStrip days={week} />;
      break;
    case 'today':
      action = (
        <Button href={ROUTES.daily} fullWidth>
          Start five minutes
        </Button>
      );
      below = (
        <div className="flex flex-col gap-[16px]">
          {streakRow}
          <WeekStrip days={week} />
          {last && <LastSessionCard when={whenLabel(last.date, today)} headline={`${countsLine(last)}.`} href={ROUTES.session(last.id)} />}
        </div>
      );
      break;
  }

  return (
    <SplitScreen
      embedded
      rest="bottom"
      pattern={
        <>
          <Pattern kind="reps" className="lg:[--pattern-size:1440px]" />
          {/* Desktop only (54:137): two toys in the upper corners of the block. */}
          <Art name="ball" size={80} className="absolute top-[96px] left-[48px] hidden size-[80px] object-contain lg:block" />
          <Art name="stacker" size={80} className="absolute top-[156px] right-[40px] hidden size-[80px] object-contain lg:block" />
        </>
      }
      bar={<Logo tone="white" className="px-[8px] lg:hidden" />}
      picture={
        <Portrait
          partner={partner}
          pose={poseFor(state.kind, partner)}
          size={420}
          alt={CHILDREN[partner].name}
          priority
          className="size-[212px] lg:size-[420px]"
        />
      }
      action={action}
      below={below}
    >
      <p className="text-label text-gray">{state.kind === 'empty' ? 'Today' : `Day ${day.day} of ${PLAN_DAYS}`}</p>
      <h1 className="mt-[6px] text-title lg:text-title-xl">{title[state.kind]}</h1>
      {state.kind === 'done' && <p className="mt-[8px] text-body text-gray">{forChild(day.teaser, partner)}</p>}
    </SplitScreen>
  );
}
