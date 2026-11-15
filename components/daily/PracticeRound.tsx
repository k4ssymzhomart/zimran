'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sessionStore } from '@/client/sessionStore';
import { FirstRound } from '@/components/first/round/FirstRound';
import { useProfile } from '@/hooks/useProfile';
import { BLOCKS, sceneById } from '@/lib/child/scenes';
import { ROUTES } from '@/lib/routes';
import { SessionResult } from './SessionResult';
import { useSaveRound, type Play } from './useSaveRound';

/**
 * A one-minute practice round from the Practice tab. Free: no access is needed. It starts as the page opens,
 * is saved as a practice session, and ends on the same result as the daily session.
 */

/** One minute, against the same pace as five: two of each skill. */
const PRACTICE_SECONDS = 60;

/** Next keeps a page alive after you leave it: a link back here starts a new round, Back and Forward restore it. */
export function PracticeRound() {
  const { bfcacheId } = useRouter();
  return <Practice key={bfcacheId} />;
}

function Practice() {
  const { profile, ready } = useProfile();
  const [play, setPlay] = useState<Play | null>(null);
  const { saved, onDone } = useSaveRound('practice', play);

  // What the round is played with is fixed once, as it starts. The seed moves on with each saved session.
  useEffect(() => {
    if (!ready || play) return;
    const id = setTimeout(() => {
      const sceneId = sceneById(profile.sceneId) ? profile.sceneId : BLOCKS.id;
      setPlay({ sceneId, partner: profile.partner, seed: 2000 + sessionStore.all().length });
    }, 0);
    return () => clearTimeout(id);
  }, [ready, play, profile.sceneId, profile.partner]);

  if (!play) return <div className="split-root min-h-dvh bg-white" />;

  if (saved) {
    return (
      <SessionResult
        done={saved.done}
        partner={play.partner}
        heading="One minute done."
        back={{ href: ROUTES.practice, label: 'Back to Practice' }}
        review={ROUTES.session(saved.id)}
      />
    );
  }

  return (
    <FirstRound
      mode="practice"
      sceneId={play.sceneId}
      partner={play.partner}
      durationSec={PRACTICE_SECONDS}
      seed={play.seed}
      title="One minute"
      onDone={onDone}
    />
  );
}
