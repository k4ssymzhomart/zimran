import Link from 'next/link';
import { Art, RowChevron, cn, focusRing } from '@/components/kit';

export interface StreakRowProps {
  /** Days in a row, from streakOf. */
  days: number;
  /** The streak screen. */
  href: string;
  className?: string;
}

/**
 * "4 days in a row" on Today (Figma 47:665, 47:749): the medal, the count in strong type, the arrow to the streak.
 * TODO kit: SettingRow draws the same line with a regular label; this one is the strong 36px line of Today.
 * The link keeps a 44px target and gives 4px back above and below, so the row sits at the drawn height.
 */
export function StreakRow({ days, href, className }: StreakRowProps) {
  return (
    <Link href={href} className={cn('-my-[4px] flex min-h-[44px] w-full items-center gap-[12px] rounded-[12px]', focusRing, className)}>
      <Art name="medal-flame" size={30} className="size-[30px] shrink-0 object-contain" />
      <span className="min-w-0 flex-1 text-body-strong text-ink">{days === 1 ? '1 day in a row' : `${days} days in a row`}</span>
      <RowChevron />
    </Link>
  );
}
