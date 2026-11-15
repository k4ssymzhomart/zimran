import { ArrowRight, Check } from '@/components/Icons';
import { masteryShare, skillTrend, type Progress } from '@/lib';
import { TrendChart } from './TrendChart';

const METERS = [
  { key: 'specific_praise', label: 'Praise', color: 'bg-violet' },
  { key: 'reflection', label: 'Reflect', color: 'bg-reflect' },
  { key: 'description', label: 'Describe', color: 'bg-describe' },
] as const;

/** "Your skill": the latest day against the clinic norm, then the trend. `span` is the chart's room in days. */
export function SkillCard({ progress, span }: { progress: Progress; span?: number }) {
  const share = masteryShare(progress);
  const trend = skillTrend(progress);

  return (
    <section aria-labelledby="skill-h" className="card enter d2 p-5 sm:p-7">
      <h2 id="skill-h" className="title text-[24px] text-fg">
        Your skill
      </h2>
      <p className="mt-1.5 text-[15px] leading-snug text-fg-soft">Your latest day against the clinic norm of 10 each in five minutes.</p>

      <div className="mt-6 grid grid-cols-3 gap-4 sm:gap-6">
        {METERS.map((m) => {
          // null means "not measured" (reflections after a day of live play), which is not zero.
          const value = share[m.key];
          const pct = value === null ? null : Math.round(value * 100);
          return (
            <div key={m.key} className="min-w-0">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-fg-2">
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${m.color}`} />
                {m.label}
              </p>
              {pct === null ? (
                <p className="mt-2 text-[13px] leading-snug text-fg-soft">Not counted in live play</p>
              ) : (
                <>
                  <p className="mt-2 text-[30px] font-extrabold leading-none tabular-nums tracking-[-0.04em] text-fg sm:text-[36px]">
                    {pct}
                    <span className="ml-0.5 text-[17px] font-bold tracking-normal text-fg-faint sm:text-[20px]">%</span>
                  </p>
                  <div
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"
                    role="meter"
                    aria-label={`${m.label}, share of the clinic norm`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                  >
                    <div className={`h-full rounded-full ${m.color}`} style={{ width: `${pct}%`, transition: 'width 500ms var(--ease-out-quint)' }} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Sentences to swap get a calm row: slate, never red. */}
      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3.5">
        <span
          aria-hidden="true"
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${share.avoidOk ? 'bg-violet text-white' : 'bg-surface-2 text-fg-2'}`}
        >
          {share.avoidOk ? <Check size={14} strokeWidth={3} /> : <ArrowRight size={14} strokeWidth={2.6} />}
        </span>
        <p className="text-[14px] leading-snug text-fg-2">
          {share.avoidOk
            ? 'Questions, commands and corrections stayed within the clinic pace.'
            : 'Next: trade a few questions and commands for descriptions.'}
        </p>
      </div>

      <div className="mt-6 border-t border-stroke pt-6">
        <TrendChart points={trend} span={span} />
        {trend.length === 1 && <p className="mt-3 text-[13px] text-fg-soft">One day so far. The line grows as you play.</p>}
      </div>
    </section>
  );
}
