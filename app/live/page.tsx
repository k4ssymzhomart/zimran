'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/Bits';
import { RoundStage } from '@/components/RoundStage';
import { loadProgress, saveProgress, todayISO } from '@/client/progressStore';
import { useRound } from '@/hooks/useRound';
import { addSession } from '@/lib/progress/history';

const SECONDS = 300;

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
  const round = useRound();
  const { state, start } = round;
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state.phase !== 'ended' || !state.result || saved) return;
    saveProgress(addSession(loadProgress(), state.result, todayISO(), 'live'));
    const id = setTimeout(() => setSaved(true), 0);
    return () => clearTimeout(id);
  }, [state.phase, state.result, saved]);

  return (
    <Shell>
      {state.phase === 'idle' && (
        <section className="space-y-4">
          <h1 className="font-display text-3xl font-semibold">Live with your child</h1>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Beta</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Put one earbud in and the phone on the table, with this page open.</li>
            <li>Let your child choose the toy. You follow.</li>
            <li>Talk as you play. With the earbud in, the coach speaks only to you.</li>
          </ol>
          <p className="text-sm">
            In Chrome or Edge your browser will ask for the microphone; other browsers have no voice input, and there
            you type what you say. Speech is turned into text by the browser&apos;s speech service
            (in Chrome, that is Google&apos;s); PlayReps does not record or store audio. The microphone hears the whole
            room and cannot tell voices apart, so a clear sentence from your child may be counted as yours.
          </p>
          <p className="text-sm text-ink-soft">
            The page keeps the screen on where the browser allows it. If the screen locks, listening stops.
          </p>
          <button
            className="btn btn-primary w-full"
            onClick={() => {
              setSaved(false);
              start('blocks', SECONDS, 1, undefined, true);
            }}
          >
            Start five minutes
          </button>
          <Link href="/play" className="btn btn-plain w-full">
            Practise with Mia first
          </Link>
        </section>
      )}

      {state.phase === 'running' && <RoundStage round={round} title="Live · five minutes" live />}

      {state.phase === 'ended' && state.result && (
        <section className="space-y-4">
          <h1 className="font-display text-3xl font-semibold">{state.result.met ? 'You met the pace for both skills' : 'Session saved'}</h1>
          <ul className="sticker-sm space-y-1 bg-[#fffaf0] p-3 text-sm">
            <li>
              Specific praise: <b>{state.result.counts.specific_praise}</b> of {state.result.targets.specific_praise}
            </li>
            <li>
              Descriptions: <b>{state.result.counts.description}</b> of {state.result.targets.description}
            </li>
            <li>
              To swap: <b>{state.result.counts.avoid}</b> (at most {state.result.targets.maxAvoid})
            </li>
          </ul>
          <p className="text-sm text-ink-soft">Reflections are not counted in live play yet. Practise them with Mia.</p>
          {state.result.leverText && <p className="text-sm font-semibold">Next time: {state.result.leverText}</p>}
          <Link href="/dashboard" className="btn btn-primary w-full">
            Back to my plan
          </Link>
        </section>
      )}
    </Shell>
  );
}
