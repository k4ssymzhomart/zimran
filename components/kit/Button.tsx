import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'ink' | 'violet' | 'white' | 'soft' | 'ghost';
export type ButtonSize = 'lg' | 'md';

interface ButtonOwnProps {
  /** `ink` is the one action of a screen. `white` is the same pill on a violet block. `ghost` is the quiet text action. */
  variant?: ButtonVariant;
  /** 56px, or 48px in the desktop top bar. A ghost button is always 44px. */
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Leading icon. Decorative: the label carries the meaning. */
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = ButtonOwnProps & Omit<ComponentProps<'button'>, keyof ButtonOwnProps> & { href?: undefined };
type ButtonAsLink = ButtonOwnProps & Omit<ComponentProps<typeof Link>, keyof ButtonOwnProps>;

/** With `href` the button is a link and takes the props of next/link; without it, the props of a button. */
export type ButtonProps = ButtonAsButton | ButtonAsLink;

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-[8px] whitespace-nowrap select-none ' +
  'transition-[background-color,color,scale] duration-quick ease-out-quint motion-reduce:transition-none ' +
  'motion-safe:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'disabled:pointer-events-none';

const PILL = 'rounded-[28px] px-[24px] text-body-strong';

const SIZE: Record<ButtonSize, string> = { lg: 'h-[56px]', md: 'h-[48px]' };

const VARIANT: Record<ButtonVariant, string> = {
  ink: `${PILL} bg-ink text-white focus-visible:outline-violet disabled:bg-mist disabled:text-faint`,
  violet: `${PILL} bg-violet text-white active:bg-violet-press focus-visible:outline-violet disabled:bg-mist disabled:text-faint`,
  white: `${PILL} bg-white text-ink active:bg-lilac focus-visible:outline-white disabled:bg-violet-tint disabled:text-lilac-2`,
  soft: `${PILL} bg-mist text-ink active:bg-line focus-visible:outline-violet disabled:text-faint`,
  ghost:
    'h-[44px] rounded-[22px] px-[24px] text-label text-gray hover:text-ink active:text-ink focus-visible:outline-violet disabled:text-faint',
};

export function Button(props: ButtonProps) {
  const { variant = 'ink', size = 'lg', fullWidth = false, icon, className, children, ...rest } = props;
  const classes = cn(BASE, VARIANT[variant], variant !== 'ghost' && SIZE[size], fullWidth && 'w-full', className);
  const content = (
    <>
      {icon ? (
        <span aria-hidden className="flex shrink-0">
          {icon}
        </span>
      ) : null}
      {children}
    </>
  );

  if (rest.href !== undefined) {
    return (
      <Link {...rest} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" {...rest} className={classes}>
      {content}
    </button>
  );
}
