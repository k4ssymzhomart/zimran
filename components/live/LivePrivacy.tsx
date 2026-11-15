'use client';

import { useEffect, useRef } from 'react';
import { Art, Button, Icon, IconButton, PageScreen, Pattern } from '@/components/kit';

/**
 * Only what is true of a live session. It passes no recorder, so no audio is kept, whatever the recording flag says;
 * the coded sentences are saved in this browser's storage, and nothing is sent anywhere else.
 */
const LINES = [
  'Chrome and Edge ask for the microphone. In other browsers you type what you say.',
  'Your browser turns speech into text. In Chrome that uses Google’s speech service.',
  'PlayReps keeps the text on this device. It keeps no audio.',
  'One microphone cannot tell voices apart, so a clear sentence from your child may count as yours.',
  'The screen stays on where the browser allows it. If it locks, listening stops.',
];

export interface LivePrivacyProps {
  onClose(): void;
}

/** 17.2, microphone and privacy (Figma 27:767). From 1024px the earbud's violet panel stays at the left. */
export function LivePrivacy({ onClose }: LivePrivacyProps) {
  const heading = useRef<HTMLDivElement>(null);

  // The page opens at its top, and the keyboard starts on it rather than on the screen that was left.
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <PageScreen
      title="Microphone and privacy"
      pattern={<Pattern kind="sentences" size={1440} />}
      picture={<Art name="microphone" size={380} className="size-[min(380px,52dvh)]" />}
      bar={
        <IconButton label="Close" onClick={onClose}>
          <Icon name="close" />
        </IconButton>
      }
      className="min-h-dvh"
    >
      <div ref={heading} tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <ul aria-label="Microphone and privacy">
          {LINES.map((line) => (
            <li key={line} className="border-t border-line py-[14px] text-body text-ink">
              {line}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-[24px] lg:mt-[12px]">
          <Button fullWidth onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </PageScreen>
  );
}
