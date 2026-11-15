'use client';

import { notFound } from 'next/navigation';
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { FirstRound } from '@/components/first/round/FirstRound';
import type { RoundDone } from '@/components/round/types';
import { LABEL, type PartnerId } from '@/lib/types';

/**
 * Preview only: the test bench of the fallback round screen (components/first/round). It mounts FirstRound the
 * way the first visit does, and when the round is over it prints the RoundDone that came back, to check
 * against what was typed. A development tool: the production build answers 404 here.
 *
 * Every value on this page is for the preview only. The address after the # picks the round and the child
 * (`round=2`, `partner=leo`); `seconds`, `seed` and `mode=live` are there for the checks that need them.
 */
export default function RoundPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  const hash = useSyncExternalStore(onHashChange, readHash, () => '');
  // A new address is a new bench: the round in it starts from its first second.
  return <Bench key={hash} setup={setupOf(hash)} />;
}

/** The two rounds of the first visit (lib/flow/journey.ts: ROUND1, ROUND2). */
const ROUNDS = {
  1: { sceneId: 'blocks', seconds: 60, title: 'Round 1 of 2' },
  2: { sceneId: 'drawing', seconds: 40, title: 'Round 2 of 2' },
} as const;

interface Setup {
  round: 1 | 2;
  partner: PartnerId;
  seconds: number;
  seed: number;
  live: boolean;
}

function onHashChange(notify: () => void) {
  window.addEventListener('hashchange', notify);
  return () => window.removeEventListener('hashchange', notify);
}

function readHash(): string {
  return window.location.hash.slice(1);
}

function setupOf(hash: string): Setup {
  const q = new URLSearchParams(hash);
  const round = q.get('round') === '2' ? 2 : 1;
  const seconds = Number(q.get('seconds'));
  const seed = Number(q.get('seed'));
  return {
    round,
    partner: q.get('partner') === 'leo' ? 'leo' : 'mia',
    seconds: Number.isFinite(seconds) && seconds > 0 ? seconds : ROUNDS[round].seconds,
    seed: q.has('seed') && Number.isFinite(seed) ? seed : 1,
    live: q.get('mode') === 'live',
  };
}

/** The address of a bench. What is left out is the default: round one, Mia, the round's own length, seed 1. */
function address(setup: Pick<Setup, 'round' | 'partner'>): string {
  const q = new URLSearchParams();
  if (setup.round === 2) q.set('round', '2');
  if (setup.partner === 'leo') q.set('partner', 'leo');
  return `#${q.toString()}`;
}

function Bench({ setup }: { setup: Setup }) {
  const [done, setDone] = useState<RoundDone | null>(null);
  /** Counts the rounds played at this address; each one is a new mount of the round screen. */
  const [run, setRun] = useState(0);
  const scene = ROUNDS[setup.round];

  if (done === null) {
    return (
      <FirstRound
        key={run}
        mode={setup.live ? 'live' : 'practice'}
        sceneId={scene.sceneId}
        partner={setup.live ? null : setup.partner}
        durationSec={setup.seconds}
        seed={setup.seed}
        title={scene.title}
        guess={null}
        onDone={setDone}
      />
    );
  }

  const go = (next: Pick<Setup, 'round' | 'partner'>) => {
    const target = address(next).slice(1);
    if (target !== readHash()) {
      // Another address is another bench: it mounts through the hash.
      window.location.hash = target;
      return;
    }
    // The same address plays the same round again.
    setDone(null);
    setRun((n) => n + 1);
  };
  const other: PartnerId = setup.partner === 'mia' ? 'leo' : 'mia';
  const { result } = done;

  return (
    <main className="split-root flex flex-col gap-[20px] p-[24px]">
      <h1 className="text-title">{scene.title}: handed back</h1>

      <div className="flex flex-wrap gap-[8px]">
        <BenchButton onClick={() => go({ round: 1, partner: setup.partner })}>Start round one (blocks, 60 seconds)</BenchButton>
        <BenchButton onClick={() => go({ round: 2, partner: setup.partner })}>Start round two (drawing, 40 seconds)</BenchButton>
        <BenchButton onClick={() => go({ round: setup.round, partner: other })}>Switch to {other === 'mia' ? 'Mia' : 'Leo'}</BenchButton>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-[16px] gap-y-[4px] text-label">
        <dt className="text-gray">Partner</dt>
        <dd data-testid="done-partner">{setup.live ? 'none (live)' : setup.partner}</dd>
        <dt className="text-gray">Input mode</dt>
        <dd data-testid="done-input">{done.input}</dd>
        <dt className="text-gray">Seconds measured</dt>
        <dd data-testid="done-seconds">
          {done.durationSec} of {setup.seconds}
          {result.short ? ' (ended before half of the round)' : ''}
        </dd>
        <dt className="text-gray">Started at</dt>
        <dd>{done.startedAt}</dd>
        <dt className="text-gray">Specific praise</dt>
        <dd data-testid="done-praise">
          {result.counts.specific_praise} of {result.targets.specific_praise}
        </dd>
        <dt className="text-gray">Reflection</dt>
        <dd data-testid="done-reflection">
          {result.counts.reflection} of {result.targets.reflection}
        </dd>
        <dt className="text-gray">Description</dt>
        <dd data-testid="done-description">
          {result.counts.description} of {result.targets.description}
        </dd>
        <dt className="text-gray">To swap</dt>
        <dd data-testid="done-avoid">
          {result.counts.avoid} (questions {result.counts.question}, commands {result.counts.command}, criticism {result.counts.criticism}), at
          most {result.targets.maxAvoid}
        </dd>
        <dt className="text-gray">Not counted in a ring</dt>
        <dd data-testid="done-neutral">
          general praise {result.counts.general_praise}, neutral talk {result.counts.neutral}
        </dd>
        <dt className="text-gray">Met the pace</dt>
        <dd>{result.met ? 'yes' : 'no'}</dd>
        <dt className="text-gray">Next lever</dt>
        <dd>{result.lever ? `${result.lever}: ${result.leverText}` : 'none'}</dd>
        <dt className="text-gray">Goodbye</dt>
        <dd>{done.farewell ?? 'none'}</dd>
        <dt className="text-gray">Audio</dt>
        <dd>{done.audioId ?? 'none'}</dd>
      </dl>

      <section className="flex flex-col gap-[8px]">
        <h2 className="text-heading">Sentences ({done.sentences.length})</h2>
        {done.sentences.length === 0 && <p className="text-label text-gray">Nothing was said in this round.</p>}
        <ol className="flex flex-col gap-[4px]">
          {done.sentences.map((sentence, i) => (
            <li key={i} data-testid="done-sentence" className="text-label">
              <span className="text-gray">
                {sentence.startSec}s to {sentence.atSec}s
              </span>{' '}
              <strong>{sentence.code}</strong> ({LABEL[sentence.code]}
              {sentence.rule ? `, rule ${sentence.rule}` : ''}
              {sentence.disputed ? ', disputed' : ''}): “{sentence.text}”
            </li>
          ))}
        </ol>
      </section>

      <pre data-testid="round-done" className="overflow-x-auto whitespace-pre-wrap rounded-[16px] bg-mist p-[16px] text-small text-gray">
        {JSON.stringify(done, null, 2)}
      </pre>
    </main>
  );
}

function BenchButton({ onClick, children }: { onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-[18px] bg-lilac px-[14px] py-[8px] text-label text-violet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
    >
      {children}
    </button>
  );
}
