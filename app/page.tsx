'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SentenceChip, Shell } from '@/components/Bits';
import { Mia } from '@/components/Mia';
import { useJourney } from '@/hooks/useJourney';
import { MAX_TRIES } from '@/lib/flow/journey';

/**
 * Home = the opener. Mia speaks first, the parent answers in their own words, and the product shows
 * what that sentence did. No reading, no quiz: the first screen is the product.
 * Reference screen: all logic is in useJourney / lib/flow/journey.ts.
 */
export default function Home() {
  // Next keeps a page alive after you leave it. A link back here must start it fresh, not show the old last screen;
  // the browser's Back button still restores the page as it was.
  const { bfcacheId } = useRouter();
  return <Opener key={bfcacheId} />;
}

function Opener() {
  const { state, answerOpener, tryReflection } = useJourney('opener');
  const [text, setText] = useState('');
  const { opener } = state;
  const revealed = state.phase === 'opener_reveal';
  const canMoveOn = opener.reflected || opener.reflectionTries >= MAX_TRIES;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    if (revealed) tryReflection(text);
    else answerOpener(text);
    setText('');
  }

  return (
    <Shell>
      <h1 className="font-display text-3xl font-semibold leading-tight">
        Daily tantrums? Practise the five-minute play skill clinics teach.
      </h1>

      <div className="rug mt-5 flex flex-col items-center px-4 pb-4 pt-3 text-center">
        <span className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Simulated child</span>
        <Mia face={opener.reflected ? 'beaming' : 'smiling'} posture={opener.reflected ? 'leaning_in' : 'at_toy'} size={150} />
        <p className="mt-2 text-sm">{opener.does}</p>
        <p className="mt-1 font-display text-xl font-semibold">“{opener.childSaid}”</p>
      </div>

      {revealed && opener.insight && (
        <section className="mt-4 space-y-3" aria-live="polite">
          <ul className="space-y-2">
            {opener.first.map((s, i) => (
              <SentenceChip key={i} sentence={s} />
            ))}
          </ul>
          <div className="sticker-sm bg-[#fffaf0] p-3">
            <p className="font-display text-lg font-semibold">{opener.insight.headline}</p>
            <p className="mt-1 text-sm">{opener.insight.body}</p>
          </div>
          {!opener.reflected && <p className="text-sm font-semibold">Now try saying her words back to her.</p>}
          {opener.reflectionFeedback && <p className="text-sm">{opener.reflectionFeedback}</p>}
        </section>
      )}

      {!(revealed && canMoveOn) && (
        <form onSubmit={submit} className="mt-4 space-y-2">
          <label htmlFor="answer" className="block text-sm font-semibold">
            {revealed ? 'Say her words back' : 'What do you say?'}
          </label>
          <div className="flex gap-2">
            <input
              id="answer"
              className="field"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={revealed ? 'You made …' : 'Type what you would really say'}
              autoComplete="off"
              maxLength={600}
            />
            <button className="btn btn-primary" type="submit">
              Say
            </button>
          </div>
          {!revealed && (
            <button type="button" className="text-sm underline decoration-dotted" onClick={() => setText('Wow, good job! What is it?')}>
              Or use a typical answer: “Wow, good job! What is it?”
            </button>
          )}
        </form>
      )}

      {revealed && (
        <div className="mt-5">
          <Link href="/play" className="btn btn-primary w-full">
            Play a 60-second round
          </Link>
          <p className="mt-2 text-center text-xs text-ink-soft">No sign-up. Your sentences are coded on this device.</p>
        </div>
      )}
    </Shell>
  );
}
