/**
 * Every statement of the jury guide (app/jury/page.tsx), kept next to the code that makes it true.
 *
 * Nothing here is a sample of anyone's data: these are statements about the product. The ones about the rules are
 * checked against the real engine in ./guide.test.ts, so a change to the rules that makes a line here untrue fails
 * `npm test`. The engine's own numbers (the clinic pace, the length of round one, the repeat window, the caps) are
 * read from lib/, not typed.
 *
 * Relative imports, not '@/': vitest runs this file without the Next path alias.
 */
import { FEATURES } from '../../lib/features';
import { ROUND1 } from '../../lib/flow/journey';
import { MAX_AVOID_5MIN, NORM_PER_SKILL } from '../../lib/progress/targets';
import { MAX_COUNTED_PER_TURN, MAX_DISPUTES, REPEAT_WINDOW_SEC } from '../../lib/round/session';
import { ROUTES } from '../../lib/routes';
import type { Code } from '../../lib/types';

/**
 * How the one action of the paywall works on this deployment, as app/pricing/page.tsx decides it: with a Stripe
 * key on the server it opens Stripe's hosted test checkout; without one no payment is taken on the site.
 * The guide says which, so it is true on both.
 */
export type Checkout = 'stripe' | 'demo';

// ---------- the three-minute path ----------

export interface Step {
  label: string;
  /** A route from lib/routes.ts. The guide also prints it, so the jury sees where each step lives. */
  href: string;
  /** What to do there. */
  detail: string;
}

const PRICING: Record<Checkout, string> = {
  demo: 'The plans and their price. No payment is taken: “Continue” gives demo access.',
  stripe:
    'The plans and their price. Stripe test checkout: card 4242 4242 4242 4242, any future date, any CVC. Or unlock without paying, labeled as a demo.',
};

const LIVE: Step = {
  label: 'Live, optional',
  href: ROUTES.live,
  detail: 'Beta, after the plans page gives access. Five minutes with your own child. Voice needs Chrome or Edge and a microphone.',
};

export function steps(checkout: Checkout): Step[] {
  return [
    {
      label: 'Landing',
      href: ROUTES.home,
      detail: 'Answer Mia in your own words. The rules read the sentence on the spot.',
    },
    {
      label: 'First visit',
      href: ROUTES.start,
      detail: `Pick Mia or Leo and answer. A ${ROUND1.seconds}-second round, a 30-second lesson, a second round on a new scene, then your own before and after. A few questions build your plan.`,
    },
    { label: 'Pricing', href: ROUTES.pricing, detail: PRICING[checkout] },
    { label: 'Today', href: ROUTES.today, detail: 'Your plan day, your week and your last session. Empty until you have played.' },
    {
      label: 'Progress',
      href: ROUTES.progress,
      detail: 'Every session you played. Open one to read your sentences as they were coded.',
    },
    // Live mode can be switched off for a build (lib/features.ts). A step that leads nowhere is not listed.
    ...(FEATURES.live ? [LIVE] : []),
  ];
}

// ---------- ways to try to break it ----------

export interface Trial {
  /** What to type or do. A sentence in curly quotes is typed as it stands. */
  title: string;
  /** What really happens today. */
  detail: string;
  /**
   * The sentences of the title, each with the code the rules give it right after the child's first line
   * ("I made a tower!"). ./guide.test.ts runs every pair through lib/coding/classify.ts.
   */
  typed?: ReadonlyArray<readonly [sentence: string, code: Code]>;
}

/** A sentence in another language, typed in Latin letters. The test checks that the rules leave it uncoded. */
export const LATIN_LETTERS = 'Qué torre tan bonita';

export const TRIALS: readonly Trial[] = [
  {
    title: '“What are you building?”',
    detail: 'A question. It goes to the swap count.',
    typed: [['What are you building?', 'question']],
  },
  {
    title: '“Put it here.”',
    detail: 'A command. Also to swap.',
    typed: [['Put it here.', 'command']],
  },
  {
    title: '“You made a tower!”',
    detail: 'A reflection, only right after the child says it. Later the same words are a description.',
    typed: [['You made a tower!', 'reflection']],
  },
  {
    title: '“Good job!” then “Good job stacking so gently.”',
    detail: 'General praise, then specific praise.',
    typed: [
      ['Good job!', 'general_praise'],
      ['Good job stacking so gently.', 'specific_praise'],
    ],
  },
  {
    title: '“Great job stacking, now give me the red one.”',
    detail: 'A command. An order anywhere in the sentence outweighs the praise.',
    typed: [['Great job stacking, now give me the red one.', 'command']],
  },
  {
    title: '“Какая красивая башня”',
    detail: 'Another script is not coded: no count moves. Another language in Latin letters is usually not coded either.',
    typed: [['Какая красивая башня', 'unknown']],
  },
  {
    title: '“You’re blahing the foo.”',
    detail: 'Neutral talk. A ring needs a real word.',
    typed: [['You’re blahing the foo.', 'neutral']],
  },
  {
    title: 'An empty answer',
    detail: 'Nothing is sent. Punctuation alone adds no sentence and moves no count.',
  },
  {
    title: 'One sentence, ten times',
    detail: `The first copy counts. Said again within ${REPEAT_WINDOW_SEC} seconds it fills no ring, and one turn counts ${MAX_COUNTED_PER_TURN} skill sentences at most.`,
  },
  {
    // lib/coding/safety.ts.
    title: 'A sentence about hitting or hurting',
    detail: 'Not scored: it fills no ring, and the screen shows where to find support. A short word list, not an assessment.',
  },
  {
    // hooks/useFirstVisit.ts: a round lives in the page, and both rounds are stored when the before and after shows.
    title: 'Reload in the middle of a round',
    detail: 'The round is gone and the first visit starts over. Its two rounds are saved together, once your before and after shows.',
  },
  {
    title: 'End a round early',
    detail:
      'The counts stand, measured over the time played and never under half the planned length. Ended before half, a round cannot meet the pace.',
  },
  {
    title: 'Disagree?',
    detail: `Takes that sentence out of the count. A second tap puts it back. At most ${MAX_DISPUTES} sentences a round.`,
  },
];

// ---------- numbers ----------

/**
 * The number `npx vitest run` printed on 15 November 2026, with the tests of this folder in it.
 * It is a count of the repository, so it cannot be computed on the page: read it again before a release.
 */
export const UNIT_TESTS = 1977;

export interface Figure {
  value: string;
  caption: string;
}

/** A count in the thousands reads with its comma: "1,359". */
const grouped = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const NUMBERS: readonly Figure[] = [
  { value: grouped(UNIT_TESTS), caption: 'unit tests' },
  {
    // README.md, "Numbers we stand behind": lib/coding/blindset.ts on its first run, before any rule was changed.
    value: '72 of 80',
    caption:
      'casual turns coded as expected on the first run of a blind set of typed sentences. Not validated against certified coders or on real speech.',
  },
  {
    value: `${NORM_PER_SKILL}, ${NORM_PER_SKILL}, ${NORM_PER_SKILL}`,
    caption: `praises, reflections and descriptions in five minutes, with at most ${MAX_AVOID_5MIN} to swap`,
  },
];

// ---------- what is real, what is simulated, what is not built ----------

export interface Fact {
  title: string;
  detail: string;
}

export const REAL_LINE = 'Rules code every sentence. No language model scores you. Mia and Leo are simulated and always labeled.';

export const REAL: readonly Fact[] = [
  { title: 'The rules', detail: 'Plain TypeScript in lib/, in the public repository. Coding makes no network call.' },
  { title: 'The counts', detail: 'Every sentence gets one code and is set against the clinic numbers. Shorter rounds keep the same pace.' },
  { title: 'Your before and after', detail: 'Computed per minute from the sentences of your own two rounds.' },
  { title: 'Your sessions', detail: 'Saved in this browser, on this device, with every sentence.' },
];

export const SIMULATED: readonly Fact[] = [
  {
    title: 'Mia and Leo',
    detail:
      'Two simulated four-year-olds on one engine. Their reactions follow what the method teaches parents; they are not a validated model of children.',
  },
];

const PAYMENTS: Record<Checkout, string> = {
  demo: 'No card is asked for and nothing is charged.',
  stripe: 'The checkout is Stripe in test mode. No real card is charged.',
};

export function notBuilt(checkout: Checkout): Fact[] {
  return [
    { title: 'Accounts', detail: 'No login and no server database. Clearing this site’s data erases your sessions.' },
    { title: 'Real payments', detail: PAYMENTS[checkout] },
    { title: 'Results with real families', detail: 'Not measured. PlayReps has no real users yet.' },
    { title: 'Accuracy on real speech', detail: 'Not measured. The 72 of 80 is typed text, and no certified coder has checked it.' },
    {
      title: 'Speech to text of our own',
      detail: 'When you speak, your browser turns speech into text. In Chrome that is Google’s speech service.',
    },
  ];
}

// ---------- the lines at the foot ----------

/** The sentence ends with the link to pcit.org, which the page adds. */
export const NOT_THERAPY = 'Skill practice. Not therapy and not a diagnosis. For a certified therapist, see';
export const THERAPIST_LINK = { label: 'pcit.org', href: 'https://www.pcit.org' } as const;
export const NOT_AFFILIATED = 'Not affiliated with or endorsed by PCIT International.';
