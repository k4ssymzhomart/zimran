import Image from 'next/image';
import { dayNumber, PLAN_DAYS, planDay, streak, type Progress } from '@/lib';
import { useChild } from '@/components/child';

const HERO_BACKGROUND = [
  'radial-gradient(110% 70% at 100% 0%, rgb(255 255 255 / 0.20), transparent 58%)',
  'radial-gradient(90% 80% at 0% 100%, rgb(46 155 255 / 0.34), transparent 62%)',
  'linear-gradient(160deg, #6b68ff 0%, #5653fe 46%, #4534bb 100%)',
].join(', ');

/** The violet hero, or a quiet white card when another block on the screen holds the one action. */
const TONE = {
  violet: {
    card: 'text-white shadow-[0_24px_48px_-24px_rgb(69_52_187/0.75)]',
    soft: 'text-white/70',
    status: 'text-white/80',
    pill: 'bg-white/15 ring-1 ring-inset ring-white/20',
    next: 'bg-white/10 ring-1 ring-inset ring-white/15',
    teaser: 'text-white',
  },
  quiet: {
    card: 'card text-fg',
    soft: 'text-fg-soft',
    status: 'text-fg-soft',
    pill: 'bg-violet/16 text-lilac',
    next: 'bg-surface-2',
    teaser: 'text-fg-2',
  },
} as const;

/**
 * Today: day N of 28 and the week, today's idea as the headline, the streak, and what tomorrow brings.
 * `art` adds the 3D calendar when nothing else on the screen carries an object.
 */
export function PlanHeader({
  progress,
  today,
  art = false,
  as: Title = 'h1',
  tone = 'violet',
}: {
  progress: Progress;
  today: string;
  art?: boolean;
  /** h2 when another headline leads the page (the empty state). */
  as?: 'h1' | 'h2';
  tone?: keyof typeof TONE;
}) {
  const { t: tr } = useChild();
  const t = TONE[tone];
  const day = dayNumber(progress, today);
  const plan = planDay(day);
  const run = streak(progress, today);
  const inPlan = day <= PLAN_DAYS;

  return (
    <section
      aria-labelledby="plan-h"
      className={`enter relative overflow-hidden rounded-[1.75rem] p-6 sm:p-8 ${t.card}`}
      style={tone === 'violet' ? { background: HERO_BACKGROUND } : undefined}
    >
      {art && (
        <Image
          src="/art/plan.png"
          alt=""
          aria-hidden="true"
          width={136}
          height={136}
          className="pointer-events-none absolute -right-2 -top-1 h-[104px] w-[104px] drop-shadow-[0_16px_22px_rgba(20,10,80,0.35)] sm:right-2 sm:top-2 sm:h-[136px] sm:w-[136px]"
        />
      )}

      <p className="text-[15px] font-semibold tracking-[-0.01em]" aria-live="polite">
        {inPlan ? `Day ${day} of ${PLAN_DAYS}` : `Day ${day}`}
      </p>
      <p className={`mt-0.5 text-[14px] ${t.soft}`}>{inPlan ? `Week ${plan.week}: ${plan.theme}` : 'Phase 2'}</p>

      <Title id="plan-h" className="title mt-8 text-[34px] sm:mt-10 sm:text-[44px]">
        {tr(plan.title)}
      </Title>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-semibold ${t.pill}`}>
          {run.days > 0 ? `${run.days}-day streak` : 'Streak starts today'}
        </span>
        <span className={`text-[15px] ${t.status}`}>{run.activeToday ? 'Today’s play is done.' : 'Today’s five minutes are still open.'}</span>
      </div>
      {run.freeDayUsed && <p className={`mt-2 text-[14px] ${t.soft}`}>One free day used. The streak goes on.</p>}

      <div className={`mt-6 rounded-2xl px-4 py-3.5 ${t.next}`}>
        <p className={`text-[15px] leading-snug ${t.teaser}`}>{tr(plan.teaser)}</p>
        {progress.anchor && <p className={`mt-1 text-[14px] ${t.soft}`}>Your five minutes: {progress.anchor.toLowerCase()}.</p>}
      </div>
    </section>
  );
}
