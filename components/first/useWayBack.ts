'use client';

import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

/** The part of the Navigation API this needs. Older browsers do not have it. */
interface WithNavigation {
  navigation?: { currentEntry?: { index: number } | null };
}

/**
 * The way back of a screen whose props carry none: the opening screens of the first visit (PickPartner,
 * FirstAnswer, AnswerRead). It is the browser's own step back while the page before this one is ours, and the
 * landing when the parent came in here, so the arrow never leads out of PlayReps and never does nothing.
 */
export function useWayBack(): () => void {
  const router = useRouter();
  return () => {
    // The Navigation API lists the entries of this site only: past the first one, the page before is ours.
    const entry = (window as WithNavigation).navigation?.currentEntry;
    const cameFromOurs = entry ? entry.index > 0 : window.history.length > 1;
    if (cameFromOurs) router.back();
    else router.push(ROUTES.home);
  };
}
