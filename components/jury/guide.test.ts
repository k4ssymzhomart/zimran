import { describe, expect, it } from 'vitest';
import { codeTurn } from '../../lib/coding/classify';
import { initialJourney, journeyReducer, ROUND1 } from '../../lib/flow/journey';
import { MAX_AVOID_5MIN, NORM_PER_SKILL, NORM_SECONDS } from '../../lib/progress/targets';
import {
  initialRound,
  MAX_COUNTED_PER_TURN,
  MAX_DISPUTES,
  measuredSeconds,
  REPEAT_WINDOW_SEC,
  ringProgress,
  roundReducer,
  type RoundEvent,
  type RoundState,
} from '../../lib/round/session';
import { ROUTES } from '../../lib/routes';
import {
  LATIN_LETTERS,
  NOT_AFFILIATED,
  NOT_THERAPY,
  NUMBERS,
  REAL,
  REAL_LINE,
  SIMULATED,
  TRIALS,
  notBuilt,
  steps,
  type Checkout,
} from './guide';

/**
 * The jury guide says what the engine does with the inputs a juror may try. Each of those lines is run here
 * against the real engine, so the guide cannot go on saying something the rules no longer do.
 */

/** The paywall takes no payment, or opens Stripe's test checkout. The guide has words for both. */
const CHECKOUTS: readonly Checkout[] = ['demo', 'stripe'];

/** What the child says as the first visit opens. The guide's sentences are typed right after it. */
const HER_LINE = initialJourney().opener.childSaid;

/** Round one of the first visit, with these moves made in order. */
function round(events: RoundEvent[] = []): RoundState {
  const started = roundReducer(initialRound(), { type: 'start', sceneId: ROUND1.sceneId, seconds: ROUND1.seconds, seed: 1 });
  return events.reduce(roundReducer, started);
}

const say = (text: string): RoundEvent => ({ type: 'say', text });
const seconds = (n: number): RoundEvent[] => Array.from({ length: n }, (): RoundEvent => ({ type: 'tick', dtSec: 1 }));
const codes = (text: string, childLastSaid: string | null = HER_LINE) => codeTurn(text, { childLastSaid }).map((s) => s.code);
const trial = (title: string) => TRIALS.find((one) => one.title === title)?.detail ?? '';
const PRAISE = 'Good job stacking so gently.';

describe('the three-minute path', () => {
  it('leads only to routes of the product, each once, starting at the landing', () => {
    const routes: unknown[] = Object.values(ROUTES);
    for (const checkout of CHECKOUTS) {
      const path = steps(checkout);
      for (const step of path) expect(routes).toContain(step.href);
      expect(new Set(path.map((step) => step.href)).size).toBe(path.length);
      expect(path[0].href).toBe(ROUTES.home);
    }
  });

  it('names the length of round one as the engine plays it', () => {
    expect(steps('demo').find((step) => step.href === ROUTES.start)?.detail).toContain(`${ROUND1.seconds}-second round`);
  });

  it('describes the paywall this deployment has, and never promises a real charge', () => {
    const pricing = (checkout: Checkout) => steps(checkout).find((step) => step.href === ROUTES.pricing)?.detail ?? '';
    const payments = (checkout: Checkout) => notBuilt(checkout).find((fact) => fact.title === 'Real payments')?.detail ?? '';
    expect(pricing('demo')).toContain('No payment is taken');
    expect(payments('demo')).toContain('nothing is charged');
    // The test card is the one Stripe publishes for test mode.
    expect(pricing('stripe')).toContain('4242 4242 4242 4242');
    expect(pricing('stripe')).toContain('unlock without paying');
    expect(payments('stripe')).toContain('No real card is charged');
  });
});

describe('ways to try to break it', () => {
  it('codes every sentence of the guide as the guide says', () => {
    const typed = TRIALS.flatMap((one) => one.typed ?? []);
    expect(typed.length).toBeGreaterThan(0);
    for (const [sentence, code] of typed) expect(codes(sentence), sentence).toEqual([code]);
  });

  it('reads her words back as a reflection only while her line stands', () => {
    expect(HER_LINE).toBe('I made a tower!');
    expect(codes('You made a tower!', null)).toEqual(['description']);
    // Twenty quiet seconds into the round she has said something else: the same words describe, they do not reflect.
    expect(round([...seconds(20), say('You made a tower!')]).sentences.map((s) => s.code)).toEqual(['description']);
  });

  it('moves nothing for a sentence in another script, or in another language in Latin letters', () => {
    const before = round();
    for (const sentence of ['Какая красивая башня', LATIN_LETTERS]) {
      const after = roundReducer(before, say(sentence));
      expect(after.sentences.map((s) => s.code), sentence).toEqual(['unknown']);
      expect(ringProgress(after)).toEqual(ringProgress(before));
      expect(after.child).toEqual(before.child);
    }
  });

  it('fills no ring with made-up words', () => {
    const before = round();
    expect(ringProgress(roundReducer(before, say('You’re blahing the foo.')))).toEqual(ringProgress(before));
  });

  it('ignores an empty answer and punctuation alone', () => {
    const before = round();
    for (const text of ['', '   ', '!!!', '...']) expect(roundReducer(before, say(text))).toBe(before);
    const visit = initialJourney();
    expect(journeyReducer(visit, { type: 'answer_opener', text: '   ' })).toBe(visit);
  });

  it('counts a repeated sentence once inside the repeat window, and again after it', () => {
    expect(trial('One sentence, ten times')).toContain(`within ${REPEAT_WINDOW_SEC} seconds`);
    const tenCopies = round(Array.from({ length: 10 }, () => say(PRAISE)));
    expect(tenCopies.sentences).toHaveLength(10);
    expect(ringProgress(tenCopies).specific_praise.count).toBe(1);
    const later = round([say(PRAISE), ...seconds(REPEAT_WINDOW_SEC + 1), say(PRAISE)]);
    expect(ringProgress(later).specific_praise.count).toBe(2);
  });

  it('counts a pasted paragraph for a few sentences only', () => {
    expect(trial('One sentence, ten times')).toContain(`one turn counts ${MAX_COUNTED_PER_TURN} skill sentences at most`);
    const paste = [
      'Good job stacking the red block.',
      'Nice work lining up the cars.',
      'I love how you share the blocks.',
      'Great job building the tower.',
      'Thank you for waiting your turn.',
      'Nice job cleaning up the cars.',
    ].join(' ');
    const pasted = round([say(paste)]);
    expect(pasted.sentences).toHaveLength(6);
    expect(ringProgress(pasted).specific_praise.count).toBe(MAX_COUNTED_PER_TURN);
  });

  it('does not score a sentence about hitting, and shows where to find support', () => {
    const before = round();
    const after = roundReducer(before, say('I am going to spank you'));
    expect(after.sentences.map((s) => s.code)).toEqual(['unknown']);
    expect(ringProgress(after)).toEqual(ringProgress(before));
    expect(after.safety).toBe(true);
    expect(after.coach?.text).toContain('988');
    // The same on the first answer of the visit.
    const visit = journeyReducer(initialJourney(), { type: 'answer_opener', text: 'I am going to spank you' });
    expect(visit.opener.insight?.body).toContain('988');
  });

  it('measures a round ended early over the time played, and gives it no pace before half its length', () => {
    const played = [say(PRAISE), say('You made a tower!'), say('You are stacking the red block.')];
    const early = roundReducer(round(played), { type: 'tick', dtSec: 5 });
    expect(measuredSeconds(early)).toBe(ROUND1.seconds / 2);
    expect(measuredSeconds(roundReducer(early, { type: 'tick', dtSec: 40 }))).toBe(45);
    const ended = roundReducer(early, { type: 'end' }).result;
    // The counts stand.
    expect(ended?.counts.target).toBe(3);
    expect(ended?.met).toBe(false);
    expect(ended?.short).toBe(true);
  });

  it('takes a disputed sentence out of the count, puts it back on a second tap, and stops at the cap', () => {
    expect(trial('Disagree?')).toContain(`At most ${MAX_DISPUTES} sentences a round`);
    const asked = round([say('What are you building?')]);
    expect(ringProgress(asked).avoid.count).toBe(1);
    const disputed = roundReducer(asked, { type: 'dispute', index: 0 });
    expect(ringProgress(disputed).avoid.count).toBe(0);
    expect(ringProgress(roundReducer(disputed, { type: 'dispute', index: 0 })).avoid.count).toBe(1);

    const questions = ['What is that?', 'Where does it go?', 'Why is it red?', 'Who is driving?', 'How tall is it?'];
    const all = questions.map((_, index): RoundEvent => ({ type: 'dispute', index }));
    const capped = round([...questions.map(say), ...all]);
    expect(ringProgress(capped).avoid.count).toBe(questions.length - MAX_DISPUTES);
  });
});

describe('the numbers and the lines', () => {
  it('prints the clinic numbers the engine counts against', () => {
    expect(NORM_SECONDS).toBe(5 * 60);
    const pace = NUMBERS.find((figure) => figure.caption.includes('in five minutes'));
    expect(pace?.value).toBe(`${NORM_PER_SKILL}, ${NORM_PER_SKILL}, ${NORM_PER_SKILL}`);
    expect(pace?.caption).toContain(`at most ${MAX_AVOID_5MIN} to swap`);
  });

  it('carries the lines the product must carry', () => {
    expect(REAL_LINE).toBe('Rules code every sentence. No language model scores you. Mia and Leo are simulated and always labeled.');
    expect(`${NOT_THERAPY} pcit.org.`).toBe('Skill practice. Not therapy and not a diagnosis. For a certified therapist, see pcit.org.');
    expect(NOT_AFFILIATED).toBe('Not affiliated with or endorsed by PCIT International.');
  });

  it('never uses the words the product avoids, and shows no demo family', () => {
    const words = [
      ...CHECKOUTS.flatMap((checkout) => steps(checkout).flatMap((step) => [step.label, step.detail])),
      ...[...TRIALS, ...REAL, ...SIMULATED, ...CHECKOUTS.flatMap(notBuilt)].flatMap((item) => [item.title, item.detail]),
      ...NUMBERS.map((figure) => figure.caption),
      REAL_LINE,
      NOT_THERAPY,
      NOT_AFFILIATED,
    ].join(' ');
    expect(words).not.toMatch(/\b(?:wrong|bad|mistake|should|don[’']t)\b/i);
    expect(words).not.toMatch(/demo family|sample/i);
  });
});
