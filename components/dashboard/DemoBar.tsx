import { DemoBadge } from '@/components/Bits';
import { Mia } from '@/components/Mia';
import type { DemoDay, Face } from '@/lib';
import { useChild } from '@/components/child';

/** Mia's face follows the day's result: pace met, more skill sentences than ones to swap, or neither yet. */
function faceFor(day: DemoDay): Face {
  if (day.result.met) return 'beaming';
  return day.result.counts.target >= day.result.counts.avoid ? 'smiling' : 'neutral';
}

/** Quiet text controls for the dark bar: the light .btn-ghost would vanish on it. */
const CONTROL =
  'inline-flex h-9 items-center rounded-lg px-2.5 text-[14px] font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white/40';

/** Shown above the dashboard for as long as it is fed by the simulated family. */
export function DemoBar({ day, total, onSkip, onBack }: { day: DemoDay; total: number; onSkip: () => void; onBack: () => void }) {
  const { t } = useChild();
  return (
    <section
      aria-label="Demo: a simulated month"
      className="pop sticky top-3 z-20 overflow-hidden rounded-[1.5rem] bg-night bg-cover bg-top p-3 pb-2 text-white shadow-[0_24px_48px_-24px_rgb(11_6_22/0.7)]"
      style={{ backgroundImage: 'url(/bg/night.jpg)' }}
    >
      <div className="flex items-center justify-between gap-3 pl-1">
        <span className="rounded-full ring-1 ring-white/20">
          <DemoBadge />
        </span>
        <p className="shrink-0 text-[15px] font-bold tabular-nums tracking-[-0.01em]">
          Day {day.day} <span className="font-medium text-white/60">of {total}</span>
        </p>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="shrink-0 overflow-hidden rounded-2xl bg-white/10">
          <Mia face={faceFor(day)} posture="at_toy" size={56} />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-[14px] leading-snug text-white/90" aria-live="polite">
            {t(day.farewell)}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-white/50">Simulated child</p>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {day.day < total && (
          <button type="button" className={CONTROL} onClick={onSkip}>
            Skip to day {total}
          </button>
        )}
        <button type="button" className={CONTROL} onClick={onBack}>
          Back to my data
        </button>
      </div>
    </section>
  );
}
