import { describe, expect, it } from 'vitest';
import { codeTurn } from '../../lib/coding/classify';
import { initialJourney, journeyReducer, ROUND1 } from '../../lib/flow/journey';
import { MAX_AVOID_5MIN, NORM_PER_SKILL, NORM_SECONDS } from '../../lib/progress/targets';
import { initialRound, measuredSeconds, ringProgress, roundReducer, type RoundEvent, type RoundState } from '../../lib/round/session';
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
const codes = (text: string, childLastSaid: string | null = HER_LINE) => codeTurn(text, { childLastSaid }).map((s) => s.code);
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
    const typed = TRIALS.flatMap((trial) => trial.typed ?? []);
    expect(typed.length).toBeGreaterThan(0);
    for (const [sentence, code] of typed) expect(codes(sentence), sentence).toEqual([code]);
  });

  it('reads her words back as a reflection only while her line stands', () => {
    expect(HER_LINE).toBe('I made a tower!');
    expect(codes('You made a tower!', null)).toEqual(['description']);
    // Twenty quiet seconds into the round she has said something else: the same words describe, they do not reflect.
    const quiet = Array.from({ length: 20 }, (): RoundEvent => ({ type: 'tick', dtSec: 1 }));
    expect(round([...quiet, say('You made a tower!')]).sentences.map((s) => s.code)).toEqual(['description']);
  });

  it('moves nothing for a sentence in another script', () => {
    const before = round();
    const after = roundReducer(before, say('Какая красивая башня'));
    expect(after.sentences.map((s) => s.code)).toEqual(['unknown']);
    expect(ringProgress(after)).toEqual(ringProgress(before));
    expect(after.child).toEqual(before.child);
  });

  it('reads another language in Latin letters by the English rules', () => {
    expect(codes(LATIN_LETTERS)).toEqual(['neutral']);
    expect(codes('¿Qué es eso?')).toEqual(['question']);
  });

  it('ignores an empty answer and punctuation alone', () => {
    const before = round();
    for (const text of ['', '   ', '!!!', '...']) expect(roundReducer(before, say(text))).toBe(before);
    const visit = initialJourney();
    expect(journeyReducer(visit, { type: 'answer_opener', text: '   ' })).toBe(visit);
  });

  it('counts every copy of a repeated sentence, and one skill alone does not meet the pace', () => {
    const repeated = round(Array.from({ length: 10 }, () => say(PRAISE)));
    expect(ringProgress(repeated).specific_praise.count).toBe(10);
    expect(roundReducer(repeated, { type: 'end' }).result?.met).toBe(false);
  });

  it('measures a round ended early over the time played, and over half its length at least', () => {
    const early = roundReducer(round([say(PRAISE)]), { type: 'tick', dtSec: 5 });
    expect(measuredSeconds(early)).toBe(ROUND1.seconds / 2);
    expect(measuredSeconds(roundReducer(early, { type: 'tick', dtSec: 40 }))).toBe(45);
    // The counts stand.
    expect(roundReducer(early, { type: 'end' }).result?.counts.specific_praise).toBe(1);
  });

  it('takes a disputed sentence out of the count, and a second tap puts it back', () => {
    const asked = round([say('What are you building?')]);
    expect(ringProgress(asked).avoid.count).toBe(1);
    const disputed = roundReducer(asked, { type: 'dispute', index: 0 });
    expect(ringProgress(disputed).avoid.count).toBe(0);
    expect(ringProgress(roundReducer(disputed, { type: 'dispute', index: 0 })).avoid.count).toBe(1);
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
