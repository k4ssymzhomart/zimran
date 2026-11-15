import Image from 'next/image';
import Link from 'next/link';
import { Logo } from './Brand';
import { Check } from './Icons';

/**
 * The screen kit. Every screen is one column with one primary action, the way the Zimran quiz screens work:
 * optional 3D art on a soft violet card, a heavy headline, at most one line under it, then the action.
 */

/** Logo on the left, one quiet control on the right, and an optional progress line under it. */
export function TopBar({ right, progress, logoHref = '/' }: { right?: React.ReactNode; progress?: number | null; logoHref?: string | null }) {
  return (
    <header className="relative z-10 mx-auto w-full max-w-[1120px] px-5 sm:px-8">
      <div className="flex h-16 items-center justify-between">
        <Logo href={logoHref} />
        <div className="flex items-center gap-1">{right}</div>
      </div>
      {progress !== undefined && progress !== null && <Progress value={progress} className="mx-auto max-w-[480px]" />}
    </header>
  );
}

/** A thin rounded progress line, 0..1. */
export function Progress({ value, className = '', label = 'Progress' }: { value: number; className?: string; label?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-violet/16 ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="h-full rounded-full bg-violet transition-[width] duration-500 ease-out-quint" style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * One screen. `children` is the content, `action` the one primary action (and at most one quiet secondary
 * under it). `top` replaces the default bar, for screens with progress or their own controls.
 */
export function Screen({
  children,
  action,
  top,
  align = 'center',
  width = 'narrow',
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  top?: React.ReactNode;
  align?: 'center' | 'left';
  width?: 'narrow' | 'wide';
}) {
  return (
    <div className="glow flex min-h-[100dvh] flex-col">
      {top ?? <TopBar />}
      <main
        className={`mx-auto flex w-full flex-1 flex-col px-5 pb-10 pt-6 sm:pt-12 ${width === 'wide' ? 'max-w-[640px]' : 'max-w-[480px]'} ${
          align === 'center' ? 'text-center' : ''
        }`}
      >
        <div>{children}</div>
        {action && <div className="enter d3 mt-8 flex flex-col gap-2">{action}</div>}
      </main>
    </div>
  );
}

/** The 3D object on a soft violet card. Decorative: the screen's words carry the meaning. */
export function Art({
  src,
  size = 'md',
  className = '',
  priority = false,
  children,
}: {
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  const box = size === 'lg' ? 'h-64 sm:h-72' : size === 'sm' ? 'h-36' : 'h-48 sm:h-56';
  const img = size === 'lg' ? 220 : size === 'sm' ? 112 : 168;
  // A portrait (children) stands on the bottom edge of the card; a 3D object floats in the middle.
  const place = children ? 'flex items-end justify-center' : 'grid place-items-center';
  return (
    <div className={`art enter mx-auto w-full ${place} ${box} ${className}`} aria-hidden={children ? undefined : true}>
      {src && (
        <Image
          src={src}
          alt=""
          width={img}
          height={img}
          priority={priority}
          className="breathe drop-shadow-[0_18px_24px_rgba(108,99,255,0.28)]"
          style={{ width: img, height: img }}
        />
      )}
      {children}
    </div>
  );
}

/** A screen headline and its one supporting line. */
export function Heading({ title, lede, as = 'h1' }: { title: React.ReactNode; lede?: React.ReactNode; as?: 'h1' | 'h2' }) {
  const Tag = as;
  return (
    <>
      <Tag className="title enter d1 mt-7 text-[32px] text-fg sm:text-[40px]">{title}</Tag>
      {lede && <p className="lede enter d2 mx-auto mt-3 max-w-[400px]">{lede}</p>}
    </>
  );
}

/** A primary link styled as the one action of the screen. */
export function ActionLink({ href, children, variant = 'primary' }: { href: string; children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost' }) {
  return (
    <Link href={href} className={`btn btn-${variant} ${variant === 'ghost' ? '' : 'btn-block'}`}>
      {children}
    </Link>
  );
}

/** A large selectable answer, like a quiz option. Works as a radio inside a role="radiogroup". */
export function Option({
  label,
  icon,
  selected,
  onSelect,
  hint,
}: {
  label: string;
  icon?: string;
  selected: boolean;
  onSelect: () => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition-[box-shadow,background-color] duration-200 ${
        selected ? 'bg-violet/15 shadow-[0_0_0_2px_var(--color-violet)]' : 'bg-surface shadow-card hover:bg-surface-2'
      } focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-violet/50`}
    >
      {icon && <Image src={icon} alt="" width={48} height={48} className="h-12 w-12 shrink-0" />}
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold tracking-[-0.01em] text-fg">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-fg-soft">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors ${selected ? 'bg-violet text-white' : 'border-2 border-stroke'}`}
      >
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}

/** A big number with a small label: counts, days, prices. */
export function Stat({ value, label, tone = 'ink' }: { value: React.ReactNode; label: string; tone?: 'ink' | 'violet' | 'sky' | 'mint' }) {
  const color = { ink: 'text-fg', violet: 'text-lilac', sky: 'text-reflect', mint: 'text-describe' }[tone];
  return (
    <div className="text-center">
      <p className={`text-[34px] font-extrabold tabular-nums tracking-[-0.04em] ${color}`}>{value}</p>
      <p className="mt-0.5 text-[13px] font-medium text-fg-soft">{label}</p>
    </div>
  );
}

/** A small rounded label. */
export function Pill({ children, tone = 'violet' }: { children: React.ReactNode; tone?: 'violet' | 'mist' | 'mint' | 'dark' }) {
  const t = {
    violet: 'bg-violet/16 text-lilac',
    mist: 'bg-surface-2 text-fg-2',
    mint: 'bg-describe/14 text-describe',
    dark: 'bg-white/10 text-fg ring-1 ring-inset ring-white/15',
  }[tone];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${t}`}>{children}</span>;
}
