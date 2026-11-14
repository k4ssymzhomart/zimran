'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SentenceChip, Shell } from '@/components/Bits';
import { Mia } from '@/components/Mia';
import { RoundStage } from '@/components/RoundStage';
import { loadProgress, saveProgress, todayISO } from '@/client/progressStore';
import { useJourney } from '@/hooks/useJourney';
import { useRound } from '@/hooks/useRound';
import { activeTask, lastTry, lessonDone, ROUND1, ROUND2 } from '@/lib/flow/journey';
import { addSession, dayNumber } from '@/lib/progress/history';
import { planDay, PLAN, PLAN_DAYS } from '@/lib/progress/plan';
import type { RoundResult } from '@/lib/types';

/**
 * /play            the first visit: round 1 -> result -> lesson -> round 2 -> before and after -> setup -> plan
 * /play?daily=1    one daily five-minute session, saved to the parent's progress
 * Reference screens: every decision is made in lib/flow/journey.ts and lib/round/session.ts.
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

  return <Shell>{mode === null ? <p className="text-sm text-ink-soft">Getting the blocks out…</p> : mode === 'daily' ? <Daily /> : <FirstVisit />}</Shell>;
}

/** Counts against targets, as a small table. */
function ResultTable({ result }: { result: RoundResult }) {
  const rows = [
    ['Specific praise', result.counts.specific_praise, result.targets.specific_praise],
    ['Reflections', result.counts.reflection, result.targets.reflection],
    ['Descriptions', result.counts.description, result.targets.description],
  ] as const;
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Your round against the clinic pace</caption>
      <thead>
        <tr className="text-left text-ink-soft">
          <th className="py-1 font-semibold">Skill</th>
          <th className="py-1 font-semibold">You</th>
          <th className="py-1 font-semibold">Clinic pace</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, count, target]) => (
          <tr key={label} className="border-t border-ink/15">
            <td className="py-1.5">{label}</td>
            <td className="py-1.5 font-display text-base font-semibold tabular-nums">{count}</td>
            <td className="py-1.5 tabular-nums">{target}</td>
          </tr>
        ))}
        <tr className="border-t border-ink/15">
          <td className="py-1.5">To swap (questions, commands, corrections)</td>
          <td className="py-1.5 font-display text-base font-semibold tabular-nums">{result.counts.avoid}</td>
          <td className="py-1.5 tabular-nums">at most {result.targets.maxAvoid}</td>
        </tr>
      </tbody>
    </table>
  );
}

function FirstVisit() {
  const j = useJourney('ready1');
  const { state, round } = j;
  const [answer, setAnswer] = useState('');

  if (state.phase === 'ready1') {
    return (
      <section className="space-y-4">
        <h1 className="font-display text-3xl font-semibold">One minute with Mia</h1>
        <p className="text-sm">
          She plays, you talk. Three things fill your rings: praise for something exact, her own words said back, and a
          description of what she is doing. Questions and orders go to a tray to swap later.
        </p>
        <button className="btn btn-primary w-full" onClick={j.beginRound1}>
          Start the round
        </button>
      </section>
    );
  }

  if (state.phase === 'round1' || state.phase === 'round2') {
    const first = state.phase === 'round1';
    return <RoundStage round={round} title={first ? `Round 1 · ${ROUND1.seconds} seconds` : `Round 2 · ${ROUND2.seconds} seconds`} />;
  }

  if (state.phase === 'result1' && state.round1) {
    return (
      <section className="space-y-4">
        <h1 className="font-display text-3xl font-semibold">Round 1</h1>
        {round.state.farewell && <p className="text-sm italic">{round.state.farewell}</p>}
        <div className="sticker-sm bg-[#fffaf0] p-3">
          <ResultTable result={state.round1} />
        </div>
        {state.round1.leverText && (
          <div className="sticker-sm bg-sun p-3">
            <p className="text-xs font-bold uppercase tracking-wide">Your biggest lever</p>
            <p className="mt-1 font-display text-lg font-semibold">{state.round1.leverText}</p>
          </div>
        )}
        <details>
          <summary className="cursor-pointer text-sm font-semibold">Every sentence and how it was read</summary>
          <ul className="mt-2 space-y-2">
            {round.state.sentences.map((s, i) => (
              <SentenceChip key={i} sentence={s} disputed={s.disputed} onDispute={() => round.dispute(i)} />
            ))}
          </ul>
        </details>
        <button className="btn btn-primary w-full" onClick={j.beginLesson}>
          Thirty-second lesson
        </button>
      </section>
    );
  }

  if (state.phase === 'lesson' && state.lesson) {
    const task = activeTask(state);
    const last = lastTry(state);
    const done = lessonDone(state);
    return (
      <section className="space-y-4">
        <h1 className="font-display text-3xl font-semibold">{state.lesson.title}</h1>
        <p className="text-sm">{state.lesson.why}</p>
        <ul className="space-y-2">
          {state.lesson.pairs.map((p, i) => (
            <li key={i} className="sticker-sm bg-[#fffaf0] p-3 text-sm">
              {p.childSaid && <p className="text-ink-soft">Mia: “{p.childSaid}”</p>}
              <p>
                Instead of <span className="italic">“{p.insteadOf}”</span>
              </p>
              <p className="font-semibold">say “{p.say}”</p>
            </li>
          ))}
        </ul>

        {last && (
          <p className="text-sm" aria-live="polite">
            {last.feedback}
          </p>
        )}

        {task && (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!answer.trim()) return;
              j.answerTask(answer);
              setAnswer('');
            }}
          >
            <p className="text-sm font-semibold">
              Your turn ({state.taskIndex + 1} of {state.lesson.tasks.length}). {task.situation}
            </p>
            {task.childSaid && <p className="text-sm">Mia: “{task.childSaid}”</p>}
            <p className="text-sm text-ink-soft">Instead of “{task.insteadOf}”, you say:</p>
            <div className="flex gap-2">
              <label htmlFor="task" className="sr-only">
                Your sentence
              </label>
              <input id="task" className="field" value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" maxLength={600} />
              <button className="btn btn-primary" type="submit">
                Check
              </button>
            </div>
          </form>
        )}

        <button className={`btn w-full ${done ? 'btn-primary' : 'btn-plain'}`} onClick={j.beginRound2}>
          {done ? 'Round two' : 'Skip to round two'}
        </button>
      </section>
    );
  }

  if (state.phase === 'change' && state.round2) {
    return (
      <section className="space-y-4">
        <h1 className="font-display text-3xl font-semibold">Before and after</h1>
        <div className="flex justify-center">
          <Mia face={state.change?.improved ? 'beaming' : 'smiling'} posture={state.change?.improved ? 'leaning_in' : 'at_toy'} size={130} />
        </div>
        {round.state.farewell && <p className="text-center text-sm italic">{round.state.farewell}</p>}
        <ul className="sticker-sm space-y-1 bg-[#fffaf0] p-3 font-display text-lg font-semibold" aria-live="polite">
          {(state.change?.lines.length ? state.change.lines : ['About the same as round 1. The plan takes it one skill at a time.']).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <div className="sticker-sm bg-[#fffaf0] p-3">
          <ResultTable result={state.round2} />
        </div>
        <button className="btn btn-primary w-full" onClick={j.next}>
          See the 28-day plan
        </button>
        <button className="btn btn-plain w-full" onClick={j.restart}>
          Play again
        </button>
      </section>
    );
  }

  if (state.phase === 'setup') {
    const { setup } = state;
    return (
      <section className="space-y-5">
        <h1 className="font-display text-3xl font-semibold">One quick question</h1>
        <p className="text-sm">The plan is the same 28 days for every family. Your answer sets when your five minutes happen.</p>
        <Choice label="When can you play for five minutes?" options={['After breakfast', 'After daycare', 'After dinner', 'Before bath']} value={setup.anchor} onPick={(v) => j.setSetup({ anchor: v })} />
        <button className="btn btn-primary w-full" onClick={j.finishSetup}>
          Show my plan
        </button>
      </section>
    );
  }

  // plan: the day comes from the saved progress, so a replay on day 5 does not say "Day 1"
  const day = j.day ?? 1;
  const weeks = [1, 2, 3, 4].map((w) => PLAN.find((d) => d.week === w)!);
  return (
    <section className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">{day <= PLAN_DAYS ? `Day ${day} of ${PLAN_DAYS} is done` : `Day ${day} is done`}</h1>
      <p className="text-sm">
        Five minutes a day{state.setup.anchor ? `, ${state.setup.anchor.toLowerCase()}` : ''}. One skill a week, and on day 28 a full
        five minutes against the clinic numbers.
      </p>
      <ol className="space-y-2">
        {weeks.map((d) => (
          <li key={d.week} className="sticker-sm bg-[#fffaf0] p-3 text-sm">
            <span className="font-bold">Week {d.week} · {d.theme}.</span> {d.title}
          </li>
        ))}
      </ol>
      <p className="text-sm font-semibold">{planDay(day).teaser}</p>
      <Link href="/dashboard" className="btn btn-primary w-full">
        See my plan
      </Link>
      <Link href="/pricing" className="btn btn-plain w-full">
        Unlock daily sessions
      </Link>
    </section>
  );
}

function Choice({ label, options, value, onPick }: { label: string; options: string[]; value: string | null; onPick: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value === o} onClick={() => onPick(o)} className={`btn btn-quiet ${value === o ? '!bg-sun' : ''}`}>
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** One daily five-minute session. The scene alternates by plan day; the result is saved to progress. */
function Daily() {
  const round = useRound();
  const { state, start } = round;
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

  if (state.phase === 'idle') {
    return (
      <section className="space-y-4">
        <h1 className="font-display text-3xl font-semibold">Today&apos;s five minutes</h1>
        <p className="text-sm">A full session against the clinic numbers: 10 specific praises, 10 reflections, 10 descriptions.</p>
        <button className="btn btn-primary w-full" onClick={begin}>
          Start
        </button>
      </section>
    );
  }

  if (state.phase === 'running') {
    return <RoundStage round={round} title={day ? `Day ${day} · five minutes · ${planDay(day).theme}` : 'Five minutes'} />;
  }

  return (
    <section className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">{state.result?.met ? 'You met the clinic pace today' : 'Session saved'}</h1>
      {state.farewell && <p className="text-sm italic">{state.farewell}</p>}
      {state.result && (
        <div className="sticker-sm bg-[#fffaf0] p-3">
          <ResultTable result={state.result} />
        </div>
      )}
      {state.result?.leverText && <p className="text-sm font-semibold">Next time: {state.result.leverText}</p>}
      <Link href="/dashboard" className="btn btn-primary w-full">
        Back to my plan
      </Link>
    </section>
  );
}
