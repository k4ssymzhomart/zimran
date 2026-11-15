import type { Metadata } from 'next';
import { LiveSession } from '@/components/screens/live/LiveSession';

export const metadata: Metadata = { title: 'PlayReps: live with your child' };

/**
 * /live — five minutes of play with the parent's own child (beta). Needs access.
 * Before you start, microphone and privacy, the live round screen, the result: components/screens/live/.
 */
export default function LivePage() {
  return <LiveSession />;
}
