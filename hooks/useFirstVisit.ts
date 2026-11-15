'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { takeFirstAnswer } from '@/client/firstAnswer';
import { profileStore } from '@/client/profileStore';
import { loadFirstRounds, loadProgress, saveFirstRounds, saveProgress, todayISO } from '@/client/progressStore';
import { sessionStore } from '@/client/sessionStore';
import { useChild } from '@/components/child';
import type { RoundDone } from '@/components/round/types';
import {
  afterDispute,
  initialJourney,
  journeyReducer,
  lessonDone,
  MAX_TRIES,
  ROUND1,
  ROUND2,
  type JourneyPhase,
} from '@/lib/flow/journey';
import { addSession } from '@/lib/progress/history';
import { planDayOf } from '@/lib/progress/sessions';
import { ROUTES } from '@/lib/routes';
import type { PartnerId } from '@/lib/types';
import { useProfile } from './useProfile';
import { sessionDraft } from './useRound';

/**
 * The screens of the first visit, in order. `partner` comes before the journey, and `ready2` is the screen a
 * skipped lesson passes on its way to round two; every other step is a phase of lib/flow/journey.ts.
 */
export type FirstStep = 'partner' | JourneyPhase | 'ready2';

/** Both rounds in full, as the round screen handed them over: the journey itself keeps only their results. */
interface Rounds {
  before: RoundDone | null;
  after: RoundDone | null;
}

const NO_ROUNDS: Rounds = { before: null, after: null };

/** Day of the plan from the sessions saved on this device. It reads the clock: handlers and effects only. */
const planDayNow = (): number => planDayOf(sessionStore.all(), todayISO());

/**
 * The first visit, wired: the pure journey reducer and everything around it, which is the chosen child, the
 * sentence carried over from the landing, the two finished rounds, and storage. It owns no round engine: the round
 * screen (components/round/RoundRunner.tsx) runs each round and hands it back through `endRound1` / `endRound2`.
 * components/first/FirstVisit.tsx reads `step` and maps it to a screen.
 */
export function useFirstVisit() {
  const [state, dispatch] = useReducer(journeyReducer, undefined, () => initialJourney(1, 'opener'));
  const { profile } = useProfile();
  const { choose } = useChild();
  const router = useRouter();
  /** The child picked on the first screen of this visit; null until then. */
  const [picked, setPicked] = useState<PartnerId | null>(null);
  /** A sentence the visitor typed into the answer field on the landing. */
  const [carried, setCarried] = useState<string | null>(null);
  /** What the landing left behind, once it has been looked for: reading it also removes it from the tab. */
  const taken = useRef<string | null | undefined>(undefined);
  const [rounds, setRounds] = useState<Rounds>(NO_ROUNDS);
  /** True while the screen before round two is up. */
  const [beforeRound2, setBeforeRound2] = useState(false);
  /** Day of the plan, from the saved sessions; null until the plan screen opens. */
  const [day, setDay] = useState<number | null>(null);
  const saved = useRef(false);

  const partner = picked ?? profile.partner;
  /** The moment chosen on this visit, or the one the parent chose before. */
  const anchor = state.setup.anchor ?? profile.anchor;
  const step: FirstStep = picked === null ? 'partner' : state.phase === 'lesson' && beforeRound2 ? 'ready2' : state.phase;

  // The landing may have carried a sentence over. It is looked for once, right after the page opens.
  useEffect(() => {
    if (taken.current === undefined) taken.current = takeFirstAnswer();
    const text = taken.current;
    if (!text) return;
    const id = setTimeout(() => setCarried(text), 0);
    return () => clearTimeout(id);
  }, []);

  // That sentence is the first answer. `pick` sends it with the tap; this covers a tap that came before it was read,
  // because the first-answer screen shows a carried sentence as said, with no field to type into.
  useEffect(() => {
    if (picked !== null && carried && state.phase === 'opener') dispatch({ type: 'answer_opener', text: carried });
  }, [picked, carried, state.phase]);

  // Each step is a new screen: it opens at the top, not where the last one was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  // Both rounds are saved once, when the before and after is first shown.
  useEffect(() => {
    const { before, after } = rounds;
    if (state.phase !== 'change' || !state.round1 || !state.round2 || !before || !after || saved.current) return;
    saved.current = true;
    const today = todayISO();
    const about = { date: today, partner };
    // The session store goes first: on its first run it brings the old sessions over, and these two must not be
    // among them. The parent's before and after are the very first two rounds on this device; a replay is practice.
    const first = !sessionStore.all().some((s) => s.kind === 'first_before');
    sessionStore.add(sessionDraft(before, { ...about, kind: first ? 'first_before' : 'practice', sceneId: ROUND1.sceneId }));
    sessionStore.add(sessionDraft(after, { ...about, kind: first ? 'first_after' : 'practice', sceneId: ROUND2.sceneId }));
    // The old progress, written as hooks/useJourney.ts writes it: the old plan page reads it until it is replaced.
    const firstRounds = !loadFirstRounds();
    const withFirst = addSession(loadProgress(), state.round1, today, 'practice');
    saveProgress(addSession(withFirst, state.round2, today, 'practice'));
    if (firstRounds) saveFirstRounds(state.round1, state.round2);
  }, [state.phase, state.round1, state.round2, rounds, partner]);

  // On the plan screen: the chosen moment goes into the old progress too, and the day of the plan is read again
  // each time the screen comes up, so a page restored on a later day does not show the earlier one.
  useEffect(() => {
    if (state.phase !== 'plan') return;
    if (anchor) saveProgress({ ...loadProgress(), anchor });
    const id = setTimeout(() => setDay(planDayNow()), 0);
    return () => clearTimeout(id);
  }, [state.phase, anchor]);

  /** One tap on a child. A sentence carried from the landing is the first answer, so it is sent at once. */
  const pick = useCallback(
    (id: PartnerId) => {
      profileStore.update({ partner: id, createdAt: profileStore.get().createdAt ?? new Date().toISOString() });
      // The round screen still shown inside RoundRunner reads the child from the old context.
      choose(id);
      setPicked(id);
      if (carried) dispatch({ type: 'answer_opener', text: carried });
    },
    [choose, carried],
  );

  const answerOpener = useCallback((text: string) => dispatch({ type: 'answer_opener', text }), []);
  const tryReflection = useCallback((text: string) => dispatch({ type: 'try_reflection', text }), []);
  const toReady = useCallback(() => dispatch({ type: 'ready' }), []);
  const beginRound1 = useCallback(() => dispatch({ type: 'begin_round1' }), []);

  /** The round screen hands each finished round over once. */
  const endRound1 = useCallback((done: RoundDone) => {
    setRounds((r) => ({ ...r, before: done }));
    dispatch({ type: 'round_ended', result: done.result });
  }, []);
  const endRound2 = useCallback((done: RoundDone) => {
    setRounds((r) => ({ ...r, after: done }));
    dispatch({ type: 'round_ended', result: done.result });
  }, []);

  /** "Disagree?" on the round-one result: the sentence leaves the count and the result follows. */
  const dispute = useCallback(
    (index: number) => {
      const before = rounds.before;
      if (state.phase !== 'result1' || !before) return;
      const next = afterDispute(before.sentences, index, ROUND1.seconds, before.durationSec);
      if (!next) return;
      setRounds((r) => ({ ...r, before: { ...before, ...next } }));
      dispatch({ type: 'result_updated', result: next.result });
    },
    [state.phase, rounds.before],
  );

  const beginLesson = useCallback(() => dispatch({ type: 'begin_lesson' }), []);
  const answerTask = useCallback((text: string) => dispatch({ type: 'answer_task', text }), []);
  const beginRound2 = useCallback(() => {
    setBeforeRound2(false);
    dispatch({ type: 'begin_round2' });
  }, []);
  /**
   * The lesson's one way out. A finished lesson ends on "Ready for round two." itself (components/first/Lesson.tsx
   * shows it with what the last answer did), so that tap starts the round. A skip has not seen that screen yet.
   */
  const leaveLesson = useCallback(() => {
    if (lessonDone(state)) beginRound2();
    else setBeforeRound2(true);
  }, [state, beginRound2]);

  const next = useCallback(() => dispatch({ type: 'continue' }), []);
  /** "Play again": a fresh pair of rounds, saved as practice. */
  const restart = useCallback(() => {
    saved.current = false;
    setRounds(NO_ROUNDS);
    setBeforeRound2(false);
    dispatch({ type: 'restart' });
  }, []);

  const setAnchor = useCallback((moment: string) => {
    dispatch({ type: 'set_setup', patch: { anchor: moment } });
    profileStore.update({ anchor: moment });
  }, []);
  /** The tap that opens the plan also reads its day, so the plan never shows without it. */
  const finishSetup = useCallback(() => {
    setDay(planDayNow());
    dispatch({ type: 'finish_setup' });
  }, []);
  /** After the plan: the plans and their price. */
  const toPlans = useCallback(() => router.push(ROUTES.pricing), [router]);

  return {
    step,
    state,
    partner,
    /** What the parent said they say most in play; null when the quiz was skipped. */
    guess: profile.guess,
    carried,
    rounds,
    anchor,
    day,
    /** True when the parent reflected or used up the tries: the first round can start. */
    canMoveOn: state.opener.reflected || state.opener.reflectionTries >= MAX_TRIES,
    pick,
    answerOpener,
    tryReflection,
    toReady,
    beginRound1,
    endRound1,
    endRound2,
    dispute,
    beginLesson,
    answerTask,
    leaveLesson,
    beginRound2,
    next,
    restart,
    setAnchor,
    finishSetup,
    toPlans,
  };
}

/** Everything the screens of the first visit are given. */
export type FirstVisitFlow = ReturnType<typeof useFirstVisit>;
