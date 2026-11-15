'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Art } from '@/components/kit/Art';
import { cn, colorMotion, focusRing } from '@/components/kit/cn';
import { LogoMark } from '@/components/kit/Logo';
import { APP_TABS, ROUTES, tabAt, type AppTab } from '@/lib/routes';

export interface RailProps {
  /** The tab to mark as current. Leave it out: the rail reads it from the address and hides off the tab roots. */
  current?: AppTab['id'];
  className?: string;
}

/**
 * The left rail from 1024px (Figma "Rail", 42:959): the mark, then Today, Practice and Progress, with Profile at the foot.
 * The current tab sits on a lilac tile. Like the tab bar, it shows on the four tab roots only.
 */
export function Rail({ current, className }: RailProps) {
  const here = tabAt(usePathname())?.id;
  const currentId = current ?? here;
  if (!currentId) return null;

  return (
    <nav
      aria-label="Main"
      className={cn(
        'sticky top-0 hidden h-dvh w-[88px] shrink-0 flex-col items-center gap-[6px] border-r border-line bg-white pb-[24px] pt-[28px] lg:flex',
        className,
      )}
    >
      <Link href={ROUTES.home} aria-label="Fammy home" className={cn('mb-[32px] rounded-[8px]', focusRing)}>
        <LogoMark size={30} />
      </Link>
      <ul className="flex flex-1 flex-col gap-[6px]">
        {APP_TABS.map((tab) => {
          const active = tab.id === currentId;
          return (
            <li key={tab.id} className="last:mt-auto">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-[64px] w-[72px] flex-col items-center justify-center gap-[4px] rounded-[16px] text-tab',
                  focusRing,
                  colorMotion,
                  active ? 'bg-lilac text-ink' : 'text-gray hover:text-ink',
                )}
              >
                <Art name={active ? `tab-${tab.art}` : `tab-${tab.art}-off`} size={28} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
