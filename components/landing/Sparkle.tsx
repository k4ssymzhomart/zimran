import type { CSSProperties } from 'react';
import { cn } from '@/components/kit/cn';

export interface SparkleProps {
  /** Position, size and color: white on violet, violet on white. */
  className?: string;
  /** When in its loop the sparkle is brightest, in seconds. */
  delay?: number;
}

/**
 * A small four-point sparkle that twinkles. Decoration only: hidden from screen readers and from the pointer.
 * With reduced motion it stays still.
 */
export function Sparkle({ className, delay = 0 }: SparkleProps) {
  const style = { animationDelay: `${delay}s` } as CSSProperties;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={cn('landing-sparkle pointer-events-none absolute size-[14px]', className)}
      style={style}
    >
      <path
        d="M12 0C12.8 7.4 16.6 11.2 24 12C16.6 12.8 12.8 16.6 12 24C11.2 16.6 7.4 12.8 0 12C7.4 11.2 11.2 7.4 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
