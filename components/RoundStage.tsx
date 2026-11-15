'use client';

import { useEffect, useState } from 'react';
import { Bars, CoachBubble, SentenceChip } from '@/components/Bits';
import { Close, Mic, Speaker, SpeakerOff } from '@/components/Icons';
import { useChild } from '@/components/child';
import { Mia } from '@/components/Mia';
import { Rings } from '@/components/Rings';
import { SayField } from '@/components/SayField';
import type { useRound } from '@/hooks/useRound';
import { useSpeech } from '@/hooks/useSpeech';
import { useWakeLock } from '@/hooks/useWakeLock';
import { LISTENING_HINT, liveNotice } from '@/lib/speech/speech';

type Round = ReturnType<typeof useRound>;

/**
 * The visible part of the screen. On a phone the keyboard covers the bottom of the layout viewport, so the
 * round sizes itself to the visual viewport: Mia, the rings and the input stay in view together.
 */
function useVisibleViewport() {
  const [vp, setVp] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => setVp({ height: Math.round(vv ? vv.height : window.innerHeight), top: Math.round(vv ? vv.offsetTop : 0) });
    const raf = requestAnimationFrame(update);
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return vp;
}

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/**
 * One running round. It only shows what the engine says and forwards the parent's moves, typed or spoken;
 * nothing here computes anything.
 *
 * `live` is play with a real child: no simulated child on screen, the microphone is asked for at once,
 * the coach speaks its lines aloud (for an earbud), and the screen is kept awake where the browser allows it.
 */
export function RoundStage({ round, title, live = false }: { round: Round; title: string; live?: boolean }) {
  const { state, view, rings, say, copy, wait, dispute, end } = round;
  const speech = useSpeech(say);
  const { start: startListening, stop: stopListening, sayAloud } = speech;
  const [aloud, setAloud] = useState(live);
  const vp = useVisibleViewport();
  const { child, t } = useChild();
  const compact = vp !== null && vp.height < 680;

  const beat = state.beats[state.beats.length - 1];
  const left = Math.max(0, Math.ceil(state.seconds - state.elapsedSec));
  const share = state.seconds > 0 ? Math.min(1, state.elapsedSec / state.seconds) : 0;
  const recent = state.sentences.map((s, index) => ({ s, index })).slice(-3).reverse();
  const listening = speech.state.status === 'listening' || speech.state.status === 'starting';
  const voiceAvailable = speech.state.status !== 'unsupported';

  // In live play the screen is out of sight, so the microphone starts with the session.
  useEffect(() => {
    if (live) startListening();
  }, [live, startListening]);

  // The phone lies on the table for five minutes; a locked screen would stop the listening.
  useWakeLock(live);

  // Each new coach line is spoken once when the parent asked for it.
  const coachText = state.coach ? t(state.coach.text) : null;
  const coachAt = state.lastPromptSec;
  useEffect(() => {
    if (aloud && coachText && coachAt !== null) sayAloud(coachText);
  }, [aloud, coachText, coachAt, sayAloud]);

  return (
    <section
      aria-label={title}
      className="glow fixed inset-x-0 top-0 z-30 flex flex-col"
      style={vp ? { height: vp.height, transform: `translateY(${vp.top}px)` } : { height: '100dvh' }}
    >
      {/* header: end, clock, coach voice */}
      <header className="mx-auto w-full max-w-[560px] shrink-0 px-4">
        <div className={`flex items-center justify-between ${compact ? 'h-11' : 'h-14'}`}>
          <button
            type="button"
            onClick={end}
            className="btn btn-ghost -ml-2 gap-1.5 px-2.5 text-fg-2"
            aria-label={live ? 'End session' : 'End round'}
          >
            <Close size={20} />
            <span className="text-[14px]">End</span>
          </button>
          <div className="text-center">
            {!compact && <p className="text-[12px] font-medium text-fg-soft">{title}</p>}
            <p className="text-[17px] font-bold tabular-nums tracking-[-0.02em] text-fg" aria-live="off">
              {clock(left)}
            </p>
          </div>
          <button
            type="button"
            aria-pressed={aloud}
            onClick={() => setAloud((a) => !a)}
            className={`btn btn-ghost -mr-2 gap-1.5 px-2.5 ${aloud ? 'text-lilac' : 'text-fg-soft'}`}
            title="Coach speaks aloud"
          >
            {aloud ? <Speaker size={20} /> : <SpeakerOff size={20} />}
            <span className="sr-only">Coach speaks aloud</span>
          </button>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-violet" style={{ width: `${share * 100}%`, transition: 'width 250ms linear' }} />
        </div>
      </header>

      {/* stage: Mia, the rings, the coach, the last sentences */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className={`mx-auto flex w-full max-w-[560px] flex-col items-center px-5 text-center ${compact ? 'gap-2 pt-2' : 'gap-5 pt-6'}`}>
          {live ? (
            // The text follows the microphone: it says "counted as you speak" only while something is listening.
            <p className="card p-4 text-left text-[15px] leading-relaxed text-fg-2" aria-live="polite">
              {liveNotice(speech.state.status)}
            </p>
          ) : (
            <div className="flex w-full flex-col items-center">
              <Mia face={view.face} posture={view.posture} size={compact ? 72 : 156} priority />
              <span className="mt-1 text-[11px] font-medium text-fg-faint">Simulated child</span>
              <p className={compact ? 'sr-only' : 'mt-2 text-[14px] text-fg-soft'} aria-live="polite">
                {beat ? t(beat.does) : null}
              </p>
              {beat?.says && (
                <p className={`title text-fg ${compact ? 'mt-0.5 text-[18px]' : 'mt-1 text-[24px]'}`}>“{beat.says}”</p>
              )}
              <p className={`font-medium text-lilac ${compact ? 'mt-0.5 text-[13px]' : 'mt-1.5 min-h-5 text-[14px]'}`} aria-live="polite">
                {t(state.microReaction)}
              </p>
              {!compact && (
                <div className="mt-4 w-full max-w-[360px]">
                  <Bars connection={view.connection} focus={view.focus} talk={view.talk} />
                </div>
              )}
            </div>
          )}

          <Rings rings={rings} compact={compact} />

          <div className="w-full max-w-[440px]">
            <CoachBubble text={coachText} />
          </div>

          {recent.length > 0 && (
            <ul className="w-full max-w-[440px] space-y-2 pb-4" aria-label="Your last sentences">
              {recent.map(({ s, index }) => (
                <SentenceChip key={index} sentence={s} disputed={s.disputed} onDispute={() => dispute(index)} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* dock: the one action, talking */}
      <div className="shrink-0 border-t border-stroke bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[560px] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {listening && (
            <p className="mb-2 truncate text-left text-[14px] text-fg-2" aria-live="polite">
              <span className="font-semibold text-lilac">Listening </span>
              {speech.state.interim || '…'}
            </p>
          )}
          <div className="flex items-center gap-2">
            <SayField
              id="say"
              label="What do you say?"
              placeholder={listening ? 'Listening… or type here' : live ? 'Type what you said…' : `Say something to ${child.name}…`}
              onSay={say}
              autoFocus={!live}
              className="min-w-0 flex-1"
            />
            {voiceAvailable && (
              <button
                type="button"
                aria-pressed={listening}
                aria-label={listening ? 'Stop listening' : 'Speak instead'}
                onClick={listening ? stopListening : startListening}
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl transition-colors ${
                  listening ? 'listening bg-violet text-white' : 'bg-surface-2 text-fg-2 hover:bg-violet/10 hover:text-lilac'
                }`}
              >
                <Mic size={22} />
              </button>
            )}
          </div>

          <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'mt-2.5'}`}>
            {!live && !compact && (
              <>
                <button className="btn btn-chip" type="button" onClick={copy}>
                  Copy {child.them}, no words
                </button>
                <button className="btn btn-chip" type="button" onClick={wait}>
                  Wait quietly
                </button>
              </>
            )}
          </div>

          {speech.state.message && (
            <p className="mt-2 text-left text-[13px] text-fg-2" role="status">
              {speech.state.message}
            </p>
          )}
          {listening && <p className="mt-1.5 text-left text-[12px] text-fg-soft">{LISTENING_HINT}</p>}
          {/* Shown before the first tap on the microphone, not only once audio is already being sent. */}
          {voiceAvailable && !listening && (
            <p className="mt-2 text-left text-[11px] leading-snug text-fg-faint">
              {compact
                ? 'Voice uses your browser’s speech service (Google’s in Chrome). No audio is stored.'
                : 'Your browser turns speech into text; in Chrome that uses Google’s speech service. PlayReps does not record or store audio.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
