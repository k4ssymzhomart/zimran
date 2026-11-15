import Stripe from 'stripe';

// No `runtime` export: with cacheComponents this Next.js version always uses Node.js and rejects the option.

const NOT_NOW = 'The renewal could not be canceled just now. Nothing changed. Please try again in a minute.';

/** When the paid period, and so the access, ends: Stripe's own cancel date, or the end of the current period. */
function accessEnds(sub: Stripe.Subscription): number | null {
  return sub.cancel_at ?? sub.items?.data?.[0]?.current_period_end ?? null;
}

/**
 * Stops the renewal of the subscription behind a Checkout session, TEST mode only.
 * The plan is not cut off: `cancel_at_period_end` lets it run to the end of the period that was paid for.
 * Every way this can fail answers with a calm sentence; Stripe's own messages stay in the server log.
 */
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  // This build must never touch a live account: refuse anything but a test key.
  if (!key || !key.startsWith('sk_test_')) {
    return Response.json(
      { canceled: false, error: 'Test checkout is not set up on this deployment, so there is no renewal to cancel.' },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as { session_id?: unknown } | null;
  const id = body?.session_id;
  // Only test-mode session ids, and nothing that could be anything else.
  if (typeof id !== 'string' || !/^cs_test_[A-Za-z0-9_]{1,200}$/.test(id)) {
    return Response.json({ canceled: false, error: 'That is not a test checkout session.' }, { status: 400 });
  }

  try {
    // Stripe is constructed here, not at module level, so a missing key can never break the import.
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(id, { expand: ['subscription'] });
    const sub = session.subscription;
    if (session.status !== 'complete' || !sub) {
      return Response.json(
        { canceled: false, error: 'No subscription was found for this checkout, so there is nothing to cancel.' },
        { status: 404 },
      );
    }

    // Already ended or already set to end: answer the same way, so a second tap is harmless.
    if (typeof sub !== 'string') {
      if (sub.status === 'canceled') {
        return Response.json({ canceled: true, access_ends: sub.ended_at ?? sub.canceled_at ?? null });
      }
      if (sub.cancel_at_period_end) {
        return Response.json({ canceled: true, access_ends: accessEnds(sub) });
      }
    }

    const updated = await stripe.subscriptions.update(typeof sub === 'string' ? sub : sub.id, { cancel_at_period_end: true });
    return Response.json({ canceled: true, access_ends: accessEnds(updated) });
  } catch (err) {
    // Details stay in the server log; Stripe messages can quote parts of the key.
    console.error('cancel failed:', err instanceof Error ? err.message : err);
    return Response.json({ canceled: false, error: NOT_NOW }, { status: 502 });
  }
}
