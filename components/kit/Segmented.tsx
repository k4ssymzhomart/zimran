import { useId } from 'react';
import { cn, colorMotion, focusRingWithin, pickOnEnter } from './cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  /** Names the control for screen readers: what the segments switch between. */
  label: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange(value: T): void;
  /** Fill the container and share the width equally ("Trends | Sessions"). The default hugs its labels ("Mia | Leo"). */
  fullWidth?: boolean;
  className?: string;
}

/** Two or three views of one screen. A radiogroup of native radios, so the arrow keys move the selection. */
export function Segmented<T extends string>({ label, options, value, onChange, fullWidth = false, className }: SegmentedProps<T>) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('rounded-[14px] bg-mist p-[4px]', fullWidth ? 'flex w-full' : 'inline-flex', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              /* A segment is 36px tall; it reaches 4px past its edges, to the 44px of the track. */
              'relative flex h-[36px] cursor-pointer items-center justify-center rounded-[10px] px-[16px] text-label whitespace-nowrap',
              'after:absolute after:inset-x-0 after:-inset-y-[4px]',
              fullWidth && 'min-w-0 flex-1',
              selected ? 'bg-ink text-white' : 'text-ink',
              colorMotion,
              focusRingWithin,
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              onKeyDown={pickOnEnter}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
