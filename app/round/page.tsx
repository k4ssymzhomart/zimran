import type { Metadata } from 'next';
import { PracticeRound } from '@/components/daily/PracticeRound';

export const metadata: Metadata = { title: 'Fammy: one-minute round' };

/** A free one-minute practice round from the Practice tab. */
export default function RoundPage() {
  return <PracticeRound />;
}
