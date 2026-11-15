'use client';

import { useEffect, useRef } from 'react';
import { CHILDREN } from '@/components/child';
import { Art, Button, Icon, IconButton, Pattern, SettingRow, SplitScreen, Tag } from '@/components/kit';
import { ROUTES } from '@/lib/routes';
import type { PartnerId } from '@/lib/types';

/** What to do before the five minutes start (Figma 17.1, 27:714; from 1024px 33:220). */
const STEPS = [
  'One earbud in, phone on the table.',
  'Your child picks the toy. You follow.',
  'Talk as you play. The coach speaks only to you.',
] as const;

export interface LiveIntroProps {
  /** The simulated child the parent practices with, for the way to practice first. */
  partner: PartnerId;
  /** Back from the privacy page: the page opens at its top and the keyboard starts at the heading. */
  focus: boolean;
  onStart(): void;
  onPrivacy(): void;
}

export function LiveIntro({ partner, focus, onStart, onPrivacy }: LiveIntroProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!focus) return;
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, [focus]);

  return (
    <SplitScreen
      pattern={<Pattern kind="sentences" size={1440} className="hidden lg:block" />}
      bar={
        <IconButton label="Back" variant="on-violet" href={ROUTES.practice}>
          <Icon name="back" />
        </IconButton>
      }
      picture={<Art name="earbud" size={384} priority className="size-[min(200px,26dvh)] lg:size-[min(320px,44dvh)]" />}
      action={
        <div className="flex flex-col items-center gap-[4px]">
          <Button fullWidth onClick={onStart}>
            Start five minutes
          </Button>
          <Button href={ROUTES.practiceRound} variant="ghost">
            Practice with {CHILDREN[partner].name} first
          </Button>
        </div>
      }
    >
      <Tag tone="skill">Beta</Tag>
      <h1 ref={heading} tabIndex={-1} className="mt-[10px] text-title text-ink outline-none">
        Live with your child
      </h1>
      <ol aria-label="Before you start" className="mt-[12px] flex flex-col gap-[10px]">
        {STEPS.map((text, i) => (
          <li key={text} className="flex gap-[16px] text-body text-ink">
            <span aria-hidden="true" className="w-[12px] shrink-0 text-body-strong tabular-nums text-violet">
              {i + 1}
            </span>
            <span className="min-w-0 text-pretty">{text}</span>
          </li>
        ))}
      </ol>
      <div className="mt-[16px] border-t border-line">
        <SettingRow compact chevron label="Microphone and privacy" onClick={onPrivacy} />
      </div>
    </SplitScreen>
  );
}
