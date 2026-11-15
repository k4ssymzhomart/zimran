'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { confirmCheckout, readEntitlement } from '@/client/entitlement';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useProfile } from '@/hooks/useProfile';
import { ROUTES } from '@/lib/routes';
import { Confirming, NotCompleted, YoureIn } from './UnlockedScreens';

/** What the server answered about the checkout session in the address. */
type Check = 'confirming' | 'paid' | 'not_paid';

/** What a screen reader hears when the answer comes: the screens are swapped whole. */
const ANNOUNCE: Record<Check, string> = {
  confirming: 'Confirming your test payment.',
  paid: 'You’re in. Test mode. No real charge was made.',
  not_paid: 'The payment was not completed. Nothing was charged.',
};

/** Where the paywall leads (/unlocked). A link here starts it fresh; the browser's Back button restores it as it was. */
export function Unlocked() {
  const { bfcacheId } = useRouter();
  return <UnlockedFlow key={bfcacheId} />;
}

/**
 * Two ways in. Stripe sends the visitor here with ?session_id=...: the server confirms that session and only then
 * access is saved (27:645, then 27:664 or 27:687). With no session in the address the screen reads the access
 * saved on this device: with it, "You're in." and the true line about how it came; without it, the plans.
 */
function UnlockedFlow() {
  const router = useRouter();
  const { profile } = useProfile();
  const { entitlement, ready } = useEntitlement();
  /** The session in the address: undefined until it has been read, null when there is none. */
  const [sessionId, setSessionId] = useState<string | null | undefined>(undefined);
  const [check, setCheck] = useState<Check>('confirming');

  // The address is read after mount, so the first paint matches the prerendered page.
  useEffect(() => {
    const timer = window.setTimeout(() => setSessionId(new URLSearchParams(window.location.search).get('session_id')), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (sessionId === undefined || sessionId === null) return;
    let live = true;
    confirmCheckout(sessionId).then((confirmed) => {
      if (!live) return;
      // This page reloaded with no network must not take back a test payment the server confirmed before.
      const saved = readEntitlement();
      setCheck(confirmed.paid || (saved.paid && !saved.demo) ? 'paid' : 'not_paid');
    });
    return () => {
      live = false;
    };
  }, [sessionId]);

  // Nobody paid and nothing is saved: the plans are the place to be.
  const noAccess = sessionId === null && ready && !entitlement.paid;
  useEffect(() => {
    if (noAccess) router.replace(ROUTES.pricing);
  }, [noAccess, router]);

  let screen: ReactNode = null;
  if (sessionId === null) {
    if (ready && entitlement.paid) screen = <YoureIn partner={profile.partner} demo={entitlement.demo} />;
  } else if (sessionId !== undefined) {
    if (check === 'confirming') screen = <Confirming />;
    else if (check === 'paid') screen = <YoureIn partner={profile.partner} demo={false} />;
    else screen = <NotCompleted partner={profile.partner} />;
  }

  return (
    <>
      {/* Until this device has been read the page is the empty Split root: white, never the old dark canvas. */}
      {screen ?? <div className="split-root" />}
      <p className="sr-only" role="status">
        {typeof sessionId === 'string' ? ANNOUNCE[check] : ''}
      </p>
    </>
  );
}
