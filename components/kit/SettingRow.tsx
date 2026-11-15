import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn, focusRing } from './cn';
import { Toggle } from './Toggle';

export interface SettingRowProps {
  label: string;
  /** A 3D object from public/art, such as "/art/bell.png". */
  art?: string;
  /** The current value, in gray on the right: "19:30". */
  value?: string;
  /** A small node right after the label, such as a Tag. */
  tag?: ReactNode;
  /** The row opens another screen. */
  href?: string;
  /** The row acts in place, for example it opens a sheet. */
  onClick?(): void;
  /** The row holds a switch. It then ignores `href` and `onClick`. */
  toggle?: { checked: boolean; onChange(checked: boolean): void };
  /** The arrow on the right. A row with `href` shows it unless told otherwise. */
  chevron?: boolean;
  className?: string;
}

/** The 20px arrow at the end of a row that leads somewhere. PlanRow uses it too. */
export function RowChevron() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-faint">
      <path d="M7.5 5l5 5-5 5" />
    </svg>
  );
}

/** One line of a settings list: object, label, then a value, an arrow or a switch. */
export function SettingRow({ label, art, value, tag, href, onClick, toggle, chevron = Boolean(href), className }: SettingRowProps) {
  const row = cn('flex min-h-[56px] w-full items-center gap-[14px] text-left', className);
  const content = (
    <>
      {art ? <Image src={art} alt="" width={30} height={30} className="size-[30px] shrink-0 object-contain" /> : null}
      <span className="flex min-w-0 flex-1 items-center gap-[8px] text-body text-ink">
        {label}
        {tag}
      </span>
      {value ? <span className="shrink-0 text-label text-gray">{value}</span> : null}
      {toggle ? <Toggle label={label} checked={toggle.checked} onChange={toggle.onChange} /> : null}
      {chevron && !toggle ? <RowChevron /> : null}
    </>
  );

  if (toggle) return <div className={row}>{content}</div>;
  if (href) {
    return (
      <Link href={href} className={cn(row, focusRing)}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(row, focusRing)}>
        {content}
      </button>
    );
  }
  return <div className={row}>{content}</div>;
}
