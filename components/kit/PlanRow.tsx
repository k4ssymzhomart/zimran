import Link from 'next/link';
import { cn, focusRing } from './cn';
import { RowChevron } from './SettingRow';

export interface PlanRowProps {
  /** What the line is about, in gray: "Partner". */
  label: string;
  /** The answer, in strong ink: "Mia". */
  value: string;
  /** The row opens another screen. */
  href?: string;
  /** The row can be edited in place, for example in a sheet. */
  onClick?(): void;
  /** The 52px row inside a sheet. The default is the 54px row of the plan. */
  compact?: boolean;
  className?: string;
}

/** One line of the plan: a gray label, its value, and an arrow when the line can be changed. */
export function PlanRow({ label, value, href, onClick, compact = false, className }: PlanRowProps) {
  const row = cn('flex w-full items-center text-left', compact ? 'min-h-[52px] gap-[8px]' : 'min-h-[54px] gap-[10px]', className);
  const content = (
    <>
      <span className="min-w-0 flex-1 text-body text-gray">{label}</span>
      <span className="shrink-0 text-body-strong text-ink">{value}</span>
      {href || onClick ? <RowChevron /> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn(row, focusRing)}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(row, 'cursor-pointer', focusRing)}>
        {content}
      </button>
    );
  }
  return <div className={row}>{content}</div>;
}
