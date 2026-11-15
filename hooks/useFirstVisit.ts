'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { takeFirstAnswer } from '@/client/firstAnswer';
import { profileStore } from '@/client/profileStore';
import { loadFirstRounds, loadProgress, saveFirstRounds, saveProgress, todayISO } from '@/client/progressStore';
import { sessionStore } from '@/client/sessionStore';
import { useChild } from '@/components/child';
import { isMomentId } from '@/components/first/quiz/moments';
import type { PlanRowKey } from '@/components/first/quizTypes';
import type { RoundDone } from '@/components/round/types';
import { afterDispute, MAX_TRIES, ROUND1, ROUND2 } from '@/lib/flow/journey';
import { hasWayBack, initialVisit, leavesVisit, placeOf, stepOf, visitReducer, type EditableQuestion, type VisitStep } from '@/lib/flow/visit';
import { addSession } from '@/lib/progress/history';
import { PLAN_DAYS } from '@/lib/progress/plan';
import { planDayOf } from '@/lib/progress/sessions';
import { ROUTES } from '@/lib/routes';
import type { HowOften, PartnerId, PlayGuess } from '@/lib/types';
import { useProfile } from './useProfile';
import { sessionDraft } from './useRound';

/** The screens of the first visit, in the order of lib/flow/visit.ts. */
export type FirstStep = VisitStep;

/** Both rounds in full, as the round screen handed them over: the journey itself keeps only their results. */
interface Rounds {
  before: RoundDone | null;
  after: RoundDone | null;
}

const NO_ROUNDS: Rounds = { before: null, after: null };

/** A one-tap answer stays on screen as chosen for this long, then the next screen comes up. */
const HOLD_MS = 250;
/**
 * After a one-tap answer nothing else is taken for this long: the hold itself, and the first moment of the next
 * screen, where the second tap of a double tap would land on an answer the parent has not read yet.
 */
const QUIET_MS = 400;

/** The question each row of "Your plan, from your answers." is set by. The first focus comes from round one. */
const QUESTION_OF_ROW: Record<Exclude<PlanRowKey, 'focus'>, EditableQuestion> = {
  partner: 'partner',
  scene: 'scene',
  praise: 'moments',
  moment: 'setup',
};

/** Day of the plan from the sessions saved on this device. It reads the clock: handlers and effects only. */
const planDayNow = (): number => planDayOf(sessionStore.all(), todayISO());

/**
 * The first visit, wired: the pure reducer of the visit (lib/flow/visit.ts, around the journey of
 * lib/flow/journey.ts) and everything around it, which is the profile the answers are written to, the sentence
 * carried over from the landing, the two finished rounds, and storage. It owns no round engine: the round screen
 * (components/round/RoundRunner.tsx) runs each round and hands it back through `endRound1` / `endRound2`.
 * components/first/FirstVisit.tsx reads `step` and maps it to a screen.
 *
 * Every answer is written to the profile as it is given, and every screen reads its answer back from there, so a
 * parent who comes back finds the earlier answers marked.
 */
export function useFirstVisit() {
  const [visit, dispatch] = useReducer(visitReducer, undefined, () => initialVisit());
  const { profile } = useProfile();
  const { choose } = useChild();
  const router = useRouter();
  /** A sentence the visitor typed into the answer field on the landing. */
  const [carried, setCarried] = useState<string | null>(null);
  /** What the landing left behind, once it has been looked for: reading it also removes it from the tab. */
  const taken = useRef<string | null | undefined>(undefined);
  const [rounds, setRounds] = useState<Rounds>(NO_ROUNDS);
  /** Day of the plan, from the saved sessions; null until the calendar sheet or the plan needs it. */
  const [day, setDay] = useState<number | null>(null);
  /** The name as it is being typed; null while the field shows the saved one. */
  const [typedName, setTypedName] = useState<string | null>(null);
  const saved = useRef(false);
  /** The timer of a one-tap answer that is being shown as chosen. */
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Until when taps are not taken, on the clock of performance.now(). */
  const quietUntil = useRef(0);

  const state = visit.journey;
  const step: FirstStep = stepOf(visit);
  const partner = profile.partner;
  /** The moment chosen on this visit, or the one the parent chose before. */
  const anchor = state.setup.anchor ?? profile.anchor;
  /** The hardest moments the question still offers; a saved profile may hold an id that is gone. */
  const moments = profile.moments.filter(isMomentId);
  const name = typedName ?? profile.childName ?? '';

  // The landing may have carried a sentence over. It is looked for once, right after the page opens.
  useEffect(() => {
    if (taken.current === undefined) taken.current = takeFirstAnswer();
    const text = taken.current;
    if (!text) return;
    const id = setTimeout(() => setCarried(text), 0);
    return () => clearTimeout(id);
  }, []);

  // That sentence is the first answer. `leaveFact` sends it with the tap; this covers a tap that came before it was
  // read, because the first-answer screen shows a carried sentence as said, with no field to type into.
  useEffect(() => {
    if (step === 'opener' && carried) dispatch({ type: 'answer_opener', text: carried });
  }, [step, carried]);

  // Each step is a new screen: it opens at the top, not where the last one was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  // A one-tap answer that is still being shown when the page goes away does not move on behind its back.
  useEffect(
    () => () => {
      if (hold.current !== null) clearTimeout(hold.current);
      hold.current = null;
    },
    [],
  );

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

  /** True while a one-tap answer is being shown, and for the first moment of the screen after it. */
  const quiet = useCallback(() => performance.now() < quietUntil.current, []);

  /**
   * A one-tap answer: written to the profile at once, so the screen shows it as chosen, and the next screen comes
   * up a quarter of a second later. A second tap in that time is not taken, on this screen or the next.
   */
  const answerThenGo = useCallback(
    (write: () => void) => {
      if (quiet()) return;
      quietUntil.current = performance.now() + QUIET_MS;
      write();
      hold.current = setTimeout(() => {
        hold.current = null;
        dispatch({ type: 'forward' });
      }, HOLD_MS);
    },
    [quiet],
  );

  /** The one way on from a screen with a button: the next screen, at once. */
  const forward = useCallback(() => {
    if (!quiet()) dispatch({ type: 'forward' });
  }, [quiet]);

  /**
   * The back arrow of the screen that is up. From the very first screen it leaves for the landing.
   * Back from the read answer the first answer is given again, so a sentence carried over from the landing is
   * dropped: it would be sent again on the spot.
   */
  const back = useCallback(() => {
    if (quiet()) return;
    if (leavesVisit(visit)) {
      router.push(ROUTES.home);
      return;
    }
    if (step === 'opener_reveal') setCarried(null);
    dispatch({ type: 'step_back' });
  }, [quiet, visit, step, router]);

  // ---------- before the rounds ----------

  const pickPartner = useCallback(
    (id: PartnerId) =>
      answerThenGo(() => {
        profileStore.update({ partner: id });
        // The round screen still shown inside RoundRunner reads the child from the old context.
        choose(id);
      }),
    [answerThenGo, choose],
  );
  const pickGuess = useCallback((guess: PlayGuess) => answerThenGo(() => profileStore.update({ guess })), [answerThenGo]);
  /** On from the fact, to the child's first line. A sentence carried from the landing is the first answer, so it is sent at once. */
  const leaveFact = useCallback(() => {
    if (quiet()) return;
    dispatch({ type: 'forward' });
    if (carried) dispatch({ type: 'answer_opener', text: carried });
  }, [quiet, carried]);

  // ---------- the journey ----------

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
      if (step !== 'result1' || !before) return;
      const next = afterDispute(before.sentences, index, ROUND1.seconds, before.durationSec, before.result.short === true);
      if (!next) return;
      setRounds((r) => ({ ...r, before: { ...before, ...next } }));
      dispatch({ type: 'result_updated', result: next.result });
    },
    [step, rounds.before],
  );

  const beginLesson = useCallback(() => dispatch({ type: 'begin_lesson' }), []);
  const answerTask = useCallback((text: string) => dispatch({ type: 'answer_task', text }), []);
  /**
   * The lesson's one way out. A finished lesson ends on "Ready for round two." itself (components/first/Lesson.tsx
   * shows it with what the last answer did), so that tap starts the round. A skip has not seen that screen yet.
   */
  const leaveLesson = useCallback(() => dispatch({ type: 'leave_lesson' }), []);
  const beginRound2 = useCallback(() => dispatch({ type: 'begin_round2' }), []);

  /** "Play again": a fresh pair of rounds, saved as practice. */
  const restart = useCallback(() => {
    saved.current = false;
    setRounds(NO_ROUNDS);
    dispatch({ type: 'restart' });
  }, []);

  // ---------- after the before and after ----------

  /** Next on the name: what is in the field, trimmed. An empty field is no name. */
  const keepName = useCallback(() => {
    if (quiet()) return;
    profileStore.update({ childName: name.trim() || null });
    setTypedName(null);
    dispatch({ type: 'forward' });
  }, [quiet, name]);
  /** Skip on the name: no name, whatever the field held. */
  const skipName = useCallback(() => {
    if (quiet()) return;
    profileStore.update({ childName: null });
    setTypedName(null);
    dispatch({ type: 'forward' });
  }, [quiet]);
  const pickAge = useCallback((childAge: number) => answerThenGo(() => profileStore.update({ childAge })), [answerThenGo]);
  const setMoments = useCallback(
    (ids: string[]) => {
      if (!quiet()) profileStore.update({ moments: ids.filter(isMomentId) });
    },
    [quiet],
  );
  /** Next on the moments. With none picked "How often do they happen?" has nothing to ask about, and no answer. */
  const leaveMoments = useCallback(() => {
    if (quiet()) return;
    if (moments.length === 0) profileStore.update({ frequency: null });
    dispatch({ type: 'forward', moments: moments.length });
  }, [quiet, moments.length]);
  const pickFrequency = useCallback((frequency: HowOften) => answerThenGo(() => profileStore.update({ frequency })), [answerThenGo]);
  const pickScene = useCallback((sceneId: string) => answerThenGo(() => profileStore.update({ sceneId })), [answerThenGo]);

  const setAnchor = useCallback((moment: string) => {
    dispatch({ type: 'set_setup', patch: { anchor: moment } });
    profileStore.update({ anchor: moment });
  }, []);
  /** Continue on "When can you play?": the calendar sheet comes up, with the day of the plan it counts from. */
  const leaveSetup = useCallback(() => {
    if (quiet()) return;
    setDay(planDayNow());
    dispatch({ type: 'forward', anchor });
  }, [quiet, anchor]);
  /** The sheet was closed, with the reminder added or not: on to the plan from the answers. */
  const closeCalendar = useCallback(() => dispatch({ type: 'calendar_closed' }), []);
  /** The Moment row of the sheet: back to the question under it. */
  const changeMoment = useCallback(() => dispatch({ type: 'calendar_closed', stay: true }), []);

  /** A row of the plan was tapped: back to the question that sets it. */
  const editRow = useCallback(
    (row: Exclude<PlanRowKey, 'focus'>) => {
      if (!quiet()) dispatch({ type: 'edit', question: QUESTION_OF_ROW[row], anchor });
    },
    [quiet, anchor],
  );
  /** "Looks right": the tap that opens the plan also reads its day, so the plan never shows without it. */
  const confirmPlan = useCallback(() => {
    if (quiet()) return;
    setDay(planDayNow());
    dispatch({ type: 'forward' });
  }, [quiet]);

  /** After the plan: the plans and their price. */
  const toPlans = useCallback(() => router.push(ROUTES.pricing), [router]);
  /** After the plan: the plan itself, on the Today tab. */
  const openPlan = useCallback(() => router.push(ROUTES.today), [router]);

  return {
    step,
    state,
    partner,
    carried,
    rounds,
    anchor,
    day,
    /** Where the screen stands among the personalization screens, for the progress segments; null on any other screen. */
    place: placeOf(visit),
    /** True when the back arrow of the screen that is up leads somewhere. */
    canGoBack: hasWayBack(visit),
    /** What the parent said they say most in play; null until the question is answered. */
    guess: profile.guess,
    /** The name field: what is being typed, or the saved name. */
    name,
    childName: profile.childName,
    childAge: profile.childAge,
    moments,
    frequency: profile.frequency ?? null,
    sceneId: profile.sceneId,
    /** True while the calendar sheet is up over "When can you play?". */
    calendarOpen: visit.calendar,
    /** Days left in the plan, today included: the reminder repeats daily for that many days. */
    daysLeft: PLAN_DAYS - (day ?? 1) + 1,
    /** True when the parent reflected or used up the tries: the first round can start. */
    canMoveOn: state.opener.reflected || state.opener.reflectionTries >= MAX_TRIES,
    back,
    forward,
    pickPartner,
    pickGuess,
    leaveFact,
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
    restart,
    changeName: setTypedName,
    keepName,
    skipName,
    pickAge,
    setMoments,
    leaveMoments,
    pickFrequency,
    pickScene,
    setAnchor,
    leaveSetup,
    closeCalendar,
    changeMoment,
    editRow,
    confirmPlan,
    toPlans,
    openPlan,
  };
}

/** Everything the screens of the first visit are given. */
export type FirstVisitFlow = ReturnType<typeof useFirstVisit>;
