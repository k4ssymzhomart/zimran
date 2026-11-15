import Stripe from 'stripe';

// No `runtime` export: with cacheComponents this Next.js version always uses Node.js and rejects the option.

const PLAN_IDS = ['four_weeks', 'twelve_weeks'];
/** Subscription states in which the plan is over. */
const ENDED: string[] = ['canceled', 'incomplete_expired', 'unpaid'];

/**
 * Confirms that a Checkout session was really completed. The client never decides this by itself:
 * it sends the session id it got back from Stripe and stores only what this route answers.
 * The answer follows the subscription as it is now, so the same link opened later, or in another browser,
 * tells the truth: a plan that has ended is not paid, and a canceled renewal comes with its end date.
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
    const session = await new Stripe(key).checkout.sessions.retrieve(id, { expand: ['subscription'] });
    const planId = session.metadata?.plan;
    const plan = planId && PLAN_IDS.includes(planId) ? planId : null;
    // Expanded, the subscription is an object; if Stripe sends only its id, the session alone decides, as before.
    const sub = session.subscription && typeof session.subscription !== 'string' ? session.subscription : null;
    const ended = sub !== null && ENDED.includes(sub.status);
    const paid = session.status === 'complete' && session.payment_status !== 'unpaid' && !ended;
    const renewalCanceled = sub !== null && (sub.cancel_at_period_end || sub.cancel_at !== null);
    const accessEnds = sub && renewalCanceled ? sub.cancel_at ?? sub.items?.data?.[0]?.current_period_end ?? null : null;
    return Response.json({ paid, plan, ended, renewal_canceled: renewalCanceled, access_ends: accessEnds });
  } catch (err) {
    console.error('entitlement check failed:', err instanceof Error ? err.message : err);
    return Response.json({ paid: false, plan: null }, { status: 502 });
  }
}
