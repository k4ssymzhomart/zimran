'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isLocked } from '@/client/entitlement';
import { todayISO } from '@/client/progressStore';
import { sessionStore } from '@/client/sessionStore';
import { CHILDREN, forChild } from '@/components/child';
import { FirstRound } from '@/components/first/round/FirstRound';
import { Button, Icon, IconButton, Pattern, Portrait, SplitScreen, Tag, type TagTone } from '@/components/kit';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useProfile } from '@/hooks/useProfile';
import { sceneById, sceneForDay } from '@/lib/child/scenes';
import { codeTurn } from '@/lib/coding/classify';
import { dayLesson, type DayLesson } from '@/lib/lesson/days';
import { PLAN_DAYS, planDay, type PlanDay } from '@/lib/progress/plan';
import { planDayOf } from '@/lib/progress/sessions';
import { NORM_SECONDS } from '@/lib/progress/targets';
import { ROUTES } from '@/lib/routes';
import { BUCKET, LABEL, type PartnerId } from '@/lib/types';
import { SessionResult } from './SessionResult';
import { useSaveRound, type Play } from './useSaveRound';

/**
 * The daily five minutes (Figma row 15, 25:595): the day, its three sentences, the five-minute round, the result.
 * Access is needed: without it the visitor goes to the paywall before anything is shown.
 * The day is the plan day counted from the saved sessions (planDayOf), read once as the session opens.
 */

type Step = 'intro' | 'examples' | 'round';

interface Day {
  n: number;
  plan: PlanDay;
  lesson: DayLesson;
}

/** Next keeps a page alive after you leave it: a link back here starts a new session, Back and Forward restore it. */
export function DailySession() {
  const { bfcacheId } = useRouter();
  return <Daily key={bfcacheId} />;
}

/** After a step changes, taps are not taken for this long. */
const QUIET_MS = 400;

/** White from the first frame, so the page never shows the old dark canvas while the device is read. */
const BLANK = <div className="split-root min-h-dvh bg-white" />;

function Daily() {
  const router = useRouter();
  const { entitlement, ready: accessReady } = useEntitlement();
  const { profile, ready: profileReady } = useProfile();
  const [day, setDay] = useState<Day | null>(null);
  const [step, setStep] = useState<Step>('intro');
  const [play, setPlay] = useState<Play | null>(null);
  const { saved, onDone } = useSaveRound('daily', play);
  const quietUntil = useRef(0);
  const introHeading = useRef<HTMLHeadingElement>(null);
  const shown = useRef<Step>('intro');

  /**
   * The way on from a screen, once: a step that just came up takes no tap for a moment, so the second tap of a
   * double tap does not land on the next screen's button unread.
   */
  function go(next: Step) {
    const now = performance.now();
    if (now < quietUntil.current) return false;
    quietUntil.current = now + QUIET_MS;
    setStep(next);
    return true;
  }

  // Back on the day from its sentences: the page opens at its top and the keyboard starts at the heading.
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    if (step !== 'intro') return;
    window.scrollTo(0, 0);
    introHeading.current?.focus({ preventScroll: true });
  }, [step]);

  const locked = accessReady && isLocked('daily', entitlement);
  // A round that has begun is played to its end and saved, whatever happens to access meanwhile.
  const toPaywall = locked && play === null;

  useEffect(() => {
    if (toPaywall) router.replace(ROUTES.pricing);
  }, [toPaywall, router]);

  // The day is read once, on this device, as the session opens.
  useEffect(() => {
    const id = setTimeout(() => {
      const n = planDayOf(sessionStore.all(), todayISO());
      setDay({ n, plan: planDay(n), lesson: dayLesson(n) });
    }, 0);
    return () => clearTimeout(id);
  }, []);

  if (!accessReady || !profileReady || !day || toPaywall) return BLANK;

  const partner = play?.partner ?? profile.partner;

  if (saved) {
    return (
      <SessionResult
        done={saved.done}
        partner={partner}
        heading={`Day ${day.n} done.`}
        back={{ href: ROUTES.today, label: 'Back to my plan' }}
        review={ROUTES.session(saved.id)}
      />
    );
  }

  if (step === 'round' && play) {
    return (
      <FirstRound
        mode="practice"
        sceneId={play.sceneId}
        partner={play.partner}
        durationSec={NORM_SECONDS}
        seed={play.seed}
        title={`Day ${day.n}`}
        onDone={onDone}
      />
    );
  }

  function begin() {
    if (!day || play || !go('round')) return;
    // The plan day may name its scene; otherwise the scene the parent picked, and the plan's rotation if that is gone.
    const sceneId = day.plan.sceneId ?? (sceneById(profile.sceneId) ? profile.sceneId : sceneForDay(day.n).id);
    // The seed changes with the day, so each day plays differently.
    setPlay({ sceneId, partner: profile.partner, seed: 1000 + day.n });
  }

  if (step === 'examples') {
    return <Examples day={day} partner={partner} onStart={begin} onClose={() => go('intro')} />;
  }

  // 15.1: the day, its title and its one idea.
  return (
    <SplitScreen
      rest="bottom"
      pattern={<Pattern kind="sentences" size={1440} className="hidden lg:block" />}
      bar={
        <IconButton label="Back" variant="on-violet" href={ROUTES.today}>
          <Icon name="back" />
        </IconButton>
      }
      picture={
        <Portrait partner={partner} pose="smiling" size={380} alt={CHILDREN[partner].name} priority className="size-[min(240px,30dvh)] lg:size-[min(380px,52dvh)]" />
      }
      action={
        <Button fullWidth onClick={() => go('examples')}>
          See today’s sentences
        </Button>
      }
    >
      <p className="text-label text-gray">
        Day {day.n} of {PLAN_DAYS}
      </p>
      <h1 ref={introHeading} tabIndex={-1} className="mt-[6px] text-title outline-none lg:text-title-xl">
        {forChild(day.plan.title, partner)}
      </h1>
      <p className="mt-[12px] text-body text-gray">{forChild(day.lesson.idea, partner)}</p>
    </SplitScreen>
  );
}

// ---------- 15.2: the three sentences to say today ----------

/** The label of a sentence, in the tone of its bucket. A sentence to swap is calm gray, never an alarm. */
function tagOf(text: string, childLastSaid: string | null): { tone: TagTone; label: string } {
  const coded = codeTurn(text, { childLastSaid });
  const code = (coded.find((s) => BUCKET[s.code] === 'target') ?? coded[0])?.code ?? 'unknown';
  const bucket = BUCKET[code];
  if (bucket === 'target') return { tone: 'skill', label: LABEL[code] };
  if (bucket === 'avoid') return { tone: 'swap', label: `${LABEL[code]}, to swap` };
  return { tone: 'quiet', label: LABEL[code] };
}

/** The question or order the day's task turns into a statement, when it names one: “What are you making?”. */
function insteadOf(setup: string): string | null {
  return /Turn “([^”]+)” into/.exec(setup)?.[1] ?? null;
}

interface ExamplesProps {
  day: Day;
  partner: PartnerId;
  onStart(): void;
  onClose(): void;
}

function Examples({ day, partner, onStart, onClose }: ExamplesProps) {
  const { lesson } = day;
  const heading = useRef<HTMLHeadingElement>(null);
  // Each sentence with the label the engine gives it, said after the child's line where the day has one.
  const said = useMemo(
    () => lesson.say.map((text, i) => ({ text, tag: tagOf(text, lesson.afterMia?.[i] ?? null) })),
    [lesson],
  );
  const { task } = lesson;
  const turn = insteadOf(task.setup);
  const lead = turn ? `Instead of “${turn}”` : task.miaSays ? `${CHILDREN[partner].name}: “${task.miaSays}”` : task.setup;

  // A new screen: it opens at its top, and the keyboard starts at its heading.
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="split-root flex min-h-dvh flex-col bg-white lg:flex-row">
      {/* From 1024px the child stays at the left, as in the round that follows. Phones keep the plain page. */}
      <div className="relative hidden shrink-0 items-center justify-center overflow-hidden bg-violet lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-1/2">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <Pattern kind="sentences" size={1440} />
        </div>
        <Portrait partner={partner} pose="smiling" size={380} className="relative size-[min(380px,52dvh)]" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col pt-[env(safe-area-inset-top)] lg:items-center lg:justify-center lg:px-[40px] lg:py-[64px]">
        <div className="flex w-full flex-1 flex-col lg:max-w-[440px] lg:flex-none">
          <div className="flex h-[44px] shrink-0 items-center px-[12px] lg:h-auto lg:px-0 lg:pb-[16px]">
            <IconButton label="Close" onClick={onClose} className="lg:-ml-[10px]">
              <Icon name="close" />
            </IconButton>
          </div>
          <div className="flex flex-1 flex-col px-[24px] pb-[max(16px,env(safe-area-inset-bottom))] lg:px-0 lg:pb-0">
            <p className="pt-[6px] text-label text-gray lg:pt-0">Today</p>
            <h1 ref={heading} tabIndex={-1} className="mt-[6px] text-title outline-none">
              {forChild(day.plan.title, partner)}
            </h1>

            <ul aria-label="Three sentences to say today" className="mt-[12px] flex flex-col">
              {said.map(({ text, tag }, i) => (
                <li key={i} className="flex flex-col items-start gap-[8px] border-b border-line py-[14px]">
                  <p className="text-body-strong break-words text-ink">“{forChild(text, partner)}”</p>
                  <Tag tone={tag.tone}>{tag.label}</Tag>
                </li>
              ))}
            </ul>

            <div className="mt-[8px] flex flex-col gap-[4px] rounded-[16px] bg-mist px-[16px] py-[14px]">
              <p className="text-label text-gray">{forChild(lead, partner)}</p>
              <p className="text-body-strong text-ink">“{forChild(task.example, partner)}”</p>
            </div>

            <div className="mt-auto pt-[24px] lg:mt-0 lg:pt-[28px]">
              <Button fullWidth onClick={onStart}>
                Start five minutes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
