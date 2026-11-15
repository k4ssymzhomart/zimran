import type { Metadata } from 'next';
import { DailySession } from '@/components/daily/DailySession';

export const metadata: Metadata = { title: 'Fammy: today’s five minutes' };

/** The daily five-minute session: the day, its three sentences, the round, the result. Needs access. */
export default function DailyPage() {
  return <DailySession />;
}
