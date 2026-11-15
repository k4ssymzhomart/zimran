import { Check } from '@/components/Icons';
import { compareRounds, type RoundResult } from '@/lib';

/** The two rounds of the first visit, per minute, best news first. */
export function FirstVisit({ before, after }: { before: RoundResult; after: RoundResult }) {
  const { lines, perMinute: d } = compareRounds(before, after);
  // compareRounds lists the gains first; this many leading lines are gains and get a check.
  const gains = [d.description, d.reflection, d.specific_praise].filter((n) => n > 0).length + (d.avoid < 0 ? 1 : 0);

  return (
    <section aria-labelledby="first-h" className="card enter d3 p-5 sm:p-7">
      <h2 id="first-h" className="title text-[24px] text-fg">
        First visit
      </h2>
      <p className="mt-1.5 text-[15px] leading-snug text-fg-soft">Your second round next to your first, after one short lesson.</p>

      {lines.length > 0 ? (
        <ul className="mt-4 divide-y divide-stroke">
          {lines.map((line, i) => (
            <li key={line} className="flex items-center gap-3 py-3">
              {i < gains ? (
                <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet text-white">
                  <Check size={13} strokeWidth={3} />
                </span>
              ) : (
                <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-fg-faint" />
                </span>
              )}
              <span className="text-[15px] leading-snug text-fg-2">{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[15px] text-fg-2">Both rounds came out at the same pace.</p>
      )}
    </section>
  );
}
