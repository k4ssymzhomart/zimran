import type { ReactNode } from 'react';
import { cn, colorMotion, focusRing, focusRingOnViolet } from './cn';

/** `mist` sits on white. `on-violet` sits on a violet card: the label of a practice partner, the scene chips of Practice. */
export type ChipTone = 'mist' | 'on-violet';

/* `reach` grows the touch target to 44px: past the top and bottom edge, and half of the gap to the next chip on each side. */
const TONE: Record<ChipTone, { box: string; rest: string; selected: string; reach: string }> = {
  mist: {
    box: 'h-[36px]',
    rest: 'bg-mist text-ink',
    selected: 'bg-ink text-white',
    reach: 'after:-inset-x-[4px] after:-inset-y-[4px]',
  },
  'on-violet': {
    box: 'h-[34px]',
    rest: 'bg-violet-press text-white',
    selected: 'bg-white text-violet',
    reach: 'after:-inset-x-[3px] after:-inset-y-[5px]',
  },
};

/**
 * The look of a chip, shared with ChipGroup. A chip is 36px tall, 34px on violet; one that can be tapped
 * reaches past its edges, so the touch target is 44px.
 */
export function chipClasses(selected: boolean, interactive: boolean, tone: ChipTone = 'mist'): string {
  const look = TONE[tone];
  return cn(
    'relative inline-flex shrink-0 items-center justify-center rounded-[18px] px-[14px] text-label whitespace-nowrap',
    look.box,
    selected ? look.selected : look.rest,
    interactive && colorMotion,
    interactive && 'cursor-pointer after:absolute',
    interactive && look.reach,
  );
}

export interface ChipProps {
  children: ReactNode;
  /** Pass a boolean to make the chip a toggle (aria-pressed). Leave it out for a plain action or a label. */
  selected?: boolean;
  /** With onClick the chip is a button; without it, static text. */
  onClick?(): void;
  disabled?: boolean;
  /** `on-violet` for a chip on a violet card. The default sits on white. */
  tone?: ChipTone;
  className?: string;
}

export function Chip({ children, selected, onClick, disabled, tone = 'mist', className }: ChipProps) {
  if (!onClick) {
    return <span className={cn(chipClasses(selected === true, false, tone), className)}>{children}</span>;
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        chipClasses(selected === true, true, tone),
        tone === 'mist' && !selected && 'active:bg-line',
        tone === 'mist' ? 'disabled:text-faint' : 'disabled:text-lilac-2',
        'disabled:pointer-events-none',
        tone === 'mist' ? focusRing : focusRingOnViolet,
        className,
      )}
    >
      {children}
    </button>
  );
}
