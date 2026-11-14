import { calmTrend, type Progress, type TantrumBucket } from '@/lib';

const OPTIONS: { value: TantrumBucket; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 1, label: '1-2' },
  { value: 2, label: '3-5' },
  { value: 3, label: '6 or more' },
];

/** A weekly average of buckets 0..3, said in the same words as the buttons. */
function inWords(average: number): string {
  if (average < 0.5) return 'close to none a day';
  if (average < 1.5) return 'about 1-2 a day';
  if (average < 2.5) return 'about 3-5 a day';
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
    <section aria-labelledby="home-h" className="sticker bg-[#fffaf0] p-4">
      <h2 id="home-h" className="font-display text-xl font-semibold">
        Your <span className="italic text-tomato">home</span>
      </h2>

      {onSave && (
        <fieldset className="mt-2">
          <legend className="font-semibold">How many tantrums today?</legend>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={saved === o.value}
                onClick={() => onSave(o.value)}
                className={`sticker-sm min-h-11 px-1 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  saved === o.value ? 'bg-sun' : 'bg-[#fffdf8]'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-2 min-h-5 text-sm text-ink-soft" aria-live="polite">
            {saved !== undefined ? 'Saved for today. Tap another answer to change it.' : ''}
          </p>
        </fieldset>
      )}

      {weeks.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm" aria-live="polite">
          {weeks.map((w) => (
            <li key={w.week} className="flex justify-between gap-3 border-b border-dashed border-ink/25 pb-1">
              <span className="font-semibold">Week {w.week}</span>
              <span>{inWords(w.average as number)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-ink-soft">Your weekly averages appear here after your first answer.</p>
      )}

      <p className="mt-3 text-xs text-ink-soft">
        {onSave
          ? 'This is your own log, kept on this device. PlayReps does not measure your home and makes no promise about tantrums; it shows you your numbers.'
          : 'In the demo these check-ins are invented. In your own dashboard this is your own log.'}
      </p>
    </section>
  );
}
