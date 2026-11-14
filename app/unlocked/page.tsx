'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/Bits';
import { Mia } from '@/components/Mia';
import { confirmCheckout } from '@/client/entitlement';

type Status = 'confirming' | 'paid' | 'not_paid';

/** Stripe sends the visitor here with ?session_id=... The server confirms it; only then we unlock. */
export default function UnlockedPage() {
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
    <Shell>
      <section className="rise sticker bg-[#fffaf0] px-5 pb-6 pt-5 text-center" aria-live="polite">
        <div className="flex justify-center">
          <Mia
            face={status === 'paid' ? 'beaming' : status === 'confirming' ? 'smiling' : 'neutral'}
            posture={status === 'paid' ? 'leaning_in' : 'at_toy'}
            size={130}
          />
        </div>

        {status === 'confirming' && (
          <>
            <h1 className="mt-3 font-display text-2xl font-semibold">Confirming your test payment…</h1>
            <p className="mt-2 text-sm text-ink-soft">This takes a moment. Mia is setting out the blocks.</p>
          </>
        )}

        {status === 'paid' && (
          <div className="pop">
            <h1 className="mt-3 font-display text-3xl font-semibold">
              You are <span className="italic text-tomato">in</span>.
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Your plan is unlocked on this device. Test mode, so no real charge was made.
            </p>
            <Link href="/dashboard" className="btn btn-primary mt-5 w-full text-lg">
              Go to your plan
            </Link>
          </div>
        )}

        {status === 'not_paid' && (
          <>
            <h1 className="mt-3 font-display text-2xl font-semibold">The payment was not completed</h1>
            <p className="mt-2 text-sm text-ink-soft">Nothing was charged. The plans are still there whenever you are ready.</p>
            <Link href="/pricing" className="btn btn-plain mt-5">
              Back to plans
            </Link>
          </>
        )}
      </section>
    </Shell>
  );
}
