'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CodeTag } from '@/components/Bits';
import { CHILDREN, useChild, type ChildId } from '@/components/child';
import { ArrowRight } from '@/components/Icons';
import { journeyProgress } from '@/components/journey';
import { Mia } from '@/components/Mia';
import { SayField } from '@/components/SayField';
import { ActionLink, Art, Screen, TopBar } from '@/components/ui';
import { useJourney } from '@/hooks/useJourney';
import { MAX_TRIES } from '@/lib/flow/journey';

/**
 * The opener. The parent picks who to practise with, the child speaks first, the parent answers in their own
 * words, and the screen shows what that sentence did. Then one try at saying the child's words back, then the
 * first round. All logic is in useJourney / lib/flow/journey.ts; the child only changes portrait, name and pronouns.
 */
export default function StartPage() {
  // Next keeps a page alive after you leave it. A link back here must start it fresh, not show the old last screen;
  // the browser's Back button still restores the page as it was.
  const { bfcacheId } = useRouter();
  return <Opener key={bfcacheId} />;
}

function Opener() {
  const { state, answerOpener, tryReflection } = useJourney('opener');
  const { child, choose, t } = useChild();
  const [picked, setPicked] = useState(false);
  const { opener } = state;
  const revealed = state.phase === 'opener_reveal';
  const canMoveOn = opener.reflected || opener.reflectionTries >= MAX_TRIES;
  const top = <TopBar progress={picked ? journeyProgress(state.phase) : 0.04} />;

  // 0. Who to practise with. One tap: the card is the answer.
  if (!picked) {
    const pick = (id: ChildId) => {
      choose(id);
      setPicked(true);
    };
    return (
      <Screen top={top}>
        <h1 className="title enter mt-2 text-[32px] text-fg sm:text-[40px]">Who do you want to practise with?</h1>
        <p className="lede enter d1 mx-auto mt-3 max-w-[380px]">Both are simulated four-year-olds. Pick the one closer to your child.</p>
        <div className="enter d2 mt-8 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Simulated child">
          {(['mia', 'leo'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={child.id === id}
              onClick={() => pick(id)}
              className="art group flex flex-col items-center pt-4 transition-transform duration-200 ease-out-quint hover:-translate-y-1 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-violet/60"
            >
              <span className="text-[20px] font-bold tracking-[-0.03em] text-fg">{CHILDREN[id].name}</span>
              <span className="mt-0.5 text-[13px] text-fg-soft">{id === 'mia' ? 'Girl, 4' : 'Boy, 4'}</span>
              <span className="mt-3 block transition-transform duration-300 ease-out-quint group-hover:scale-[1.04]">
                <Mia kid={id} face={id === 'mia' ? 'smiling' : 'beaming'} posture="at_toy" size={172} priority fade={false} />
              </span>
            </button>
          ))}
        </div>
      </Screen>
    );
  }

  // 1. The child speaks. One action: answer.
  if (!revealed) {
    return (
      <Screen top={top}>
        <Art size="lg" priority>
          <Mia face="smiling" posture="at_toy" size={236} priority fade={false} />
        </Art>
        <p className="enter d1 mt-6 text-[15px] text-fg-soft">{t(opener.does)}</p>
        <h1 className="title enter d1 mt-2 text-[34px] text-fg sm:text-[40px]">“{opener.childSaid}”</h1>
        <SayField
          id="answer"
          label={`What do you say to ${child.name}?`}
          placeholder="What do you say?"
          onSay={answerOpener}
          suggestion="Wow, good job! What is it?"
          className="enter d2 mt-8"
        />
        <p className="enter d3 mt-6 text-[12px] font-medium text-fg-faint">{child.name} is a simulated child.</p>
      </Screen>
    );
  }

  // 3. Done: one action, the first round.
  if (canMoveOn) {
    return (
      <Screen
        top={top}
        action={
          <>
            <ActionLink href="/play">
              Play a 60-second round
              <ArrowRight size={20} />
            </ActionLink>
            <p className="mt-1 text-[13px] text-fg-faint">Your sentences are coded on this device.</p>
          </>
        }
      >
        <Art size="lg">
          <Mia face={opener.reflected ? 'beaming' : 'smiling'} posture={opener.reflected ? 'leaning_in' : 'at_toy'} size={236} fade={false} />
        </Art>
        <h1 className="title enter d1 mt-7 text-[32px] text-fg sm:text-[38px]" aria-live="polite">
          {opener.reflected ? `${child.they === 'she' ? 'She' : 'He'} heard that you listened.` : 'Close. Here is one way.'}
        </h1>
        <p className="lede enter d2 mx-auto mt-3 max-w-[400px]">
          {opener.reflected
            ? `Saying ${child.their} words back keeps ${child.them} talking. Now try it for a whole minute.`
            : t(opener.reflectionFeedback ?? '')}
        </p>
      </Screen>
    );
  }

  // 2. What the first answer did, and one try at saying the child's words back.
  return (
    <Screen top={top}>
      <div className="enter flex flex-col items-center">
        <Mia face="smiling" posture="at_toy" size={120} />
      </div>
      <ul className="enter d1 mt-5 flex flex-wrap justify-center gap-2" aria-label="How your answer was read">
        {opener.first.map((s, i) => (
          <li key={i} className="inline-flex max-w-full items-center gap-2 rounded-full bg-surface py-1.5 pl-3.5 pr-1.5 text-[14px] shadow-card">
            <span className="truncate text-fg-2">“{s.text}”</span>
            <CodeTag sentence={s} />
          </li>
        ))}
      </ul>
      {opener.insight && (
        <>
          <h1 className="title enter d1 mt-6 text-[30px] text-fg sm:text-[36px]">{t(opener.insight.headline)}</h1>
          <p className="lede enter d2 mx-auto mt-3 max-w-[420px]">{t(opener.insight.body)}</p>
        </>
      )}

      <div className="card enter d3 mt-8 p-4 text-left">
        <p className="text-[15px] font-semibold text-fg">
          Now say {child.their} words back: <span className="font-normal text-fg-soft">“{opener.childSaid}”</span>
        </p>
        <SayField id="reflect" label={`Say ${child.their} words back`} placeholder="You made …" onSay={tryReflection} autoFocus className="mt-3" />
        {opener.reflectionFeedback && (
          <p className="mt-3 text-[14px] text-lilac" aria-live="polite">
            {t(opener.reflectionFeedback)}
          </p>
        )}
      </div>
    </Screen>
  );
}
