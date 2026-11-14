import Stripe from 'stripe';

// No `runtime` export: with cacheComponents this Next.js version always uses Node.js and rejects the option.

const PLAN_IDS = ['four_weeks', 'twelve_weeks'];

/**
 * Confirms that a Checkout session was really completed. The client never decides this by itself:
 * it sends the session id it got back from Stripe and stores only what this route answers.
 */
export async function GET(req: Request) {
  // Reading the request first keeps this handler request-time only; it is never prerendered at build.
  const id = new URL(req.url).searchParams.get('session_id');
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key || !key.startsWith('sk_test_')) {
    return Response.json({ paid: false, plan: null, error: 'Test checkout is not set up on this deployment.' }, { status: 503 });
  }
  // Only test-mode session ids, and nothing that could be anything else.
  if (!id || !/^cs_test_[A-Za-z0-9_]{1,200}$/.test(id)) {
    return Response.json({ paid: false, plan: null, error: 'That is not a test checkout session.' }, { status: 400 });
  }

  try {
    const session = await new Stripe(key).checkout.sessions.retrieve(id);
    const paid = session.status === 'complete' && session.payment_status !== 'unpaid';
    const plan = session.metadata?.plan;
    return Response.json({ paid, plan: plan && PLAN_IDS.includes(plan) ? plan : null });
  } catch (err) {
    console.error('entitlement check failed:', err instanceof Error ? err.message : err);
    return Response.json({ paid: false, plan: null }, { status: 502 });
  }
}
