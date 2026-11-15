import type { FormEvent } from 'react';
import { cn, colorMotion } from './cn';
import { IconButton } from './IconButton';

export type MicState = 'idle' | 'listening' | 'unavailable';

export interface ComposerProps {
  value: string;
  onChange(value: string): void;
  /** Called with the trimmed text on the send button or the keyboard's send key. Empty text is never sent. */
  onSubmit(text: string): void;
  /** The line in the empty field, such as "Say something to Mia". It also names the field for screen readers. */
  placeholder: string;
  /** Starts and stops listening. Leave it out and the field is typing only. */
  onMic?(): void;
  /** `unavailable` hides the microphone, for browsers with no speech recognition. */
  micState?: MicState;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/**
 * The answer field of the round and the landing. The slot on the right holds one button:
 * the microphone while the field is empty or listening, the send arrow once there is text.
 */
export function Composer({
  value,
  onChange,
  onSubmit,
  placeholder,
  onMic,
  micState = 'idle',
  disabled,
  autoFocus,
  className,
}: ComposerProps) {
  const text = value.trim();
  const listening = micState === 'listening';
  const showMic = onMic !== undefined && micState !== 'unavailable' && (listening || text === '');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (text !== '') onSubmit(text);
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        'flex h-[56px] w-full items-center gap-[8px] rounded-[28px] pl-[22px] pr-[6px]',
        listening ? 'bg-lilac' : 'bg-mist',
        colorMotion,
        'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-violet',
        className,
      )}
    >
      {/* 17px type: iOS zooms the page on focus only below 16px. The ring is drawn on the form. */}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="send"
        autoComplete="off"
        disabled={disabled}
        autoFocus={autoFocus}
        className="h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-faint"
      />
      {showMic ? (
        <IconButton
          label={listening ? 'Stop listening' : 'Speak your answer'}
          variant={listening ? 'violet' : 'plain'}
          aria-pressed={listening}
          disabled={disabled}
          onClick={onMic}
        >
          <MicIcon size={listening ? 22 : 24} />
        </IconButton>
      ) : (
        <IconButton type="submit" label="Send" variant="ink" disabled={disabled || text === ''}>
          <ArrowUpIcon />
        </IconButton>
      )}
    </form>
  );
}

function MicIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}
