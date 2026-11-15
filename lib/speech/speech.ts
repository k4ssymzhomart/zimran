/**
 * Voice input, the pure part: what state the microphone is in, and which transcripts are passed on.
 * The browser objects live in hooks/useSpeech.ts. Nothing here touches the DOM or the clock,
 * so every decision is tested directly.
 */

export type SpeechStatus =
  | 'unsupported' // this browser has no speech recognition
  | 'idle'
  | 'starting' // asked for, waiting for the browser (also between automatic restarts)
  | 'listening'
  | 'denied' // the visitor or the browser refused the microphone
  | 'failed';

export interface SpeechState {
  status: SpeechStatus;
  /** The parent wants the microphone on; recognition is restarted while this is true. */
  wanted: boolean;
  /** Words heard so far in the sentence being spoken. */
  interim: string;
  /** A calm line for the screen, or null. */
  message: string | null;
  /**
   * The browser has started recognition since the parent turned voice on, so the microphone was allowed.
   * False while the permission prompt is still unanswered; it stays true between automatic restarts.
   */
  ready: boolean;
}

export type SpeechEvent =
  | { type: 'support'; supported: boolean }
  | { type: 'want'; on: boolean }
  | { type: 'started' }
  | { type: 'interim'; text: string }
  | { type: 'accepted' }
  | { type: 'ended' }
  | { type: 'error'; code: string };

export const MESSAGES = {
  unsupported: 'Voice works in Chrome and Edge. Typing works everywhere.',
  denied: 'The microphone is off for this page. You can allow it in the address bar, or keep typing.',
  noMicrophone: 'No microphone was found. Typing works.',
  network: 'The speech service could not be reached. Typing works.',
  failed: 'Voice stopped unexpectedly. You can turn it on again, or keep typing.',
} as const;

/** Shown while listening. A final transcript arrives at each pause and is coded as the parent's turn. */
export const LISTENING_HINT = 'Pause briefly between sentences, so each one is counted on its own.';

/**
 * What the live screen says about listening. It never says the parent is being heard when they are not,
 * and it says plainly that one microphone cannot tell the parent's voice from the child's.
 */
export const LIVE_NOTICE = {
  on:
    'Put the phone down and play. Your sentences are counted as you speak, and the coach talks to you. ' +
    'The microphone hears the whole room and cannot tell voices apart, so a clear sentence from your child may be counted as yours. ' +
    'Reflections are not counted in live play yet; practice those with Mia.',
  waiting: 'Waiting for the microphone. Allow it when your browser asks, or type what you say below.',
  off: 'The microphone is off, so nothing is being heard. Turn it on with “Speak instead”, or type what you say below.',
  unsupported:
    'Voice does not work in this browser, so nothing is being heard. Type what you say below, or open this page in Chrome or Edge.',
} as const;

/** True while the parent is really being heard: listening, or between two automatic restarts. */
export function isHearing(state: Pick<SpeechState, 'status' | 'ready'>): boolean {
  return state.status === 'listening' || (state.status === 'starting' && state.ready);
}

/**
 * `ready` says the browser has granted the microphone. Left out, a status of 'starting' is read as before,
 * as being heard: a screen that passes the status alone keeps its "play" line through the browser's own
 * pauses (some phones stop listening after every sentence) instead of flipping to "waiting" each time.
 * A screen that passes `state.ready` gets the waiting line until the permission is answered.
 */
export function liveNotice(status: SpeechStatus, ready = true): string {
  if (isHearing({ status, ready })) return LIVE_NOTICE.on;
  // Asked for, and the browser has not answered yet: nothing is counted until the microphone is allowed.
  if (status === 'starting') return LIVE_NOTICE.waiting;
  return status === 'unsupported' ? LIVE_NOTICE.unsupported : LIVE_NOTICE.off;
}

export function initialSpeech(): SpeechState {
  return { status: 'idle', wanted: false, interim: '', message: null, ready: false };
}

/** Errors the browser reports during ordinary use; they change nothing. */
const BENIGN = new Set(['no-speech', 'aborted']);

export function speechReducer(state: SpeechState, event: SpeechEvent): SpeechState {
  switch (event.type) {
    case 'support':
      return event.supported ? state : { ...state, status: 'unsupported', wanted: false, message: MESSAGES.unsupported };
    case 'want':
      if (state.status === 'unsupported') return state;
      return event.on
        ? { ...state, wanted: true, status: 'starting', message: null }
        : { ...state, wanted: false, status: 'idle', interim: '', ready: false };
    case 'started':
      return state.wanted ? { ...state, status: 'listening', ready: true } : state;
    case 'interim':
      return state.status === 'listening' ? { ...state, interim: event.text } : state;
    case 'accepted':
      return { ...state, interim: '' };
    case 'ended':
      // Browsers end recognition after a pause; while the parent wants it, it is started again.
      if (state.status === 'denied' || state.status === 'failed' || state.status === 'unsupported') return state;
      return { ...state, interim: '', status: state.wanted ? 'starting' : 'idle' };
    case 'error': {
      if (BENIGN.has(event.code)) return state;
      const off = { ...state, wanted: false, interim: '', ready: false };
      if (event.code === 'not-allowed' || event.code === 'service-not-allowed') {
        return { ...off, status: 'denied', message: MESSAGES.denied };
      }
      if (event.code === 'audio-capture') return { ...off, status: 'failed', message: MESSAGES.noMicrophone };
      if (event.code === 'network') return { ...off, status: 'failed', message: MESSAGES.network };
      return { ...off, status: 'failed', message: MESSAGES.failed };
    }
  }
}

/** True when the hook has to (re)start the browser's recognition. */
export function shouldStart(state: SpeechState): boolean {
  return state.wanted && state.status === 'starting';
}

const FILLER = /^(?:(?:um+|uh+|er+|erm+|hmm+|mm+)\b[,.]?\s*)+/i;

/** Tidy what the recognizer heard: trim, collapse spaces, drop leading "um". */
export function cleanTranscript(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().replace(FILLER, '').trim();
}

const wordsOf = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^a-z' ]/g, ' ')
    .split(' ')
    .filter(Boolean);

export interface Heard {
  text: string;
  atMs: number;
}

/** Some browsers deliver the same final result twice. */
export function isRepeat(last: Heard | null, text: string, nowMs: number, windowMs = 1500): boolean {
  return last !== null && nowMs - last.atMs <= windowMs && wordsOf(last.text).join(' ') === wordsOf(text).join(' ');
}

export interface SpokenLine {
  text: string;
  /** null while the coach is still speaking. */
  endedAtMs: number | null;
}

/** How long after the coach stops its own words can still arrive as a late transcript. */
const ECHO_TAIL_MS = 2500;
/**
 * A quoted example in a coach line (“Good job stacking so gently.”) is there to be said aloud.
 * Hearing it and saying it takes a parent longer than this, so the same words arriving sooner are the coach's own tail.
 */
const REPEAT_AFTER_MS = 1500;

/** True when `part` is a run of consecutive words inside `whole`. */
function isRun(part: string[], whole: string[]): boolean {
  for (let start = 0; start + part.length <= whole.length; start++) {
    if (part.every((w, i) => whole[start + i] === w)) return true;
  }
  return false;
}

/** The example sentences a coach line puts in quotation marks, as words. */
const quotedExamples = (line: string): string[][] => [...line.matchAll(/[“"]([^”"]+)[”"]/g)].map((m) => wordsOf(m[1]));

/**
 * The coach's spoken line can leak from a loudspeaker into the microphone.
 * A transcript is an echo when it is a word-for-word stretch of the coach's line, heard during the line or just after it.
 * Sharing a few words with the coach is not enough: "You did it" stays the parent's sentence.
 * The coach's quoted example, said back by the parent once the coach has finished, is also kept.
 */
export function isEcho(text: string, spoken: SpokenLine | null, nowMs: number, windowMs = ECHO_TAIL_MS): boolean {
  if (!spoken) return false;
  const sinceEnd = spoken.endedAtMs === null ? null : nowMs - spoken.endedAtMs;
  if (sinceEnd !== null && sinceEnd > windowMs) return false;
  const heard = wordsOf(text);
  // Two words are too few to tell an echo from the parent ("nice tower").
  if (heard.length < 3 || !isRun(heard, wordsOf(spoken.text))) return false;
  if (sinceEnd === null) return true; // the coach is still speaking
  const isExample = quotedExamples(spoken.text).some((example) => isRun(heard, example));
  return !isExample || sinceEnd < REPEAT_AFTER_MS;
}

/** The cleaned sentence to pass to the round, or null when it is empty, a repeat or an echo. */
export function acceptTranscript(raw: string, nowMs: number, last: Heard | null, spoken: SpokenLine | null): string | null {
  const text = cleanTranscript(raw);
  if (!text || !/[a-z]/i.test(text)) return null;
  if (isRepeat(last, text, nowMs) || isEcho(text, spoken, nowMs)) return null;
  return text;
}

// ---------- the coach's voice ----------

/** The parts of a browser voice (SpeechSynthesisVoice) the choice needs. */
export interface VoiceLike {
  name: string;
  lang: string;
  default?: boolean;
}

/**
 * Voices that read a sentence the way a person would, best first: the neural voices of Edge, Chrome's network
 * voice, then Apple's downloaded and standard voices. The browser picks none of them by itself.
 */
const PREFERRED_VOICES: readonly RegExp[] = [
  /^Microsoft (Aria|Jenny|Ava|Emma|Andrew|Brian|Guy)\b.*Natural/i,
  /^Google US English$/i,
  /^(Ava|Zoe|Allison|Evan|Nathan|Samantha|Susan|Tom|Noelle|Joelle)\b.*\((Premium|Enhanced)\)/i,
  /^(Samantha|Ava|Allison|Susan|Zoe|Nicky|Aaron|Tom)\b/i,
  // The same Apple voices on a Mac set to Russian, where the browser lists them by their Russian names.
  /^(Саманта|Ава|Эллисон|Сьюзен|Зои|Ники|Аарон|Том)(?:\s|\(|$)/,
  /^Microsoft (Zira|David|Mark)\b/i,
  /^Google UK English (Female|Male)$/i,
];

/**
 * macOS novelty and synthetic-sounding voices, by their English and their Russian names (a Mac set to Russian
 * lists them as "Альберт", "Пузырьки"). Never the coach, whatever the browser's default is.
 */
const NOVELTY_VOICES: readonly RegExp[] = [
  /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Good News|Jester|Junior|Organ|Pipe Organ|Superstar|Ralph|Trinoids|Whisper|Zarvox|Deranged|Hysterical|Fred|Kathy|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley)\b/i,
  /^(Альберт|Бах|Виолончель|Воббл|Джуниор|Зарвокс|Колокольчик|Кэти|Орган|Трубный орган|Плохие новости|Хорошие новости|Прыг-скок|Пузырьки|Ральф|Суперзвезда|Триноид|Фред|Шепот|Шёпот|Шутник|Бред|Истерика)(?:\s|\(|$)/,
];
const isNovelty = (name: string): boolean => NOVELTY_VOICES.some((novelty) => novelty.test(name));

/**
 * The voice the coach speaks in: the best English voice this browser has, or null to leave it to the browser
 * (no voices listed yet, or no English one). Left alone, Chrome on a Mac can read the coach as "Albert".
 */
export function pickVoice<V extends VoiceLike>(voices: readonly V[]): V | null {
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang) && !isNovelty(v.name));
  for (const preferred of PREFERRED_VOICES) {
    const hit = english.find((v) => preferred.test(v.name));
    if (hit) return hit;
  }
  const american = english.filter((v) => /^en[-_]US$/i.test(v.lang));
  return american.find((v) => v.default) ?? american[0] ?? english[0] ?? null;
}
