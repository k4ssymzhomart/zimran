/**
 * Every route of the product in one place. No route string is written anywhere else.
 * The old dark screens keep their paths until they are rebuilt; the four tabs live under app/(app)/.
 */
export const ROUTES = {
  // The front door and the first visit.
  home: '/',
  start: '/start',
  /** The personalization questions that open the first visit. */
  quiz: '/start/quiz',
  /** The plan built from the first visit: when you play, your 28 days. */
  plan: '/plan',
  pricing: '/pricing',
  unlocked: '/unlocked',
  jury: '/jury',

  // Screens with a running clock.
  play: '/play',
  /** One daily five-minute session, saved to the parent's progress. */
  daily: '/daily',
  live: '/live',

  // The four tabs and the session review.
  today: '/today',
  practice: '/practice',
  progress: '/progress',
  profile: '/profile',
  session: (id: string): `/progress/${string}` => `/progress/${encodeURIComponent(id)}`,

  /** The old dark plan page. It keeps working until Today replaces it. */
  dashboard: '/dashboard',

  /** The kit gallery, the visual test bench. Development only: it answers 404 in production. */
  kit: '/kit',

  api: {
    checkout: '/api/checkout',
    entitlement: '/api/entitlement',
    /** The daily reminder as a calendar file (app/api/calendar/route.ts). */
    calendar: '/api/calendar',
  },

  /** The daily five minutes in the Split design (app/daily): the day, its three sentences, the round, the result. Needs access. */
  dailySession: '/daily',
  /** A free one-minute practice round in the Split design (app/round), for the Practice tab. */
  practiceRound: '/round',
  /** This month's days of play and the free day (Figma story 9). A pushed screen with its own way back. */
  streak: '/streak',
  /** The week in numbers, and the 28 days once they are played (Figma story 13). */
  week: '/week',
} as const;

/** The four tab roots, in bar order. `art` names the icon pair in public/art: tab-{art}.png and tab-{art}-off.png. */
export const APP_TABS = [
  { id: 'today', label: 'Today', href: ROUTES.today, art: 'home' },
  { id: 'practice', label: 'Practice', href: ROUTES.practice, art: 'practice' },
  { id: 'progress', label: 'Progress', href: ROUTES.progress, art: 'progress' },
  { id: 'profile', label: 'Profile', href: ROUTES.profile, art: 'profile' },
] as const;

export type AppTab = (typeof APP_TABS)[number];

/**
 * The tab whose root this pathname is, or null anywhere else.
 * The tab bar and the rail show on the four roots only: a session review is a pushed screen with its own way back.
 */
export function tabAt(pathname: string): AppTab | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return APP_TABS.find((tab) => tab.href === path) ?? null;
}
