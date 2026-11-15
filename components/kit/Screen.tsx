import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * The two screen shells of the Split style. Both are layout only: every word and picture comes in through props.
 * On its own a shell is the Split root of the page. Inside AppShell pass `embedded`: the shell is the root there.
 */

/** The top row of a screen: a 44px back button at the left, at most one control at the right. */
const BAR = 'relative flex h-[44px] shrink-0 items-center justify-between px-[12px] lg:h-[80px] lg:px-[28px]';

export interface SplitScreenProps {
  /** What the violet block holds: one portrait or one 3D object, with any words that sit on violet. */
  picture: ReactNode;
  /** A background pattern for the violet block. It fills the block, is clipped to it and is hidden from screen readers. */
  pattern?: ReactNode;
  /** The top row of the violet block: a back button, the logo. */
  bar?: ReactNode;
  /** Where the picture rests: centered (portraits, objects) or standing on the block's bottom edge (full-body poses). */
  rest?: 'center' | 'bottom';
  /** The words, on white. */
  children: ReactNode;
  /** The one action, under the words. */
  action?: ReactNode;
  /** Whatever follows the action: the week, the last session. */
  below?: ReactNode;
  embedded?: boolean;
  className?: string;
}

/**
 * Violet holds the picture, white holds the words, the action sits under the words.
 * On phones violet is on top and takes the height the words leave (Figma 20:7, 20:74, 47:665).
 * From 1024px it is the left side: half the page on its own (32:91), a 472px panel beside the rail (54:137).
 */
export function SplitScreen({
  picture,
  pattern,
  bar,
  rest = 'center',
  children,
  action,
  below,
  embedded = false,
  className,
}: SplitScreenProps) {
  return (
    <div className={cn('flex flex-col lg:flex-row', embedded ? 'flex-1' : 'split-root', className)}>
      <div
        className={cn(
          'relative flex min-h-[220px] flex-1 flex-col overflow-hidden bg-violet pt-[env(safe-area-inset-top)] text-white lg:sticky lg:top-0 lg:h-dvh lg:flex-none',
          embedded ? 'lg:w-[472px]' : 'lg:w-1/2',
        )}
      >
        {pattern && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            {pattern}
          </div>
        )}
        {bar && <div className={BAR}>{bar}</div>}
        <div
          className={cn(
            'relative flex min-h-0 flex-1 flex-col items-center',
            rest === 'bottom' ? 'justify-end' : 'justify-center px-[24px] pb-[28px]',
          )}
        >
          {picture}
        </div>
      </div>

      <div
        className={cn(
          'flex flex-col bg-white lg:min-w-0 lg:flex-1 lg:items-center lg:justify-center lg:p-[40px]',
          embedded ? 'pb-[16px]' : 'pb-[max(24px,env(safe-area-inset-bottom))]',
        )}
      >
        <div className={cn('w-full', embedded ? 'lg:max-w-[480px]' : 'lg:max-w-[440px]')}>
          <div className="px-[24px] pt-[24px] lg:px-0 lg:pt-0">{children}</div>
          {action && <div className="px-[24px] pt-[16px] lg:px-0">{action}</div>}
          {below && <div className="px-[24px] pt-[20px] lg:px-0 lg:pt-[28px]">{below}</div>}
        </div>
      </div>
    </div>
  );
}

export interface PageScreenProps {
  title: string;
  /** Sits at the right of the title row: a segmented control, one small action. */
  aside?: ReactNode;
  /** A top row above the title, for a screen that was pushed: the back button. Tab roots have none. */
  bar?: ReactNode;
  children: ReactNode;
  embedded?: boolean;
  className?: string;
}

/** A plain white page with a title row, for the app's tabs (Figma 47:921 on phones, 60:223 from 1024px). */
export function PageScreen({ title, aside, bar, children, embedded = false, className }: PageScreenProps) {
  return (
    <div className={cn('flex flex-col bg-white pt-[env(safe-area-inset-top)]', embedded ? 'flex-1' : 'split-root', className)}>
      {bar && <div className={BAR}>{bar}</div>}
      <header
        className={cn(
          'flex min-h-[60px] items-center justify-between gap-[16px] px-[24px] pb-[10px] pt-[6px] lg:px-[48px] lg:pb-[24px]',
          !bar && 'lg:pt-[40px]',
        )}
      >
        <h1 className="text-title lg:text-title-xl">{title}</h1>
        {aside}
      </header>
      <div className="flex flex-1 flex-col px-[24px] pb-[16px] lg:px-[48px] lg:pb-[48px]">{children}</div>
    </div>
  );
}
