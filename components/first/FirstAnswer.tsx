'use client';

import { useState } from 'react';
import { CHILDREN, forChild } from '@/components/child';
import { Chip, Composer, Icon, IconButton, Pattern, Portrait, SplitScreen } from '@/components/kit';
import type { FirstAnswerProps } from './types';
import { useWayBack } from './useWayBack';

/** What most parents say first: warm praise, then a question. A tap puts it in the field; it is not sent. */
const SUGGESTION = 'Wow, good job! What is it?';

/**
 * The screen before this one is gone with the card that was tapped. The child's words take the focus, without
 * a ring: a screen reader reads them, and the next Tab reaches the suggestion and the field.
 */
function takeFocus(words: HTMLElement | null) {
  words?.focus({ preventScroll: true });
}

/**
 * The child speaks first and the parent answers in their own words. Phones are Figma 20:74, from 1024px it is 32:91.
 * A sentence carried over from the landing is shown as said, with no field: the flow sends it on.
 * The field is for typing only: speech is not wired here, so it shows no microphone.
 */
export function FirstAnswer({ partner, does, childSaid, carried, onAnswer }: FirstAnswerProps) {
  const back = useWayBack();
  const [text, setText] = useState('');
  const said = carried?.trim() || null;

  function send(answer: string) {
    setText('');
    onAnswer(answer);
  }

  return (
    <SplitScreen
      pattern={<Pattern kind="sentences" size={1440} className="max-lg:hidden" />}
      bar={
        <IconButton label="Back" variant="on-violet" onClick={back}>
          <Icon name="back" />
        </IconButton>
      }
      picture={
        <>
          <Portrait partner={partner} pose="smiling" size={480} priority className="size-[240px] lg:size-[380px]" />
          <div ref={takeFocus} tabIndex={-1} className="mt-[4px] flex flex-col gap-[4px] text-center outline-none lg:mt-[10px] lg:gap-[10px]">
            <p className="text-label lg:text-lead">{forChild(does, partner)}</p>
            {childSaid && <h1 className="text-title lg:text-title-xl">“{childSaid}”</h1>}
          </div>
          {/* Fetched ahead and not shown: the picture of an answer that says the child's words back, so it does not pop in late. */}
          <Portrait partner={partner} pose="leaning" size={480} priority className="hidden" />
        </>
      }
      dock={
        said ? (
          <p className="flex min-h-[56px] w-full items-center rounded-[28px] bg-mist px-[22px] py-[16px] text-body">
            <span className="sr-only">You said: </span>“{said}”
          </p>
        ) : (
          <>
            <Chip onClick={() => setText(SUGGESTION)}>“{SUGGESTION}”</Chip>
            <Composer
              value={text}
              onChange={setText}
              onSubmit={send}
              placeholder={`Say something to ${CHILDREN[partner].name}`}
              micState="unavailable"
            />
          </>
        )
      }
    />
  );
}
