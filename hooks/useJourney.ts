'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { loadFirstRounds, loadProgress, saveFirstRounds, saveProgress, todayISO } from '@/client/progressStore';
import { sessionStore } from '@/client/sessionStore';
import { useChild } from '@/components/child';
import type { RoundDone } from '@/components/round/types';
import { initialJourney, journeyReducer, ROUND1, ROUND2, type JourneyPhase, type SetupAnswers } from '@/lib/flow/journey';
import { addSession, dayNumber } from '@/lib/progress/history';
import { sessionDraft, useRound } from './useRound';

/**
 * The first visit, wired: the pure journey reducer, the round engine with its clock, and storage.
 * A screen reads `state` and `round`, and calls the actions. It holds no logic of its own.
 */
export function useJourney(startAt: JourneyPhase = 'opener') {
  const [state, dispatch] = useReducer(journeyReducer, startAt, (phase) => initialJourney(1, phase));
  const round = useRound();
  const { state: r, start, done } = round;
  const { child } = useChild();
  const saved = useRef(false);
  /** Both rounds in full, for the session store: the engine lets go of round one when round two starts. */
  const rounds = useRef<{ before: RoundDone | null; after: RoundDone | null }>({ before: null, after: null });
  /** Day of the plan, read from the saved progress when the plan screen opens. */
  const [day, setDay] = useState<number | null>(null);

  // Each round gets its own seed, which also tells a fresh round from the previous one.
  const roundSeed = state.phase === 'round2' || state.phase === 'change' ? state.seed + 1 : state.seed;

  // Entering a round phase starts the engine.
  useEffect(() => {
    if (state.phase === 'round1') start(ROUND1.sceneId, ROUND1.seconds, state.seed);
    if (state.phase === 'round2') start(ROUND2.sceneId, ROUND2.seconds, state.seed + 1);
  }, [state.phase, state.seed, start]);

  // A finished round is handed to the journey; a later dispute updates the stored result.
  useEffect(() => {
    if (r.phase !== 'ended' || !r.result || r.seed !== roundSeed) return;
    if (state.phase === 'round1' || state.phase === 'round2') dispatch({ type: 'round_ended', result: r.result });
    else if (state.phase === 'result1' && r.result !== state.round1) dispatch({ type: 'result_updated', result: r.result });
    else if (state.phase === 'change' && r.result !== state.round2) dispatch({ type: 'result_updated', result: r.result });
  }, [r.phase, r.result, r.seed, roundSeed, state.phase, state.round1, state.round2]);

  // Each finished round is kept with its sentences; a dispute on the result screen replaces it.
  useEffect(() => {
    if (!done) return;
    if (r.seed === state.seed) rounds.current.before = done;
    if (r.seed === state.seed + 1) rounds.current.after = done;
  }, [done, r.seed, state.seed]);

  // Both rounds are saved once, when the before-and-after is first shown.
  useEffect(() => {
    if (state.phase !== 'change' || !state.round1 || !state.round2 || saved.current) return;
    saved.current = true;
    const today = todayISO();
    const firstVisit = !loadFirstRounds();
    // The session store goes first: on its first run it brings the old sessions over, and these two must not be among them.
    const { before, after } = rounds.current;
    const about = { date: today, partner: child.id };
    // Like the "First visit" card below, the before and after are the very first two rounds; a replay is practice.
    if (before) sessionStore.add(sessionDraft(before, { ...about, kind: firstVisit ? 'first_before' : 'practice', sceneId: ROUND1.sceneId }));
    if (after) sessionStore.add(sessionDraft(after, { ...about, kind: firstVisit ? 'first_after' : 'practice', sceneId: ROUND2.sceneId }));
    const withFirst = addSession(loadProgress(), state.round1, today, 'practice');
    saveProgress(addSession(withFirst, state.round2, today, 'practice'));
    // Kept from the very first visit only: the dashboard card is called "First visit".
    if (firstVisit) saveFirstRounds(state.round1, state.round2);
  }, [state.phase, state.round1, state.round2, child.id]);

  // On the plan screen: the chosen moment goes into the saved progress, and the day of the plan is read.
  useEffect(() => {
    if (state.phase !== 'plan') return;
    if (state.setup.anchor) saveProgress({ ...loadProgress(), anchor: state.setup.anchor });
    const id = setTimeout(() => setDay(dayNumber(loadProgress(), todayISO())), 0);
    return () => clearTimeout(id);
  }, [state.phase, state.setup]);

  const answerOpener = useCallback((text: string) => dispatch({ type: 'answer_opener', text }), []);
  const tryReflection = useCallback((text: string) => dispatch({ type: 'try_reflection', text }), []);
  const beginRound1 = useCallback(() => dispatch({ type: 'begin_round1' }), []);
  const beginLesson = useCallback(() => dispatch({ type: 'begin_lesson' }), []);
  const answerTask = useCallback((text: string) => dispatch({ type: 'answer_task', text }), []);
  const beginRound2 = useCallback(() => dispatch({ type: 'begin_round2' }), []);
  const next = useCallback(() => dispatch({ type: 'continue' }), []);
  const setSetup = useCallback((patch: Partial<SetupAnswers>) => dispatch({ type: 'set_setup', patch }), []);
  const finishSetup = useCallback(() => dispatch({ type: 'finish_setup' }), []);
  const restart = useCallback(() => {
    saved.current = false;
    rounds.current = { before: null, after: null };
    dispatch({ type: 'restart' });
  }, []);

  return {
    state,
    round,
    day,
    answerOpener,
    tryReflection,
    beginRound1,
    beginLesson,
    answerTask,
    beginRound2,
    next,
    setSetup,
    finishSetup,
    restart,
  };
}
