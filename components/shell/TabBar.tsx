'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Art } from '@/components/kit/Art';
import { cn, focusRing } from '@/components/kit/cn';
import { APP_TABS, tabAt, type AppTab } from '@/lib/routes';

export interface TabBarProps {
  /** The tab to mark as current. Leave it out: the bar reads it from the address and hides off the tab roots. */
  current?: AppTab['id'];
  className?: string;
}

/**
 * The tab bar on phones (Figma "Tab bar", 42:894, the one the Today frame 47:665 uses): flat white, one hairline
 * on top, four tabs, labels always on. The current tab has the violet 3D icon and an ink label; the others are gray.
 * It shows on the four tab roots only and stands clear of the home indicator.
 */
export function TabBar({ current, className }: TabBarProps) {
  const here = tabAt(usePathname())?.id;
  const currentId = current ?? here;
  if (!currentId) return null;

  return (
    <nav
      aria-label="Main"
      className={cn(
        'sticky bottom-0 z-10 h-[calc(64px+env(safe-area-inset-bottom))] border-t border-line bg-white px-[8px] pb-[calc(6px+env(safe-area-inset-bottom))] pt-[8px] lg:hidden',
        className,
      )}
    >
      <ul className="flex h-full">
        {APP_TABS.map((tab) => {
          const active = tab.id === currentId;
          return (
            <li key={tab.id} className="min-w-0 flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-[3px] rounded-[12px] text-tab',
                  focusRing,
                  active ? 'text-ink' : 'text-gray',
                )}
              >
                <Art name={active ? `tab-${tab.art}` : `tab-${tab.art}-off`} size={30} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
