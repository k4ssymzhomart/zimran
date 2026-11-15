import { useId } from 'react';
import { chipClasses, type ChipTone } from './Chip';
import { cn, focusRingWithin, focusRingWithinOnViolet, pickOnEnter } from './cn';

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
  /** `on-violet` for a group on a violet card. The default sits on white. */
  tone?: ChipTone;
  className?: string;
}

/** One choice out of a few short ones: a filter, a scene, a check-in answer. Native radios, so the arrow keys work. */
export function ChipGroup<T extends string>({ label, options, value, onChange, tone = 'mist', className }: ChipGroupProps<T>) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap', tone === 'mist' ? 'gap-[8px]' : 'gap-[6px]', className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(chipClasses(option.value === value, true, tone), tone === 'mist' ? focusRingWithin : focusRingWithinOnViolet)}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            onKeyDown={pickOnEnter}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
