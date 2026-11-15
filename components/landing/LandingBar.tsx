import Link from 'next/link';
import { Button, Logo } from '@/components/kit';
import { cn, focusRingOnViolet } from '@/components/kit/cn';
import { TopBar, type TopBarLink } from '@/components/shell/TopBar';
import { ROUTES } from '@/lib/routes';

export interface LandingBarProps {
  /** Links to the sections of this page that exist, in page order: "How it works", "Method", "Pricing". */
  sections?: TopBarLink[];
  /** Where "Try one answer" leads: the answer field on this page. */
  actionHref: string;
}

/**
 * The top bar of the landing from 1024px (Figma 63:225): the logo, the section links, the jury guide,
 * the way into the app, and the one action. On phones the first screen carries its own header on violet.
 */
export function LandingBar({ sections = [], actionHref }: LandingBarProps) {
  return (
    <div className="hidden lg:block">
      <TopBar
        className="mx-auto max-w-[1440px]"
        logo={<Logo />}
        links={[...sections, { label: 'Jury guide', href: ROUTES.jury }, { label: 'Open app', href: ROUTES.today }]}
        action={
          <Button href={actionHref} size="md" className="w-[180px]">
            Try one answer
          </Button>
        }
      />
    </div>
  );
}

/** The header of the first screen on phones (Figma 20:7): the white logo and the way into the app, on violet. */
export function LandingHeader({ className }: { className?: string }) {
  return (
    <div className={cn('relative flex h-[48px] shrink-0 items-center justify-between px-[24px]', className)}>
      <Logo tone="white" />
      <Link
        href={ROUTES.today}
        className={cn('inline-flex min-h-[44px] items-center rounded-[8px] text-label text-white', focusRingOnViolet)}
      >
        Open app
      </Link>
    </div>
  );
}
