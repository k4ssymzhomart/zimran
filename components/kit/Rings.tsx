import type { ReactNode } from 'react';
import { cn } from './cn';

/** `light` sits on white, `violet` on a violet block. */
export type RingTone = 'light' | 'violet';

const TRACK: Record<RingTone, string> = { light: 'stroke-line', violet: 'stroke-violet-press' };
const ARC: Record<RingTone, string> = { light: 'stroke-violet', violet: 'stroke-white' };

export interface RingProps {
  /** 0 is an empty track, 1 is a full ring. Values outside are clamped. */
  progress: number;
  /** Diameter in CSS pixels. The stroke is 9% of it, as in Figma. */
  size?: number;
  tone?: RingTone;
  /** The center slot: usually the count. */
  children?: ReactNode;
  className?: string;
}

/** One flat ring that fills clockwise from the top. */
export function Ring({ progress, size = 56, tone = 'light', children, className }: RingProps) {
  const share = Math.min(1, Math.max(0, progress));
  return (
    <span className={cn('relative grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 size-full -rotate-90" fill="none" strokeWidth="9">
        <circle cx="50" cy="50" r="45.5" className={TRACK[tone]} />
        <circle
          cx="50"
          cy="50"
          r="45.5"
          pathLength="100"
          strokeDasharray={`${share * 100} 100`}
          className={cn(ARC[tone], 'transition-[stroke-dasharray] duration-500 ease-out-quint motion-reduce:transition-none')}
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

export interface RingStat {
  /** What the center shows: a count, or a dash when the skill is not counted (reflections in live play). */
  value: ReactNode;
  /** Share of the clinic pace, 0..1. */
  progress: number;
  /** Change since the last session, already formatted: "+4", "−3". */
  delta?: string;
}

export interface RingsProps {
  praise: RingStat;
  reflect: RingStat;
  describe: RingStat;
  /** Sentences to swap: a count on a flat disc, never a ring to fill. */
  swap?: Omit<RingStat, 'progress'>;
  /** 56 in a round, 60 on Progress, 76 on desktop. From 72 up the text steps up a size. */
  size?: number;
  tone?: RingTone;
  /** The row has no spacing of its own: pass `justify-between`, or `justify-center gap-[22px]`. */
  className?: string;
}

/** The three skill rings toward the clinic pace, and the calm counter of sentences to swap. */
export function Rings({ praise, reflect, describe, swap, size = 56, tone = 'light', className }: RingsProps) {
  const large = size >= 72;
  const onViolet = tone === 'violet';
  const value = cn(large ? 'text-heading' : 'text-body-strong', 'tabular-nums', onViolet ? 'text-white' : 'text-ink');
  const label = cn(large ? 'text-label' : 'text-small', onViolet ? 'text-white' : 'text-gray');
  const delta = cn('text-small-strong tabular-nums', onViolet ? 'text-white' : 'text-violet');

  const stat = (name: string, s: Omit<RingStat, 'progress'>, picture: ReactNode) => (
    <div className="flex flex-col items-center gap-[6px]">
      {picture}
      <span className={label}>{name}</span>
      {s.delta !== undefined && <span className={delta}>{s.delta}</span>}
    </div>
  );
  const ring = (name: string, s: RingStat) =>
    stat(
      name,
      s,
      <Ring progress={s.progress} size={size} tone={tone}>
        <span className={value}>{s.value}</span>
      </Ring>,
    );

  return (
    <div className={cn('flex items-start', className)}>
      {ring('Praise', praise)}
      {ring('Reflect', reflect)}
      {ring('Describe', describe)}
      {swap &&
        stat(
          'To swap',
          swap,
          <span
            className={cn('grid shrink-0 place-items-center rounded-full', onViolet ? 'bg-violet-press' : 'bg-mist')}
            style={{ width: size, height: size }}
          >
            <span className={value}>{swap.value}</span>
          </span>,
        )}
    </div>
  );
}
