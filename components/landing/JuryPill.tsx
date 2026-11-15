import Link from 'next/link';
import { cn, focusRingOnViolet } from '@/components/kit/cn';
import { ROUTES } from '@/lib/routes';

/** Pinned to the bottom of the landing at every size: the jury's way in, the three-minute guide. */
export function JuryPill() {
  return (
    <Link
      href={ROUTES.jury}
      className={cn(
        'fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 z-50 inline-flex min-h-[48px] -translate-x-1/2 items-center gap-[8px] whitespace-nowrap rounded-full bg-violet px-[20px] text-label text-white shadow-lg lg:right-[40px] lg:left-auto lg:translate-x-0',
        focusRingOnViolet,
      )}
    >
      <span className="text-small-strong">Jury?</span>
      Start with the three-minute guide →
    </Link>
  );
}
