import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  NOT_AFFILIATED,
  NOT_THERAPY,
  NUMBERS,
  REAL,
  REAL_LINE,
  SIMULATED,
  THERAPIST_LINK,
  TRIALS,
  ACCOUNTS_ON,
  notBuilt,
  steps,
  type Checkout,
  type Fact,
} from '@/components/jury/guide';
import { WayBack } from '@/components/jury/WayBack';
import { Button, cn, focusRing } from '@/components/kit';
import { ROUTES } from '@/lib/routes';
import { accountsAvailable } from '../api/account/store';

export const metadata: Metadata = {
  title: 'Jury guide: Fammy in three minutes',
  description: 'The three-minute path through Fammy, what is real, what is simulated, what is not built, and how to try to break it.',
};

/** The guide is white from the top edge; the root layout sets the violet of the Split screens. */
export const viewport: Viewport = { themeColor: 'white' };

/** One part of the guide under its heading. */
function Part({ id, title, className, children }: { id: string; title: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn('flex flex-col', className)}>
      <h2 id={id} className="text-heading">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A list of statements: the thing in ink, what is true of it in gray under it (Figma 27:1032). */
function Facts({ items }: { items: readonly Fact[] }) {
  return (
    <ul role="list" className="flex flex-col gap-[4px]">
      {items.map((item) => (
        <li key={item.title} className="flex flex-col gap-[2px] py-[10px]">
          <p className="text-body-strong">{item.title}</p>
          <p className="text-label text-pretty text-gray">{item.detail}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * The jury guide (Figma 27:973 on phones, 33:315 from 1024px): the path to walk in three minutes, what to type to
 * test the rules, and which parts are real. It is a page of statements, with no data of anyone on it; every statement
 * is in components/jury/guide.ts, and the ones about the rules are run against the engine in its test.
 *
 * Phones read one column in the order of the frame. From 1024px the page is three columns: the path with what is
 * not built under it, the ways to break it, the numbers with what is real and what is simulated.
 */
export default function JuryPage() {
  // The same rule as app/pricing/page.tsx, so the guide describes the paywall this deployment really has.
  const checkout: Checkout = process.env.STRIPE_SECRET_KEY ? 'stripe' : 'demo';
  // With an account store the optional account exists, and only its password reset is missing.
  const missing = notBuilt(checkout).map((fact) => (fact.title === 'Accounts' && accountsAvailable() ? ACCOUNTS_ON : fact));

  return (
    <div className="split-root flex flex-col pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col lg:max-w-[1440px]">
        <div className="flex h-[44px] shrink-0 items-center justify-between px-[12px] lg:h-[88px] lg:pl-[4px] lg:pr-[40px] xl:pl-[28px] xl:pr-[56px]">
          <WayBack />
          <div className="hidden lg:block">
            <Button href={ROUTES.start} className="w-[160px]">
              Start
            </Button>
          </div>
        </div>

        <main className="flex flex-1 flex-col px-[24px] pt-[12px] lg:px-[40px] lg:pt-0 xl:px-[64px]">
          <h1 className="text-display lg:text-display-xl">Jury guide</h1>

          <div className="flex flex-1 flex-col gap-[36px] pt-[36px] lg:grid lg:grid-cols-3 lg:grid-rows-[auto_1fr] lg:gap-x-[40px] lg:pt-[44px] xl:gap-x-[72px]">
            <Part id="path" title="Three minutes" className="gap-[4px] lg:col-start-1 lg:row-start-1">
              <ol role="list" className="flex flex-col gap-[4px]">
                {steps(checkout).map((step, i) => (
                  <li key={step.href} className={cn(i > 0 && 'border-t border-line pt-[4px]')}>
                    <Link
                      href={step.href}
                      className={cn(
                        'grid min-h-[48px] grid-cols-[16px_minmax(0,1fr)_auto] items-baseline gap-x-[12px] gap-y-[2px] rounded-[8px] py-[12px]',
                        focusRing,
                      )}
                    >
                      <span aria-hidden="true" className="text-body-strong text-violet">
                        {i + 1}
                      </span>
                      <span className="text-body">{step.label}</span>
                      <span className="text-label text-faint">{step.href}</span>
                      <span className="col-span-2 col-start-2 text-label text-pretty text-gray">{step.detail}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </Part>

            <Part id="break" title="Try to break it" className="gap-[4px] lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <Facts items={TRIALS} />
            </Part>

            <div className="flex flex-col gap-[36px] lg:col-start-3 lg:row-span-2 lg:row-start-1">
              <Part id="numbers" title="Numbers" className="gap-[14px]">
                <ul role="list" className="flex flex-col gap-[14px]">
                  {NUMBERS.map((figure) => (
                    <li key={figure.value}>
                      <p className="text-title">{figure.value}</p>
                      <p className="text-body text-pretty text-gray">{figure.caption}</p>
                    </li>
                  ))}
                </ul>
              </Part>

              <Part id="real" title="What is real" className="gap-[8px]">
                <p className="text-body text-pretty">{REAL_LINE}</p>
                <Facts items={REAL} />
              </Part>

              <Part id="simulated" title="What is simulated" className="gap-[4px]">
                <Facts items={SIMULATED} />
              </Part>
            </div>

            <Part id="not-built" title="What is not built" className="gap-[4px] lg:col-start-1 lg:row-start-2">
              <Facts items={missing} />
            </Part>
          </div>
        </main>

        {/* The lines every screen of this kind carries and, on phones, the one action under them (27:1064, 27:1066). */}
        <footer className="px-[24px] pt-[28px] pb-[max(24px,env(safe-area-inset-bottom))] lg:px-[40px] lg:pb-[36px] xl:px-[64px]">
          <p className="text-small text-gray">
            {NOT_THERAPY}{' '}
            <a
              href={THERAPIST_LINK.href}
              target="_blank"
              rel="noreferrer"
              className={cn('rounded-[4px] underline decoration-faint underline-offset-2', focusRing)}
            >
              {THERAPIST_LINK.label}
            </a>
            . {NOT_AFFILIATED}
          </p>
          <div className="pt-[24px] lg:hidden">
            <Button href={ROUTES.start} fullWidth>
              Start
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
