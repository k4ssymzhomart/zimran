'use client';

/**
 * The paywall and the screens after it, in each of their states, for Mia and for Leo, to check them against the
 * frames (27:462, 27:507, 27:552, 27:599, 27:645, 27:664, 27:687, 33:171, 33:204). A development tool: the
 * production build answers 404 here.
 *
 * Every value in this file is for the preview only and nothing in the product imports it. The screens are the
 * real ones: the line over the headline goes through momentLine and the renewal date is counted by termsLine from
 * the day below, exactly as /pricing counts it from today. The two "live" states mount the page itself: they read
 * this device's own profile and today's date, and their actions are real, so "Continue" saves access on this device.
 *
 * Open /preview/paywall for the list, or /preview/paywall#paywall-demo-mia for one state.
 */
import { notFound } from 'next/navigation';
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import type { PlanId } from '@/client/entitlement';
import { CHILDREN } from '@/components/child';
import { Paywall } from '@/components/pricing/Paywall';
import { PaywallScreen, type CheckoutMode } from '@/components/pricing/PaywallScreen';
import { momentLine } from '@/components/pricing/plans';
import { Confirming, NotCompleted, YoureIn } from '@/components/pricing/UnlockedScreens';
import type { PartnerId } from '@/lib/types';

// ---------- what a parent might have chosen, for the preview only ----------

/** The day the frames were drawn for: four weeks on is the "13 December 2026" they print. */
const DRAWN_ON = '2026-11-15';
const MOMENT = 'After dinner';
const SCENE = 'blocks';
/** What the checkout route answers while no Stripe key is set, as the screen receives it. */
const NOT_SET_UP = 'Test checkout is not set up on this deployment.';

// ---------- the screens with preview props ----------

/** Shows which callback of the screen fired, so a click can be checked by eye and by a script. */
function Fired({ children }: { children: ReactNode }) {
  return (
    <p data-testid="fired" className="fixed top-[8px] right-[8px] z-10 rounded-[13px] bg-ink px-[10px] py-[4px] text-small-strong text-white">
      {children}
    </p>
  );
}

interface WallProps {
  checkout: CheckoutMode;
  partner: PartnerId;
  /** False leaves out the daily moment, as on a device that never chose one. */
  withMoment?: boolean;
  plan?: PlanId;
  opening?: boolean;
  cancelled?: boolean;
  error?: string | null;
  ready?: boolean;
}

/** The paywall with its state held here: the plans can be chosen, the actions only say that they fired. */
function Wall({ checkout, partner, withMoment = true, plan = 'four_weeks', opening, cancelled, error, ready = true }: WallProps) {
  const [planId, setPlanId] = useState<PlanId>(plan);
  const [fired, setFired] = useState<string | null>(null);
  return (
    <>
      <PaywallScreen
        checkout={checkout}
        partner={partner}
        ready={ready}
        moment={withMoment ? momentLine(MOMENT, SCENE) : null}
        planId={planId}
        onPlan={setPlanId}
        today={DRAWN_ON}
        opening={opening}
        cancelled={cancelled}
        error={error}
        onContinue={() => setFired(`onContinue(${planId})`)}
        onDemo={() => setFired(`onDemo(${planId})`)}
        onClose={() => setFired('onClose')}
      />
      {fired && <Fired>{fired}</Fired>}
    </>
  );
}

interface PreviewState {
  key: string;
  title: string;
  screen: ReactNode;
}

function statesFor(partner: PartnerId): PreviewState[] {
  const { name } = CHILDREN[partner];
  return [
    { key: `paywall-demo-${partner}`, title: `Paywall with ${name}, no payment taken (demo)`, screen: <Wall checkout="demo" partner={partner} /> },
    {
      key: `paywall-demo-12-${partner}`,
      title: `Paywall with ${name}, 12 weeks chosen (demo)`,
      screen: <Wall checkout="demo" partner={partner} plan="twelve_weeks" />,
    },
    {
      key: `paywall-demo-no-moment-${partner}`,
      title: `Paywall with ${name}, no daily moment chosen (demo)`,
      screen: <Wall checkout="demo" partner={partner} withMoment={false} />,
    },
    { key: `paywall-stripe-${partner}`, title: `Paywall with ${name}, test checkout`, screen: <Wall checkout="stripe" partner={partner} /> },
    {
      key: `paywall-opening-${partner}`,
      title: `Paywall with ${name}, opening the checkout`,
      screen: <Wall checkout="stripe" partner={partner} opening />,
    },
    {
      key: `paywall-failed-${partner}`,
      title: `Paywall with ${name}, the checkout did not open`,
      screen: <Wall checkout="stripe" partner={partner} error={NOT_SET_UP} />,
    },
    {
      key: `paywall-closed-${partner}`,
      title: `Paywall with ${name}, back without paying`,
      screen: <Wall checkout="stripe" partner={partner} cancelled />,
    },
    {
      key: `paywall-waiting-${partner}`,
      title: `Paywall with ${name}, before the device has been read`,
      screen: <Wall checkout="demo" partner={partner} ready={false} />,
    },
    { key: `in-demo-${partner}`, title: `You're in with ${name}, demo access`, screen: <YoureIn partner={partner} demo /> },
    { key: `in-test-${partner}`, title: `You're in with ${name}, after a test payment`, screen: <YoureIn partner={partner} demo={false} /> },
    { key: `not-completed-${partner}`, title: `The payment was not completed, with ${name}`, screen: <NotCompleted partner={partner} /> },
  ];
}

const STATES: readonly PreviewState[] = [
  ...statesFor('mia'),
  ...statesFor('leo'),
  { key: 'confirming', title: 'Confirming the test payment', screen: <Confirming /> },
  { key: 'live-demo', title: 'Live: the page itself, no payment taken (this device’s profile, today’s date)', screen: <Paywall checkout="demo" /> },
  { key: 'live-stripe', title: 'Live: the page itself, test checkout (this device’s profile, today’s date)', screen: <Paywall checkout="stripe" /> },
];

// ---------- the page ----------

/** The state to show is the part of the address after "#": read in the browser only, so the page itself stays static. */
const onHash = (changed: () => void) => {
  window.addEventListener('hashchange', changed);
  return () => window.removeEventListener('hashchange', changed);
};
const hashNow = () => window.location.hash.slice(1);
const noHash = () => '';

function Preview() {
  const key = useSyncExternalStore(onHash, hashNow, noHash);
  const state = STATES.find((s) => s.key === key);
  if (state) return <div key={state.key}>{state.screen}</div>;
  return (
    <main className="split-root px-[24px] py-[32px] lg:px-[48px]">
      <h1 className="text-title text-ink">The paywall and the way back from it</h1>
      <ul className="flex flex-col pt-[16px]">
        {STATES.map((s) => (
          <li key={s.key}>
            <a href={`#${s.key}`} className="flex min-h-[44px] items-center py-[4px] text-body text-violet">
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default function PaywallPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Preview />;
}
