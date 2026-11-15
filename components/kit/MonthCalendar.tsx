import { cn, focusRing } from './cn';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Column of the first day of a month, Monday = 0. Plain arithmetic (Sakamoto's method), so no Date object is made during render. */
function firstColumn(year: number, month: number): number {
  const shift = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4][month - 1];
  const y = month < 3 ? year - 1 : year;
  const sundayFirst = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + shift + 1) % 7;
  return (sundayFirst + 6) % 7;
}

function daysIn(year: number, month: number): number {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** "2026-11" reads "November 2026". */
export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${year}`;
}

/** Phone: 38px discs in 44 x 50 cells. Compact, for the desktop card: 36px discs in 52 x 46 cells. */
const SIZE = {
  regular: { cell: 'h-[50px] w-[44px] gap-[3px]', disc: 'size-[38px]', dot: 'size-[5px]', grid: 'gap-y-[6px]' },
  compact: { cell: 'h-[46px] w-[52px] gap-[2px]', disc: 'size-[36px]', dot: 'size-[4px]', grid: 'gap-y-[4px]' },
};

export interface MonthCalendarProps {
  /** The month to show, YYYY-MM. */
  month: string;
  /** Local days with a session, YYYY-MM-DD. */
  played: readonly string[];
  /** Days that carry the small dot under the disc. */
  dotted?: readonly string[];
  /** Today's local day, YYYY-MM-DD. It decides which open days are behind and which are ahead. */
  today?: string;
  /** Each arrow shows only when its handler is given. */
  onPrev?(): void;
  onNext?(): void;
  /** With it, a played day is a button that opens that day. */
  onSelectDay?(date: string): void;
  compact?: boolean;
  /** Leave out the month title and the arrows, when the screen draws its own header. */
  hideHeader?: boolean;
  className?: string;
}

/** One month of practice, Monday first. Played days are filled; days ahead wait in lilac. */
export function MonthCalendar({ month, played, dotted = [], today, onPrev, onNext, onSelectDay, compact = false, hideHeader = false, className }: MonthCalendarProps) {
  const [year, m] = month.split('-').map(Number);
  const title = monthLabel(month);
  const size = compact ? SIZE.compact : SIZE.regular;
  const blanks = Array.from({ length: firstColumn(year, m) }, (_, i) => <span key={`blank-${i}`} />);
  const grid = cn('grid grid-cols-[repeat(7,auto)] justify-between', size.grid);

  const days = Array.from({ length: daysIn(year, m) }, (_, i) => {
    const day = i + 1;
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const isPlayed = played.includes(date);
    const isToday = date === today;
    const disc = cn(
      'grid place-items-center rounded-full text-label tabular-nums',
      size.disc,
      isPlayed ? 'bg-violet text-white' : isToday ? 'border-2 border-ink bg-white text-ink' : today !== undefined && date > today ? 'bg-lilac text-ink' : 'text-faint',
    );
    const cell = cn('flex flex-col items-center justify-center', size.cell);
    const inside = (
      <>
        <span className={disc}>{day}</span>
        <span className={cn('rounded-full', size.dot, dotted.includes(date) && 'bg-violet')} />
      </>
    );
    return isPlayed && onSelectDay ? (
      <button key={date} type="button" onClick={() => onSelectDay(date)} aria-label={`${day} ${title}`} className={cn(cell, 'rounded-[12px]', focusRing)}>
        {inside}
      </button>
    ) : (
      <span key={date} aria-current={isToday ? 'date' : undefined} className={cell}>
        {inside}
      </span>
    );
  });

  return (
    <div role="group" aria-label={title} className={className}>
      {!hideHeader && (
        <div className="flex items-center justify-between pb-[8px]">
          <h3 className="text-heading text-ink">{title}</h3>
          <div className="flex gap-[8px]">
            {onPrev && <Arrow label="Previous month" onClick={onPrev} d="M11.25 4.5 6.75 9l4.5 4.5" />}
            {onNext && <Arrow label="Next month" onClick={onNext} d="M6.75 4.5 11.25 9l-4.5 4.5" />}
          </div>
        </div>
      )}
      <div aria-hidden="true" className={cn(grid, 'pb-[6px]')}>
        {WEEKDAYS.map((letter, i) => (
          <span key={i} className={cn('h-[22px] text-center text-small text-gray', compact ? 'w-[52px]' : 'w-[44px]')}>
            {letter}
          </span>
        ))}
      </div>
      <div className={grid}>
        {blanks}
        {days}
      </div>
    </div>
  );
}

/** A 36px mist disc inside a 44px touch target. */
function Arrow({ label, onClick, d }: { label: string; onClick(): void; d: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cn('-m-[4px] grid size-[44px] place-items-center rounded-full text-ink', focusRing)}>
      <span className="grid size-[36px] place-items-center rounded-full bg-mist">
        <svg viewBox="0 0 18 18" width="18" height="18" fill="none" aria-hidden="true">
          <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}
