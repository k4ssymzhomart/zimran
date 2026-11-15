'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readEntitlement } from '@/client/entitlement';
import { loadFirstRounds, loadProgress, saveProgress, todayISO } from '@/client/progressStore';
import { Shell } from '@/components/Bits';
import { ArrowRight } from '@/components/Icons';
import { ActionLink } from '@/components/ui';
import { CalmCard } from '@/components/dashboard/CalmCard';
import { DemoBar } from '@/components/dashboard/DemoBar';
import { DemoInvite } from '@/components/dashboard/DemoInvite';
import { EmptyStart } from '@/components/dashboard/EmptyStart';
import { FirstVisit } from '@/components/dashboard/FirstVisit';
import { MoreLinks, type MoreLink } from '@/components/dashboard/MoreLinks';
import { PlanHeader } from '@/components/dashboard/PlanHeader';
import { DashboardSkeleton } from '@/components/dashboard/Skeleton';
import { SkillCard } from '@/components/dashboard/SkillCard';
import { addCheckin, addDays, PLAN_DAYS, simulateFamily, type DemoDay, type Progress, type RoundResult, type TantrumBucket } from '@/lib';

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

const FREE_ROUND: MoreLink = { href: '/play', label: 'Practise a free 60-second round' };
const LIVE: MoreLink = { href: '/live', label: 'Try five minutes live with your child', beta: true };

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

  if (!own) return <DashboardSkeleton />;

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

  // The page's one action: today's practice, or the unlock that opens it.
  const daily: MoreLink = own.paid
    ? { href: '/play?daily=1', label: 'Start today’s five minutes' }
    : { href: '/pricing', label: 'Unlock daily sessions' };

  return (
    <Shell wide>
      <div className="flex flex-col gap-5 sm:gap-6">
        {demo && shown && (
          <DemoBar day={shown} total={demo.days.length} onSkip={() => setDemoDay(demo.days.length)} onBack={() => setDemo(null)} />
        )}

        {empty ? (
          <>
            {/* Before the first round, playing it is the one action; the daily one waits in the quiet rows. */}
            <EmptyStart />
            <PlanHeader progress={progress} today={today} as="h2" tone="quiet" />
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <PlanHeader progress={progress} today={today} art={!demo} />
            <div className="enter d1">
              <ActionLink href={daily.href}>
                {daily.label}
                <ArrowRight size={20} />
              </ActionLink>
            </div>
          </div>
        )}

        {!empty && <SkillCard progress={progress} span={demo ? demo.days.length : 7} />}

        {!demo && own.firstRounds && <FirstVisit before={own.firstRounds.before} after={own.firstRounds.after} />}

        {/* The demo shows no check-ins: nothing is simulated or promised about tantrums at home. */}
        {!demo && <CalmCard progress={progress} today={today} onSave={saveCheckin} />}

        <MoreLinks links={empty ? [daily, LIVE] : [FREE_ROUND, LIVE]} />

        {!demo && <DemoInvite onPlay={playDemo} />}
      </div>
    </Shell>
  );
}
