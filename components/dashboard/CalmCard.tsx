import { Check } from '@/components/Icons';
import { calmTrend, type Progress, type TantrumBucket } from '@/lib';

const OPTIONS: { value: TantrumBucket; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 1, label: '1-2' },
  { value: 2, label: '3-5' },
  { value: 3, label: '6 or more' },
];

/** A weekly average of buckets 0..3, said in the same words as the buttons. */
function inWords(average: number): string {
  if (average < 0.5) return 'Close to none a day';
  if (average < 1.5) return 'About 1-2 a day';
  if (average < 2.5) return 'About 3-5 a day';
  return '6 or more a day';
}

/**
 * "Your home": the parent's own daily log of tantrums, and its weekly averages in words.
 * Without onSave (the demo) the question is hidden and only the trend is shown.
 */
export function CalmCard({
  progress,
  today,
  onSave,
}: {
  progress: Progress;
  today: string;
  onSave?: (tantrums: TantrumBucket) => void;
}) {
  const weeks = calmTrend(progress).filter((w) => w.average !== null);
  const saved = progress.checkins.find((c) => c.date === today)?.tantrums;

  return (
    <section aria-labelledby="home-h" className="card enter d3 p-5 sm:p-7">
      <h2 id="home-h" className="title text-[24px] text-fg">
        Your home
      </h2>

      {onSave && (
        <fieldset className="mt-4">
          <legend className="text-[16px] font-semibold tracking-[-0.01em] text-fg">How many tantrums today?</legend>
          <div className="mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1">
            {OPTIONS.map((o) => {
              const on = saved === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onSave(o.value)}
                  className={`h-11 whitespace-nowrap rounded-xl px-0.5 text-[13px] font-semibold transition-[background-color,color,box-shadow] sm:text-[14px] duration-200 focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-violet/50 ${
                    on ? 'bg-violet text-white shadow-violet' : 'text-fg-2 hover:bg-white/6 hover:text-fg'
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex min-h-5 items-center gap-1.5 text-[13px] text-fg-soft" aria-live="polite">
            {saved !== undefined && (
              <>
                <Check size={14} strokeWidth={2.8} className="text-lilac" />
                Saved for today. Tap another to change it.
              </>
            )}
          </p>
        </fieldset>
      )}

      {weeks.length > 0 ? (
        <ul className="mt-3 divide-y divide-stroke border-t border-stroke" aria-live="polite" aria-label="Weekly average">
          {weeks.map((w) => (
            <li key={w.week} className="flex items-center justify-between gap-3 py-3 text-[15px]">
              <span className="font-semibold text-fg">Week {w.week}</span>
              <span className="text-fg-2">{inWords(w.average as number)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-fg-soft">Weekly averages show here after your first answer.</p>
      )}

      <p className="mt-4 text-[12px] leading-relaxed text-fg-faint">
        {onSave
          ? 'This is your own log, kept on this device. PlayReps does not measure your home and makes no promise about tantrums; it shows you your numbers.'
          : 'In the demo these check-ins are invented. In your own dashboard this is your own log.'}
      </p>
    </section>
  );
}
