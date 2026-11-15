'use client';

import { useEffect, useRef } from 'react';
import { Art, Button, Icon, IconButton, Pattern } from '@/components/kit';

/**
 * Microphone and privacy (Figma 17.2, 27:767): what the microphone hears and where the words go, before the parent starts.
 * Live play never keeps audio: the round screen is mounted without a recorder, so the third line holds whatever the
 * recordings flag says.
 */
const LINES = [
  'Chrome and Edge ask for the microphone. In other browsers you type what you say.',
  'Your browser turns speech into text. In Chrome that uses Google’s speech service.',
  'PlayReps does not record or store audio.',
  'The microphone hears the whole room and cannot tell voices apart, so a clear sentence from your child may count as yours.',
  'The screen stays on where the browser allows it. If it locks, listening stops.',
] as const;

export interface LivePrivacyProps {
  onClose(): void;
}

export function LivePrivacy({ onClose }: LivePrivacyProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  // A new screen: it opens at its top, and the keyboard starts at its heading.
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="split-root flex min-h-dvh flex-col bg-white lg:flex-row">
      {/* From 1024px the earbud stays at the left, as on the page before. Phones keep the plain page of the frame. */}
      <div className="relative hidden shrink-0 items-center justify-center overflow-hidden bg-violet lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-1/2">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <Pattern kind="sentences" size={1440} />
        </div>
        <Art name="earbud" size={384} className="relative size-[min(320px,44dvh)]" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col pt-[env(safe-area-inset-top)] lg:items-center lg:justify-center lg:px-[40px] lg:py-[64px]">
        <div className="flex w-full flex-1 flex-col lg:max-w-[440px] lg:flex-none">
          <div className="flex h-[44px] shrink-0 items-center px-[12px] lg:h-auto lg:px-0 lg:pb-[16px]">
            <IconButton label="Close" onClick={onClose} className="lg:-ml-[10px]">
              <Icon name="close" />
            </IconButton>
          </div>
          <div className="flex flex-1 flex-col px-[24px] pb-[max(16px,env(safe-area-inset-bottom))] lg:px-0 lg:pb-0">
            <h1 ref={heading} tabIndex={-1} className="pt-[6px] text-title text-ink outline-none lg:pt-0">
              Microphone and privacy
            </h1>

            <ul className="mt-[16px] flex flex-col border-t border-line">
              {LINES.map((line) => (
                <li key={line} className="border-b border-line py-[12px] text-body text-ink text-pretty last:border-b-0">
                  {line}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-[24px] lg:mt-0 lg:pt-[28px]">
              <Button fullWidth onClick={onClose}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
