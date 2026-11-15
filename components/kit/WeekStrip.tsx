import Link from 'next/link';
import { cn, focusRing } from './cn';

export interface WeekDay {
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  /** The letter under the peg: "M". */
  label: string;
  /** What a screen reader hears instead of the letter: "Monday, played". */
  name: string;
  played: boolean;
  today?: boolean;
  /** Where a tap goes: that day's session review. */
  href?: string;
}

export interface WeekStripProps {
  days: readonly WeekDay[];
  className?: string;
}

/** Seven pegs, Monday to Sunday. A played day is filled, today has an ink outline, the rest wait. */
export function WeekStrip({ days, className }: WeekStripProps) {
  return (
    /* Each day is 44px wide for the thumb; the row reaches 4px past both edges so the 36px pegs still line up with the page. */
    <ol className={cn('-mx-[4px] flex items-start justify-between', className)}>
      {days.map((day) => {
        const peg = (
          <>
            <span
              className={cn(
                'grid size-[36px] place-items-center rounded-full',
                day.played ? 'bg-violet text-white' : day.today ? 'border-2 border-ink bg-white' : 'bg-mist',
              )}
            >
              {day.played && <CheckIcon />}
            </span>
            <span aria-hidden="true" className={cn('text-small', day.today ? 'text-ink' : 'text-gray')}>
              {day.label}
            </span>
          </>
        );
        const column = 'flex w-[44px] max-w-full flex-col items-center gap-[6px]';
        return (
          <li key={day.date} aria-current={day.today ? 'date' : undefined} className="min-w-0">
            {day.href ? (
              <Link href={day.href} aria-label={day.name} className={cn(column, 'rounded-[12px]', focusRing)}>
                {peg}
              </Link>
            ) : (
              <span className={column}>
                {peg}
                <span className="sr-only">{day.name}</span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M3.75 9.375 6.9 12.525 14.25 5.25" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
