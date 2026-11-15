import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn, focusRing } from '@/components/kit/cn';

export interface TopBarLink {
  label: string;
  href: string;
}

export interface TopBarProps {
  /** The logo, already linked home when it should be. */
  logo: ReactNode;
  /** A few text links, in reading order. They fold away under 1024px; the logo and the action stay. */
  links?: TopBarLink[];
  /** The one action: the black pill, 48px tall in this bar. */
  action?: ReactNode;
  className?: string;
}

/** The landing top bar (Figma "Top bar/Landing", 51:1433): the logo at the left, text links and one action at the right. */
export function TopBar({ logo, links = [], action, className }: TopBarProps) {
  return (
    <header
      className={cn('flex h-[64px] items-center justify-between bg-white px-[24px] text-ink lg:h-[80px] lg:px-[40px]', className)}
    >
      {logo}
      <div className="flex items-center gap-[36px]">
        {links.length > 0 && (
          <nav aria-label="Site" className="hidden lg:block">
            <ul className="flex items-center gap-[36px]">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={cn('inline-flex min-h-[44px] items-center rounded-[8px] text-label', focusRing)}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {action}
      </div>
    </header>
  );
}
