'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { clock, countsLine, dayLabel, whenLabel } from '@/app/(app)/labels';
import { isLocked } from '@/client/entitlement';
import { todayISO } from '@/client/progressStore';
import {
  Art,
  Button,
  ChipGroup,
  MonthCalendar,
  PageScreen,
  Pattern,
  Portrait,
  Rings,
  Segmented,
  SessionRow,
  Tag,
  cn,
  monthLabel,
  type ChipOption,
  type RingStat,
  type SegmentedOption,
  type TagTone,
} from '@/components/kit';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/hooks/useSessions';
import { FEATURES } from '@/lib/features';
import { streakOf, weekNumbers } from '@/lib/progress/sessions';
import { ROUTES } from '@/lib/routes';
import type { SavedSession, SessionKind } from '@/lib/types';
import {
  CLINIC_PACE,
  firstVisitRows,
  fourWeeks,
  latestStats,
  milestonesOf,
  trendLine,
  type Milestone,
  type TrendStat,
  type Week,
} from './numbers';

/** The local day is read on this device only. The server and the first paint get null, so nothing can mismatch. */
const never = () => () => {};
const noDay = () => null;

type View = 'trends' | 'sessions';
type Filter = 'all' | 'live';

const VIEWS: ReadonlyArray<SegmentedOption<View>> = [
  { value: 'trends', label: 'Trends' },
  { value: 'sessions', label: 'Sessions' },
];

/** "Recorded" joins these only when recordings are switched on. */
const FILTERS: ReadonlyArray<ChipOption<Filter>> = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
];

const KIND: Record<SessionKind, string> = {
  first_before: 'First round',
  first_after: 'Round two',
  daily: 'Daily session',
  practice: 'Practice',
  live: 'Live',
};

/** At most one tag on a row: a live session says so, a session at the clinic pace says so. */
function tagOf(session: SavedSession): { label: string; tone: TagTone } | undefined {
  if (session.kind === 'live') return { label: 'Live', tone: 'quiet' };
  return session.met ? { label: 'Pace met', tone: 'skill' } : undefined;
}

/** The gray line of a session row: "Typed. 9 skills, 4 to swap", "13 skills, 2 to swap. Reflections not counted". */
function detailOf(session: SavedSession): string {
  const counts = countsLine(session);
  if (session.kind === 'first_before') return `First round. ${counts}`;
  if (session.kind === 'first_after') return `Round two. ${counts}`;
  if (session.kind === 'live') return `${counts}. Reflections not counted`;
  return session.input === 'typed' ? `Typed. ${counts}` : counts;
}

/** The kind column of the desktop table: a typed practice reads "Typed", as drawn. */
function kindOf(session: SavedSession): string {
  if ((session.kind === 'daily' || session.kind === 'practice') && session.input === 'typed') return 'Typed';
  return KIND[session.kind];
}

/** Newest first, under "This week", "Last week" and "Earlier". */
function byWeek(sessions: readonly SavedSession[], today: string): Array<{ label: string; sessions: SavedSession[] }> {
  const { thisWeek, lastWeek } = weekNumbers(sessions, today);
  const groups = [
    { label: 'This week', sessions: [] as SavedSession[] },
    { label: 'Last week', sessions: [] as SavedSession[] },
    { label: 'Earlier', sessions: [] as SavedSession[] },
  ];
  for (const s of [...sessions].reverse()) {
    groups[s.date >= thisWeek.from ? 0 : s.date >= lastWeek.from ? 1 : 2].sessions.push(s);
  }
  return groups.filter((g) => g.sessions.length > 0);
}

/** A ring is full at the clinic pace of ten in five minutes. Reflections in live play: a dash, never a zero. */
function ringOf(stat: TrendStat): RingStat {
  if (stat.value === null) return { value: '–', progress: 0 };
  return { value: stat.value, progress: Math.min(1, stat.value / CLINIC_PACE), delta: stat.delta };
}

/**
 * Progress (Figma 47:1125 trends, 47:1270 sessions, 47:1375 no sessions yet; 60:223 from 1024px). Every number is
 * read from the sessions saved on this device. Phones switch between Trends and Sessions; desktop shows both.
 * Left out: "Hard moments, your log", which has no saved data behind it yet.
 */
export function ProgressScreen() {
  const { sessions, ready } = useSessions();
  const { entitlement, ready: entitlementReady } = useEntitlement();
  const { profile, ready: profileReady } = useProfile();
  const today = useSyncExternalStore(never, todayISO, noDay);
  const [view, setView] = useState<View>('trends');
  const [filter, setFilter] = useState<Filter>('all');

  if (!ready || !entitlementReady || !profileReady || today === null) {
    return (
      <PageScreen embedded title="Progress">
        {null}
      </PageScreen>
    );
  }

  const switcher = <Segmented<View> label="View" options={VIEWS} value={view} onChange={setView} fullWidth />;

  if (sessions.length === 0) {
    // Nothing was ever played: the free first round, or today's session when access is already paid for.
    const paid = !isLocked('daily', entitlement);
    return (
      <PageScreen embedded title="Progress">
        <div className="lg:hidden">{switcher}</div>
        <div className="flex flex-1 flex-col items-center justify-center gap-[16px] px-[8px] py-[40px]">
          <div className="relative flex size-[148px] items-center justify-center overflow-clip rounded-[36px] bg-violet">
            <Pattern kind="reps" size={720} />
            <Art name="clipboard" size={92} className="relative" />
          </div>
          <p className="text-center text-title">No sessions yet.</p>
        </div>
        <Button href={paid ? ROUTES.daily : ROUTES.start} fullWidth className="lg:mx-auto lg:w-[342px]">
          {paid ? 'Start today’s session' : 'Play your first round'}
        </Button>
      </PageScreen>
    );
  }

  const last = sessions[sessions.length - 1];
  const stats = latestStats(sessions);
  const rings = stats && {
    praise: ringOf(stats.praise),
    reflect: ringOf(stats.reflect),
    describe: ringOf(stats.describe),
    swap: { value: stats.swap.value ?? 0, delta: stats.swap.delta },
  };
  const line = trendLine(sessions, today);
  const weeks = fourWeeks(sessions, today);
  const firstVisit = firstVisitRows(sessions);
  const milestones = milestonesOf(sessions);
  const shown = filter === 'live' ? sessions.filter((s) => s.kind === 'live') : sessions;
  const groups = byWeek(shown, today);
  const streak = streakOf(sessions, today).days;
  const month = today.slice(0, 7);
  const played = [...new Set(sessions.map((s) => s.date))];
  const metDays = [...new Set(sessions.filter((s) => s.met).map((s) => s.date))];
  const caption = `${whenLabel(last.date, today)}, at five-minute pace. A full ring is the clinic pace of ten.`;
  const chips = FEATURES.live && <ChipGroup<Filter> label="Show sessions" options={FILTERS} value={filter} onChange={setFilter} />;
  const noneShown = shown.length === 0 && <p className="py-[24px] text-body text-gray">No live sessions yet.</p>;

  return (
    <PageScreen embedded title="Progress">
      {/* Phones: one half at a time. */}
      <div className="flex w-full flex-col gap-[28px] lg:hidden">
        {switcher}
        {view === 'trends' ? (
          <>
            <section className="flex flex-col gap-[14px]">
              <h2 className="text-heading">{line} this week.</h2>
              {rings && <Rings {...rings} size={60} className="justify-between" />}
              <p className="text-small text-gray">{caption}</p>
            </section>
            <section className="flex flex-col gap-[16px]">
              <h2 className="text-heading">Four weeks</h2>
              <WeekChart weeks={weeks} />
              <Legend note="Dashed: clinic norm" />
            </section>
            {firstVisit && (
              <section className="flex flex-col gap-[14px]">
                <h2 className="text-heading">First visit</h2>
                <FirstVisit rows={firstVisit} />
              </section>
            )}
            <section className="flex flex-col gap-[16px]">
              <h2 className="text-heading">Milestones</h2>
              <Milestones items={milestones} className="grid-cols-4" />
            </section>
          </>
        ) : (
          <div className="flex flex-col gap-[16px]">
            {chips}
            {noneShown}
            {groups.map((group) => (
              <section key={group.label} className="flex flex-col">
                <h2 className="text-small-strong text-gray">{group.label}</h2>
                <ul className="divide-y divide-line">
                  {group.sessions.map((s) => (
                    <li key={s.id}>
                      <SessionRow title={dayLabel(s.date)} detail={detailOf(s)} href={ROUTES.session(s.id)} tag={tagOf(s)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* From 1024px: everything at once, in cards (Figma 60:223). */}
      <div className="hidden w-full grid-cols-[minmax(0,780fr)_minmax(0,452fr)] gap-[24px] lg:grid">
        <section className="relative flex min-h-[440px] overflow-clip rounded-[36px] bg-violet p-[40px] text-white">
          <Pattern kind="reps" size={1440} />
          <div className="relative flex min-w-0 flex-1 flex-col justify-between gap-[32px]">
            <div className="flex flex-col gap-[8px]">
              <p className="text-lead">This week</p>
              <h2 className="text-title-xl">{line}.</h2>
            </div>
            <div className="flex flex-col gap-[16px]">
              {rings && <Rings {...rings} size={76} tone="violet" className="gap-[28px]" />}
              <p className="text-small">{caption}</p>
            </div>
          </div>
          <Portrait partner={profile.partner} pose="body-jumping" size={240} alt="" className="relative shrink-0 self-end" />
        </section>

        <section className={CARD}>
          <header className="flex items-center gap-[12px]">
            <Art name="medal-flame" size={44} />
            <div className="flex flex-col">
              <h2 className="text-heading">{streak > 0 ? `${streak} ${streak === 1 ? 'day' : 'days'} in a row` : 'A new day to play'}</h2>
              <p className="text-small text-gray">{monthLabel(month)}</p>
            </div>
          </header>
          <MonthCalendar month={month} played={played} dotted={metDays} today={today} compact hideHeader />
        </section>

        <section className={CARD}>
          <header className="flex flex-wrap items-center justify-between gap-[12px]">
            <h2 className="text-heading">Four weeks</h2>
            <Legend />
          </header>
          <WeekChart weeks={weeks} />
          <p className="text-small text-gray">The dashed line is the clinic pace.</p>
        </section>

        <section className={CARD}>
          <h2 className="text-heading">First visit</h2>
          {firstVisit ? <FirstVisit rows={firstVisit} /> : <p className="text-body text-gray">The first round and round two compare here once both are played.</p>}
        </section>

        <section className={CARD}>
          <header className="flex items-center justify-between gap-[12px]">
            <h2 className="text-heading">Sessions</h2>
            {chips}
          </header>
          {noneShown}
          {shown.length > 0 && <SessionTable sessions={[...shown].reverse()} />}
        </section>

        <section className={CARD}>
          <h2 className="text-heading">Milestones</h2>
          <Milestones items={milestones} wide className="grid-cols-2" />
        </section>
      </div>
    </PageScreen>
  );
}

const CARD = 'flex min-w-0 flex-col gap-[20px] rounded-[36px] border border-line p-[28px]';

/** The weekly mean of each skill at five-minute pace, with the clinic pace dashed across. TODO kit: a trend chart. */
function WeekChart({ weeks }: { weeks: Week[] }) {
  const W = 560;
  const H = 160;
  const values = weeks.flatMap((w) => (w.pace ? [w.pace.praise, w.pace.reflect ?? 0, w.pace.describe] : []));
  const top = Math.max(CLINIC_PACE + 2, Math.ceil(Math.max(0, ...values)) + 1);
  const x = (i: number) => 8 + (i * (W - 16)) / (weeks.length - 1);
  const y = (v: number) => H - 8 - (v * (H - 16)) / top;
  const series: Array<{ name: string; className: string; pick: (w: Week) => number | null }> = [
    { name: 'Describe', className: 'stroke-faint fill-faint', pick: (w) => w.pace?.describe ?? null },
    { name: 'Reflect', className: 'stroke-ink fill-ink', pick: (w) => w.pace?.reflect ?? null },
    { name: 'Praise', className: 'stroke-violet fill-violet', pick: (w) => w.pace?.praise ?? null },
  ];
  const said = weeks
    .map((w) => (w.pace ? `${w.label}: praise ${Math.round(w.pace.praise)}, reflect ${w.pace.reflect === null ? 'not counted' : Math.round(w.pace.reflect)}, describe ${Math.round(w.pace.describe)}` : `${w.label}: no sessions`))
    .join('; ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Each skill per five minutes, by week. ${said}. Clinic pace: ${CLINIC_PACE}.`} className="h-auto w-full">
      <line x1={0} x2={W} y1={y(CLINIC_PACE)} y2={y(CLINIC_PACE)} className="stroke-faint" strokeWidth={1.5} strokeDasharray="4 6" />
      <line x1={0} x2={W} y1={H - 1} y2={H - 1} className="stroke-line" strokeWidth={1} />
      {series.map((s) => {
        const points = weeks.flatMap((w, i) => {
          const v = s.pick(w);
          return v === null ? [] : [{ x: x(i), y: y(v) }];
        });
        return (
          <g key={s.name} className={s.className}>
            {points.length > 1 && <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
            {points.map((p) => (
              <circle key={p.x} cx={p.x} cy={p.y} r={3.5} strokeWidth={0} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function Legend({ note }: { note?: string }) {
  const dot = (name: string, color: string) => (
    <li className="flex items-center gap-[6px]">
      <span aria-hidden="true" className={cn('size-[8px] rounded-full', color)} />
      {name}
    </li>
  );
  return (
    <ul className="flex flex-wrap items-center gap-x-[16px] gap-y-[4px] text-small text-gray">
      {dot('Praise', 'bg-violet')}
      {dot('Reflect', 'bg-ink')}
      {dot('Describe', 'bg-faint')}
      {note && <li className="text-faint">{note}</li>}
    </ul>
  );
}

function FirstVisit({ rows }: { rows: Array<{ delta: string; label: string }> }) {
  return (
    <ul className="flex flex-col gap-[14px]">
      {rows.map((row) => (
        <li key={row.label} className="flex items-start gap-[16px]">
          <span className="w-[48px] shrink-0 text-heading text-violet">{row.delta}</span>
          <span className="pt-[2px] text-body">{row.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Milestones({ items, wide = false, className }: { items: Milestone[]; wide?: boolean; className?: string }) {
  return (
    <ul className={cn('grid gap-[12px]', className)}>
      {items.map((m) => (
        <li key={m.label} className={cn('flex items-center gap-[8px]', wide ? 'flex-row gap-[16px] py-[8px]' : 'flex-col text-center')}>
          <Art name={m.art} size={wide ? 64 : 52} className={cn(!m.done && 'opacity-40')} />
          <span className={cn(wide ? 'text-body-strong' : 'text-small', m.done ? 'text-ink' : 'text-faint')}>
            {m.label}
            <span className="sr-only">{m.done ? ', reached' : ', not yet'}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The desktop list of sessions (Figma 60:223). The date links to the review and the link covers the row. */
function SessionTable({ sessions }: { sessions: SavedSession[] }) {
  const head = 'pb-[12px] text-left text-small text-gray font-normal';
  return (
    <table className="w-full">
      <thead className="border-b border-line">
        <tr>
          <th scope="col" className={head}>Date</th>
          <th scope="col" className={head}>Kind</th>
          <th scope="col" className={head}>Length</th>
          <th scope="col" className={head}>Praise</th>
          <th scope="col" className={head}>Reflect</th>
          <th scope="col" className={head}>Describe</th>
          <th scope="col" className={head}>To swap</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {sessions.map((s) => (
          <tr key={s.id} className="relative h-[64px] text-body">
            <td className="text-body-strong">
              <Link
                href={ROUTES.session(s.id)}
                className="outline-none after:absolute after:inset-0 after:rounded-[12px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-violet"
              >
                {dayLabel(s.date)}
              </Link>
            </td>
            <td>
              <span className="flex items-center gap-[8px]">
                {kindOf(s)}
                {s.kind === 'live' ? <Tag tone="quiet">Beta</Tag> : s.met && <Tag tone="skill">Pace met</Tag>}
              </span>
            </td>
            <td>{clock(s.durationSec)}</td>
            <td>{s.counts.specific_praise}</td>
            <td>{s.kind === 'live' ? '–' : s.counts.reflection}</td>
            <td>{s.counts.description}</td>
            <td>{s.counts.avoid}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
