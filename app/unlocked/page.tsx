import type { Metadata } from 'next';
import { Unlocked } from '@/components/pricing/Unlocked';

export const metadata: Metadata = { title: 'Fammy: your plan' };

/**
 * Where the paywall leads. After a test checkout Stripe sends the visitor here with the session to confirm;
 * after a demo unlock the access saved on this device is read back. components/pricing/Unlocked.tsx holds both.
 */
export default function UnlockedPage() {
  return <Unlocked />;
}
