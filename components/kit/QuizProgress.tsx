import { cn } from './cn';

export interface QuizProgressProps {
  /** How many segments the bar has. */
  steps: number;
  /** The step the parent is on, counted from 1. Segments up to and including it are filled. */
  current: number;
  /** Names the bar for screen readers. */
  label?: string;
  className?: string;
}

/** The segmented bar at the top of the quiz. It sits on the violet block: white for done, pressed violet for ahead. */
export function QuizProgress({ steps, current, label = 'Progress', className }: QuizProgressProps) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={steps}
      aria-valuenow={current}
      aria-valuetext={`${current} of ${steps}`}
      className={cn('flex h-[4px] items-center gap-[4px]', className)}
    >
      {Array.from({ length: steps }, (_, index) => (
        <span
          key={index}
          className={cn('h-[4px] min-w-0 flex-1 rounded-[2px]', index < current ? 'bg-white' : 'bg-violet-press')}
        />
      ))}
    </div>
  );
}
