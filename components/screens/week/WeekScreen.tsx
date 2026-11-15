'use client';

import { useState } from 'react';
import type { Entitlement } from '@/client/entitlement';
import { CHILDREN, forChild } from '@/components/child';
import { Art, Button, cn, Icon, Pattern, Portrait, type ArtName } from '@/components/kit';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/hooks/useSessions';
import { PLAN_DAYS, planDay, type PlanDay } from '@/lib/progress/plan';
import { bestStreakOf, planDayOf } from '@/lib/progress/sessions';
import type { PartnerId, SavedSession } from '@/lib/types';
import { dayMonth } from '../streak/dates';
import { backToToday, ColumnScreen, startAction, useToday } from '../streak/shared';
import { perMinute, perSession, planDays, short, shownWeek, skillOf, SKILLS, type PlanDays } from './numbers';

const reps = <Pattern kind="reps" />;

/** The object of each plan week's skill, for the card of the week ahead. */
const THEME_ART: Record<PlanDay['theme'], ArtName> = {
  Follow: 'follow',
  Describe: 'describe',
  Reflect: 'reflect',
  Praise: 'praise',
  Keep: 'medal-check',
};

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Week and finish (Figma 62:1272, 62:1344): the week in numbers, per session against the week before, and the
 * week ahead. Once the 28 days of the plan have run, the screen opens on them: day 1 against the last day played.
 * A pushed screen: its own way back, no tab bar.
 */
export function WeekScreen() {
  const { sessions, ready } = useSessions();
  const { profile, ready: profileReady } = useProfile();
  const { entitlement, ready: accessReady } = useEntitlement();
  const today = useToday();
  const [weekOpen, setWeekOpen] = useState(false);

  if (!ready || !profileReady || !accessReady || today === null) {
    return <ColumnScreen pattern={reps} bar={backToToday} />;
  }

  const plan = planDays(sessions);
  if (plan && planDayOf(sessions, today) >= PLAN_DAYS && !weekOpen) {
    return <YourDays plan={plan} sessions={sessions} partner={profile.partner} entitlement={entitlement} onWeek={() => setWeekOpen(true)} />;
  }
  return <WeekView sessions={sessions} today={today} partner={profile.partner} entitlement={entitlement} />;
}

interface WeekViewProps {
  sessions: readonly SavedSession[];
  today: string;
  partner: PartnerId;
  entitlement: Entitlement;
}

/** 13.1: what moved this week, the skill of the plan week first. */
function WeekView({ sessions, today, partner, entitlement }: WeekViewProps) {
  const day = planDay(planDayOf(sessions, today));
  const week = shownWeek(sessions, today);
  // The first day of a plan week, not yet played: the next session starts that week.
  const startsWeek = !sessions.some((s) => s.date === today) && day.day > 1 && day.day <= PLAN_DAYS && (day.day - 1) % 7 === 0;
  const aheadWeek = startsWeek ? day.week : day.week + 1;
  const ahead = aheadWeek <= PLAN_DAYS / 7 ? planDay((aheadWeek - 1) * 7 + 1) : null;
  const start = startAction(sessions.length > 0, entitlement, startsWeek ? `Start week ${day.week}` : 'Start five minutes');
  const weekName = day.week <= PLAN_DAYS / 7 ? `Week ${day.week}, ${forChild(planDay((day.week - 1) * 7 + 1).title, partner)}` : `Week ${day.week}`;

  const action = (
    <Button href={start.href} fullWidth>
      {start.label}
    </Button>
  );
  const picture = <Art name="summit" size={128} priority className="size-[112px]" />;

  if (week.now.sessions === 0) {
    return (
      <ColumnScreen pattern={reps} bar={backToToday} picture={picture} action={action}>
        <p className="text-label text-gray">{weekName}</p>
        <h1 className="mt-[6px] text-title">{sessions.length === 0 ? 'No sessions yet.' : 'No sessions this week.'}</h1>
      </ColumnScreen>
    );
  }

  const focus = SKILLS.find((skill) => skill.key === skillOf(day.focus)) ?? SKILLS[0];
  const now = perSession(week.now, focus.key) ?? 0;
  const before = perSession(week.before, focus.key);
  const headline =
    before === null
      ? `${count(week.now.sessions, 'session', 'sessions')} ${week.current ? 'this week' : 'last week'}.`
      : short(before) === short(now)
        ? `${focus.noun} stayed at ${short(now)}.`
        : `${focus.noun} went from ${short(before)} to ${short(now)}.`;
  const caption =
    before === null ? 'Per session.' : week.current ? 'Per session, last week and this week.' : 'Per session, the week before and last week.';

  return (
    <ColumnScreen pattern={reps} bar={backToToday} picture={picture} action={action}>
      <p className="text-label text-gray">{weekName}</p>
      <h1 className="mt-[6px] text-title">{headline}</h1>
      <p className="mt-[8px] text-small text-gray">{caption}</p>

      <ul className="mt-[8px] divide-y divide-line border-b border-line">
        {SKILLS.map(({ key, label }) => {
          const was = perSession(week.before, key);
          const is = perSession(week.now, key) ?? 0;
          return (
            <li key={key} className="flex h-[47px] items-center justify-between gap-[12px]">
              <span className="text-body text-ink">{label}</span>
              <span className="flex items-center gap-[10px]">
                {was !== null && (
                  <>
                    <span className="text-body text-gray">{short(was)}</span>
                    <span className="sr-only">to</span>
                    <Icon name="arrow-right" size={16} className="text-faint" />
                  </>
                )}
                <span className="min-w-[32px] text-right text-body-strong text-ink">{short(is)}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {ahead && (
        <div className="mt-[8px] flex items-center gap-[14px] rounded-[16px] bg-lilac px-[16px] py-[14px]">
          <Art name={THEME_ART[ahead.theme]} size={48} className="size-[40px]" />
          <div className="flex min-w-0 flex-col">
            <span className="text-small text-gray">Week {ahead.week}</span>
            <span className="text-body-strong text-ink">{forChild(ahead.title, partner)}</span>
          </div>
        </div>
      )}
    </ColumnScreen>
  );
}

interface YourDaysProps {
  plan: PlanDays;
  sessions: readonly SavedSession[];
  partner: PartnerId;
  entitlement: Entitlement;
  onWeek(): void;
}

/** 13.2: the 28 days as played, day 1 against the last day played, per minute. */
function YourDays({ plan, sessions, partner, entitlement, onWeek }: YourDaysProps) {
  const start = startAction(true, entitlement, 'Keep my five minutes');
  const best = bestStreakOf(sessions);
  return (
    <ColumnScreen
      pattern={<Pattern kind="bars" />}
      bar={backToToday}
      rest="bottom"
      picture={
        <Portrait partner={partner} pose="body-jumping" size={260} alt={CHILDREN[partner].name} priority className="size-[236px] object-contain object-bottom" />
      }
      action={
        <div className="flex flex-col gap-[8px]">
          <Button href={start.href} fullWidth>
            {start.label}
          </Button>
          <Button variant="ghost" fullWidth onClick={onWeek}>
            This week in numbers
          </Button>
        </div>
      }
    >
      <h1 className="text-title">
        {PLAN_DAYS} days, {count(plan.sessions.length, 'session', 'sessions')}.
      </h1>
      <div className="mt-[16px] grid grid-cols-2 gap-[12px]">
        <DayCard title="Day 1, per minute" day={plan.first} />
        <DayCard violet title={`Day ${plan.last.day}`} day={plan.last} />
      </div>
      <dl className="mt-[12px] divide-y divide-line border-b border-line">
        <Row label="Clinic pace met" value={count(plan.paceDays, 'day', 'days')} />
        <Row label="Best run" value={count(best, 'day', 'days')} />
      </dl>
    </ColumnScreen>
  );
}

function DayCard({ title, day, violet = false }: { title: string; day: PlanDays['first']; violet?: boolean }) {
  const soft = violet ? 'text-lilac-2' : 'text-gray';
  return (
    <div className={cn('relative flex flex-col gap-[10px] overflow-hidden rounded-[20px] p-[16px]', violet ? 'bg-violet text-white' : 'border border-line bg-white text-ink')}>
      {violet && <Pattern kind="reps" size={720} />}
      <h2 className="relative text-body-strong">{title}</h2>
      <dl className="relative flex flex-col gap-[6px]">
        {SKILLS.map(({ key, label }) => {
          const rate = perMinute(day.sessions, key);
          return (
            <div key={key} className="flex items-baseline justify-between gap-[8px]">
              <dt className={cn('text-small', soft)}>{label}</dt>
              <dd className="text-body-strong">{rate === null ? '–' : rate.toFixed(1)}</dd>
            </div>
          );
        })}
      </dl>
      <p className={cn('relative mt-auto text-small', soft)}>{dayMonth(day.date)}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-[50px] items-center justify-between">
      <dt className="text-body text-gray">{label}</dt>
      <dd className="text-body-strong text-ink">{value}</dd>
    </div>
  );
}
