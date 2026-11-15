import { cn, colorMotion, focusRing } from './cn';

export interface ToggleProps {
  checked: boolean;
  onChange(checked: boolean): void;
  /** Names the switch for screen readers: the label of the row it sits in. */
  label: string;
  disabled?: boolean;
  className?: string;
}

/** An on/off switch. The track is 32px tall; it reaches 6px past its top and bottom edge, so the touch target is 44px. */
export function Toggle({ checked, onChange, label, disabled, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[32px] w-[52px] shrink-0 cursor-pointer rounded-full after:absolute after:inset-x-0 after:-inset-y-[6px]',
        /* A switch that cannot be changed keeps its side and fades to the pale tone of its color. */
        checked ? 'bg-violet disabled:bg-lilac-2' : 'bg-line disabled:bg-mist',
        'disabled:cursor-not-allowed',
        colorMotion,
        focusRing,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-[3px] left-[3px] size-[26px] rounded-full bg-white',
          'transition-transform duration-quick ease-out-quint motion-reduce:transition-none',
          checked && 'translate-x-[20px]',
        )}
      />
    </button>
  );
}
