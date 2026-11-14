import { DemoBadge } from '@/components/Bits';
import { Mia } from '@/components/Mia';
import type { DemoDay, Face } from '@/lib';

/** Mia's face follows the day's result: pace met, more skill sentences than ones to swap, or neither yet. */
function faceFor(day: DemoDay): Face {
  if (day.result.met) return 'beaming';
  return day.result.counts.target >= day.result.counts.avoid ? 'smiling' : 'neutral';
}

/** Shown above the dashboard for as long as it is fed by the simulated family. */
export function DemoBar({ day, total, onSkip, onBack }: { day: DemoDay; total: number; onSkip: () => void; onBack: () => void }) {
  return (
    <section aria-label="Demo: a simulated month" className="sticker sticky top-2 z-10 bg-[#fffdf8] p-3">
      <div className="flex items-center justify-between gap-2">
        <DemoBadge />
        <span className="font-display text-lg font-semibold tabular-nums">
          Day {day.day}
          <span className="text-sm font-normal text-ink-soft"> / {total}</span>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="shrink-0">
          <Mia face={faceFor(day)} posture="at_toy" size={64} />
        </div>
        <p className="min-h-10 text-sm leading-snug" aria-live="polite">
          {day.farewell}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {day.day < total && (
          <button type="button" className="btn btn-quiet" onClick={onSkip}>
            Skip to day {total}
          </button>
        )}
        <button type="button" className="btn btn-quiet" onClick={onBack}>
          Back to my data
        </button>
      </div>
    </section>
  );
}
