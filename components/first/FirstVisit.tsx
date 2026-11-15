'use client';

import { useEffect, useRef } from 'react';
// The round in the Split design, built on the same props and engine as components/round/RoundRunner.
// To use developer B's stage instead: import { RoundRunner } from '@/components/round/RoundRunner';
import { FirstRound as RoundRunner } from './round/FirstRound';
import { useFirstVisit, type FirstVisitFlow } from '@/hooks/useFirstVisit';
import { lastTry, lessonDone, ROUND1, ROUND2 } from '@/lib/flow/journey';
import { AnswerRead } from './AnswerRead';
import { CalendarSheet } from './CalendarSheet';
import { FirstAnswer } from './FirstAnswer';
import { Lesson } from './Lesson';
import { PickPartner } from './PickPartner';
import { PlanFromAnswers } from './PlanFromAnswers';
import { habitFor } from './planFromAnswersRules';
import { PlanResult } from './PlanResult';
import { QuizAge } from './quiz/QuizAge';
import { QuizFact } from './quiz/QuizFact';
import { QuizGuess } from './quiz/QuizGuess';
import { QuizHowOften } from './quiz/QuizHowOften';
import { QuizMoments } from './quiz/QuizMoments';
import { QuizName } from './quiz/QuizName';
import { Ready } from './Ready';
import { BeforeAfter, RoundOneResult } from './roundScreens';
import { Scene } from './Scene';
import { WhenYouPlay } from './WhenYouPlay';

/**
 * The first visit as one route. Three short screens come before the first answer (pick Mia or Leo, a guess, a
 * fact), then the parent answers, plays round one, takes the lesson, plays round two and sees the before and after.
 * The rest of the personalization comes after that, where it builds the plan: the child's name and age, the
 * hardest moments, the scene, when to play, the plan from those answers, the 28 days.
 * Every decision is made in hooks/useFirstVisit.ts, lib/flow/visit.ts and lib/flow/journey.ts.
 */
export function FirstVisit() {
  const flow = useFirstVisit();
  return <FirstVisitScreens flow={flow} />;
}

/**
 * Draws the screen of the step that is up, and moves the keyboard focus to it when the step changes.
 *
 * The wrapper is not a box (`contents`): each screen is laid out as if it stood alone on the page.
 */
export function FirstVisitScreens({ flow }: { flow: FirstVisitFlow }) {
  const screen = useRef<HTMLDivElement>(null);
  const shown = useRef(flow.step);

  // The screen before is gone with the control that was used, and the focus with it. The heading of the new screen
  // takes it, without a ring: a screen reader reads the question and the next Tab reaches its answers.
  // Not on the first paint (the page has just opened), and not in a round: the round screen looks after its own field.
  useEffect(() => {
    if (shown.current === flow.step) return;
    shown.current = flow.step;
    const root = screen.current;
    if (!root || flow.step === 'round1' || flow.step === 'round2') return;
    // A screen that placed the focus itself keeps it.
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body && root.contains(active)) return;
    const heading = root.querySelector<HTMLElement>('h1');
    if (!heading) return;
    if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, [flow.step]);

  /** The Moment row of the calendar sheet: the sheet closes and the moment that is picked takes the focus, ready to be changed. */
  function changeMoment() {
    flow.changeMoment();
    window.setTimeout(() => screen.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus(), 0);
  }

  return (
    <div ref={screen} className="contents [&_h1:focus]:outline-none">
      <StepScreen flow={flow} onChangeMoment={changeMoment} />
    </div>
  );
}

/**
 * Maps the step of the first visit to its screen and passes the props frozen in ./types.ts and ./quizTypes.ts.
 * Nothing else.
 *
 * The screens get the engine's texts as the engine wrote them, about Mia, together with `partner`: each screen
 * rewrites what it shows for the chosen child (forChild), and some compare a text with the engine's own.
 *
 * Each screen brings its own `split-root`. A round is rendered alone, with nothing around it: until its new
 * visuals land, the round screen is the old dark stage, and that needs a page with no `split-root` on it.
 */
function StepScreen({ flow, onChangeMoment }: { flow: FirstVisitFlow; onChangeMoment(): void }) {
  const { state, partner, rounds } = flow;
  const { opener } = state;
  /** The top row of a personalization screen: where it stands among them, and the way back. */
  const quiz = { step: flow.place?.step ?? 1, steps: flow.place?.steps ?? 1, onBack: flow.back };

  switch (flow.step) {
    case 'partner':
      return <PickPartner {...quiz} value={partner} onPick={flow.pickPartner} />;

    case 'guess':
      return <QuizGuess {...quiz} value={flow.guess} onPick={flow.pickGuess} />;

    case 'fact':
      return <QuizFact {...quiz} onNext={flow.leaveFact} />;

    case 'opener':
      return (
        <FirstAnswer
          partner={partner}
          does={opener.does}
          childSaid={opener.childSaid}
          carried={flow.carried}
          onAnswer={flow.answerOpener}
          onBack={flow.back}
        />
      );

    case 'opener_reveal':
      return (
        <AnswerRead
          partner={partner}
          childSaid={opener.childSaid}
          first={opener.first}
          insight={opener.insight}
          reflected={opener.reflected}
          tries={opener.reflectionTries}
          feedback={opener.reflectionFeedback}
          canMoveOn={flow.canMoveOn}
          onTry={flow.tryReflection}
          onNext={flow.toReady}
          onBack={flow.back}
        />
      );

    case 'ready1':
      // After "Play again" nothing is behind this screen, and it draws no arrow.
      return <Ready partner={partner} round={1} seconds={ROUND1.seconds} onStart={flow.beginRound1} onBack={flow.canGoBack ? flow.back : undefined} />;

    case 'round1':
      return (
        <RoundRunner
          key={`round1-${state.seed}`}
          mode="practice"
          sceneId={ROUND1.sceneId}
          partner={partner}
          durationSec={ROUND1.seconds}
          seed={state.seed}
          title="Round 1 of 2"
          guess={flow.guess}
          onDone={flow.endRound1}
        />
      );

    case 'result1':
      if (!state.round1) return null;
      // No key: the screen stays mounted while a dispute changes its result, on the step the parent is reading.
      return (
        <RoundOneResult
          result={state.round1}
          sentences={rounds.before?.sentences ?? []}
          guess={flow.guess}
          partner={partner}
          farewell={rounds.before?.farewell ?? null}
          onDispute={flow.dispute}
          onNext={flow.beginLesson}
        />
      );

    case 'lesson':
      if (!state.lesson) return null;
      return (
        <Lesson
          partner={partner}
          lesson={state.lesson}
          taskIndex={state.taskIndex}
          lastTry={lastTry(state)}
          done={lessonDone(state)}
          onAnswer={flow.answerTask}
          onNext={flow.leaveLesson}
          onBack={flow.back}
        />
      );

    case 'ready2':
      return <Ready partner={partner} round={2} seconds={ROUND2.seconds} onStart={flow.beginRound2} />;

    case 'round2':
      return (
        <RoundRunner
          key={`round2-${state.seed + 1}`}
          mode="practice"
          sceneId={ROUND2.sceneId}
          partner={partner}
          durationSec={ROUND2.seconds}
          seed={state.seed + 1}
          title="Round 2 of 2"
          guess={flow.guess}
          onDone={flow.endRound2}
        />
      );

    case 'change':
      if (!state.round1 || !state.round2) return null;
      return (
        <BeforeAfter
          before={state.round1}
          after={state.round2}
          change={state.change}
          partner={partner}
          farewell={rounds.after?.farewell ?? null}
          onNext={flow.forward}
          onAgain={flow.restart}
        />
      );

    case 'name':
      return <QuizName {...quiz} value={flow.name} onChange={flow.changeName} onNext={flow.keepName} onSkip={flow.skipName} />;

    case 'age':
      return <QuizAge {...quiz} childName={flow.childName} value={flow.childAge} onPick={flow.pickAge} />;

    case 'moments':
      return <QuizMoments {...quiz} value={flow.moments} onChange={flow.setMoments} onNext={flow.leaveMoments} />;

    case 'frequency':
      return <QuizHowOften {...quiz} value={flow.frequency} onPick={flow.pickFrequency} />;

    case 'scene':
      return <Scene {...quiz} childName={flow.childName} partner={partner} value={flow.sceneId} onPick={flow.pickScene} />;

    case 'setup':
      // The sheet stays mounted with its question, so the time the parent set in it is still there when it reopens.
      return (
        <>
          <WhenYouPlay partner={partner} value={flow.anchor} onChange={flow.setAnchor} onNext={flow.leaveSetup} onBack={flow.back} />
          <CalendarSheet
            open={flow.calendarOpen}
            anchor={flow.anchor}
            daysLeft={flow.daysLeft}
            onClose={flow.closeCalendar}
            onEditMoment={onChangeMoment}
          />
        </>
      );

    case 'answers':
      return (
        <PlanFromAnswers
          {...quiz}
          partner={partner}
          sceneId={flow.sceneId}
          praise={habitFor(flow.moments)}
          anchor={flow.anchor}
          focus={state.round1?.lever ?? null}
          onEdit={flow.editRow}
          onNext={flow.confirmPlan}
        />
      );

    case 'plan':
      // The day is read from the saved sessions as the plan opens; there is no plan to show without it.
      if (flow.day === null) return null;
      return <PlanResult partner={partner} anchor={flow.anchor} day={flow.day} onNext={flow.toPlans} onOpenPlan={flow.openPlan} />;
  }
}
