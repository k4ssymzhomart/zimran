/**
 * The two lengths of the paid plan and the words the paywall builds from them.
 * Pure functions: no clock, no storage. The page hands in today's date and what the parent told the quiz.
 *
 * The imports are relative so that the tests load this file without a path alias.
 */
import { termWeeks, type PlanId } from '../../client/entitlement';
import { SCENES } from '../../lib/child/scenes';
import { addDays } from '../../lib/progress/history';

export interface Plan {
  id: PlanId;
  /** Length of one term. */
  weeks: number;
  /** What one term costs, in whole dollars. The same price on renewal. */
  dollars: number;
  /** A short label beside the name. */
  tag: string | null;
  /** What the term holds beyond the first four weeks. Written about Mia: pass it through forChild. */
  detail: string | null;
}

/**
 * The same prices as PLANS in app/api/checkout/route.ts, which is what the test checkout charges.
 * A detail covers the whole term: paid access keeps live mode open until the term ends.
 */
export const PLANS: readonly Plan[] = [
  { id: 'four_weeks', weeks: termWeeks('four_weeks'), dollars: 29, tag: null, detail: null },
  {
    id: 'twelve_weeks',
    weeks: termWeeks('twelve_weeks'),
    dollars: 69,
    tag: 'Best value',
    detail: 'Weeks 1–4 with Mia, weeks 5–12 live with your child',
  },
];

/** The plan the paywall opens on. */
export const DEFAULT_PLAN: PlanId = 'four_weeks';

export function isPlanId(value: unknown): value is PlanId {
  return PLANS.some((plan) => plan.id === value);
}

export function planOf(id: PlanId): Plan {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0];
}

/** "4 weeks" */
export const lengthOf = (plan: Plan): string => `${plan.weeks} weeks`;

/** "$29" */
export const priceOf = (plan: Plan): string => `$${plan.dollars}`;

/** "$1.04 a day": the price of a term over its days. */
export const perDayOf = (plan: Plan): string => `$${(plan.dollars / (plan.weeks * 7)).toFixed(2)} a day`;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "December 13, 2026" (American order) from YYYY-MM-DD. Read from the string itself, so no time zone can move the day. */
export function longDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/** The day a term that starts today renews, as YYYY-MM-DD: today plus its weeks. */
export function renewalDay(today: string, plan: Plan): string {
  return addDays(today, plan.weeks * 7);
}

/**
 * The terms under the plans: "$29 every 4 weeks. Renews December 13, 2026. Cancel anytime in Profile."
 * `today` is the device's own date (YYYY-MM-DD); while it is not known the line names no day.
 */
export function termsLine(plan: Plan, today: string | null): string {
  const every = `${priceOf(plan)} every ${lengthOf(plan)}.`;
  return today === null ? `${every} Cancel anytime in Profile.` : `${every} Renews ${longDate(renewalDay(today, plan))}. Cancel anytime in Profile.`;
}

/** What the child plays with in each scene, as the line below says it. A scene not listed here goes by its title. */
const PLAYS_WITH: Partial<Record<string, string>> = { blocks: 'blocks', drawing: 'crayons' };

/**
 * The parent's own answers over the headline: "Five minutes after dinner, with blocks."
 * Null without a daily moment: the line is only there when the parent chose one.
 */
export function momentLine(anchor: string | null, sceneId: string): string | null {
  const moment = (anchor ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/, '');
  if (moment === '') return null;
  // "After dinner" is saved as an answer; inside the sentence only its first letter gives way.
  const when = moment.charAt(0).toLowerCase() + moment.slice(1);
  const toy = PLAYS_WITH[sceneId] ?? SCENES.find((scene) => scene.id === sceneId)?.title.toLowerCase() ?? null;
  return toy === null ? `Five minutes ${when}.` : `Five minutes ${when}, with ${toy}.`;
}
