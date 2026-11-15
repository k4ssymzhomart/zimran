import Image from 'next/image';
import { cn, colorMotion, focusRingWithin } from './cn';

export interface ChoiceTileProps {
  label: string;
  /** A 3D object from public/art, such as "/art/sun.png". */
  art: string;
  selected: boolean;
  onChange(selected: boolean): void;
  /** Several tiles can be chosen (a checkbox). The default is one choice (a radio). */
  multiple?: boolean;
  /** Radios that share a name are one question: the arrow keys move between them. */
  name?: string;
  value?: string;
  disabled?: boolean;
  className?: string;
}

/** A picture answer that sits two to a row: a small 3D object and a short label. It fills its grid cell. */
export function ChoiceTile({ label, art, selected, onChange, multiple = false, name, value, disabled, className }: ChoiceTileProps) {
  return (
    <label
      className={cn(
        'relative flex min-h-[76px] w-full items-center gap-[10px] rounded-[20px] py-[10px]',
        /* The selected border is 1px thicker; the padding gives that pixel back. */
        selected ? 'border-2 border-violet bg-lilac pl-[11px] pr-[9px]' : 'border border-line bg-white pl-[12px] pr-[10px]',
        disabled ? 'cursor-not-allowed text-faint' : 'cursor-pointer text-ink',
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
        className="sr-only"
      />
      <Image src={art} alt="" width={40} height={40} className="size-[40px] shrink-0 object-contain" />
      <span className="min-w-0 flex-1 text-label">{label}</span>
    </label>
  );
}
