import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * The two screen shells of the Split style. Both are layout only: every word and picture comes in through props.
 * On its own a shell is the Split root of the page. Inside AppShell pass `embedded`: the shell is the root there.
 */

/** The top row of a screen: a 44px back button at the left, at most one control at the right. */
const BAR = 'relative flex h-[44px] shrink-0 items-center justify-between px-[12px] lg:h-[80px] lg:px-[28px]';

/** Where a picture rests in a violet block: centered (portraits, objects) or standing on the bottom edge (full-body poses). */
type Rest = 'center' | 'bottom';

interface VioletProps {
  picture: ReactNode;
  pattern?: ReactNode;
  bar?: ReactNode;
  rest: Rest;
  /** Display, size and position: the block itself only knows what it holds. */
  className: string;
}

/**
 * The violet block: the pattern behind, the bar on top, the picture in what is left.
 * A centered picture sits 14px above the middle of the stage on phones (Figma 20:93) and in the middle of the whole
 * block from 1024px, bar included (32:99). A standing picture keeps 8px under the bar (47:689).
 * An image that is a direct child of the stage gives way when the block is short: it scales down inside its box.
 */
function Violet({ picture, pattern, bar, rest, className }: VioletProps) {
  return (
    <div className={cn('relative flex-col overflow-hidden bg-violet text-white', className)}>
      {pattern && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {pattern}
        </div>
      )}
      {/* Above the stage, so a picture taller than the block never covers the way back. */}
      {bar && <div className={cn(BAR, 'z-[1]')}>{bar}</div>}
      <div
        data-stage=""
        className={cn(
          'relative flex min-h-0 flex-1 flex-col items-center [&>img]:min-h-0 [&>img]:shrink [&>img]:object-contain',
          rest === 'bottom'
            ? 'justify-end pt-[8px] [&>img]:object-bottom'
            : cn('justify-center px-[24px] pb-[28px]', bar ? 'lg:pb-[80px]' : 'lg:pb-0'),
        )}
      >
        {picture}
      </div>
    </div>
  );
}

/** A slot is empty when React would draw nothing for it. */
function empty(node: ReactNode): boolean {
  return node === null || node === undefined || node === false || node === '';
}

export interface SplitScreenProps {
  /**
   * What the violet block holds: one portrait or one 3D object, with any words that sit on violet.
   * Pass the image itself (in a fragment when words follow it) and it scales down when the screen is short.
   */
  picture: ReactNode;
  /** A background pattern for the violet block. It fills the block, is clipped to it and is hidden from screen readers. */
  pattern?: ReactNode;
  /** The top row of the violet block: a back button, the logo. */
  bar?: ReactNode;
  /** Where the picture rests: centered (portraits, objects) or standing on the block's bottom edge (full-body poses). */
  rest?: Rest;
  /** The words, on white. */
  children?: ReactNode;
  /** The one action, under the words. */
  action?: ReactNode;
  /** Whatever follows the action: the week, the last session. */
  below?: ReactNode;
  /**
   * The dock of a talking screen, where the parent answers: the chips, then the answer field. It sits 16px from the
   * edges with 10px between its parts (Figma 20:97), under anything else on white. A part keeps its own width and
   * starts at the left; the Composer fills the row.
   */
  dock?: ReactNode;
  embedded?: boolean;
  /**
   * Lands on the root. From 1024px the words sit in a column 440px wide, 480px beside the rail;
   * `lg:[--split-column:460px]` sets another width (the quiz, Figma 54:908).
   */
  className?: string;
}

/**
 * Violet holds the picture, white holds the words, the action sits under the words.
 * On phones violet is on top and takes the height the words leave (Figma 20:7, 20:74, 47:665), 220px at least.
 * When the screen gets short (long words, a keyboard that resizes the page) a picture passed as the image itself
 * scales down, so the block can reach its 220px and the action stays in view (21:280). A picture wrapped in an
 * element of its own keeps its size: the block stays as tall as it and the page scrolls.
 * From 1024px violet is the left side and stays in place while the white side scrolls: half the page on its own
 * (32:91), a 472px panel beside the rail (54:137).
 */
export function SplitScreen({
  picture,
  pattern,
  bar,
  rest = 'center',
  children,
  action,
  below,
  dock,
  embedded = false,
  className,
}: SplitScreenProps) {
  const docked = !empty(dock);
  return (
    <div className={cn('flex flex-col lg:flex-row', embedded ? 'flex-1' : 'split-root', className)}>
      <Violet
        picture={picture}
        pattern={pattern}
        bar={bar}
        rest={rest}
        className={cn(
          'flex min-h-[220px] flex-1 pt-[env(safe-area-inset-top)] lg:sticky lg:top-0 lg:h-dvh lg:flex-none',
          // With an image of its own to scale, the block may go under the picture's height, down to its 220px.
          // An image taken out of the flow (a support object placed by hand, or one hidden on phones) does not count.
          'max-lg:has-[>[data-stage]>img:not(.absolute):not(.hidden)]:basis-0',
          embedded ? 'lg:w-[472px]' : 'lg:w-1/2',
        )}
      />

      <div
        className={cn(
          'flex flex-col bg-white lg:min-w-0 lg:flex-1 lg:items-center lg:justify-center lg:px-[40px] lg:py-[64px]',
          // The tab bar of AppShell stands clear of the home indicator itself; on its own the shell does.
          embedded ? 'pb-[16px]' : docked ? 'pb-[max(16px,env(safe-area-inset-bottom))]' : 'pb-[max(24px,env(safe-area-inset-bottom))]',
        )}
      >
        <div className={cn('w-full', embedded ? 'lg:max-w-[var(--split-column,480px)]' : 'lg:max-w-[var(--split-column,440px)]')}>
          {!empty(children) && <div className="px-[24px] pt-[24px] lg:px-0 lg:pt-0">{children}</div>}
          {action && <div className="px-[24px] pt-[16px] lg:px-0 lg:first:pt-0">{action}</div>}
          {below && <div className="px-[24px] pt-[20px] lg:px-0 lg:pt-[28px] lg:first:pt-0">{below}</div>}
          {docked && <div className="flex flex-col items-start gap-[10px] px-[16px] pt-[16px] lg:px-0 lg:first:pt-0">{dock}</div>}
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
  /**
   * With a picture or a pattern the page is a split from 1024px (Figma 54:221): a violet panel at the left holds
   * them and stays in place, and the title, the control beside it and the page share one centered column, 480px wide.
   * Phones keep the plain page and never show the panel.
   */
  picture?: ReactNode;
  /** A background pattern for that panel. */
  pattern?: ReactNode;
  /** Where the picture rests in that panel. */
  rest?: Rest;
}

/**
 * A plain white page with a title row, for the app's tabs (Figma 47:921 and 47:1270 on phones, 60:223 from 1024px).
 * The title lines up with the middle of the control beside it; alone it sits 6px from the top and the page starts
 * 14px under it.
 */
export function PageScreen({ title, aside, bar, children, embedded = false, className, picture, pattern, rest = 'center' }: PageScreenProps) {
  const split = !empty(picture) || !empty(pattern);
  const page = (
    <>
      {bar && <div className={BAR}>{bar}</div>}
      <header
        className={cn(
          'flex items-center justify-between gap-[16px] px-[24px] pt-[6px]',
          aside ? 'min-h-[60px] pb-[10px]' : 'pb-[14px]',
          split ? 'lg:min-h-0 lg:px-0 lg:pb-[10px]' : 'lg:px-[48px] lg:pb-[24px]',
          !bar && (split ? 'lg:pt-0' : 'lg:pt-[40px]'),
        )}
      >
        <h1 className={cn('text-title', !split && 'lg:text-title-xl')}>{title}</h1>
        {aside}
      </header>
      <div
        className={cn(
          'flex flex-1 flex-col px-[24px]',
          embedded ? 'pb-[16px]' : 'pb-[max(16px,env(safe-area-inset-bottom))]',
          split ? 'lg:px-0 lg:pb-0' : 'lg:px-[48px] lg:pb-[48px]',
        )}
      >
        {children}
      </div>
    </>
  );

  if (!split) {
    return <div className={cn('flex flex-col bg-white pt-[env(safe-area-inset-top)]', embedded ? 'flex-1' : 'split-root', className)}>{page}</div>;
  }

  return (
    <div className={cn('flex flex-col bg-white lg:flex-row', embedded ? 'flex-1' : 'split-root', className)}>
      <Violet
        picture={picture}
        pattern={pattern}
        rest={rest}
        className={cn('hidden shrink-0 lg:sticky lg:top-0 lg:flex lg:h-dvh', embedded ? 'lg:w-[472px]' : 'lg:w-1/2')}
      />
      <div className="flex min-w-0 flex-1 flex-col pt-[env(safe-area-inset-top)] lg:items-center lg:justify-center lg:px-[40px] lg:py-[64px]">
        <div className="flex w-full flex-1 flex-col lg:max-w-[var(--split-column,480px)] lg:flex-none">{page}</div>
      </div>
    </div>
  );
}
