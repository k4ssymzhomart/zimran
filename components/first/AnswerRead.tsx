'use client';

import { useState } from 'react';
import { CHILDREN, forChild } from '@/components/child';
import { Button, Composer, Icon, IconButton, Pattern, Portrait, SplitScreen, Tag, cn, type TagTone } from '@/components/kit';
import { LABEL, type Bucket, type CodedSentence } from '@/lib/types';
import type { AnswerReadProps } from './types';
import { useWayBack } from './useWayBack';

const TONE: Record<Bucket, TagTone> = { target: 'skill', avoid: 'swap', neutral: 'quiet', none: 'quiet' };

/** Every sentence of the first answer with the tag the rules gave it (Figma 20:132). A sentence to swap says so. */
function Sentences({ sentences, className }: { sentences: CodedSentence[]; className?: string }) {
  return (
    <ul aria-label="How your answer was read" className={cn('flex flex-col items-start gap-[10px]', className)}>
      {sentences.map((sentence, index) => {
        const tone = TONE[sentence.bucket];
        return (
          <li key={index} className="flex flex-wrap items-center gap-x-[10px] gap-y-[4px]">
            <span className="text-body">“{sentence.text}”</span>
            <Tag tone={tone}>{tone === 'swap' ? `${LABEL[sentence.code]}, to swap` : LABEL[sentence.code]}</Tag>
          </li>
        );
      })}
    </ul>
  );
}

/** The engine's last line holds one way to say it, in quotes. The screen sets the sentence apart, as Figma 20:178 does. */
function oneWay(feedback: string | null): { lead: string; model: string | null } {
  const at = feedback ? feedback.indexOf('“') : -1;
  if (!feedback || at < 0) return { lead: feedback ?? '', model: null };
  return { lead: feedback.slice(0, at).trim(), model: feedback.slice(at).trim() };
}

/**
 * The field the parent typed in is gone when a new state opens. Its words take the focus, without a ring:
 * a screen reader reads them, and the next Tab reaches the field or the action under them.
 */
function takeFocus(words: HTMLElement | null) {
  words?.focus({ preventScroll: true });
}

/**
 * What the first answer did, then one try at saying the child's words back.
 * Figma 20:109 while the parent can still try; 20:156 once the child's words were said back; 20:178 when the
 * tries are used up. There is no desktop frame: from 1024px violet is the left half, as in 32:91 and 33:204.
 * The field is for typing only: speech is not wired here, so it shows no microphone.
 */
export function AnswerRead({ partner, childSaid, first, insight, reflected, tries, feedback, canMoveOn, onTry, onNext }: AnswerReadProps) {
  const back = useWayBack();
  const [text, setText] = useState('');
  const child = CHILDREN[partner];
  const line = forChild(feedback, partner) ?? null;
  const pattern = <Pattern kind="sentences" size={1440} className="max-lg:hidden" />;

  function send(answer: string) {
    setText('');
    onTry(answer);
  }

  if (canMoveOn) {
    const { lead, model } = oneWay(line);
    return (
      <SplitScreen
        rest="bottom"
        pattern={pattern}
        picture={<Portrait partner={partner} pose={reflected ? 'leaning' : 'smiling'} size={480} priority className="size-[280px] lg:size-[480px]" />}
        action={
          /* The action sits 24px under the words (20:173); the shell gives 16. */
          <div className="pt-[8px]">
            <Button fullWidth onClick={onNext}>
              Play one minute
            </Button>
          </div>
        }
      >
        <div className="pt-[4px] lg:pt-0">
          {/* A first answer that already said the child's words back has not been shown yet: it is read here. */}
          {reflected && tries === 0 && <Sentences sentences={first} className="pb-[20px]" />}
          <div ref={takeFocus} tabIndex={-1} className="flex flex-col gap-[12px] outline-none">
            {reflected ? (
              <h1 className="text-title">{child.they === 'she' ? 'She' : 'He'} heard that you listened.</h1>
            ) : (
              <>
                <p className="text-body text-gray">{lead ? `Close. ${lead}` : 'Close.'}</p>
                {model && <h1 className="text-title">{model}</h1>}
              </>
            )}
          </div>
        </div>
      </SplitScreen>
    );
  }

  // TODO kit: SplitScreen cannot keep the violet block at the height of its picture (20:110), so this state lays itself out.
  return (
    <div className="split-root flex flex-col lg:flex-row">
      <div className="relative flex shrink-0 flex-col overflow-hidden bg-violet pt-[env(safe-area-inset-top)] text-white lg:sticky lg:top-0 lg:h-dvh lg:w-1/2">
        {pattern}
        <div className="relative z-[1] flex h-[44px] shrink-0 items-center px-[12px] lg:h-[80px] lg:px-[28px]">
          <IconButton label="Back" variant="on-violet" onClick={back}>
            <Icon name="back" />
          </IconButton>
        </div>
        <div className="relative flex flex-col items-center px-[24px] pb-[24px] lg:min-h-0 lg:flex-1 lg:justify-center lg:pb-[80px] lg:[&>img]:min-h-0 lg:[&>img]:shrink lg:[&>img]:object-contain">
          <Portrait partner={partner} pose="smiling" size={480} priority className="size-[132px] lg:size-[380px]" />
          {childSaid && <p className="mt-[4px] text-center text-heading lg:mt-[10px] lg:text-title-xl">“{childSaid}”</p>}
          {/* Fetched ahead and not shown: the picture of the next state, so the child does not pop in late when the try lands. */}
          <Portrait partner={partner} pose="leaning" size={480} priority className="hidden" />
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-white pb-[max(16px,env(safe-area-inset-bottom))] lg:min-w-0 lg:items-center lg:justify-center lg:px-[40px] lg:py-[64px]">
        <div className="flex w-full flex-1 flex-col lg:max-w-[440px] lg:flex-none">
          <Sentences sentences={first} className="px-[24px] pt-[24px] lg:px-0 lg:pt-0" />
          {insight && (
            <div ref={takeFocus} tabIndex={-1} className="flex flex-col gap-[8px] px-[24px] pt-[20px] outline-none lg:px-0">
              <h1 className="text-title">{forChild(insight.headline, partner)}</h1>
              <p className="text-body text-gray">{forChild(insight.body, partner)}</p>
            </div>
          )}
          {/* On phones the try rests on the bottom edge (20:143). */}
          <div className="min-h-[16px] flex-1 lg:min-h-[32px] lg:flex-none" />
          <div className="flex flex-col gap-[10px] px-[16px] lg:px-0">
            <div aria-live="polite" className="flex flex-col gap-[4px] px-[8px] lg:px-0">
              <p className="text-body-strong">Now say {child.their} words back.</p>
              {line && <p className="text-body">{line}</p>}
            </div>
            <Composer value={text} onChange={setText} onSubmit={send} placeholder="You made …" micState="unavailable" />
          </div>
        </div>
      </div>
    </div>
  );
}
