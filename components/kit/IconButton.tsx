import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from './cn';

/** `plain` sits on white, `on-violet` on a violet block; `ink` and `violet` are filled circles (send, microphone on). */
export type IconButtonVariant = 'plain' | 'on-violet' | 'ink' | 'violet';

interface IconButtonOwnProps {
  /** What the button does. It is the accessible name, since the button shows only an icon. */
  label: string;
  variant?: IconButtonVariant;
  className?: string;
  /** The icon, drawn with currentColor: 24px, or 22px inside a filled circle. */
  children: ReactNode;
}

type Own = keyof IconButtonOwnProps | 'aria-label';
type IconButtonAsButton = IconButtonOwnProps & Omit<ComponentProps<'button'>, Own> & { href?: undefined };
type IconButtonAsLink = IconButtonOwnProps & Omit<ComponentProps<typeof Link>, Own>;

/** With `href` the button is a link (a back arrow, a close cross); without it, a button. */
export type IconButtonProps = IconButtonAsButton | IconButtonAsLink;

const BASE =
  'inline-flex size-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full ' +
  'transition-colors duration-quick ease-out-quint motion-reduce:transition-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none';

const VARIANT: Record<IconButtonVariant, string> = {
  plain: 'text-ink active:bg-line focus-visible:outline-violet disabled:text-faint',
  'on-violet': 'text-white active:bg-violet-press focus-visible:outline-white',
  ink: 'bg-ink text-white focus-visible:outline-violet disabled:bg-line disabled:text-faint',
  violet: 'bg-violet text-white active:bg-violet-press focus-visible:outline-violet disabled:bg-line disabled:text-faint',
};

export function IconButton(props: IconButtonProps) {
  const { label, variant = 'plain', className, children, ...rest } = props;
  const classes = cn(BASE, VARIANT[variant], className);

  if (rest.href !== undefined) {
    return (
      <Link {...rest} aria-label={label} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" {...rest} aria-label={label} className={classes}>
      {children}
    </button>
  );
}
