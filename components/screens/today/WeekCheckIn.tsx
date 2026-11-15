'use client';

import { useState } from 'react';
import { loadProgress, saveProgress } from '@/client/progressStore';
import { CheckIn, type SegmentedOption } from '@/components/kit';
import { addCheckin, type Checkin, type TantrumBucket } from '@/lib/progress/history';

type Answer = 'none' | '1-2' | '3-5' | '6+';

const OPTIONS: ReadonlyArray<SegmentedOption<Answer>> = [
  { value: 'none', label: 'None' },
  { value: '1-2', label: '1–2' },
  { value: '3-5', label: '3–5' },
  { value: '6+', label: '6 or more' },
];

/** The answers in the order of the saved buckets: 0 is none, 3 is six or more. */
const ANSWERS: readonly Answer[] = ['none', '1-2', '3-5', '6+'];
const BUCKET: Record<Answer, TantrumBucket> = { none: 0, '1-2': 1, '3-5': 2, '6+': 3 };

/** The latest answer saved this week, Monday to today, or null while the question is open. */
function answerThisWeek(checkins: readonly Checkin[], monday: string, today: string): Answer | null {
  const latest = checkins
    .filter((c) => c.date >= monday && c.date <= today)
    .reduce<Checkin | null>((kept, c) => (kept === null || c.date >= kept.date ? c : kept), null);
  return latest ? (ANSWERS[latest.tantrums] ?? null) : null;
}

export interface WeekCheckInProps {
  /** Today, YYYY-MM-DD: the date the answer is saved under. */
  today: string;
  /** The Monday of this week, YYYY-MM-DD. */
  monday: string;
  className?: string;
}

/**
 * The weekly question on the done-for-today screen (Figma 47:749), saved as the day's check-in in the progress store
 * on this device (one per day: a second answer replaces the first). It records an answer and promises nothing.
 * Render it only once the page has read today's date on the device: the first value comes from storage.
 */
export function WeekCheckIn({ today, monday, className }: WeekCheckInProps) {
  const [answer, setAnswer] = useState<Answer | null>(() => answerThisWeek(loadProgress().checkins, monday, today));

  const answerWith = (next: Answer): void => {
    setAnswer(next);
    saveProgress(addCheckin(loadProgress(), today, BUCKET[next]));
  };

  return <CheckIn question="How many hard moments this week?" options={OPTIONS} value={answer} onChange={answerWith} className={className} />;
}
