import { masteryShare, skillTrend, type Progress } from '@/lib';
import { TrendChart } from './TrendChart';

const METERS = [
  { key: 'specific_praise', label: 'Praise', color: 'bg-sun' },
  { key: 'reflection', label: 'Reflect', color: 'bg-sky' },
  { key: 'description', label: 'Describe', color: 'bg-leaf' },
] as const;

/** "Your skill": the latest day against the clinic norm, then the trend. `span` is the chart's room in days. */
export function SkillCard({ progress, span }: { progress: Progress; span?: number }) {
  const share = masteryShare(progress);
  const trend = skillTrend(progress);

  return (
    <section aria-labelledby="skill-h" className="sticker bg-[#fffaf0] p-4">
      <h2 id="skill-h" className="font-display text-xl font-semibold">
        Your <span className="italic text-tomato">skill</span>
      </h2>
      <p className="mt-1 text-sm text-ink-soft">How close your latest day is to the clinic norm: 10 of each in five minutes. A shorter round is not scaled up.</p>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {METERS.map((m) => {
          // null means "not measured" (reflections after a day of live play), which is not zero.
          const value = share[m.key];
          const pct = value === null ? null : Math.round(value * 100);
          return (
            <div key={m.key}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold uppercase tracking-wide">{m.label}</span>
                <span className="font-display text-lg font-semibold tabular-nums">{pct === null ? '—' : `${pct}%`}</span>
              </div>
              {pct === null ? (
                <p className="mt-1 text-[11px] leading-tight text-ink-soft">Not counted in live play</p>
              ) : (
                <div
                  className="mt-1 h-3 overflow-hidden rounded-full border-2 border-ink bg-[#fffdf8]"
                  role="meter"
                  aria-label={`${m.label}, share of the clinic norm`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                >
                  <div className={`h-full ${m.color}`} style={{ width: `${pct}%`, transition: 'width 500ms ease' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className={`mt-3 rounded-full border-2 border-ink/70 px-4 py-1.5 text-sm ${share.avoidOk ? 'bg-[#fffdf8]' : 'bg-sand'}`}>
        {share.avoidOk
          ? 'Questions, commands and corrections stayed within the clinic pace.'
          : 'Next to swap: a few questions and commands, traded for descriptions.'}
      </p>

      <div className="mt-4">
        <TrendChart points={trend} span={span} />
        {trend.length === 1 && (
          <p className="mt-2 text-sm text-ink-soft">One day so far. The line grows with every day you play.</p>
        )}
      </div>
    </section>
  );
}
