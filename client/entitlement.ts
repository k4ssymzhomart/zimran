/** Client-side helpers for the paywall. Guest-only: the entitlement lives in localStorage. */

const KEY = 'playreps.entitlement.v1';

export type PlanId = 'four_weeks' | 'twelve_weeks';

export interface Entitlement {
  paid: boolean;
  plan: PlanId | null;
  /** True when unlocked through the labelled demo link instead of the test checkout. */
  demo: boolean;
  /** ISO date-time on this device when access started; null without access, or for an unlock saved before this field existed. */
  startedAt: string | null;
}

const NONE: Entitlement = { paid: false, plan: null, demo: false, startedAt: null };

/** No access. One constant, so a hook can hand it out on the server and before anything is saved. */
export const NO_ENTITLEMENT: Entitlement = NONE;

const listeners = new Set<() => void>();
const changed = (): void => listeners.forEach((listener) => listener());

export function readEntitlement(): Entitlement {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...NONE, ...(JSON.parse(raw) as Partial<Entitlement>) } : NONE;
  } catch {
    return NONE; // private mode or blocked storage: behave as not paid
  }
}

function write(e: Entitlement): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(e));
  } catch {
    /* storage unavailable: the unlock lasts for this page only */
  }
  changed();
}

/** Access starts once: confirming the same unlock again (a reload of the success page) keeps the first date. */
function startOf(plan: PlanId | null, demo: boolean): string {
  const saved = readEntitlement();
  const same = saved.paid && saved.plan === plan && saved.demo === demo;
  return same && saved.startedAt ? saved.startedAt : new Date().toISOString();
}

/** Sends the visitor to Stripe's hosted test checkout. Returns an error message, or null on redirect. */
export async function startCheckout(plan: PlanId): Promise<string | null> {
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) return data.error ?? 'Checkout is unavailable right now.';
    window.location.assign(data.url);
    return null;
  } catch {
    return 'Checkout is unavailable right now.';
  }
}

/** Call on the success page with the session id from the URL. */
export async function confirmCheckout(sessionId: string): Promise<Entitlement> {
  try {
    const res = await fetch(`/api/entitlement?session_id=${encodeURIComponent(sessionId)}`);
    const data = (await res.json()) as { paid?: boolean; plan?: PlanId | null };
    const paid = data.paid === true;
    const plan = data.plan ?? null;
    const e: Entitlement = { paid, plan, demo: false, startedAt: paid ? startOf(plan, false) : null };
    if (e.paid) write(e);
    return e;
  } catch {
    return NONE;
  }
}

/** Fallback for the jury if Stripe is unreachable. The UI must label it as a demo unlock. */
export function demoUnlock(): Entitlement {
  const e: Entitlement = { paid: true, plan: 'four_weeks', demo: true, startedAt: startOf('four_weeks', true) };
  write(e);
  return e;
}

/** Ends access on this device: the test membership or the demo unlock. */
export function clearEntitlement(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: nothing was saved */
  }
  changed();
}

// ---------- for hooks ----------

let snapshotRaw: string | null | undefined;
let snapshot: Entitlement = NONE;

/** The saved entitlement as a stable object: the same reference until what is saved changes. */
export function entitlementSnapshot(): Entitlement {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshot = readEntitlement();
  }
  return snapshot;
}

/** Calls back when access changes here or in another tab. */
export function subscribeEntitlement(listener: () => void): () => void {
  const onStorage = (event: StorageEvent): void => {
    if (event.key === null || event.key === KEY) listener();
  };
  listeners.add(listener);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

// ---------- term and locks ----------

const TERM_WEEKS: Record<PlanId, number> = { four_weeks: 4, twelve_weeks: 12 };

/** Length of a plan's term in weeks; 0 without a plan. */
export function termWeeks(plan: PlanId | null): number {
  return plan ? TERM_WEEKS[plan] : 0;
}

/**
 * The local day (YYYY-MM-DD) a paid term renews: its start plus its length.
 * Null without a paid plan or a start date, and for the demo unlock, which has no payment to renew.
 */
export function renewsOn(entitlement: Entitlement): string | null {
  const { paid, demo, plan, startedAt } = entitlement;
  if (!paid || demo || !plan || !startedAt) return null;
  const day = new Date(startedAt);
  if (Number.isNaN(day.getTime())) return null;
  day.setDate(day.getDate() + termWeeks(plan) * 7);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

/**
 * The places a screen can ask about. Free for everyone: the first visit, one-minute practice rounds, the lessons,
 * and reading back your own sessions and progress. Access buys the daily five-minute session and live mode.
 */
export type PaidFeature = 'daily' | 'practice' | 'live' | 'review' | 'progress';

const PAID_FEATURES: readonly PaidFeature[] = ['daily', 'live'];

export function isLocked(feature: PaidFeature, entitlement: Entitlement): boolean {
  return PAID_FEATURES.includes(feature) && !entitlement.paid;
}
