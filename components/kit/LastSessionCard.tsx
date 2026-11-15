import Link from 'next/link';
import { cn, colorMotion, focusRing } from './cn';

export interface LastSessionCardProps {
  /** When the session was: "Yesterday". */
  when: string;
  /** The session in one sentence: "Six praises, nine questions." */
  headline: string;
  /** The session's review. */
  href: string;
  action?: string;
  className?: string;
}

/** The most recent session on Today. The whole card opens its review. */
export function LastSessionCard({ when, headline, href, action = 'Review', className }: LastSessionCardProps) {
  return (
    <Link
      href={href}
      className={cn('flex items-center gap-[12px] rounded-[20px] bg-mist px-[16px] py-[14px] active:bg-line', colorMotion, focusRing, className)}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="text-small text-gray">{when}</span>
        <span className="text-body-strong text-ink">{headline}</span>
      </span>
      <span className="shrink-0 text-label text-violet">{action}</span>
    </Link>
  );
}
