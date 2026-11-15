import type { Metadata } from 'next';
import { Paywall } from '@/components/pricing/Paywall';

export const metadata: Metadata = { title: 'Fammy: choose your plan' };

/**
 * The paywall (story 16). The server decides how its one action works and tells the screen:
 * with a Stripe key the action opens Stripe's hosted test checkout; without one no payment is taken on this site,
 * so the action gives access at once and the screen says that it is a demo.
 */
export default function PricingPage() {
  return <Paywall checkout={process.env.STRIPE_SECRET_KEY ? 'stripe' : 'demo'} />;
}
