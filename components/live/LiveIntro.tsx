'use client';

import { useEffect, useState, type RefObject } from 'react';
import { Art, Button, Divider, Icon, IconButton, Pattern, SettingRow, SplitScreen, Tag } from '@/components/kit';
import { MESSAGES } from '@/lib/speech/speech';
import { ROUTES } from '@/lib/routes';

/** The three steps of frame 27:714, in its words. */
const STEPS = ['One earbud in, phone on the table.', 'Your child picks the toy. You follow.', 'Talk as you play. The coach speaks only to you.'];

/** True when this browser turns speech into text. Read in the browser only. */
function hasSpeech(): boolean {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

export interface LiveIntroProps {
  /** Mia or Leo: the practice round offered before the real thing. */
  childName: string;
  heading: RefObject<HTMLHeadingElement | null>;
  onStart(): void;
  onPrivacy(): void;
}

/**
 * 17.1, before you start (Figma 27:714; from 1024px the split of 33:220): the three steps, "Beta", the one action,
 * and the quiet way to practice with the simulated child first.
 */
export function LiveIntro({ childName, heading, onStart, onPrivacy }: LiveIntroProps) {
  // Known on the device only. A browser without speech says so before the five minutes start.
  const [speech, setSpeech] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setSpeech(hasSpeech()), 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <SplitScreen
      pattern={<Pattern kind="sentences" size={1440} className="hidden lg:block" />}
      bar={
        <IconButton label="Back" variant="on-violet" href={ROUTES.practice}>
          <Icon name="back" />
        </IconButton>
      }
      picture={<Art name="earbud" size={380} priority className="size-[min(170px,22dvh)] lg:size-[min(380px,52dvh)]" />}
      action={
        <div className="flex flex-col items-center gap-[4px]">
          <Button fullWidth onClick={onStart}>
            Start five minutes
          </Button>
          <Button href={ROUTES.practiceRound} variant="ghost">
            Practice with {childName} first
          </Button>
        </div>
      }
    >
      <Tag tone="skill">Beta</Tag>
      <h1 ref={heading} tabIndex={-1} className="mt-[10px] text-title outline-none">
        Live with your child
      </h1>
      <ol className="mt-[12px] flex flex-col gap-[10px]">
        {STEPS.map((step, i) => (
          <li key={step} className="flex gap-[14px] text-body text-ink">
            <span aria-hidden="true" className="w-[14px] shrink-0 text-body-strong text-violet tabular-nums">
              {i + 1}
            </span>
            <span className="min-w-0">{step}</span>
          </li>
        ))}
      </ol>
      {!speech && (
        <p role="status" className="mt-[12px] text-label text-gray">
          {MESSAGES.unsupported}
        </p>
      )}
      <Divider className="mt-[16px]" />
      <SettingRow label="Microphone and privacy" onClick={onPrivacy} chevron compact />
    </SplitScreen>
  );
}
