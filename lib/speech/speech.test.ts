import { describe, expect, it } from 'vitest';
import { coachPrompt } from '../coach/policy';
import {
  acceptTranscript,
  cleanTranscript,
  initialSpeech,
  isEcho,
  isHearing,
  isRepeat,
  LISTENING_HINT,
  LIVE_NOTICE,
  liveNotice,
  MESSAGES,
  shouldStart,
  speechReducer,
  type SpeechEvent,
  type SpeechState,
  type SpeechStatus,
} from './speech';

const run = (events: SpeechEvent[], from: SpeechState = initialSpeech()): SpeechState => events.reduce(speechReducer, from);

describe('microphone state', () => {
  it('goes idle -> starting -> listening when the parent turns it on', () => {
    let s = run([{ type: 'want', on: true }]);
    expect(s.status).toBe('starting');
    expect(shouldStart(s)).toBe(true);
    s = run([{ type: 'started' }], s);
    expect(s.status).toBe('listening');
    expect(shouldStart(s)).toBe(false);
  });
  it('shows the words while they are being spoken and clears them when the sentence is accepted', () => {
    let s = run([{ type: 'want', on: true }, { type: 'started' }, { type: 'interim', text: "you're stacking" }]);
    expect(s.interim).toBe("you're stacking");
    s = run([{ type: 'accepted' }], s);
    expect(s.interim).toBe('');
  });
  it('asks for a restart when the browser ends recognition after a pause', () => {
    const s = run([{ type: 'want', on: true }, { type: 'started' }, { type: 'ended' }]);
    expect(s.status).toBe('starting');
    expect(shouldStart(s)).toBe(true);
  });
  it('stays off after the parent turns it off', () => {
    const s = run([{ type: 'want', on: true }, { type: 'started' }, { type: 'want', on: false }, { type: 'ended' }]);
    expect(s.status).toBe('idle');
    expect(shouldStart(s)).toBe(false);
  });
  it('a refused microphone turns voice off with a calm line and does not restart', () => {
    const s = run([{ type: 'want', on: true }, { type: 'error', code: 'not-allowed' }, { type: 'ended' }]);
    expect(s.status).toBe('denied');
    expect(s.wanted).toBe(false);
    expect(s.message).toBe(MESSAGES.denied);
    expect(shouldStart(s)).toBe(false);
  });
  it('silence and aborts are not failures', () => {
    const listening = run([{ type: 'want', on: true }, { type: 'started' }]);
    expect(run([{ type: 'error', code: 'no-speech' }], listening)).toBe(listening);
    expect(run([{ type: 'error', code: 'aborted' }], listening)).toBe(listening);
  });
  it('other failures stop voice and say that typing works', () => {
    const listening = run([{ type: 'want', on: true }, { type: 'started' }]);
    expect(run([{ type: 'error', code: 'network' }], listening).message).toBe(MESSAGES.network);
    expect(run([{ type: 'error', code: 'audio-capture' }], listening).message).toBe(MESSAGES.noMicrophone);
    const odd = run([{ type: 'error', code: 'something-new' }], listening);
    expect(odd.status).toBe('failed');
    expect(odd.wanted).toBe(false);
  });
  it('an unsupported browser never starts', () => {
    const s = run([{ type: 'support', supported: false }, { type: 'want', on: true }]);
    expect(s.status).toBe('unsupported');
    expect(s.message).toBe(MESSAGES.unsupported);
    expect(shouldStart(s)).toBe(false);
  });
  it('can be turned on again after a failure', () => {
    const s = run([{ type: 'want', on: true }, { type: 'error', code: 'network' }, { type: 'want', on: true }]);
    expect(s.status).toBe('starting');
    expect(s.message).toBeNull();
  });
  it('no message scolds', () => {
    for (const m of [...Object.values(MESSAGES), ...Object.values(LIVE_NOTICE), LISTENING_HINT]) {
      expect(m).not.toMatch(/\b(wrong|bad|mistake|should|don't)\b/i);
    }
  });
});

describe('the live notice', () => {
  it('says sentences are counted only while the microphone is on, or restarting after it was allowed', () => {
    expect(liveNotice('listening', true)).toBe(LIVE_NOTICE.on);
    expect(liveNotice('starting', true)).toBe(LIVE_NOTICE.on);
    for (const status of ['idle', 'denied', 'failed', 'unsupported'] as SpeechStatus[]) {
      expect(liveNotice(status, false)).toMatch(/nothing is being heard/);
      expect(liveNotice(status, false)).toMatch(/type what you say/i);
      expect(liveNotice(status, false)).not.toMatch(/counted as you speak/);
    }
  });
  it('while the browser still asks for the microphone, it says it is waiting and claims nothing', () => {
    const asked = run([{ type: 'want', on: true }]);
    expect(asked).toMatchObject({ status: 'starting', ready: false });
    expect(isHearing(asked)).toBe(false);
    expect(liveNotice(asked.status, asked.ready)).toBe(LIVE_NOTICE.waiting);
    expect(LIVE_NOTICE.waiting).not.toMatch(/counted as you speak|coach talks/);
    expect(LIVE_NOTICE.waiting).toMatch(/type what you say/i);
  });
  it('once allowed, it stays "on" through the automatic restarts, and goes back when voice is turned off or refused', () => {
    const allowed = run([{ type: 'want', on: true }, { type: 'started' }]);
    expect(allowed.ready).toBe(true);
    const restarting = run([{ type: 'ended' }], allowed);
    expect(restarting).toMatchObject({ status: 'starting', ready: true });
    expect(isHearing(restarting)).toBe(true);
    expect(liveNotice(restarting.status, restarting.ready)).toBe(LIVE_NOTICE.on);
    expect(run([{ type: 'want', on: false }], allowed).ready).toBe(false);
    expect(run([{ type: 'error', code: 'not-allowed' }], allowed).ready).toBe(false);
    expect(run([{ type: 'error', code: 'no-speech' }], allowed).ready).toBe(true);
    // Turned on again: waiting until the browser starts.
    const again = run([{ type: 'want', on: false }, { type: 'want', on: true }], allowed);
    expect(liveNotice(again.status, again.ready)).toBe(LIVE_NOTICE.waiting);
  });
  it('a screen that passes the status alone keeps its "play" line through the browser\'s own pauses', () => {
    // On some phones recognition ends after every sentence and is started again at once. The round screen calls
    // liveNotice(status) with one argument; read as "waiting", its card flipped after every sentence.
    const paused = run([{ type: 'want', on: true }, { type: 'started' }, { type: 'ended' }]);
    expect(paused.status).toBe('starting');
    expect(liveNotice(paused.status)).toBe(LIVE_NOTICE.on);
    expect(liveNotice('listening')).toBe(LIVE_NOTICE.on);
    // A screen that tracks the permission still gets the waiting line before it is answered.
    const asked = run([{ type: 'want', on: true }]);
    expect(liveNotice(asked.status, asked.ready)).toBe(LIVE_NOTICE.waiting);
    // Off is off, with or without the second argument.
    for (const status of ['idle', 'denied', 'failed', 'unsupported'] as SpeechStatus[]) expect(liveNotice(status)).toBe(liveNotice(status, false));
  });
  it('offers the microphone button only where the browser has voice', () => {
    expect(liveNotice('denied', false)).toContain('Speak instead');
    expect(liveNotice('unsupported', false)).not.toContain('Speak instead');
    expect(liveNotice('unsupported', false)).toMatch(/Chrome or Edge/);
  });
  it("does not claim to leave the child's voice out", () => {
    expect(LIVE_NOTICE.on).toMatch(/cannot tell voices apart/);
    expect(LIVE_NOTICE.on).toMatch(/your child may be counted as yours/);
    for (const m of Object.values(LIVE_NOTICE)) expect(m).not.toMatch(/does not (listen|hear)|is not heard/i);
  });
});

describe('transcripts', () => {
  it('tidies what was heard', () => {
    expect(cleanTranscript('  um  you are   stacking the blocks ')).toBe('you are stacking the blocks');
    expect(cleanTranscript('uh, um nice tower')).toBe('nice tower');
    expect(cleanTranscript('umbrella is red')).toBe('umbrella is red');
  });
  it('drops a result the browser delivers twice', () => {
    const last = { text: 'You made a tower', atMs: 1000 };
    expect(isRepeat(last, 'you made a tower', 1800)).toBe(true);
    expect(isRepeat(last, 'you made a tower', 4000)).toBe(false);
    expect(isRepeat(last, 'you made a bridge', 1200)).toBe(false);
    expect(isRepeat(null, 'you made a tower', 1200)).toBe(false);
  });
  it("drops the coach's own line when the microphone picks it up", () => {
    const line = 'Praise one exact thing she just did.';
    expect(isEcho('praise one exact thing she just did', { text: line, endedAtMs: null }, 5000)).toBe(true);
    expect(isEcho('exact thing she just did', { text: line, endedAtMs: 4000 }, 5500)).toBe(true);
    expect(isEcho('praise one exact thing she just did', { text: line, endedAtMs: 1000 }, 9000)).toBe(false);
  });
  it('keeps the parent talking over the coach', () => {
    const line = 'Praise one exact thing she just did.';
    expect(isEcho('you are putting the roof on the house', { text: line, endedAtMs: null }, 5000)).toBe(false);
    expect(isEcho('nice tower', { text: line, endedAtMs: null }, 5000)).toBe(false);
  });
  it("keeps a parent's sentence that only shares words with the coach's line", () => {
    const line = 'Nice description. You named exactly what she did.';
    expect(isEcho('you did it', { text: line, endedAtMs: null }, 5000)).toBe(false);
    expect(isEcho('she did what you named', { text: line, endedAtMs: null }, 5000)).toBe(false);
    expect(isEcho('you named exactly what she did', { text: line, endedAtMs: null }, 5000)).toBe(true);
  });
  it("keeps the coach's quoted example when the parent says it back", () => {
    // The real line the coach gives after a vague "Good job!".
    const prompt = coachPrompt({
      nowSec: 20,
      lastPromptSec: null,
      lastSpecificPraiseSec: null,
      childSpokeSec: null,
      reflectedSinceChildSpoke: false,
      justCoded: { text: 'Good job!', code: 'general_praise', bucket: 'neutral', confidence: 1, rule: 'test' },
    });
    const line = prompt?.text ?? '';
    expect(line).toContain('“Good job stacking so gently.”');
    const example = 'good job stacking so gently';
    // While the coach is speaking, and in the moment after, these words are its own.
    expect(isEcho(example, { text: line, endedAtMs: null }, 1000)).toBe(true);
    expect(isEcho(example, { text: line, endedAtMs: 1000 }, 1500)).toBe(true);
    // A parent needs longer than that to say it: two seconds on, it is theirs and it counts.
    expect(isEcho(example, { text: line, endedAtMs: 1000 }, 3000)).toBe(false);
    expect(acceptTranscript('Good job stacking so gently', 3000, null, { text: line, endedAtMs: 1000 })).toBe('Good job stacking so gently');
    // The rest of the line is never the parent's, quoted example included.
    expect(isEcho('add exactly what she did', { text: line, endedAtMs: 1000 }, 3000)).toBe(true);
    expect(isEcho('warm now add exactly what she did good job stacking so gently', { text: line, endedAtMs: 1000 }, 3000)).toBe(true);
  });
  it('passes on a clean sentence and nothing else', () => {
    expect(acceptTranscript(' um you made a tower ', 1000, null, null)).toBe('you made a tower');
    expect(acceptTranscript('   ', 1000, null, null)).toBeNull();
    expect(acceptTranscript('123', 1000, null, null)).toBeNull();
    expect(acceptTranscript('you made a tower', 1200, { text: 'you made a tower', atMs: 1000 }, null)).toBeNull();
    expect(acceptTranscript('say back what she just said', 1200, null, { text: 'Say back what she just said.', endedAtMs: null })).toBeNull();
  });
});
