import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LiveSession } from '@/components/live/LiveSession';
import { FEATURES } from '@/lib/features';

export const metadata: Metadata = { title: 'Fammy: live with your child' };

/** Five minutes of play with the parent's own child (beta). Needs access; with the live flag off there is no such page. */
export default function LivePage() {
  if (!FEATURES.live) notFound();
  return <LiveSession />;
}
