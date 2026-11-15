'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { demoUnlock, startCheckout, type PlanId } from '@/client/entitlement';
import { todayISO } from '@/client/progressStore';
import { useProfile } from '@/hooks/useProfile';
import { ROUTES } from '@/lib/routes';
import { PaywallScreen, type CheckoutMode } from './PaywallScreen';
import { DEFAULT_PLAN, isPlanId, momentLine } from './plans';

/** The part of the Navigation API the way back needs. Older browsers do not have it. */
interface WithNavigation {
  navigation?: { currentEntry?: { index: number } | null };
}

export interface PaywallProps {
  /** Decided on the server: `stripe` when a Stripe key is set, `demo` when no payment is taken on the site. */
  checkout: CheckoutMode;
}

/** The paywall of /pricing. A link here starts it fresh; the browser's Back button restores it as it was. */
export function Paywall({ checkout }: PaywallProps) {
  const { bfcacheId } = useRouter();
  return <PaywallFlow key={bfcacheId} checkout={checkout} />;
}

function PaywallFlow({ checkout }: PaywallProps) {
  const router = useRouter();
  const { profile, ready } = useProfile();
  const [planId, setPlanId] = useState<PlanId>(DEFAULT_PLAN);
  /** Today on this device. Read after mount, never during render: the renewal date is counted from it. */
  const [today, setToday] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  /** The address is read once: a page the browser brings back keeps the plan the visitor chose on it. */
  const addressRead = useRef(false);

  useEffect(() => {
    // One tick later, so the first paint matches the prerendered page.
    const timer = window.setTimeout(() => {
      setToday(todayISO());
      if (addressRead.current) return;
      addressRead.current = true;
      const query = new URLSearchParams(window.location.search);
      // The plan cards of the landing lead here with ?plan=four_weeks or ?plan=twelve_weeks.
      const asked = query.get('plan');
      if (isPlanId(asked)) setPlanId(asked);
      // Stripe's own "back" link returns here with ?cancelled=1.
      setCancelled(query.has('cancelled'));
    }, 0);
    // Back from Stripe's page the browser may show this page as it was left: still opening the checkout.
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setOpening(false);
    };
    window.addEventListener('pageshow', onShow);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pageshow', onShow);
    };
  }, []);

  /** Access with no payment, for the chosen plan, saved as a demo. Then the screen that says so. */
  function unlock() {
    demoUnlock(planId);
    router.push(ROUTES.unlocked);
  }

  async function pay() {
    if (opening) return;
    if (checkout === 'demo') {
      unlock();
      return;
    }
    setOpening(true);
    setError(null);
    const message = await startCheckout(planId); // null: the browser is already leaving for Stripe
    if (message !== null) {
      setError(message);
      setOpening(false);
    }
  }

  /**
   * The cross goes back to the page the visitor came from while that page is ours. A visitor who came in here
   * goes to their plan when they have started one, and to the landing when they have not.
   */
  function close() {
    // The Navigation API lists the entries of this site only: past the first one, the page before is ours.
    const entry = (window as WithNavigation).navigation?.currentEntry;
    const cameFromOurs = entry ? entry.index > 0 : window.history.length > 1;
    if (cameFromOurs) router.back();
    else router.push(profile.createdAt === null ? ROUTES.home : ROUTES.today);
  }

  return (
    <PaywallScreen
      checkout={checkout}
      partner={profile.partner}
      ready={ready && today !== null}
      moment={momentLine(profile.anchor, profile.sceneId)}
      planId={planId}
      // The checkout that is opening was asked for one plan: it stays chosen until the answer comes.
      onPlan={(id) => {
        if (!opening) setPlanId(id);
      }}
      today={today}
      opening={opening}
      cancelled={cancelled}
      error={error}
      onContinue={pay}
      onDemo={unlock}
      onClose={close}
    />
  );
}
