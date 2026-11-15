import type { ReactNode } from 'react';
import { cn, colorMotion, focusRing } from './cn';

/**
 * The look of a chip, shared with ChipGroup. A chip is 36px tall; one that can be tapped
 * reaches 4px past its top and bottom edge, so the touch target is 44px.
 */
export function chipClasses(selected: boolean, interactive: boolean): string {
  return cn(
    'relative inline-flex h-[36px] shrink-0 items-center justify-center rounded-[18px] px-[14px] text-label whitespace-nowrap',
    selected ? 'bg-ink text-white' : 'bg-mist text-ink',
    interactive && colorMotion,
    interactive && 'cursor-pointer after:absolute after:inset-x-0 after:-inset-y-[4px]',
  );
}

export interface ChipProps {
  children: ReactNode;
  /** Pass a boolean to make the chip a toggle (aria-pressed). Leave it out for a plain action or a label. */
  selected?: boolean;
  /** With onClick the chip is a button; without it, static text. */
  onClick?(): void;
  disabled?: boolean;
  className?: string;
}

export function Chip({ children, selected, onClick, disabled, className }: ChipProps) {
  if (!onClick) {
    return <span className={cn(chipClasses(selected === true, false), className)}>{children}</span>;
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        chipClasses(selected === true, true),
        !selected && 'active:bg-line',
        'disabled:pointer-events-none disabled:text-faint',
        focusRing,
        className,
      )}
    >
      {children}
    </button>
  );
}
