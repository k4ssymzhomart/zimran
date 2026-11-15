import Image from 'next/image';
import { cn, colorMotion, focusRingWithin } from './cn';

export interface OptionProps {
  label: string;
  /** A 3D object from public/art, such as "/art/breakfast.png". Without it the row is text only and a little shorter. */
  art?: string;
  selected: boolean;
  onChange(selected: boolean): void;
  /** Several options can be chosen (a checkbox). The default is one choice (a radio). */
  multiple?: boolean;
  /** Radios that share a name are one question: the arrow keys move between them. Wrap them in role="radiogroup". */
  name?: string;
  value?: string;
  disabled?: boolean;
  className?: string;
}

/* The selected border is 1px thicker; the padding gives that pixel back, so nothing moves on select. */
const WITH_ART = { rest: 'pl-[14px] pr-[16px]', selected: 'pl-[13px] pr-[15px]' };
const TEXT_ONLY = { rest: 'pl-[18px] pr-[16px]', selected: 'pl-[17px] pr-[15px]' };

/** One answer of a quiz question: a full-width row with a radio mark on the right. */
export function Option({ label, art, selected, onChange, multiple = false, name, value, disabled, className }: OptionProps) {
  const padding = art ? WITH_ART : TEXT_ONLY;
  return (
    <label
      className={cn(
        'relative flex w-full items-center rounded-[20px] py-[10px]',
        art ? 'min-h-[68px] gap-[14px]' : 'min-h-[62px] gap-[12px]',
        selected ? `border-2 border-violet bg-lilac ${padding.selected}` : `border border-line bg-white ${padding.rest}`,
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
      {art ? <Image src={art} alt="" width={40} height={40} className="size-[40px] shrink-0 object-contain" /> : null}
      <span className="min-w-0 flex-1 text-body-strong">{label}</span>
      <span
        aria-hidden
        className={cn(
          'flex size-[24px] shrink-0 items-center justify-center rounded-full',
          selected ? 'bg-violet text-white' : 'border-[1.5px] border-line',
        )}
      >
        {selected ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.9 7l2.8 2.7 5.4-5.6" />
          </svg>
        ) : null}
      </span>
    </label>
  );
}
