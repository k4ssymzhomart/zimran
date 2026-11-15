import Stripe from 'stripe';

// No `runtime` export: with cacheComponents this Next.js version always uses Node.js and rejects the option.

/** One place for what is charged. The paywall page prints the same numbers. */
const PLANS = {
  four_weeks: { name: 'PlayReps, 4 weeks', amount: 2900, weeks: 4 },
  twelve_weeks: { name: 'PlayReps, 12 weeks', amount: 6900, weeks: 12 },
} as const;
type PlanId = keyof typeof PLANS;

const isPlanId = (v: unknown): v is PlanId => typeof v === 'string' && Object.hasOwn(PLANS, v);

/** Creates a Stripe Checkout session in TEST mode and returns its URL. */
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return Response.json({ error: 'Test checkout is not set up on this deployment.' }, { status: 503 });
  }
  // This build must never take real money: refuse anything but a test key.
  if (!key.startsWith('sk_test_')) {
    return Response.json({ error: 'Checkout is turned off: only Stripe test keys are allowed here.' }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { plan?: unknown } | null;
  if (!isPlanId(body?.plan)) {
    return Response.json({ error: 'Please choose the 4-week or the 12-week plan.' }, { status: 400 });
  }
  const planId = body.plan;
  const plan = PLANS[planId];
  // Send the visitor back to the site they came from (works on localhost and on any deployed URL).
  // Stripe's return links go only to this site: an Origin header that names another host is ignored.
  const self = new URL(req.url);
  const sent = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const origin = sent && URL.canParse(sent) && new URL(sent).host === host ? new URL(sent).origin : self.origin;

  try {
    // Stripe is constructed here, not at module level, so a missing key can never break the import.
    const session = await new Stripe(key).checkout.sessions.create({
      mode: 'subscription',
      // The app is in English and its prices are in US dollars: the checkout says the same,
      // not the visitor's local language and a converted price.
      locale: 'en',
      adaptive_pricing: { enabled: false },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: plan.amount,
            product_data: { name: plan.name },
            recurring: { interval: 'week', interval_count: plan.weeks },
          },
        },
      ],
      metadata: { plan: planId },
      success_url: `${origin}/unlocked?session_id={CHECKOUT_SESSION_ID}`,
      // The pricing page reads `cancelled` (its own spelling of the parameter) to show "Checkout was closed. Nothing was charged."
      cancel_url: `${origin}/pricing?cancelled=1`,
    });
    if (!session.url) throw new Error('Stripe returned no checkout URL.');
    return Response.json({ url: session.url });
  } catch (err) {
    // Details stay in the server log; Stripe messages can quote parts of the key.
    console.error('checkout failed:', err instanceof Error ? err.message : err);
    return Response.json({ error: 'The test checkout could not be opened just now.' }, { status: 502 });
  }
}
