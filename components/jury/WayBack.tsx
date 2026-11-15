'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { Icon, IconButton } from '@/components/kit';
import { ROUTES } from '@/lib/routes';

/** The part of the Navigation API this needs. Older browsers do not have it. */
interface WithNavigation {
  navigation?: { currentEntry?: { index: number } | null };
}

/**
 * The back arrow of the jury guide. It is a link to the landing, so it works before the page's script has loaded
 * and for a visitor who opened the guide directly. A visitor who came here from another page of Fammy (the
 * landing's footer, Profile) goes back to that page instead, as the browser's own Back would take them.
 *
 * TODO kit: one way back for every pushed screen. components/first/useWayBack.ts follows the same rule.
 */
export function WayBack() {
  const router = useRouter();

  function back(event: MouseEvent<HTMLAnchorElement>) {
    // A click that opens a new tab or window stays a plain link.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    // The Navigation API lists the entries of this site only: past the first one, the page before is ours.
    const entry = (window as WithNavigation).navigation?.currentEntry;
    const cameFromOurs = entry ? entry.index > 0 : window.history.length > 1;
    if (!cameFromOurs) return;
    event.preventDefault();
    router.back();
  }

  return (
    <IconButton href={ROUTES.home} label="Back" onClick={back}>
      <Icon name="back" />
    </IconButton>
  );
}
