'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { isLocked } from '@/client/entitlement';
import { loadProgress, saveProgress, todayISO } from '@/client/progressStore';
import { sessionStore } from '@/client/sessionStore';
import { CHILDREN } from '@/components/child';
import { FirstRound } from '@/components/first/round/FirstRound';
import type { RoundDone } from '@/components/round/types';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useProfile } from '@/hooks/useProfile';
import { sessionDraft } from '@/hooks/useRound';
import { sceneById } from '@/lib/child/scenes';
import { addSession } from '@/lib/progress/history';
import { NORM_SECONDS } from '@/lib/progress/targets';
import { ROUTES } from '@/lib/routes';
import { LiveIntro } from './LiveIntro';
import { LivePrivacy } from './LivePrivacy';
import { LiveResult } from './LiveResult';

/**
 * /live, five minutes of play with the parent's own child (beta; Figma row 17, 27:710; desktop 33:220, 33:260).
 * The parent speaks, the engine codes every sentence, the coach answers aloud. The same round screen as practice,
 * started in live mode: no simulated child, the microphone asked for at once, reflections not counted.
 * Access is needed: without it the visitor goes to the paywall before anything is shown.
 */

type Step = 'intro' | 'privacy' | 'round';

/** The scene the old live page played when the profile names none that exists. */
const FALLBACK_SCENE = 'blocks';

/** After a step changes, taps are not taken for this long: the second tap of a double tap is not a choice. */
const QUIET_MS = 400;

/** White from the first frame, so the page never shows the old dark canvas while the device is read. */
const BLANK = <div className="split-root min-h-dvh bg-white" />;

/** Next keeps a page alive after you leave it: a link back here starts a new session, Back and Forward restore it. */
export function LiveSession() {
  const { bfcacheId } = useRouter();
  return <Live key={bfcacheId} />;
}

interface Saved {
  done: RoundDone;
  id: string;
}

function Live() {
  const router = useRouter();
  const { entitlement, ready: accessReady } = useEntitlement();
  const { profile, ready: profileReady } = useProfile();
  const [step, setStep] = useState<Step>('intro');
  /** The scene the session is played in, fixed as it starts: a profile changed in another tab changes nothing under way. */
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const once = useRef(false);
  const quietUntil = useRef(0);
  const introHeading = useRef<HTMLHeadingElement>(null);
  const shown = useRef<Step>('intro');

  function go(next: Step) {
    const now = performance.now();
    if (now < quietUntil.current) return false;
    quietUntil.current = now + QUIET_MS;
    setStep(next);
    return true;
  }

  // Back on the intro from the privacy page: it opens at its top and the keyboard starts at the heading.
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    if (step !== 'intro') return;
    window.scrollTo(0, 0);
    introHeading.current?.focus({ preventScroll: true });
  }, [step]);

  const locked = accessReady && isLocked('live', entitlement);
  // A session that has begun is played to its end and saved, whatever happens to access meanwhile.
  const toPaywall = locked && sceneId === null;

  useEffect(() => {
    if (toPaywall) router.replace(ROUTES.pricing);
  }, [toPaywall, router]);

  // The round screen calls this once, when the five minutes are over or the parent ends them. Saved once.
  const onDone = useCallback(
    (done: RoundDone) => {
      if (once.current || sceneId === null) return;
      once.current = true;
      const date = todayISO();
      // The session store goes first: on its first run it brings the old sessions over, and this one must not be among them.
      const id = sessionStore.add(sessionDraft(done, { kind: 'live', date, sceneId, partner: null }));
      // The old v1 progress too, as the old live page did, so the old screens agree.
      saveProgress(addSession(loadProgress(), done.result, date, 'live'));
      setSaved({ done, id });
    },
    [sceneId],
  );

  if (!accessReady || !profileReady || toPaywall) return BLANK;

  if (saved) return <LiveResult done={saved.done} review={ROUTES.session(saved.id)} />;

  if (step === 'round' && sceneId !== null) {
    // The second tap of a double tap on "Start five minutes" lands on the session: it neither opens the keyboard
    // nor turns the microphone off.
    const settle = (event: MouseEvent) => {
      if (performance.now() >= quietUntil.current) return;
      event.preventDefault();
      event.stopPropagation();
    };
    return (
      <div onMouseDownCapture={settle} onClickCapture={settle}>
        <FirstRound mode="live" sceneId={sceneId} partner={null} durationSec={NORM_SECONDS} seed={1} title="Live session" onDone={onDone} />
      </div>
    );
  }

  function begin() {
    if (sceneId !== null || !go('round')) return;
    setSceneId(sceneById(profile.sceneId) ? profile.sceneId : FALLBACK_SCENE);
  }

  if (step === 'privacy') return <LivePrivacy onClose={() => go('intro')} />;

  return <LiveIntro childName={CHILDREN[profile.partner].name} heading={introHeading} onStart={begin} onPrivacy={() => go('privacy')} />;
}
