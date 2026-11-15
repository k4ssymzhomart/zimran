import type { ComponentProps } from 'react';
import { cn, focusRing } from './cn';

export interface TextFieldProps extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'className'> {
  /** Names the field for screen readers. On screen the question above the field does that job. */
  label: string;
  value: string;
  onChange(value: string): void;
  className?: string;
}

/** The one-line answer field of the quiz: large type on a mist block, violet caret. */
export function TextField({ label, value, onChange, className, type = 'text', ...input }: TextFieldProps) {
  return (
    <label className={cn('block', className)}>
      <span className="sr-only">{label}</span>
      <input
        {...input}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-[60px] w-full rounded-[18px] bg-mist px-[18px] text-heading text-ink caret-violet placeholder:text-faint',
          focusRing,
        )}
      />
    </label>
  );
}
