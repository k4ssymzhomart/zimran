import type { CSSProperties } from 'react';
import { cn } from './cn';

/**
 * `bars` is the logo mark, giant and cropped: brand and result moments.
 * `sentences` is small dashes like lines of speech: rounds, lessons, the session review.
 * `reps` is the logo unit repeated: everyday screens.
 */
export type PatternKind = 'bars' | 'sentences' | 'reps';

/** One step lighter or one step darker than the violet block it sits on. */
export type PatternTone = 'tint' | 'press';

const TONE: Record<PatternTone, string> = { tint: 'bg-violet-tint', press: 'bg-violet-press' };

/** The tones the Figma components are drawn in. */
const DRAWN: Record<PatternKind, PatternTone> = { bars: 'press', sentences: 'press', reps: 'tint' };

export interface PatternProps {
  kind: PatternKind;
  tone?: PatternTone;
  /**
   * Side of the 1440 drawing in CSS pixels: 1008 on a phone block, 720 on a card, 1440 on desktop.
   * Leave it out to set `--pattern-size` from a class instead, for example `md:[--pattern-size:1440px]`.
   */
  size?: number;
  className?: string;
}

/**
 * A tone-on-tone background for a violet block. The parent needs `relative`; put the picture and the words after it.
 * The drawing is a mask over a flat token color, anchored top left. On a block larger than `size`
 * it grows to cover the block, so there is no tile edge and no seam.
 */
export function Pattern({ kind, tone = DRAWN[kind], size, className }: PatternProps) {
  const side = 'max(var(--pattern-size, 1008px), 100%)';
  const mask = `url(/pattern/${kind}.svg) 0 0 / cover no-repeat`;
  const sized = size === undefined ? undefined : ({ '--pattern-size': `${size}px` } as CSSProperties);
  return (
    <div aria-hidden="true" style={sized} className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className={cn('absolute top-0 left-0', TONE[tone])} style={{ width: side, height: side, mask, WebkitMask: mask }} />
    </div>
  );
}
