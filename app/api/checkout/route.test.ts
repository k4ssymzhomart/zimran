import { afterEach, describe, expect, it, vi } from 'vitest';

/** Stripe is replaced by a stand-in that records what the route asks for. No network, no key. */
const { create } = vi.hoisted(() => ({
  create: vi.fn(async (args: { cancel_url: string; success_url: string }) => ({ url: 'https://checkout.stripe.test/session', args })),
}));
vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create } };
  },
}));

import { POST } from './route';

const ask = (plan: unknown): Request =>
  new Request('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', host: 'localhost:3000' },
    body: JSON.stringify({ plan }),
  });

afterEach(() => {
  vi.unstubAllEnvs();
  create.mockClear();
});

describe('POST /api/checkout', () => {
  it('sends a closed checkout back to the pricing page with the parameter that page reads', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_example');
    const res = await POST(ask('four_weeks'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/session' });
    expect(create).toHaveBeenCalledTimes(1);
    const { cancel_url: cancelUrl, success_url: successUrl } = create.mock.calls[0][0];
    // app/pricing/page.tsx shows "Checkout was closed. Nothing was charged." when the URL has `cancelled`.
    expect(cancelUrl).toBe('http://localhost:3000/pricing?cancelled=1');
    expect(new URL(cancelUrl).searchParams.has('cancelled')).toBe(true);
    expect(successUrl).toBe('http://localhost:3000/unlocked?session_id={CHECKOUT_SESSION_ID}');
  });

  it('refuses a plan it does not sell, a missing key and a live key, and asks Stripe for nothing', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_example');
    expect((await POST(ask('forever'))).status).toBe(400);
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    expect((await POST(ask('four_weeks'))).status).toBe(503);
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_example');
    expect((await POST(ask('four_weeks'))).status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });
});
