'use client';

import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { cn, focusRing, focusRingWithin } from './cn';

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export interface PlayerHandle {
  /** Jump to a sentence. The transcript calls it when a row is tapped. */
  seek(seconds: number): void;
}

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
  /** Called as playback moves, so the transcript can highlight the sentence being played. */
  onTime?(seconds: number): void;
  ref?: Ref<PlayerHandle>;
  className?: string;
}

/** Plays back a recorded session: play and pause, a track to scrub, the time, and a dot at every sentence to swap. */
export function Player({ src, durationSec, marks = [], peaks = [], marksLabel = 'Dots: to swap', onTime, ref, className }: PlayerProps) {
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

  return (
    <div className={cn('flex flex-col gap-[10px] rounded-[24px] bg-mist px-[16px] pt-[16px] pb-[14px]', className)}>
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
      <div className="flex items-center gap-[14px]">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className={cn('grid size-[48px] shrink-0 place-items-center rounded-full bg-ink text-white', focusRing)}
        >
          <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" aria-hidden="true">
            {playing ? (
              <path d="M5.5 4.5h3v11h-3zM11.5 4.5h3v11h-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            ) : (
              <path d="M6.67 4.58v10.84L15.83 10 6.67 4.58Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            )}
          </svg>
        </button>
        <div className={cn('relative flex h-[48px] min-w-0 flex-1 items-center rounded-[8px]', focusRingWithin)}>
          {peaks.length > 0 ? (
            <div aria-hidden="true" className="flex size-full items-center justify-between">
              {peaks.map((peak, i) => (
                <span
                  key={i}
                  className={cn('w-[3px] rounded-full', i / peaks.length < played ? 'bg-violet' : 'bg-faint')}
                  style={{ height: 8 + Math.min(1, Math.max(0, peak)) * 32 }}
                />
              ))}
            </div>
          ) : (
            <div aria-hidden="true" className="h-[6px] w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-violet" style={{ width: `${played * 100}%` }} />
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
      {marks.length > 0 && (
        <div aria-hidden="true" className="relative ml-[62px] h-[6px]">
          {marks.map((second, i) => (
            <span
              key={i}
              className="absolute top-0 size-[6px] -translate-x-1/2 rounded-full bg-ink"
              style={{ left: `${Math.min(100, Math.max(0, (second / durationSec) * 100))}%` }}
            />
          ))}
        </div>
      )}
      <div className="flex justify-between pl-[62px] text-small text-gray">
        <span className="text-small-strong text-ink tabular-nums">{clock(time)}</span>
        {marks.length > 0 && <span>{marksLabel}</span>}
        <span className="tabular-nums">{clock(durationSec)}</span>
      </div>
    </div>
  );
}
