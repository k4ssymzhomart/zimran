import Image from 'next/image';
import { cn, colorMotion, focusRingWithin, pickOnEnter } from './cn';

export interface TileProps {
  label: string;
  /** A 3D object from public/art, such as "/art/cake.png". */
  art: string;
  /** The two Figma variants: Tile/Default and Tile/Selected. */
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

/** The tall quiz tile: a 60px object over its label. It fills its grid cell. */
export function Tile({ label, art, selected, onChange, multiple = false, name, value, disabled, className }: TileProps) {
  return (
    <label
      className={cn(
        'relative flex min-h-[140px] w-full flex-col items-start gap-[10px] rounded-[24px]',
        /* The selected border is 1px thicker; the padding gives that pixel back. */
        selected
          ? 'border-2 border-ink bg-lilac px-[15px] pt-[17px] pb-[15px]'
          : 'border border-line bg-white px-[16px] pt-[18px] pb-[16px]',
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
        onKeyDown={pickOnEnter}
        className="sr-only"
      />
      <Image src={art} alt="" width={60} height={60} className="size-[60px] shrink-0 object-contain" />
      <span className="w-full text-body-strong">{label}</span>
    </label>
  );
}
