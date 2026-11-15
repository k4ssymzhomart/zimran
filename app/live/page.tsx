'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Mic } from '@/components/Icons';
import { RoundRunner } from '@/components/round/RoundRunner';
import type { RoundDone } from '@/components/round/types';
import { ActionLink, Art, Heading, Pill, Screen, Stat } from '@/components/ui';
import { loadProgress, saveProgress, todayISO } from '@/client/progressStore';
import { sessionStore } from '@/client/sessionStore';
import { sessionDraft } from '@/hooks/useRound';
import { addSession } from '@/lib/progress/history';
import type { RoundResult } from '@/lib/types';
import { useChild } from '@/components/child';

const SECONDS = 300;
const SCENE = 'blocks';

const STEPS = [
  { text: 'Put one earbud in and the phone on the table, with this page open.', hint: 'The screen stays on where the browser allows it. If it locks, listening stops.' },
  { text: 'Let your child choose the toy. You follow.' },
  { text: 'Talk as you play. With the earbud in, the coach speaks only to you.' },
];

/**
 * /live — five minutes of play with the parent's own child (beta).
 * The parent speaks, the engine codes every sentence, the coach answers aloud.
 * Same reducer as a practice round, started with `live: true`: no simulated child, no reflections.
 */
export default function LivePage() {
  // Next keeps a page alive after you leave it. A link back here must start it fresh, not show the old last screen;
  // the browser's Back button still restores the page as it was.
  const { bfcacheId } = useRouter();
  return <Live key={bfcacheId} />;
}

function Live() {
  const { child, t } = useChild();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RoundResult | null>(null);

  // The round runner calls this once, when the five minutes are over or the parent ends them.
  function save(done: RoundDone) {
    const today = todayISO();
    // The session store goes first: on its first run it brings the old sessions over, and this one must not be among them.
    sessionStore.add(sessionDraft(done, { kind: 'live', date: today, sceneId: SCENE, partner: null }));
    saveProgress(addSession(loadProgress(), done.result, today, 'live'));
    setResult(done.result);
  }

  if (running && !result) {
    return <RoundRunner mode="live" sceneId={SCENE} partner={null} durationSec={SECONDS} seed={1} title="Live, five minutes" onDone={save} />;
  }

  if (result) {
    return (
      <Screen action={<ActionLink href="/dashboard">Back to my plan</ActionLink>}>
        <Art src={result.met ? '/art/trophy.png' : '/art/progress.png'} size="sm" priority />
        <Heading title={result.met ? 'You met the pace for both skills' : 'Session saved'} />

        {/* One card: the three counts side by side, and the reflections note as its footer. */}
        <div className="card enter d2 mt-7 overflow-hidden">
          <ul className="grid grid-cols-3 divide-x divide-stroke py-5" aria-label="Your five minutes">
            <li className="px-2">
              <Stat tone="violet" label="Specific praise" value={<Of count={result.counts.specific_praise} of={result.targets.specific_praise} />} />
            </li>
            <li className="px-2">
              <Stat tone="mint" label="Descriptions" value={<Of count={result.counts.description} of={result.targets.description} />} />
            </li>
            <li className="px-2">
              <Stat label="To swap" value={result.counts.avoid} />
              <p className="text-[12px] tabular-nums text-fg-faint">at most {result.targets.maxAvoid}</p>
            </li>
          </ul>
          <p className="border-t border-stroke px-4 py-3.5 text-[13px] leading-snug text-fg-soft">
            <span className="block">Reflections are not counted in live play yet.</span>
            <span className="block">Practise them with {child.name}.</span>
          </p>
        </div>

        {result.leverText && (
          <p className="enter d3 mt-4 rounded-card bg-violet/10 px-4 py-3.5 text-left text-[15px] leading-snug text-lilac">
            <span className="font-semibold">Next time:</span> {t(result.leverText)}
          </p>
        )}
      </Screen>
    );
  }

  // idle: what to do before the five minutes start
  return (
    <Screen
      action={
        <>
          <button type="button" className="btn btn-primary btn-block" onClick={() => setRunning(true)}>
            Start five minutes
            <ArrowRight size={20} />
          </button>
          <ActionLink href="/play" variant="ghost">
            Practise with {child.name} first
          </ActionLink>
          <p className="mt-4 flex gap-2.5 text-left text-[13px] leading-normal text-fg-soft">
            <Mic size={16} className="mt-px shrink-0 text-fg-faint" />
            <span className="text-pretty">
              Chrome and Edge ask for the microphone; in other browsers you type. Your browser’s speech service turns
              speech into text (in Chrome, Google’s). PlayReps does not record or store audio. The microphone cannot tell
              voices apart, so your child’s clear sentences may count as yours.
            </span>
          </p>
        </>
      }
    >
      <Art src="/art/earbud.png" size="sm" priority />
      <div className="enter d1 mt-7">
        <Pill>Beta</Pill>
      </div>
      <h1 className="title enter d1 mt-3 text-[32px] text-fg sm:text-[40px]">Live with your child</h1>

      <ol className="card enter d2 mt-7 divide-y divide-stroke text-left">
        {STEPS.map((step, i) => (
          <li key={step.text} className="flex gap-3.5 px-4 py-4">
            <span
              aria-hidden="true"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet/16 text-[14px] font-bold tabular-nums text-lilac"
            >
              {i + 1}
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-[16px] font-medium leading-snug text-fg text-pretty">{step.text}</span>
              {step.hint && <span className="mt-1 block text-[14px] leading-snug text-fg-soft text-pretty">{step.hint}</span>}
            </span>
          </li>
        ))}
      </ol>
    </Screen>
  );
}

/** "4 of 10": the count big, the target small beside it. */
function Of({ count, of }: { count: number; of: number }) {
  return (
    <>
      {count}
      <span className="ml-1 text-[15px] font-semibold tracking-[-0.01em] text-fg-faint">of {of}</span>
    </>
  );
}
