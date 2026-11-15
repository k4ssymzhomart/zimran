import type { ReactNode } from 'react';
import { cn } from './cn';

/** `skill` marks praise, reflection and description. `swap` marks a sentence to swap: calm gray, never an alarm color. */
export type TagTone = 'skill' | 'quiet' | 'swap';

export interface TagProps {
  tone: TagTone;
  children: ReactNode;
  className?: string;
}

const TONE: Record<TagTone, string> = {
  skill: 'bg-lilac text-violet',
  quiet: 'bg-mist text-gray',
  swap: 'bg-mist text-ink',
};

export function Tag({ tone, children, className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex h-[26px] shrink-0 items-center justify-center rounded-[13px] px-[10px] text-small-strong whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
