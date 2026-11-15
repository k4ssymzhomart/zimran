'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { DemoBadge } from '@/components/Bits';
import { Check } from '@/components/Icons';
import { MiaCard } from '@/components/pricing/MiaCard';
import { Heading, Pill, Screen } from '@/components/ui';
import { demoUnlock, startCheckout, type PlanId } from '@/client/entitlement';
import { useChild } from '@/components/child';

/** The same numbers as PLANS in app/api/checkout/route.ts, which is what Stripe really charges. */
const PLANS: { id: PlanId; title: string; weeks: number; price: string; perDay: string; best: boolean }[] = [
  { id: 'twelve_weeks', title: '12 weeks', weeks: 12, price: '$69', perDay: '$0.82 a day', best: true },
  { id: 'four_weeks', title: '4 weeks', weeks: 4, price: '$29', perDay: '$1.04 a day', best: false },
];

const INCLUDED = [
  'A coach line when it helps',
  'The 28-day plan, one skill a week',
  'Progress toward the clinic numbers',
  'After day 28, keep the habit going',
];

function dateInWeeks(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function PricingPage() {
  // A link back here starts the paywall fresh; the browser's Back button still restores it as it was.
  const { bfcacheId } = useRouter();
  return <Paywall key={bfcacheId} />;
}

/**
 * The paywall, built like the Coursiv and Jobescape ones: the plans, the terms and the one button fit on the first
 * screen; what both plans include sits under the action for anyone who scrolls.
 */
function Paywall() {
  const { child } = useChild();
  const router = useRouter();
  const [planId, setPlanId] = useState<PlanId>('twelve_weeks');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  // Renewal dates depend on today's date, so they are filled in after mount, never during render.
  const [renewsOn, setRenewsOn] = useState<Record<PlanId, string> | null>(null);

  useEffect(() => {
    // One tick later, so the first paint matches the prerendered page (and the hooks lint rule is satisfied).
    const timer = window.setTimeout(() => {
      setRenewsOn({ twelve_weeks: dateInWeeks(12), four_weeks: dateInWeeks(4) });
      // Stripe's "back" link returns here with ?cancelled=1.
      setCancelled(new URLSearchParams(window.location.search).has('cancelled'));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];

  async function pay() {
    setBusy(true);
    setError(null);
    const message = await startCheckout(planId); // null means the browser is already leaving for Stripe
    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  function unlockDemo() {
    demoUnlock();
    router.push('/dashboard');
  }

  return (
    <Screen
      action={
        <div className="flex flex-col">
          {/* The terms in full, right above the button. Reads as a whole sentence before the date is known.
              Nothing is said about cancelling: this build has no cancel control yet, and the checkout is test mode only. */}
          <p className="mx-auto max-w-[400px] text-[14px] leading-relaxed text-fg-soft" aria-live="polite">
            <strong className="font-semibold text-fg">{plan.price} today.</strong> It renews at the same {plan.price}{' '}
            <span className="whitespace-nowrap">every {plan.weeks} weeks</span>
            {renewsOn ? (
              <>
                , <span className="whitespace-nowrap">next on {renewsOn[planId]}</span>.
              </>
            ) : (
              `, next in ${plan.weeks} weeks.`
            )}
          </p>

          <button type="button" onClick={pay} disabled={busy} aria-busy={busy} className="btn btn-primary btn-block mt-4">
            {busy ? 'Opening checkout…' : `Continue with ${plan.price}`}
          </button>

          {/* Only words in the live region; the demo button sits outside it so it is not read out as an announcement. */}
          <div role="status" aria-live="polite">
            {cancelled && !error && <p className="mt-4 text-[14px] text-fg-soft">Checkout was closed. Nothing was charged.</p>}
            {error && (
              <p className="pop mx-auto mt-5 max-w-[400px] text-[14px] leading-relaxed text-fg-2">
                {error} <span className="whitespace-nowrap">Nothing was charged.</span>
              </p>
            )}
          </div>
          {error && (
            <div className="pop mt-3 flex flex-col items-center gap-2.5">
              <button type="button" onClick={unlockDemo} className="btn btn-secondary btn-block">
                Unlock in demo mode instead
              </button>
              <DemoBadge>Demo unlock, no payment</DemoBadge>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left">
            <Image src="/art/lock.png" alt="" width={32} height={32} className="h-8 w-8 shrink-0" />
            <p className="text-[13px] leading-snug text-fg-2">
              <strong className="block font-semibold text-fg">Test mode.</strong> Use card{' '}
              <span className="whitespace-nowrap font-semibold tabular-nums text-fg">4242 4242 4242 4242</span>, any future date,
              any CVC. No real charge.
            </p>
          </div>

          <section aria-labelledby="included-title" className="mt-12 text-left">
            <h2 id="included-title" className="text-[20px] font-extrabold tracking-[-0.03em] text-fg">
              Both plans include
            </h2>
            <ul className="mt-4 space-y-3">
              {INCLUDED.map((text) => (
                <li key={text} className="flex items-start gap-3 text-[16px] leading-snug tracking-[-0.01em] text-fg-2">
                  <span aria-hidden="true" className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet/16 text-lilac">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </section>
        </div>
      }
    >
      <MiaCard face="beaming" posture="leaning_in" size="sm" priority />
      <Heading
        title={`Keep practising with ${child.name}`}
        lede={
          <>
            Five minutes a day, every sentence coded <span className="whitespace-nowrap">as you say it.</span>
          </>
        }
      />

      {/* Real radio buttons inside labels: arrow keys, screen readers and tapping the card all work. */}
      <div role="radiogroup" aria-label="Choose your plan" className="enter d2 mt-8 space-y-3 text-left">
        {PLANS.map((p) => {
          const selected = p.id === planId;
          return (
            <label
              key={p.id}
              className={`relative flex cursor-pointer items-center gap-4 rounded-2xl px-4 py-4 transition-[box-shadow,background-color] duration-200 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-violet/50 ${
                selected ? 'bg-violet/10 shadow-[0_0_0_2px_var(--color-violet)]' : 'bg-surface shadow-card hover:bg-surface-2'
              }`}
            >
              <input
                type="radio"
                name="plan"
                value={p.id}
                checked={selected}
                onChange={() => setPlanId(p.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors ${
                  selected ? 'bg-violet text-white' : 'border-2 border-stroke'
                }`}
              >
                {selected && <Check size={14} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[18px] font-bold tracking-[-0.02em] text-fg">{p.title}</span>
                  {p.best && <Pill>Best value</Pill>}
                </span>
                <span className="mt-0.5 block text-[14px] tabular-nums text-fg-soft">{p.perDay}</span>
              </span>
              <span className="text-[26px] font-extrabold tabular-nums tracking-[-0.04em] text-fg">{p.price}</span>
            </label>
          );
        })}
      </div>
    </Screen>
  );
}
