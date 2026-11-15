'use client';

import { RoundRunner } from '@/components/round/RoundRunner';
import { useFirstVisit, type FirstVisitFlow } from '@/hooks/useFirstVisit';
import { lastTry, lessonDone, ROUND1, ROUND2 } from '@/lib/flow/journey';
import { AnswerRead } from './AnswerRead';
import { FirstAnswer } from './FirstAnswer';
import { Lesson } from './Lesson';
import { PickPartner } from './PickPartner';
import { PlanResult } from './PlanResult';
import { Ready } from './Ready';
import { BeforeAfter, RoundOneResult } from './roundScreens';
import { WhenYouPlay } from './WhenYouPlay';

/**
 * The first visit as one route: pick Mia or Leo, answer, see how the answer was read, round one, its result, the
 * lesson, round two, the before and after, when you play, the plan. Every decision is made in
 * hooks/useFirstVisit.ts and lib/flow/journey.ts.
 */
export function FirstVisit() {
  const flow = useFirstVisit();
  return <FirstVisitScreens flow={flow} />;
}

/**
 * Maps the step of the first visit to its screen and passes the props frozen in ./types.ts. Nothing else.
 *
 * The screens get the engine's texts as the engine wrote them, about Mia, together with `partner`: each screen
 * rewrites what it shows for the chosen child (forChild), and some compare a text with the engine's own.
 *
 * Each screen brings its own `split-root`. A round is rendered alone, with nothing around it: until its new
 * visuals land, the round screen is the old dark stage, and that needs a page with no `split-root` on it.
 */
export function FirstVisitScreens({ flow }: { flow: FirstVisitFlow }) {
  const { state, partner, rounds } = flow;
  const { opener } = state;

  switch (flow.step) {
    case 'partner':
      return <PickPartner value={partner} onPick={flow.pick} />;

    case 'opener':
      return (
        <FirstAnswer
          partner={partner}
          does={opener.does}
          childSaid={opener.childSaid}
          carried={flow.carried}
          onAnswer={flow.answerOpener}
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
        />
      );

    case 'ready1':
      return <Ready partner={partner} round={1} seconds={ROUND1.seconds} onStart={flow.beginRound1} />;

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
          onNext={flow.next}
          onAgain={flow.restart}
        />
      );

    case 'setup':
      return <WhenYouPlay partner={partner} value={flow.anchor} onChange={flow.setAnchor} onNext={flow.finishSetup} />;

    case 'plan':
      // The day is read from the saved sessions as the plan opens; there is no plan to show without it.
      if (flow.day === null) return null;
      return <PlanResult partner={partner} anchor={flow.anchor} day={flow.day} onNext={flow.toPlans} />;
  }
}
