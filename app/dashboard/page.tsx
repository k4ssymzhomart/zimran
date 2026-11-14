'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readEntitlement } from '@/client/entitlement';
import { loadFirstRounds, loadProgress, saveProgress, todayISO } from '@/client/progressStore';
import { DemoBadge, Shell } from '@/components/Bits';
import { Mia } from '@/components/Mia';
import { CalmCard } from '@/components/dashboard/CalmCard';
import { DemoBar } from '@/components/dashboard/DemoBar';
import { SkillCard } from '@/components/dashboard/SkillCard';
import {
  addCheckin, addDays, compareRounds, dayNumber, PLAN_DAYS, planDay, simulateFamily, streak,
  type DemoDay, type Progress, type RoundResult, type TantrumBucket,
} from '@/lib';

/** Everything read from this device, loaded once in an effect. */
interface Own {
  progress: Progress;
  today: string;
  paid: boolean;
  firstRounds: { before: RoundResult; after: RoundResult } | null;
}

interface Demo {
  days: DemoDay[];
  progress: Progress;
}

const DEMO_SEED = 7;
const DEMO_STEP_MS = 1000;

/** The simulated family's progress as it stood on a given date. */
function cutAt(p: Progress, date: string): Progress {
  return { ...p, sessions: p.sessions.filter((s) => s.date <= date), checkins: p.checkins.filter((c) => c.date <= date) };
}

export default function DashboardPage() {
  // Next keeps a page alive after you leave it. A link back here must start it fresh, not show the old last screen;
  // the browser's Back button still restores the page as it was.
  const { bfcacheId } = useRouter();
  return <Dashboard key={bfcacheId} />;
}

function Dashboard() {
  const [own, setOwn] = useState<Own | null>(null);
  const [demo, setDemo] = useState<Demo | null>(null);
  const [demoDay, setDemoDay] = useState(1);

  // localStorage and the clock exist only in the browser, so they are read once after the first paint.
  // This is the one-time read of an external store that the lint rule below cannot tell apart from a cascade.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOwn({ progress: loadProgress(), today: todayISO(), paid: readEntitlement().paid, firstRounds: loadFirstRounds() });
  }, []);

  // The demo steps one day about once a second until day 28.
  useEffect(() => {
    if (!demo || demoDay >= demo.days.length) return;
    const id = setTimeout(() => setDemoDay((d) => d + 1), DEMO_STEP_MS);
    return () => clearTimeout(id);
  }, [demo, demoDay]);

  if (!own) return <Skeleton />;

  const playDemo = () => {
    // The simulated month ends today. It lives in state only and is never saved.
    setDemo(simulateFamily(DEMO_SEED, addDays(todayISO(), -(PLAN_DAYS - 1))));
    setDemoDay(1);
    window.scrollTo({ top: 0 });
  };

  const saveCheckin = (tantrums: TantrumBucket) => {
    const today = todayISO();
    // Start from what is stored now: another tab may have saved rounds since this page was read.
    const progress = addCheckin(loadProgress(), today, tantrums);
    saveProgress(progress);
    setOwn({ ...own, progress, today });
  };

  // One view for both sources: the demo cut at its current day, or the parent's own data.
  const shown = demo ? demo.days[demoDay - 1] : null;
  const progress = demo && shown ? cutAt(demo.progress, shown.date) : own.progress;
  const today = shown ? shown.date : own.today;
  const empty = progress.sessions.length === 0;

  return (
    <Shell>
      <div className="space-y-5 pb-12">
        {demo && shown && (
          <DemoBar day={shown} total={demo.days.length} onSkip={() => setDemoDay(demo.days.length)} onBack={() => setDemo(null)} />
        )}

        <PlanHeader progress={progress} today={today} />

        {empty ? (
          <section className="sticker rise bg-[#fffaf0] p-4 text-center">
            <div className="rug mx-auto flex w-fit justify-center px-8 pb-3 pt-5">
              <Mia face="smiling" posture="at_toy" size={120} />
            </div>
            <p className="mt-3 font-display text-lg font-semibold">Mia has the blocks out and is waiting for you.</p>
            <p className="mt-1 text-sm text-ink-soft">Play your first two short rounds and this page starts filling with your own numbers.</p>
            <Link href="/play" className="btn btn-primary mt-4 w-full">
              Play your first round
            </Link>
          </section>
        ) : (
          <SkillCard progress={progress} span={demo ? demo.days.length : 7} />
        )}

        {!demo && own.firstRounds && <FirstVisit before={own.firstRounds.before} after={own.firstRounds.after} />}

        {/* The demo shows no check-ins: nothing is simulated or promised about tantrums at home. */}
        {!demo && <CalmCard progress={progress} today={today} onSave={saveCheckin} />}

        <div className="space-y-3 text-center">
          {own.paid ? (
            <Link href="/play?daily=1" className="btn btn-primary w-full">
              Start today&rsquo;s five minutes
            </Link>
          ) : (
            <Link href="/pricing" className="btn btn-primary w-full">
              Unlock daily sessions
            </Link>
          )}
          <p>
            <Link href="/play" className="text-sm font-semibold underline decoration-dotted underline-offset-4">
              Practise a free 60-second round
            </Link>
          </p>
          <p>
            <Link href="/live" className="text-sm font-semibold underline decoration-dotted underline-offset-4">
              Try five minutes live with your child (beta)
            </Link>
          </p>
        </div>

        {!demo && (
          <section aria-labelledby="demo-h" className="rounded-[1.25rem] border-2 border-dashed border-ink/60 p-4">
            <DemoBadge>Demo · simulated family</DemoBadge>
            <h2 id="demo-h" className="mt-2 font-display text-xl font-semibold">
              See a month in <span className="italic text-tomato">30 seconds</span>
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              A simulated parent plays all 28 days. Their sentences are coded by the same rules as yours; their learning
              curve is invented. Nothing is saved over your data.
            </p>
            <button type="button" className="btn btn-sun mt-3" onClick={playDemo}>
              Play the demo
            </button>
          </section>
        )}
      </div>
    </Shell>
  );
}

/** Day N of 28, today's idea, the streak, and what tomorrow brings. */
function PlanHeader({ progress, today }: { progress: Progress; today: string }) {
  const day = dayNumber(progress, today);
  const plan = planDay(day);
  const run = streak(progress, today);

  return (
    <section aria-labelledby="plan-h" className="sticker bg-[#fffaf0] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-soft" aria-live="polite">
          {day <= PLAN_DAYS ? `Day ${day} of ${PLAN_DAYS} · Week of ${plan.theme}` : `Day ${day} · Phase 2`}
        </p>
        <p className="shrink-0 rounded-full border-2 border-ink bg-sun px-3 py-0.5 text-sm font-bold tabular-nums">
          {run.days > 0 ? `${run.days}-day streak` : 'Streak starts today'}
        </p>
      </div>
      <h1 id="plan-h" className="mt-2 font-display text-3xl font-semibold leading-tight">
        {plan.title}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {run.activeToday ? 'Today’s play is done.' : 'Today’s five minutes are still open.'}
        {run.freeDayUsed && ' One free day used in this streak; life happens, the streak goes on.'}
      </p>
      <p className="mt-3 border-t-2 border-dashed border-ink/25 pt-3 text-sm">{plan.teaser}</p>
      {progress.anchor && <p className="mt-1 text-sm text-ink-soft">Your five minutes: {progress.anchor.toLowerCase()}.</p>}
    </section>
  );
}

/** The two rounds of the first visit, per minute, best news first. */
function FirstVisit({ before, after }: { before: RoundResult; after: RoundResult }) {
  const { lines } = compareRounds(before, after);
  return (
    <section aria-labelledby="first-h" className="sticker bg-[#fffaf0] p-4">
      <h2 id="first-h" className="font-display text-xl font-semibold">
        First <span className="italic text-tomato">visit</span>
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Your second round next to your first, after one short lesson.</p>
      {lines.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {lines.map((line) => (
            <li key={line} className="rounded-xl border-2 border-ink/80 bg-[#fffdf8] px-3 py-1.5 text-sm font-semibold">
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm">Both rounds came out at the same pace.</p>
      )}
    </section>
  );
}

/** Before the device has been read: quiet shapes, not zeros that could pass for real data. */
function Skeleton() {
  return (
    <Shell>
      <div className="space-y-5 pb-12" aria-busy="true">
        <p className="text-sm text-ink-soft" role="status">
          Opening your notebook…
        </p>
        {['h-36', 'h-56', 'h-40'].map((h) => (
          <div key={h} className={`sticker ${h} bg-[#fffaf0] p-4`}>
            <div className="h-3 w-1/3 rounded-full bg-sand/70" />
            <div className="mt-3 h-6 w-2/3 rounded-full bg-sand/50" />
          </div>
        ))}
      </div>
    </Shell>
  );
}
