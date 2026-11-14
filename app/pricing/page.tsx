'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell, DemoBadge } from '@/components/Bits';
import { Mia } from '@/components/Mia';
import { demoUnlock, startCheckout, type PlanId } from '@/client/entitlement';

/** The same numbers as PLANS in app/api/checkout/route.ts, which is what Stripe really charges. */
const PLANS: { id: PlanId; title: string; weeks: number; price: string; perDay: string; note: string }[] = [
  { id: 'twelve_weeks', title: '12 weeks', weeks: 12, price: '$69', perDay: '$0.82 a day', note: 'The usual length of a clinic programme' },
  { id: 'four_weeks', title: '4 weeks', weeks: 4, price: '$29', perDay: '$1.04 a day', note: 'The 28-day plan' },
];

const INCLUDED = [
  { dot: 'bg-sun', text: 'Five minutes a day: every sentence coded as you say it, and a coach line when it helps' },
  { dot: 'bg-leaf', text: 'The 28-day plan, one skill a week' },
  { dot: 'bg-sky', text: 'Your progress toward the clinic numbers' },
  { dot: 'bg-tomato', text: 'After day 28: the same five minutes a day, to keep the habit' },
];

function dateInWeeks(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function PricingPage() {
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
    <Shell>
      <section className="rise flex items-end gap-3">
        <div className="shrink-0">
          <Mia face="beaming" posture="leaning_in" size={96} />
        </div>
        <div className="pb-2">
          <h1 className="font-display text-3xl font-semibold leading-tight">
            Keep going with <span className="italic text-tomato">Mia</span>
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Practise with Mia every day, five minutes at a time.</p>
        </div>
      </section>

      <ul className="rise delay-1 sticker mt-5 space-y-2.5 bg-[#fffaf0] p-4 text-sm">
        {INCLUDED.map((item) => (
          <li key={item.text} className="flex items-start gap-3">
            <span aria-hidden="true" className={`mt-1 h-3 w-3 shrink-0 rounded-[4px] border-2 border-ink ${item.dot}`} />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>

      {/* Real radio buttons inside labels: arrow keys, screen readers and tapping the card all work. */}
      <fieldset className="rise delay-2 mt-6">
        <legend className="font-display text-lg font-semibold">Choose your plan</legend>
        <div className="mt-3 space-y-3">
          {PLANS.map((p) => (
            <label
              key={p.id}
              className={`sticker-sm flex cursor-pointer items-center gap-3 p-4 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-sun/70 ${
                p.id === planId ? 'bg-sun/35' : 'bg-[#fffdf8]'
              }`}
            >
              <input
                type="radio"
                name="plan"
                value={p.id}
                checked={p.id === planId}
                onChange={() => setPlanId(p.id)}
                className="h-5 w-5 shrink-0 accent-tomato"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-semibold leading-tight">{p.title}</span>
                <span className="block text-sm text-ink-soft">
                  {p.perDay} · {p.note}
                </span>
              </span>
              <span className="font-display text-2xl font-semibold">{p.price}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* The terms in full, right above the button. Reads as a whole sentence before the date is known.
          Nothing is said about cancelling: this build has no cancel control yet, and the checkout is test mode only. */}
      <p className="rise delay-3 mt-5 text-sm leading-relaxed" aria-live="polite">
        <strong>{plan.price} today.</strong> It renews at the same {plan.price} every {plan.weeks} weeks
        {renewsOn ? `, next on ${renewsOn[planId]}` : `, next in ${plan.weeks} weeks`}.
      </p>

      <button onClick={pay} disabled={busy} className="btn btn-primary rise delay-3 mt-4 w-full text-lg">
        {busy ? 'Opening checkout…' : `Continue — ${plan.price}`}
      </button>

      <p className="rise delay-4 sticker-sm mt-5 bg-sun px-4 py-3 text-sm leading-snug">
        <strong>Test mode.</strong> Use card <strong className="whitespace-nowrap">4242 4242 4242 4242</strong>, any
        future date, any CVC. No real charge.
      </p>

      <div role="status" aria-live="polite">
        {cancelled && !error && (
          <p className="mt-4 text-sm text-ink-soft">Checkout was closed and nothing was charged. Pick up whenever you like.</p>
        )}
        {error && (
          <div className="pop sticker-sm mt-5 bg-[#fffaf0] p-4">
            <p className="text-sm leading-snug">
              {error} Nothing was charged. You can still look around:
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button onClick={unlockDemo} className="btn btn-plain">
                Unlock in demo mode instead
              </button>
              <DemoBadge>Demo unlock · no payment</DemoBadge>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
