'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Check, Sparkle } from '@/components/Icons';
import { useChild } from '@/components/child';
import { journeyProgress } from '@/components/journey';
import { ChangeRow, MiaCard, ResultStats, SentenceDisclosure, SkillRow, Takeaway } from '@/components/play/parts';
import { RoundStage } from '@/components/RoundStage';
import { SayField } from '@/components/SayField';
import { ActionLink, Art, Heading, Option, Screen, TopBar } from '@/components/ui';
import { loadProgress, saveProgress, todayISO } from '@/client/progressStore';
import { useJourney } from '@/hooks/useJourney';
import { useRound } from '@/hooks/useRound';
import { activeTask, lastTry, lessonDone, ROUND2 } from '@/lib/flow/journey';
import { addSession, dayNumber } from '@/lib/progress/history';
import { planDay, PLAN, PLAN_DAYS } from '@/lib/progress/plan';

/**
 * /play            the first visit: round 1 -> result -> lesson -> round 2 -> before and after -> setup -> plan
 * /play?daily=1    one daily five-minute session, saved to the parent's progress
 * Every decision is made in lib/flow/journey.ts and lib/round/session.ts. Each phase is one screen with one action.
 */
export default function PlayPage() {
  // Next keeps a page alive after you leave it. A link back here must start it fresh, not show the old last screen;
  // the browser's Back button still restores the page as it was.
  const { bfcacheId } = useRouter();
  return <Play key={bfcacheId} />;
}

function Play() {
  // The query is read after mount: the page itself is prerendered without it.
  const [mode, setMode] = useState<'first' | 'daily' | null>(null);
  useEffect(() => {
    const daily = new URLSearchParams(window.location.search).has('daily');
    const id = setTimeout(() => setMode(daily ? 'daily' : 'first'), 0);
    return () => clearTimeout(id);
  }, []);

  if (mode === null) {
    return (
      <Screen>
        <p className="enter pt-24 text-[15px] text-fg-faint" role="status">
          Getting the blocks out…
        </p>
      </Screen>
    );
  }
  return mode === 'daily' ? <Daily /> : <FirstVisit />;
}

const ANCHORS = [
  { label: 'After breakfast', icon: '/art/breakfast.png' },
  { label: 'After daycare', icon: '/art/daycare.png' },
  { label: 'After dinner', icon: '/art/dinner.png' },
  { label: 'Before bath', icon: '/art/bath.png' },
] as const;

function FirstVisit() {
  const j = useJourney('ready1');
  const { state, round } = j;
  const { child, t } = useChild();
  const top = <TopBar progress={journeyProgress(state.phase)} />;

  // Each phase is a new screen: it opens at the top, not where the last one was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.phase]);

  if (state.phase === 'round1' || state.phase === 'round2') {
    return <RoundStage round={round} title={state.phase === 'round1' ? 'Round 1 of 2' : 'Round 2 of 2'} />;
  }

  if (state.phase === 'ready1') {
    return (
      <Screen
        top={top}
        action={
          <button type="button" className="btn btn-primary btn-block" onClick={j.beginRound1}>
            Start the round
          </button>
        }
      >
        <Art src="/art/timer.png" priority />
        <Heading
          title={`One minute with ${child.name}`}
          lede={`Praise something exact, say ${child.their} words back, describe what ${child.they} does. Each one fills a ring.`}
        />
        <SkillRow />
      </Screen>
    );
  }

  if (state.phase === 'result1' && state.round1) {
    const result = state.round1;
    return (
      <Screen
        top={top}
        action={
          <button type="button" className="btn btn-primary btn-block" onClick={j.beginLesson}>
            Start the 30-second lesson
          </button>
        }
      >
        <MiaCard face={result.met ? 'beaming' : 'smiling'} posture={result.met ? 'leaning_in' : 'at_toy'} />
        <Heading title="Round 1 done" lede={t(round.state.farewell ?? '')} />
        <ResultStats result={result} className="mt-7" />
        {result.leverText && (
          <Takeaway label="Your biggest lever" className="mt-3">
            {t(result.leverText)}
          </Takeaway>
        )}
        <SentenceDisclosure sentences={round.state.sentences} onDispute={round.dispute} className="mt-3" />
      </Screen>
    );
  }

  if (state.phase === 'lesson' && state.lesson) {
    const { lesson } = state;
    const task = activeTask(state);
    const last = lastTry(state);
    const done = lessonDone(state);
    return (
      <Screen
        top={top}
        action={
          done ? (
            <button type="button" className="btn btn-primary btn-block" onClick={j.beginRound2}>
              Start round two
            </button>
          ) : (
            <button type="button" className="btn btn-ghost self-center" onClick={j.beginRound2}>
              Skip to round two
            </button>
          )
        }
      >
        <Art src="/art/lightbulb.png" size="sm" />
        <Heading title={t(lesson.title)} lede={t(lesson.why)} />

        <ul className="card enter d2 mt-7 divide-y divide-stroke text-left" aria-label="Examples">
          {lesson.pairs.map((p, i) => (
            <li key={i} className="px-4 py-3.5">
              {p.childSaid && <p className="text-[14px] text-fg-soft">{child.name}: “{p.childSaid}”</p>}
              <p className="text-[14px] text-fg-faint">Instead of “{p.insteadOf}”</p>
              <p className="mt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.01em] text-fg">“{p.say}”</p>
            </li>
          ))}
        </ul>

        {task ? (
          <div className="card enter d3 mt-4 p-4 text-left">
            <p className="text-[13px] font-semibold text-lilac">
              Your turn, {state.taskIndex + 1} of {lesson.tasks.length}
            </p>
            <p className="mt-1.5 text-[15px] leading-snug text-fg-2">{t(task.situation)}</p>
            {task.childSaid && <p className="title mt-1.5 text-[22px] text-fg">“{task.childSaid}”</p>}
            <p className="mt-3 text-[15px] leading-snug text-fg-soft">Instead of “{task.insteadOf}”, you say:</p>
            <SayField id="task" label="Your sentence" placeholder="Your sentence" submitLabel="Check" onSay={j.answerTask} className="mt-2.5" />
            {last && (
              <p className="mt-3 text-[14px] leading-snug text-lilac" aria-live="polite">
                {t(last.feedback)}
              </p>
            )}
          </div>
        ) : (
          last && (
            <div className="pop mt-4 flex items-start gap-3 rounded-[1.25rem] bg-violet/10 px-4 py-3.5 text-left" aria-live="polite">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet text-white">
                {last.ok ? <Check size={14} strokeWidth={3} /> : <Sparkle size={13} strokeWidth={2.4} />}
              </span>
              <p className="text-[15px] leading-snug text-lilac">{t(last.feedback)}</p>
            </div>
          )
        )}
      </Screen>
    );
  }

  if (state.phase === 'change' && state.round2) {
    const change = state.change;
    const improved = change?.improved ?? false;
    // The engine lists good news first: skills that rose, then fewer sentences to swap.
    const goodCount = change
      ? (['description', 'reflection', 'specific_praise'] as const).filter((k) => change.perMinute[k] > 0).length +
        (change.perMinute.avoid < 0 ? 1 : 0)
      : 0;
    return (
      <Screen
        top={top}
        action={
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={j.next}>
              See my 28-day plan
            </button>
            <button type="button" className="btn btn-ghost self-center" onClick={j.restart}>
              Play again
            </button>
          </>
        }
      >
        <MiaCard size="sm" face={improved ? 'beaming' : 'smiling'} posture={improved ? 'leaning_in' : 'at_toy'} />
        <Heading title="Before and after" lede={t(round.state.farewell ?? '')} />
        {change && change.lines.length > 0 ? (
          <ul className="card enter d2 mt-7 divide-y divide-stroke text-left" aria-label="What changed since round 1" aria-live="polite">
            {change.lines.map((l, i) => (
              <ChangeRow key={l} text={l} good={i < goodCount} />
            ))}
          </ul>
        ) : (
          <p className="enter d2 mt-7 rounded-[1.25rem] bg-surface-2 px-5 py-4 text-[15px] leading-snug text-fg-2" aria-live="polite">
            About the same as round 1. The plan takes it one skill at a time.
          </p>
        )}
        <ResultStats result={state.round2} caption={`Round 2, ${ROUND2.seconds} seconds`} className="mt-6" />
      </Screen>
    );
  }

  if (state.phase === 'setup') {
    const { setup } = state;
    return (
      <Screen
        top={top}
        action={
          <button type="button" className="btn btn-primary btn-block" onClick={j.finishSetup}>
            Show my plan
          </button>
        }
      >
        <Heading title="When can you play for five minutes?" lede="The plan is the same for every family. This sets your moment." />
        <div role="radiogroup" aria-label="When can you play for five minutes?" className="enter d2 mt-8 flex flex-col gap-3">
          {ANCHORS.map((a) => (
            <Option key={a.label} label={a.label} icon={a.icon} selected={setup.anchor === a.label} onSelect={() => j.setSetup({ anchor: a.label })} />
          ))}
        </div>
      </Screen>
    );
  }

  if (state.phase !== 'plan') return null;

  // plan: the day comes from the saved progress, so a replay on day 5 does not say "Day 1"
  const day = j.day ?? 1;
  const today = planDay(day);
  const weeks = [1, 2, 3, 4].map((w) => PLAN.find((d) => d.week === w)!);
  return (
    <Screen
      top={top}
      action={
        <>
          <ActionLink href="/dashboard">See my plan</ActionLink>
          <ActionLink href="/pricing" variant="secondary">
            Unlock daily sessions
          </ActionLink>
        </>
      }
    >
      <Art src="/art/plan.png" />
      <Heading
        title={day <= PLAN_DAYS ? `Day ${day} of ${PLAN_DAYS} is done` : `Day ${day} is done`}
        lede={`Five minutes a day${state.setup.anchor ? ` ${state.setup.anchor.toLowerCase()}` : ''}. One skill a week.`}
      />
      <ol className="card enter d2 mt-7 divide-y divide-stroke text-left" aria-label="Your four weeks">
        {weeks.map((d) => {
          const current = d.week === today.week;
          return (
            <li key={d.week} className="flex items-center gap-3.5 px-4 py-3" aria-current={current ? 'step' : undefined}>
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[15px] font-bold tabular-nums ${
                  current ? 'bg-violet text-white shadow-violet' : 'bg-surface-2 text-fg-soft'
                }`}
              >
                <span className="sr-only">Week </span>
                {d.week}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold tracking-[-0.01em] text-fg">{d.theme}</span>
                <span className="block text-[14px] leading-snug text-fg-soft">{t(d.title)}</span>
              </span>
              {current && <span className="shrink-0 text-[13px] font-semibold text-lilac">This week</span>}
            </li>
          );
        })}
      </ol>
      <p className="enter d3 mt-5 text-[15px] leading-snug text-fg-2">{t(today.teaser)}</p>
    </Screen>
  );
}

/** One daily five-minute session. The scene alternates by plan day; the result is saved to progress. */
function Daily() {
  const round = useRound();
  const { state, start } = round;
  const { t } = useChild();
  const [day, setDay] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  function begin() {
    const n = dayNumber(loadProgress(), todayISO());
    setDay(n);
    setSaved(false);
    // The seed changes with the day so each session plays differently.
    start(n % 2 === 0 ? 'drawing' : 'blocks', 300, 1000 + n);
  }

  useEffect(() => {
    if (state.phase !== 'ended' || !state.result || saved) return;
    saveProgress(addSession(loadProgress(), state.result, todayISO(), 'practice'));
    const id = setTimeout(() => setSaved(true), 0);
    return () => clearTimeout(id);
  }, [state.phase, state.result, saved]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.phase]);

  if (state.phase === 'idle') {
    return (
      <Screen
        action={
          <button type="button" className="btn btn-primary btn-block" onClick={begin}>
            Start
          </button>
        }
      >
        <Art src="/art/timer.png" priority />
        <Heading
          title="Today’s five minutes"
          lede="A full session against the clinic numbers: 10 specific praises, 10 reflections, 10 descriptions."
        />
      </Screen>
    );
  }

  if (state.phase === 'running') {
    return <RoundStage round={round} title={day ? `Day ${day}, ${planDay(day).theme}` : 'Five minutes'} />;
  }

  const result = state.result;
  return (
    <Screen action={<ActionLink href="/dashboard">Back to my plan</ActionLink>}>
      <MiaCard face={result?.met ? 'beaming' : 'smiling'} posture={result?.met ? 'leaning_in' : 'at_toy'} />
      <Heading title={result?.met ? 'You met the clinic pace today' : 'Session saved'} lede={t(state.farewell ?? '')} />
      {result && <ResultStats result={result} className="mt-7" />}
      {result?.leverText && (
        <Takeaway label="Next time" className="mt-3">
          {t(result.leverText)}
        </Takeaway>
      )}
    </Screen>
  );
}
