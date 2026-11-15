'use client';

import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { cn, focusRing, focusRingOnViolet, focusRingWithin, focusRingWithinOnViolet } from './cn';

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export interface PlayerHandle {
  /** Jump to a sentence. The transcript calls it when a row is tapped. */
  seek(seconds: number): void;
}

/**
 * `light` is the mist card of the phone review.
 * `violet` has no card and sits straight on a violet block, as on the desktop review: an 80px white button,
 * white and darker violet bars, the times in white, and no dots.
 */
export type PlayerTone = 'light' | 'violet';

/** Sizes in CSS pixels: the play icon, its stroke in the icon's own 20 unit box, the shortest and the tallest bar. */
const LOOK = {
  light: {
    root: 'gap-[10px] rounded-[24px] bg-mist px-[16px] pt-[16px] pb-[14px]',
    row: 'gap-[14px]',
    button: cn('size-[48px] bg-ink text-white', focusRing),
    icon: 20,
    stroke: 1.5,
    track: cn('h-[48px]', focusRingWithin),
    bar: 'w-[3px]',
    quiet: 8,
    loud: 40,
    played: 'bg-violet',
    ahead: 'bg-faint',
    line: 'bg-line',
    times: 'pl-[62px] text-small text-gray',
    now: 'text-small-strong text-ink',
  },
  violet: {
    root: 'gap-[18px] text-white',
    row: 'gap-[20px]',
    button: cn('size-[80px] bg-white text-violet', focusRingOnViolet),
    icon: 30,
    stroke: 4 / 3,
    track: cn('h-[80px]', focusRingWithinOnViolet),
    bar: 'w-[4px]',
    quiet: 12,
    loud: 60,
    played: 'bg-white',
    ahead: 'bg-violet-press',
    line: 'bg-violet-press',
    times: 'pl-[100px] text-body text-white',
    now: 'text-body-strong',
  },
} as const;

export interface PlayerProps {
  /** URL of the recording kept on this device. Without it the player renders nothing: there is no sample audio. */
  src?: string | null;
  /** Length of the session. A browser recording often cannot report its own duration. */
  durationSec: number;
  /** Second at which each sentence to swap starts. Each one gets a dot under the track. */
  marks?: readonly number[];
  /** Loudness of the real recording, slice by slice, 0..1. Without it the track is a plain bar, not a made-up waveform. */
  peaks?: readonly number[];
  marksLabel?: string;
  /** Where the player sits. On the desktop review the violet one starts 46px under the headline. */
  tone?: PlayerTone;
  /** Called as playback moves, so the transcript can highlight the sentence being played. */
  onTime?(seconds: number): void;
  ref?: Ref<PlayerHandle>;
  className?: string;
}

/** Plays back a recorded session: play and pause, a track to scrub, the time, and a dot at every sentence to swap. */
export function Player({ src, durationSec, marks = [], peaks = [], marksLabel = 'Dots: to swap', tone = 'light', onTime, ref, className }: PlayerProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  const seek = (seconds: number) => {
    const next = Math.min(durationSec, Math.max(0, seconds));
    if (audio.current) audio.current.currentTime = next;
    setTime(next);
    onTime?.(next);
  };
  useImperativeHandle(ref, () => ({ seek }));

  if (!src || durationSec <= 0) return null;

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  };
  const played = time / durationSec;
  const look = LOOK[tone];
  /* The dots belong to the card: the desktop review draws the violet player without them. */
  const dots = tone === 'light' && marks.length > 0;

  return (
    <div className={cn('flex flex-col', look.root, className)}>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => {
          setTime(event.currentTarget.currentTime);
          onTime?.(event.currentTarget.currentTime);
        }}
      />
      <div className={cn('flex items-center', look.row)}>
        <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className={cn('grid shrink-0 place-items-center rounded-full', look.button)}>
          <svg viewBox="0 0 20 20" width={look.icon} height={look.icon} fill="currentColor" aria-hidden="true">
            {playing ? (
              <path d="M5.5 4.5h3v11h-3zM11.5 4.5h3v11h-3z" stroke="currentColor" strokeWidth={look.stroke} strokeLinejoin="round" />
            ) : (
              <path d="M6.67 4.58v10.84L15.83 10 6.67 4.58Z" stroke="currentColor" strokeWidth={look.stroke} strokeLinejoin="round" />
            )}
          </svg>
        </button>
        <div className={cn('relative flex min-w-0 flex-1 items-center rounded-[8px]', look.track)}>
          {peaks.length > 0 ? (
            <div aria-hidden="true" className="flex size-full items-center justify-between">
              {peaks.map((peak, i) => (
                <span
                  key={i}
                  className={cn('rounded-full', look.bar, i / peaks.length < played ? look.played : look.ahead)}
                  style={{ height: look.quiet + Math.min(1, Math.max(0, peak)) * (look.loud - look.quiet) }}
                />
              ))}
            </div>
          ) : (
            <div aria-hidden="true" className={cn('h-[6px] w-full overflow-hidden rounded-full', look.line)}>
              <div className={cn('h-full rounded-full', look.played)} style={{ width: `${played * 100}%` }} />
            </div>
          )}
          {/* The real control: an invisible native slider over the track, so dragging, tapping and the arrow keys all work. */}
          <input
            type="range"
            aria-label="Position in the recording"
            aria-valuetext={`${clock(time)} of ${clock(durationSec)}`}
            min={0}
            max={durationSec}
            step={0.1}
            value={time}
            onChange={(event) => seek(Number(event.currentTarget.value))}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </div>
      </div>
      {dots && (
        <div aria-hidden="true" className="relative ml-[62px] h-[6px]">
          {marks.map((second, i) => (
            <span
              key={i}
              className="absolute top-0 size-[6px] rounded-full bg-ink"
              style={{ left: `calc((100% - 6px) * ${Math.min(1, Math.max(0, second / durationSec))})` }}
            />
          ))}
        </div>
      )}
      <div className={cn('flex justify-between', look.times)}>
        <span className={cn('tabular-nums', look.now)}>{clock(time)}</span>
        {dots && <span>{marksLabel}</span>}
        <span className="tabular-nums">{clock(durationSec)}</span>
      </div>
    </div>
  );
}
