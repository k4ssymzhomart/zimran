import type { ComponentProps } from 'react';
import { cn, focusRing } from './cn';

export interface TextFieldProps extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'className'> {
  /** Names the field for screen readers. On screen the question above the field does that job. */
  label: string;
  value: string;
  onChange(value: string): void;
  /** The 56px field with body type, for a settings card. The default is the 60px answer field of the quiz. */
  compact?: boolean;
  className?: string;
}

/** The one-line answer field of the quiz: large type on a mist block, violet caret. */
export function TextField({ label, value, onChange, compact = false, className, type = 'text', ...input }: TextFieldProps) {
  return (
    <label className={cn('block', className)}>
      <span className="sr-only">{label}</span>
      {/* 22px or 17px type: iOS zooms the page on focus only below 16px. */}
      <input
        {...input}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'w-full rounded-[18px] bg-mist px-[18px] text-ink caret-violet placeholder:text-faint',
          compact ? 'h-[56px] text-body' : 'h-[60px] text-heading',
          focusRing,
        )}
      />
    </label>
  );
}
