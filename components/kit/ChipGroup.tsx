import { useId } from 'react';
import { chipClasses } from './Chip';
import { cn, focusRingWithin } from './cn';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

export interface ChipGroupProps<T extends string> {
  /** Names the group for screen readers: the question these chips answer. */
  label: string;
  options: ReadonlyArray<ChipOption<T>>;
  /** The chosen value, or null while nothing is chosen. */
  value: T | null;
  onChange(value: T): void;
  className?: string;
}

/** One choice out of a few short ones: a filter, an age, a check-in answer. Native radios, so the arrow keys work. */
export function ChipGroup<T extends string>({ label, options, value, onChange, className }: ChipGroupProps<T>) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap gap-[8px]', className)}>
      {options.map((option) => (
        <label key={option.value} className={cn(chipClasses(option.value === value, true), focusRingWithin)}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
