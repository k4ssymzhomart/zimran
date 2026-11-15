import { BUCKET, LABEL, type SavedSentence } from '@/lib/types';
import { cn, focusRing } from './cn';
import { RewriteCard } from './RewriteCard';
import { Tag, type TagTone } from './Tag';

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export interface TranscriptRowProps {
  sentence: SavedSentence;
  /** The player is on this sentence. */
  playing?: boolean;
  /** An open row shows the rewrite and "Change label". */
  open?: boolean;
  /** A tap on the sentence. The screen seeks the player and opens the row. */
  onToggle?(): void;
  /** A sentence to say instead, for a sentence to swap. */
  rewrite?: string;
  /** Who wrote the rewrite: "Coach tip" by default. */
  rewriteSource?: string;
  onChangeLabel?(): void;
  className?: string;
}

/** One sentence the parent said, with the code the rules gave it. A sentence to swap is underlined in ink. */
export function TranscriptRow({ sentence, playing = false, open = false, onToggle, rewrite, rewriteSource, onChangeLabel, className }: TranscriptRowProps) {
  /* A disputed sentence is not counted, so it keeps its label but loses the skill color and the underline. */
  const bucket = sentence.disputed ? 'none' : BUCKET[sentence.code];
  const swap = bucket === 'avoid';
  const tone: TagTone = bucket === 'target' ? 'skill' : swap ? 'swap' : 'quiet';
  const said = (
    <>
      <span className={cn('text-body text-ink', swap && 'underline decoration-from-font')}>“{sentence.text}”</span>
      <Tag tone={tone}>{swap ? `${LABEL[sentence.code]}, to swap` : LABEL[sentence.code]}</Tag>
    </>
  );
  const stack = 'flex flex-col items-start gap-[8px]';

  return (
    <div aria-current={playing || undefined} className={cn('flex items-start gap-[12px] rounded-[16px] py-[12px]', playing && 'bg-lilac px-[12px]', className)}>
      <span className="w-[34px] shrink-0 text-small text-gray tabular-nums">{clock(sentence.startSec)}</span>
      <div className={cn(stack, 'min-w-0 flex-1')}>
        {onToggle ? (
          <button type="button" onClick={onToggle} aria-expanded={open} className={cn(stack, 'rounded-[8px] text-left', focusRing)}>
            {said}
          </button>
        ) : (
          said
        )}
        {open && rewrite && <RewriteCard text={rewrite} source={rewriteSource} className="w-full" />}
        {open && onChangeLabel && (
          /* 20px of text inside a 44px touch target. */
          <button type="button" onClick={onChangeLabel} className={cn('-my-[12px] rounded-[8px] py-[12px] text-label text-violet', focusRing)}>
            Change label
          </button>
        )}
      </div>
    </div>
  );
}
