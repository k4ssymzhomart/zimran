import Link from 'next/link';
import { Logo } from '@/components/kit';
import { cn, focusRing } from '@/components/kit/cn';
import { ROUTES } from '@/lib/routes';

/**
 * The foot of the landing (Figma 66:1841 on phones, 64:605 from 1024px): the logo, the way to the jury guide,
 * and the lines that say what PlayReps is and is not.
 */
export function Footer() {
  return (
    <footer className="bg-white text-ink">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[14px] px-[24px] pt-[24px] pb-[max(24px,env(safe-area-inset-bottom))] lg:min-h-[96px] lg:flex-row lg:items-center lg:gap-[32px] lg:px-[56px] lg:py-[24px]">
        <div className="flex items-center justify-between lg:contents">
          <Logo />
          {/* The row is 28px tall as drawn; the link reaches 12px past its text above and below, a 44px target. */}
          <Link
            href={ROUTES.jury}
            className={cn('relative shrink-0 rounded-[8px] text-label after:absolute after:inset-x-0 after:-inset-y-[12px]', focusRing)}
          >
            Jury guide
          </Link>
        </div>
        <p className="text-small text-gray lg:min-w-0 lg:flex-1">
          Skill practice. Not therapy and not a diagnosis. On a waitlist? Stay on it: PlayReps is practice while you wait. In
          crisis, call or text 988. Childhelp: 1-800-422-4453. Not affiliated with or endorsed by PCIT International. Mia and
          Leo are simulated children. Real children vary.
        </p>
      </div>
    </footer>
  );
}
