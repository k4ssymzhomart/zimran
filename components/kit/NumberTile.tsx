import { cn, colorMotion, focusRingWithin, pickOnEnter } from './cn';

/** `lg` is the 76px tile of the quiz. `sm` is the 48px tile of the same choice inside a settings card. */
export type NumberTileSize = 'lg' | 'sm';

export interface NumberTileProps {
  /** What the tile shows, in large type: an age, a count. Keep it to a few characters. */
  label: string;
  selected: boolean;
  onChange(selected: boolean): void;
  /** Several tiles can be chosen (a checkbox). The default is one choice (a radio). */
  multiple?: boolean;
  /** Radios that share a name are one question: the arrow keys move between them. Wrap them in role="radiogroup". */
  name?: string;
  value?: string;
  disabled?: boolean;
  size?: NumberTileSize;
  className?: string;
}

const SIZE: Record<NumberTileSize, string> = {
  lg: 'h-[76px] rounded-[20px] text-title',
  sm: 'h-[48px] rounded-[16px] text-body-strong',
};

/**
 * A number answer that sits three to a row, such as the ages of the quiz: no picture, no border, the chosen one in ink.
 * It fills its grid cell: three columns with a 10px gap make the 107px tile on a phone.
 */
export function NumberTile({ label, selected, onChange, multiple = false, name, value, disabled, size = 'lg', className }: NumberTileProps) {
  return (
    <label
      className={cn(
        'relative flex w-full items-center justify-center whitespace-nowrap',
        SIZE[size],
        selected ? 'bg-ink text-white' : disabled ? 'bg-mist text-faint' : 'bg-mist text-ink active:bg-line',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        colorMotion,
        focusRingWithin,
        className,
      )}
    >
      <input
        type={multiple ? 'checkbox' : 'radio'}
        name={name}
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        onKeyDown={pickOnEnter}
        className="sr-only"
      />
      {label}
    </label>
  );
}
