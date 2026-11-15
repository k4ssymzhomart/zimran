'use client';

import { useEffect, useRef, useState } from 'react';
import { CHILDREN, forChild } from '@/components/child';
import {
  Chip,
  Composer,
  Icon,
  IconButton,
  Pattern,
  Portrait,
  Rings,
  Tag,
  cn,
  colorMotion,
  focusRing,
  focusRingOnViolet,
  type FacePose,
  type MicState,
  type TagTone,
} from '@/components/kit';
import type { useRound } from '@/hooks/useRound';
import { useSpeech } from '@/hooks/useSpeech';
import { useWakeLock } from '@/hooks/useWakeLock';
import { SAFETY_NOTE } from '@/lib/coding/safety';
import { REPEAT_NOTE, TURN_CAP_NOTE, type TimedSentence } from '@/lib/round/session';
import { isHearing, liveNotice } from '@/lib/speech/speech';
import { LABEL, type Face, type PartnerId, type PlayGuess, type Posture } from '@/lib/types';

type Round = ReturnType<typeof useRound>;

export interface SplitRoundStageProps {
  /** Everything hooks/useRound.ts returns: the engine's state and the parent's moves. */
  round: Round;
  /** Mia or Leo. Live play has no partner; a practice round without one is played with Mia. */
  partner: PartnerId | null;
  /** Names the screen for a screen reader ("Round 1 of 2"). The frames do not draw it. */
  title: string;
  /** Play with a real child: no simulated child on screen, the microphone and the coach's voice start at once. */
  live?: boolean;
  /** The quiz answer about what the parent says most. The result screen sets it against the counts; a running round does not show it. */
  guess?: PlayGuess | null;
}

/** A required line of the product (docs/build/FOUNDATION.md, section 6). */
const TYPING_LINE = 'Typing? Go for the mix, not the speed.';
/** The line of frame 21:403, above the field while the microphone hears the parent. */
const LISTENING_LINE = 'Listening. Pause between sentences.';

/** From this height a phone shows the round as drawn (21:139). Under it the child and the counters step down a size (21:280). */
const ROOMY_FROM = 680;
/** Under this height a phone has no room for the chips; with its keyboard open, the child, the counters and the field are all that fit (21:280). */
const CRAMPED_UNDER = 520;
/** How long the keyboard layout stays after the field loses the focus: a tap on the send button lands before anything moves. */
const KEYBOARD_LEAVES_MS = 300;
/** The split of frame 32:109 starts here; it is the `lg` step of the classes below. */
const WIDE = '(min-width: 1024px)';
/** A mouse and a real keyboard. A phone waits for a tap before its keyboard covers half of the round. */
const DESK = '(hover: hover) and (pointer: fine)';
/** The parent's last turn is shown, up to this many sentences of it. */
const TURN_ROWS = 3;

interface Visible {
  height: number;
  top: number;
  wide: boolean;
}

function measure(): Visible {
  const vv = window.visualViewport;
  return {
    height: Math.round(vv ? vv.height : window.innerHeight),
    top: Math.round(vv ? vv.offsetTop : 0),
    wide: window.matchMedia(WIDE).matches,
  };
}

/**
 * The visible part of the screen. On a phone the keyboard covers the bottom of the layout viewport, so the
 * round sizes itself to the visual viewport: the child, the counters and the field stay in view together.
 * The stage mounts in the browser, once the round has
 * started, so its first frame is measured already; rendered on a server it would fill the screen until measured.
 */
function useVisibleViewport(): Visible | null {
  const [vp, setVp] = useState<Visible | null>(() => (typeof window === 'undefined' ? null : measure()));
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => {
      const next = measure();
      setVp((was) => (was && was.height === next.height && was.top === next.top && was.wide === next.wide ? was : next));
    };
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

/** Engine text on its way to the screen: the frames set quotation marks and apostrophes typographically. */
const typeset = (text: string) => text.replace(/"([^"]*)"/g, '“$1”').replace(/'/g, '’');

/** A phone number stays on one line: "1-800-422-4453" is not broken at a hyphen. */
function unbroken(text: string) {
  return text.split(/(\d[\d-]*\d)/).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** Every portrait there is: the five faces, the back of the head when turned away, a lean when delighted. */
const POSES: FacePose[] = ['beaming', 'smiling', 'neutral', 'pouting', 'crying', 'away', 'leaning'];

const FACE_LABEL: Record<Face, string> = {
  beaming: 'beaming',
  smiling: 'smiling',
  neutral: 'calm',
  pouting: 'pouting',
  crying: 'crying',
};

/**
 * Which portrait the engine's face and posture make, as components/Mia.tsx maps them: tears always show the
 * face; otherwise turning away shows the back of the head, and leaning in while beaming shows the lean.
 */
function poseFor(face: Face, posture: Posture): FacePose {
  if (posture === 'turned_away' && face !== 'crying') return 'away';
  if (posture === 'leaning_in' && face === 'beaming') return 'leaning';
  return face;
}

/**
 * The child as the engine sees them. All seven portraits are on the page and the one that matches is shown,
 * so a change of mood never waits for a picture. The box gives way when the block is short: the picture
 * scales down inside it.
 */
function Child({ partner, face, posture, className }: { partner: PartnerId; face: Face; posture: Posture; className: string }) {
  const pose = poseFor(face, posture);
  // Leaning in has a portrait of its own only with the beaming face. With any other face it is a small lean.
  const lean = posture === 'leaning_in' && pose !== 'leaning';
  return (
    <div
      role="img"
      aria-label={`${CHILDREN[partner].name}, a simulated child, ${pose === 'away' ? 'turned away' : FACE_LABEL[face]}`}
      className={cn('relative min-h-0 shrink', className)}
    >
      <div
        className={cn(
          'absolute inset-0 origin-bottom transition-transform duration-500 ease-out-quint motion-reduce:transition-none',
          lean && '-translate-y-[3%] scale-105',
        )}
      >
        {POSES.map((each) => (
          // 480 is the size the screens before the round ask for, so the opening portrait is already on the device.
          <Portrait
            key={each}
            partner={partner}
            pose={each}
            size={480}
            priority={each === 'smiling'}
            className={cn(
              'absolute inset-0 size-full object-contain transition-opacity duration-quick ease-out-quint motion-reduce:transition-none',
              each === pose ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}
      </div>
    </div>
  );
}

interface Said {
  sentence: TimedSentence;
  /** Its place in the round: what "Disagree?" names. */
  index: number;
}

/** The sentences of the parent's last turn, oldest first. A turn shares one time stamp. */
function lastTurn(sentences: readonly TimedSentence[]): Said[] {
  const last = sentences[sentences.length - 1];
  if (!last) return [];
  const turn: Said[] = [];
  for (let i = sentences.length - 1; i >= 0 && sentences[i].atSec === last.atSec && turn.length < TURN_ROWS; i--) {
    turn.unshift({ sentence: sentences[i], index: i });
  }
  return turn;
}

/**
 * The counted sentences the parent set aside earlier in the round. They are listed once every place is taken:
 * the engine then refuses another "Disagree?" and asks for "Count it" on one of them.
 */
function setAside(sentences: readonly TimedSentence[], turn: readonly Said[]): Said[] {
  return sentences
    .map((sentence, index) => ({ sentence, index }))
    .filter(({ sentence, index }) => sentence.disputed && (sentence.bucket === 'target' || sentence.bucket === 'avoid') && !turn.some((said) => said.index === index));
}

/**
 * One sentence the parent said, with the code the rules gave it (the "Last sentence" row of 21:205).
 * "Disagree?" takes it out of the count and "Count it" puts it back, as in the old screen. The engine sets
 * aside a few sentences a round; past that it refuses the tap and says why in the coach line.
 */
// TODO kit: a one-line sentence row. TranscriptRow is the two-line row of the session review.
function SaidRow({ sentence, onDispute }: { sentence: TimedSentence; onDispute(): void }) {
  // A sentence that fills no ring by a rule of the round says so in place of its code.
  const note = sentence.repeat ? REPEAT_NOTE : sentence.capped ? TURN_CAP_NOTE : null;
  // A disputed sentence is not counted: it keeps its label and loses the skill color, as in the kit's TranscriptRow.
  const bucket = sentence.disputed ? 'none' : sentence.bucket;
  const swap = bucket === 'avoid';
  const tone: TagTone = bucket === 'target' ? 'skill' : swap ? 'swap' : 'quiet';
  const label = note ?? (swap ? `${LABEL[sentence.code]}, to swap` : LABEL[sentence.code]);
  // Offered where the old screen offered it. A sentence under a note fills no ring either way: nothing to set aside.
  const offered = note === null && sentence.code !== 'unknown';
  return (
    <li className="flex items-center gap-[10px]">
      <Tag tone={tone}>{label}</Tag>
      <p className="min-w-0 flex-1 truncate text-label text-gray" title={sentence.text}>
        “{sentence.text}”
      </p>
      {offered && (
        /* 20px of text inside a 44px touch target. */
        <button
          type="button"
          onClick={onDispute}
          className={cn('-my-[12px] shrink-0 cursor-pointer rounded-[8px] py-[12px] text-label text-violet active:text-violet-press', colorMotion, focusRing)}
        >
          {sentence.disputed ? 'Count it' : 'Disagree?'}
          <span className="sr-only">
            {' '}
            {LABEL[sentence.code]}: “{sentence.text}”
          </span>
        </button>
      )}
    </li>
  );
}

/**
 * One running round in the Split design: phones are frames 21:139, 21:205, 21:280, 21:403, 21:468 and 24:401,
 * from 1024px it is the split of 32:109. A fallback for the first visit until the round screen of
 * components/round is rebuilt; it takes what that screen will take.
 *
 * It only shows what the engine says and forwards the parent's moves, typed or spoken; nothing here computes a
 * count, a ring or a second.
 */
// TODO kit: SplitScreen does not fit a round. Its root cannot follow the visual viewport, it has no place for
// the time line under the bar, and its violet block stops at 220px, which a phone with its keyboard open does
// not have. The blocks below repeat its measurements (bar, stage, dock, the 440px column).
export function SplitRoundStage({ round, partner, title, live = false }: SplitRoundStageProps) {
  const { state, view, rings, say, saySpoken, copy, wait, dispute, end } = round;
  // The microphone has its own `say`, so a saved session knows which sentences were spoken.
  const speech = useSpeech(saySpoken);
  const { start: startListening, stop: stopListening, sayAloud } = speech;
  const [aloud, setAloud] = useState(live);
  const [text, setText] = useState('');
  /** How many beats there were when the parent last tapped "Copy" or "Wait". */
  const [nudgedAt, setNudgedAt] = useState(-1);
  const [desk] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESK).matches);
  /** The field has the focus: on a phone its keyboard is open. */
  const [composing, setComposing] = useState(false);
  const leaving = useRef<number | undefined>(undefined);
  const vp = useVisibleViewport();
  const field = useRef<HTMLDivElement>(null);

  const kid: PartnerId = partner ?? 'mia';
  const child = CHILDREN[kid];
  const shown = (line: string) => typeset(forChild(line, kid));

  // Phones only: the split from 1024px has a column of its own for the words, whatever the height.
  const short = vp !== null && !vp.wide && vp.height < ROOMY_FROM;
  // A device with a real keyboard has nothing to make room for; its words scroll if they must.
  const cramped = short && vp.height < CRAMPED_UNDER && !desk;
  // The keyboard is open (21:280). A screen that is this short with the keyboard away still shows what a sentence did.
  const tight = cramped && composing;

  const beats = state.beats.length;
  const beat = state.beats[beats - 1];
  const left = Math.max(0, Math.ceil(state.seconds - state.elapsedSec));
  const share = state.seconds > 0 ? Math.min(1, state.elapsedSec / state.seconds) : 0;
  const turn = lastTurn(state.sentences);
  const rows = state.disputesLeft > 0 ? turn : [...setAside(state.sentences, turn), ...turn];

  // The engine's one-line reaction is what she does from the parent's move until her next beat.
  const saidSinceBeat = beat !== undefined && turn.some(({ sentence }) => sentence.atSec >= beat.atSec && sentence.code !== 'unknown');
  const reacting = (saidSinceBeat || nudgedAt === beats) && state.microReaction !== '';
  const doing = beat ? shown(reacting ? state.microReaction : beat.does) : null;

  const status = speech.state.status;
  /** The parent turned the microphone on. The browser may still be asking for it. */
  const voiceOn = status === 'listening' || status === 'starting';
  const hearing = isHearing(speech.state);
  const micState: MicState = status === 'unsupported' ? 'unavailable' : voiceOn ? 'listening' : 'idle';
  /** Words heard so far in the sentence being spoken, as the field shows them (21:403). */
  const heard = speech.state.interim ? `${speech.state.interim}…` : '';
  const typing = !voiceOn && (text !== '' || tight);

  // In live play the screen is out of sight, so the microphone starts with the session.
  useEffect(() => {
    if (live) startListening();
  }, [live, startListening]);

  // The phone lies on the table for five minutes; a locked screen would stop the listening.
  useWakeLock(live);

  useEffect(() => () => window.clearTimeout(leaving.current), []);

  // Each new coach line is spoken once when the parent asked for it. Spoken as the engine wrote it:
  // the microphone knows the line by its plain words and does not count its echo as the parent.
  const coach = state.coach;
  const coachSpoken = coach ? forChild(coach.text, kid) : null;
  const coachAt = state.lastPromptSec;
  useEffect(() => {
    if (aloud && coachSpoken && coachAt !== null) sayAloud(coachSpoken);
  }, [aloud, coachSpoken, coachAt, sayAloud]);

  // The support card below carries the safety line; it is not said twice.
  const coachLine = coach && coach.text !== SAFETY_NOTE.body ? shown(coach.text) : null;
  const feedback = !tight && (coachLine !== null || rows.length > 0);

  function change(next: string) {
    if (!voiceOn) {
      setText(next);
      return;
    }
    // Typing takes over from the microphone. The words in the field are the recognizer's, and it sends them
    // itself as it stops: only what was typed around them stays.
    stopListening();
    const at = next.indexOf(heard);
    setText(at < 0 ? '' : next.slice(0, at) + next.slice(at + heard.length));
  }

  function send(sentence: string) {
    // While listening the field shows what was heard, and that reaches the engine through `saySpoken`.
    if (voiceOn) return;
    setText('');
    say(sentence);
    if (tight) {
      // A phone with its keyboard open shows no coach line and no tag (21:280). Sending puts the keyboard away,
      // so the parent sees what the sentence did (21:205) and taps the field for the next one.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    } else if (desk) {
      // The send button gives way to the microphone as the field empties; the next sentence starts in the field.
      field.current?.querySelector('input')?.focus();
    }
  }

  const ring = (part: { count: number; target: number }) => ({
    value:
      part.target > 0 ? (
        <span className={short ? 'text-label' : undefined}>
          {part.count}
          <span className="sr-only"> of {part.target}</span>
        </span>
      ) : (
        '–'
      ),
    progress: part.target > 0 ? Math.min(1, part.count / part.target) : 0,
  });

  return (
    <section
      aria-label={title || (live ? 'Live session' : 'Round')}
      className="fixed inset-x-0 top-0 z-30 flex flex-col overflow-hidden bg-white text-ink lg:flex-row"
      style={vp ? { height: vp.height, transform: `translateY(${vp.top}px)` } : { height: '100dvh' }}
    >
      {/* Violet holds the child: the bar, the time line, then what the child does and says. */}
      <div className="relative flex min-h-[46px] flex-1 flex-col overflow-hidden bg-violet pt-[env(safe-area-inset-top)] text-white lg:h-full lg:w-1/2 lg:flex-none">
        {/* The desktop block carries the sentences pattern (32:109); the phone frames are flat. */}
        <Pattern kind="sentences" size={1440} className="hidden lg:block" />

        <div className="relative flex h-[44px] shrink-0 items-center justify-between px-[12px] lg:h-[80px] lg:px-[28px]">
          <IconButton label={live ? 'End session' : 'End round'} variant="on-violet" onClick={end}>
            <Icon name="close" />
          </IconButton>
          <p className="text-body-strong tabular-nums">
            <span className="sr-only">Time left </span>
            {clock(left)}
          </p>
          <button
            // TODO kit: IconButton has no pressed look on violet. On is the white disc of a selected chip on violet.
            type="button"
            aria-pressed={aloud}
            aria-label="Coach speaks aloud"
            title="Coach speaks aloud"
            onClick={() => setAloud((on) => !on)}
            className={cn(
              'inline-flex size-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full',
              aloud ? 'bg-white text-violet active:bg-lilac' : 'text-white active:bg-violet-press',
              colorMotion,
              focusRingOnViolet,
            )}
          >
            <Icon name="speaker" />
          </button>
        </div>

        {/* The share of the round that is behind, from the engine's clock. The ticks are 250ms apart. */}
        <div aria-hidden="true" className="relative h-[2px] shrink-0 bg-violet-press">
          <div
            className="h-full bg-white transition-[width] duration-[250ms] ease-linear motion-reduce:transition-none"
            style={{ width: `${share * 100}%` }}
          />
        </div>

        <div
          className={cn(
            'relative flex min-h-0 flex-1 flex-col items-center justify-center gap-[4px] px-[24px] lg:gap-[10px] lg:px-[56px] lg:pb-[80px]',
            short ? 'pb-[16px]' : 'pb-[28px]',
          )}
        >
          {live ? (
            // The text follows the microphone: it says "counted as you speak" only while something is listening.
            <p role="status" className="max-w-[440px] text-center text-body">
              {liveNotice(status, speech.state.ready)}
            </p>
          ) : (
            <>
              <Child
                partner={kid}
                face={view.face}
                posture={view.posture}
                // 200px alone (21:139), 180px above a coach line (21:205), 120px on a short screen (21:280), 340px in the split (32:109).
                className={cn(short ? 'size-[120px]' : feedback ? 'size-[180px]' : 'size-[200px]', 'lg:size-[340px]')}
              />
              <div aria-live="polite" className="flex w-full flex-col items-center gap-[4px] text-center lg:gap-[10px]">
                {/* On the shortest screens her words stay and what she does is read out only (21:280). */}
                {doing && <p className={cn('text-label lg:text-lead', cramped && beat?.says && 'sr-only')}>{doing}</p>}
                {beat?.says && <p className={cn('text-balance', short ? 'text-heading' : 'text-title lg:text-title-xl')}>“{typeset(beat.says)}”</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* White holds the words: the four counters, what the last sentence did, then the answer. */}
      <div
        className={cn(
          'flex min-h-0 shrink flex-col overflow-y-auto overscroll-contain bg-white lg:h-full lg:w-1/2 lg:shrink-0 lg:px-[40px] lg:pb-[64px] lg:pt-[64px]',
          tight ? 'pb-[10px]' : 'pb-[max(16px,env(safe-area-inset-bottom))]',
        )}
      >
        <div className="w-full lg:m-auto lg:max-w-[440px]">
          <div
            role="group"
            aria-label="Progress toward the clinic pace"
            className={cn('px-[24px] lg:px-0 lg:pb-[24px] lg:pt-0', short ? 'pb-[12px] pt-[14px]' : 'pb-[16px] pt-[20px]')}
          >
            <Rings
              // TODO kit: Rings has no 44px step. The short screen passes its smaller number as the value.
              size={short ? 44 : 56}
              className="justify-center gap-[22px]"
              praise={ring(rings.specific_praise)}
              reflect={ring(rings.reflection)}
              describe={ring(rings.description)}
              swap={{ value: <span className={short ? 'text-label' : undefined}>{rings.avoid.count}</span> }}
            />
          </div>

          {/* A sentence the engine did not score, and where to find support. It stays for the rest of the round. */}
          {state.safety && (
            <div role="status" className="mx-[24px] mb-[16px] flex flex-col gap-[4px] rounded-[16px] bg-mist p-[16px] lg:mx-0 lg:mb-[24px]">
              <p className="text-body-strong">{SAFETY_NOTE.headline}</p>
              <p className="text-label text-gray">{unbroken(SAFETY_NOTE.body)}</p>
            </div>
          )}

          <div className={cn(feedback && 'flex flex-col gap-[10px] px-[24px] pb-[16px] lg:px-0 lg:pb-[24px]')}>
            {/* Always on the page, so a new coach line is read out even while the keyboard hides it. */}
            <p role="status" className={feedback && coachLine ? 'text-body-strong' : 'sr-only'}>
              {coachLine}
            </p>
            {feedback && rows.length > 0 && (
              <ul aria-label="Your last sentences" className="flex flex-col gap-[10px]">
                {rows.map(({ sentence, index }) => (
                  <SaidRow key={index} sentence={sentence} onDispute={() => dispute(index)} />
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col items-start gap-[10px] px-[16px] lg:px-0">
            {/* The two moves without words. A sentence being typed takes their place; while the microphone is on they stay. */}
            {!typing && !cramped && !live && (
              <div className="flex gap-[8px]">
                <Chip
                  onClick={() => {
                    setNudgedAt(beats);
                    copy();
                  }}
                >
                  Copy {child.them}
                </Chip>
                <Chip
                  onClick={() => {
                    setNudgedAt(beats);
                    wait();
                  }}
                >
                  Wait
                </Chip>
              </div>
            )}
            {voiceOn && (
              // The line of 21:403. Said once the browser really listens, never while it is still asking for the microphone.
              <p role="status" className="min-h-[20px] px-[8px] text-label text-gray">
                {hearing ? LISTENING_LINE : null}
              </p>
            )}
            {typing && (
              // It takes the place and the height of the chips, so nothing moves as a sentence is started and sent.
              <p className={cn('flex items-center px-[8px] text-label text-gray', !tight && 'min-h-[36px]')}>{TYPING_LINE}</p>
            )}
            <div
              ref={field}
              className="w-full"
              onFocus={(event) => {
                if (!(event.target instanceof HTMLInputElement)) return;
                window.clearTimeout(leaving.current);
                setComposing(true);
              }}
              onBlur={(event) => {
                if (!(event.target instanceof HTMLInputElement)) return;
                leaving.current = window.setTimeout(() => setComposing(false), KEYBOARD_LEAVES_MS);
              }}
            >
              <Composer
                value={voiceOn ? heard : text}
                onChange={change}
                onSubmit={send}
                placeholder={live ? 'Type what you said' : `Say something to ${child.name}`}
                onMic={voiceOn ? stopListening : startListening}
                micState={micState}
                autoFocus={desk && !live}
              />
            </div>
            {/* Why there is no microphone, or why it went quiet. Typing already has its line above. */}
            {speech.state.message && !voiceOn && !typing && (
              <p role="status" className="px-[8px] text-small text-gray">
                {speech.state.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
