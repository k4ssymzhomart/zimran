'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { isLocked, type Entitlement } from '@/client/entitlement';
import { todayISO } from '@/client/progressStore';
import { cn, Icon, IconButton } from '@/components/kit';
import { ROUTES } from '@/lib/routes';

/** The local day is read on this device only. The server and the first paint get null, so nothing can mismatch. */
const never = () => () => {};
const noDay = () => null;

export function useToday(): string | null {
  return useSyncExternalStore(never, todayISO, noDay);
}

/** The way back from a pushed screen: to Today. */
export const backToToday = (
  <IconButton href={ROUTES.today} label="Back to Today" variant="on-violet">
    <Icon name="back" />
  </IconButton>
);

/**
 * The one action that starts a session: the daily five minutes with access, the free first visit when nothing was
 * ever played, the plans when the daily session is locked.
 */
export function startAction(played: boolean, entitlement: Entitlement, label = 'Start five minutes'): { href: string; label: string } {
  if (!isLocked('daily', entitlement)) return { href: ROUTES.daily, label };
  if (!played) return { href: ROUTES.start, label: 'Start a round' };
  return { href: ROUTES.pricing, label: 'See plans' };
}

interface ColumnScreenProps {
  /** The violet block's pattern, bar and picture. */
  pattern?: ReactNode;
  bar?: ReactNode;
  picture?: ReactNode;
  /** Where the picture rests: centered, or standing on the block's bottom edge (full-body poses). */
  rest?: 'center' | 'bottom';
  /** The words, on white. */
  children?: ReactNode;
  /** The one action, at the foot of the white part. */
  action?: ReactNode;
}

/**
 * TODO kit: SplitScreen without its desktop split. Stories 9 and 13 are drawn for phones only, so from 1024px the
 * phone layout stands in a centered column 480px wide: violet on top with the picture, white under it with the words.
 */
export function ColumnScreen({ pattern, bar, picture, rest = 'center', children, action }: ColumnScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center bg-white lg:py-[40px]">
      <div className="flex w-full max-w-[480px] flex-1 flex-col lg:flex-none lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-line">
        <div className="relative flex shrink-0 flex-col overflow-hidden bg-violet pt-[env(safe-area-inset-top)] text-white lg:pt-0">
          {pattern && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              {pattern}
            </div>
          )}
          {bar && <div className="relative z-[1] flex h-[44px] items-center px-[12px] lg:h-[56px]">{bar}</div>}
          <div className={cn('relative flex min-h-[160px] items-center justify-center px-[24px]', rest === 'bottom' ? 'items-end pt-[4px]' : 'pt-[4px] pb-[28px]')}>
            {picture}
          </div>
        </div>
        <div className="flex flex-1 flex-col bg-white px-[24px] pt-[24px] pb-[max(24px,env(safe-area-inset-bottom))]">
          {children}
          {action && <div className="mt-auto pt-[24px]">{action}</div>}
        </div>
      </div>
    </div>
  );
}
