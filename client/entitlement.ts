/** Client-side helpers for the paywall. Guest-only: the entitlement lives in localStorage. */

const KEY = 'playreps.entitlement.v1';

export type PlanId = 'four_weeks' | 'twelve_weeks';

export interface Entitlement {
  paid: boolean;
  plan: PlanId | null;
  /** True when unlocked through the labelled demo link instead of the test checkout. */
  demo: boolean;
}

const NONE: Entitlement = { paid: false, plan: null, demo: false };

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
    const e: Entitlement = { paid: data.paid === true, plan: data.plan ?? null, demo: false };
    if (e.paid) write(e);
    return e;
  } catch {
    return NONE;
  }
}

/** Fallback for the jury if Stripe is unreachable. The UI must label it as a demo unlock. */
export function demoUnlock(): Entitlement {
  const e: Entitlement = { paid: true, plan: 'four_weeks', demo: true };
  write(e);
  return e;
}
