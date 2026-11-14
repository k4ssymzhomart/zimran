'use client';

import { useEffect, useState } from 'react';
import { Bars, CoachBubble, SentenceChip } from '@/components/Bits';
import { Mia } from '@/components/Mia';
import { Rings } from '@/components/Rings';
import type { useRound } from '@/hooks/useRound';
import { useSpeech } from '@/hooks/useSpeech';
import { useWakeLock } from '@/hooks/useWakeLock';
import { LISTENING_HINT, liveNotice } from '@/lib/speech/speech';

type Round = ReturnType<typeof useRound>;

/**
 * One running round. Reference screen: it only shows what the engine says and forwards the parent's moves,
 * typed or spoken. Restyle freely; the data comes from `round` and nothing here computes anything.
 *
 * `live` is play with a real child: no simulated child on screen, the microphone is asked for at once,
 * the coach speaks its lines aloud (for an earbud), and the screen is kept awake where the browser allows it.
 */
export function RoundStage({ round, title, live = false }: { round: Round; title: string; live?: boolean }) {
  const { state, view, rings, say, copy, wait, dispute, end } = round;
  const speech = useSpeech(say);
  const { start: startListening, stop: stopListening, sayAloud } = speech;
  const [text, setText] = useState('');
  const [aloud, setAloud] = useState(live);
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
  const coachText = state.coach?.text ?? null;
  const coachAt = state.lastPromptSec;
  useEffect(() => {
    if (aloud && coachText && coachAt !== null) sayAloud(coachText);
  }, [aloud, coachText, coachAt, sayAloud]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    say(text);
    setText('');
  }

  return (
    <section aria-label={title} className="space-y-4">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>{title}</span>
        <span className="tabular-nums" aria-live="off">
          {left}s left
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border-2 border-ink bg-[#fffaf0]">
        <div className="h-full bg-tomato" style={{ width: `${share * 100}%`, transition: 'width 250ms linear' }} />
      </div>

      {live ? (
        // The text follows the microphone: it says "counted as you speak" only while something is listening.
        <p className="sticker-sm bg-[#fffaf0] p-3 text-sm" aria-live="polite">
          {liveNotice(speech.state.status)}
        </p>
      ) : (
        <>
          <div className="rug flex flex-col items-center px-4 pb-4 pt-3 text-center">
            <span className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Simulated child</span>
            <Mia face={view.face} posture={view.posture} size={150} />
            <p className="mt-2 text-sm" aria-live="polite">
              {beat?.does}
            </p>
            {beat?.says && <p className="mt-1 font-display text-lg font-semibold">“{beat.says}”</p>}
            <p className="mt-1 min-h-5 text-sm italic text-ink-soft" aria-live="polite">
              {state.microReaction}
            </p>
          </div>
          <Bars connection={view.connection} focus={view.focus} talk={view.talk} />
        </>
      )}

      <Rings rings={rings} />
      <CoachBubble text={coachText} />

      <form onSubmit={submit} className="flex gap-2">
        <label className="sr-only" htmlFor="say">
          What do you say?
        </label>
        <input
          id="say"
          className="field"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? 'Listening… or type here' : live ? 'Type what you said…' : 'Say something to Mia…'}
          autoComplete="off"
          autoFocus={!live}
          maxLength={600}
        />
        <button className="btn btn-primary" type="submit">
          Say
        </button>
      </form>

      {/* Voice: the same sentences, spoken. Typing always stays available. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {voiceAvailable && (
            <button className="btn btn-quiet" type="button" aria-pressed={listening} onClick={listening ? stopListening : startListening}>
              {listening ? 'Stop listening' : 'Speak instead'}
            </button>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={aloud} onChange={(e) => setAloud(e.target.checked)} />
            Coach speaks aloud
          </label>
        </div>
        {listening && (
          <p className="text-sm" aria-live="polite">
            <span className="font-semibold">Listening: </span>
            {speech.state.interim || '…'}
          </p>
        )}
        {speech.state.message && (
          <p className="text-sm" role="status">
            {speech.state.message}
          </p>
        )}
        {listening && <p className="text-xs text-ink-soft">{LISTENING_HINT}</p>}
        {/* Shown before the first tap on "Speak instead", not only once the audio is already being sent. */}
        {voiceAvailable && (
          <p className="text-xs text-ink-soft">
            Your browser turns speech into text; in Chrome that uses Google&apos;s speech service. PlayReps does not
            record or store audio.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!live && (
          <>
            <button className="btn btn-quiet" type="button" onClick={copy}>
              Copy her (no words)
            </button>
            <button className="btn btn-quiet" type="button" onClick={wait}>
              Wait quietly
            </button>
          </>
        )}
        <button className="btn btn-quiet ml-auto" type="button" onClick={end}>
          {live ? 'End session' : 'End round'}
        </button>
      </div>

      {recent.length > 0 && (
        <ul className="space-y-2" aria-label="Your last sentences">
          {recent.map(({ s, index }) => (
            <SentenceChip key={index} sentence={s} disputed={s.disputed} onDispute={() => dispute(index)} />
          ))}
        </ul>
      )}
    </section>
  );
}
