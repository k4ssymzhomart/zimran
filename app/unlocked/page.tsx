'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from '@/components/Icons';
import { MiaCard } from '@/components/pricing/MiaCard';
import { ActionLink, Art, Heading, Screen } from '@/components/ui';
import { confirmCheckout } from '@/client/entitlement';

type Status = 'confirming' | 'paid' | 'not_paid';

/** What a screen reader hears when the status changes; the screens are swapped whole. */
const ANNOUNCE: Record<Status, string> = {
  confirming: 'Confirming your test payment.',
  paid: 'You’re in. Your plan is unlocked on this device.',
  not_paid: 'The payment was not completed. Nothing was charged.',
};

/** Stripe sends the visitor here with ?session_id=... The server confirms it; only then we unlock. */
export default function UnlockedPage() {
  const { bfcacheId } = useRouter();
  return <Unlocked key={bfcacheId} />;
}

function Unlocked() {
  const [status, setStatus] = useState<Status>('confirming');

  useEffect(() => {
    let live = true;
    const id = new URLSearchParams(window.location.search).get('session_id');
    // No id in the URL means nobody paid; skip the request and answer the same way.
    const check = id ? confirmCheckout(id).then((e) => e.paid) : Promise.resolve(false);
    check.then((paid) => {
      if (live) setStatus(paid ? 'paid' : 'not_paid');
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      {status === 'confirming' && (
        <Screen>
          <MiaCard face="smiling" priority />
          <Heading title="Confirming your test payment…" lede="This takes a moment." />
          <div className="enter d3 mt-8 flex justify-center" aria-hidden="true">
            <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-violet/25 border-t-violet motion-reduce:animate-none" />
          </div>
        </Screen>
      )}

      {status === 'paid' && (
        <Screen
          action={
            <ActionLink href="/dashboard">
              Go to your plan
              <ArrowRight size={20} />
            </ActionLink>
          }
        >
          <Art src="/art/party.png" priority />
          <Heading
            title="You’re in."
            lede={
              <>
                Your plan is unlocked on this device. <span className="whitespace-nowrap">Test mode,</span> so no real charge was made.
              </>
            }
          />
        </Screen>
      )}

      {status === 'not_paid' && (
        <Screen action={<ActionLink href="/pricing">Back to plans</ActionLink>}>
          <Art src="/art/replay.png" priority />
          <Heading title="The payment was not completed" lede="Nothing was charged." />
        </Screen>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {ANNOUNCE[status]}
      </p>
    </>
  );
}
