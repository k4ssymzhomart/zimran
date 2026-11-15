'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useEffect, useState } from 'react';
import { isLocked } from '@/client/entitlement';
import { loadProgress, saveProgress, todayISO } from '@/client/progressStore';
import { sessionStore } from '@/client/sessionStore';
import { RoundRunner } from '@/components/round/RoundRunner';
import type { RoundDone } from '@/components/round/types';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useProfile } from '@/hooks/useProfile';
import { sessionDraft } from '@/hooks/useRound';
import { FEATURES } from '@/lib/features';
import { addSession, isEmptyResult } from '@/lib/progress/history';
import { ROUTES } from '@/lib/routes';
import { LiveIntro } from './LiveIntro';
import { LivePrivacy } from './LivePrivacy';
import { LiveResult } from './LiveResult';

/**
 * Live with your child (Figma story 17, beta): before you start (27:714, 33:220), microphone and privacy (27:767),
 * the five minutes themselves (the round screen in live mode, 33:260), and the result.
 * The parent speaks, the engine codes every sentence, the coach answers aloud. No simulated child, no reflections.
 * Access is needed: without it the visitor goes to the paywall before anything is shown.
 */

/** Five minutes, as every daily session. */
const SECONDS = 300;
/** Live play has no simulated scene; the saved session names the one the old live page always used. */
const SCENE = 'blocks';
/** After a step changes, taps are not taken for this long: the second tap of a double tap is not a choice. */
const QUIET_MS = 400;

type Step = 'intro' | 'privacy' | 'round';

/** A finished session, and the id it was saved under: null when nothing was said, so nothing was saved. */
interface Finished {
  done: RoundDone;
  id: string | null;
}

/** Next keeps a page alive after you leave it: a link back here starts fresh, Back and Forward restore it. */
export function LiveSession() {
  const { bfcacheId } = useRouter();
  return <Live key={bfcacheId} />;
}

/** White from the first frame, so the page never shows the old dark canvas while the device is read. */
const BLANK = <div className="split-root min-h-dvh bg-white" />;

function Live() {
  const router = useRouter();
  const { entitlement, ready: accessReady } = useEntitlement();
  const { profile, ready: profileReady } = useProfile();
  const [step, setStep] = useState<Step>('intro');
  const [returned, setReturned] = useState(false);
  // Each session is its own mount of the round screen; "Start again" after an empty one counts up.
  const [run, setRun] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState<Finished | null>(null);
  const handled = useRef(-1);
  const quietUntil = useRef(0);

  const off = !FEATURES.live;
  // A session that has begun is played to its end and saved, whatever happens to access meanwhile.
  const toPaywall = accessReady && isLocked('live', entitlement) && !started;

  useEffect(() => {
    if (off) router.replace(ROUTES.today);
    else if (toPaywall) router.replace(ROUTES.pricing);
  }, [off, toPaywall, router]);

  // The round screen calls this once per session, when the five minutes are over or the parent ends them.
  const onDone = useCallback(
    (done: RoundDone) => {
      if (handled.current === run) return;
      handled.current = run;
      let id: string | null = null;
      // A session in which nothing was said is not saved: it would only add an empty day to the parent's progress.
      if (!isEmptyResult(done.result)) {
        const date = todayISO();
        // The session store goes first: on its first run it brings the old sessions over, and this one must not be among them.
        id = sessionStore.add(sessionDraft(done, { kind: 'live', date, sceneId: SCENE, partner: null }));
        saveProgress(addSession(loadProgress(), done.result, date, 'live'));
      }
      setFinished({ done, id });
    },
    [run],
  );

  function go(next: Step) {
    const now = performance.now();
    if (now < quietUntil.current) return;
    quietUntil.current = now + QUIET_MS;
    if (next === 'round') setStarted(true);
    setReturned(next === 'intro');
    setStep(next);
  }

  /** After a session in which nothing was heard: back to the start, with access read again. */
  function again() {
    quietUntil.current = performance.now() + QUIET_MS;
    setFinished(null);
    setStarted(false);
    setRun((n) => n + 1);
    setReturned(true);
    setStep('intro');
  }

  if (off || !accessReady || !profileReady || toPaywall) return BLANK;

  if (finished) {
    return <LiveResult done={finished.done} id={finished.id} partner={profile.partner} onAgain={again} />;
  }

  if (step === 'round') {
    return (
      <RoundRunner key={run} mode="live" sceneId={SCENE} partner={null} durationSec={SECONDS} seed={1} title="Live" onDone={onDone} />
    );
  }

  if (step === 'privacy') return <LivePrivacy onClose={() => go('intro')} />;

  return <LiveIntro partner={profile.partner} focus={returned} onStart={() => go('round')} onPrivacy={() => go('privacy')} />;
}
