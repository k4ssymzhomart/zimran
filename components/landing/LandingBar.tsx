'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button, Logo } from '@/components/kit';
import { cn, focusRing, focusRingOnViolet } from '@/components/kit/cn';
import type { TopBarLink } from '@/components/shell/TopBar';
import { ROUTES } from '@/lib/routes';

export interface LandingBarProps {
  /** Links to the sections of this page that exist, in page order: "How it works", "Method", "Pricing". */
  sections?: TopBarLink[];
  /** Where "Try one answer" leads: the answer field on this page. */
  actionHref: string;
}

/** A scroll down faster than this, in pixels a millisecond, puts the bar away until the visitor scrolls back up. */
const FAST = 1;

/**
 * The top bar of the landing. It changes as the visitor goes down the page:
 * over the first screen it has no fill (white words on the violet block on phones, ink words on white from 1024px);
 * past it the bar turns white with a 1px line under it, a thin violet line that shows how far down the page
 * the visitor is, the section links marking the section in view, and the black "Try one answer" pill.
 * A fast scroll down puts it away; any scroll up brings it back, and so does the keyboard focus.
 */
export function LandingBar({ sections = [], actionHref }: LandingBarProps) {
  const bar = useRef<HTMLElement>(null);
  const [solid, setSolid] = useState(false);
  const [away, setAway] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const wide = window.matchMedia('(min-width: 1024px)');
    let lastY = window.scrollY;
    let lastT = performance.now();
    let frame = 0;

    function measure() {
      frame = 0;
      if (!el) return;
      const y = window.scrollY;
      const now = performance.now();
      const room = document.documentElement.scrollHeight - window.innerHeight;
      el.style.setProperty('--bar-progress', String(room > 0 ? Math.min(1, Math.max(0, y / room)) : 0));

      // The part of the first screen the bar sits on: the violet block on phones, the words on white from 1024px.
      const under = document.querySelector<HTMLElement>(wide.matches ? '[data-hero-words]' : '[data-hero-violet]');
      const height = el.offsetHeight;
      const isSolid = under ? under.getBoundingClientRect().bottom <= height : y > 0;
      setSolid(isSolid);

      const dy = y - lastY;
      const speed = dy / Math.max(1, now - lastT);
      // A jump of half a screen or more in one frame is a link to a section, not a fast scroll: the bar stays.
      if (!isSolid || dy < -2) setAway(false);
      else if (speed > FAST && dy < window.innerHeight / 2) setAway(true);
      lastY = y;
      lastT = now;

      // The section in view is the one across the line 40% down the screen.
      const line = window.innerHeight * 0.4;
      let inView: string | null = null;
      for (const { href } of sections) {
        const target = document.getElementById(href.slice(1));
        if (!target) continue;
        const rect = target.getBoundingClientRect();
        if (rect.top <= line && rect.bottom > line) inView = href;
      }
      setActive(inView);
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [sections]);

  const links = [...sections, { label: 'Jury guide', href: ROUTES.jury }, { label: 'Open app', href: ROUTES.today }];

  return (
    <>
      {/* The room the bar takes from 1024px. On phones the first screen keeps its own room for it, on violet. */}
      <div aria-hidden="true" className="hidden h-[80px] lg:block" />
      <header
        ref={bar}
        onFocus={() => setAway(false)}
        className={cn(
          'landing-bar fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)]',
          solid ? 'border-b border-line bg-white' : 'border-b border-transparent bg-transparent',
          away && solid && '-translate-y-full',
        )}
      >
        <div
          className={cn(
            'mx-auto flex max-w-[1440px] items-center justify-between px-[24px] lg:h-[80px] lg:px-[40px]',
            solid ? 'h-[64px]' : 'h-[48px]',
          )}
        >
          {/* On phones the bar starts on the violet block, so its logo starts white. */}
          <span className={cn(solid ? 'hidden' : 'lg:hidden')}>
            <Logo tone="white" />
          </span>
          <span className={cn(!solid && 'max-lg:hidden')}>
            <Logo />
          </span>

          <div className="flex items-center gap-[36px]">
            <nav aria-label="Site" className="hidden lg:block">
              <ul className="flex items-center gap-[36px]">
                {links.map((link) => {
                  const current = link.href === active;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={current ? 'location' : undefined}
                        className={cn(
                          'inline-flex min-h-[44px] items-center rounded-[8px] text-label transition-[color] duration-quick ease-out-quint',
                          current ? 'text-violet' : 'text-ink hover:text-violet',
                          focusRing,
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Phones, over the violet block: the way into the app, in white. */}
            <Link
              href={ROUTES.today}
              className={cn(
                'inline-flex min-h-[44px] items-center rounded-[8px] text-label text-white lg:hidden',
                solid && 'hidden',
                focusRingOnViolet,
              )}
            >
              Open app
            </Link>

            {/* The one action shows once the first screen, which has its own, is behind the visitor. */}
            <span className={cn('landing-bar-action', !solid && 'landing-bar-action-off')}>
              <Button href={actionHref} size="md" className="px-[20px] lg:w-[180px]">
                Try one answer
              </Button>
            </span>
          </div>
        </div>
        <div aria-hidden="true" className={cn('landing-bar-progress', !solid && 'opacity-0')} />
      </header>
    </>
  );
}
