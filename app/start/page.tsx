'use client';

import { useRouter } from 'next/navigation';
import { FirstVisit } from '@/components/first/FirstVisit';

/**
 * The first visit, one route from the first tap to the plan. The steps are held by hooks/useFirstVisit.ts and
 * drawn by components/first/FirstVisit.tsx; nothing is decided here.
 */
export default function StartPage() {
  // Next keeps a page alive after you leave it. A link back here must start it fresh, not show the old last screen;
  // the browser's Back button still restores the page as it was.
  const { bfcacheId } = useRouter();
  return <FirstVisit key={bfcacheId} />;
}
