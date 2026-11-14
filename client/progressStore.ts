/** Guest-only storage: the parent's progress lives in localStorage on this device. */
import { emptyProgress, parseProgress, type Progress } from '@/lib/progress/history';
import type { RoundResult } from '@/lib/types';

const KEY = 'playreps.progress.v1';
const ROUNDS_KEY = 'playreps.firstRounds.v1';

/** Today's local date as YYYY-MM-DD. Call it in handlers and effects only, never during render. */
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function loadProgress(): Progress {
  try {
    return parseProgress(window.localStorage.getItem(KEY));
  } catch {
    return emptyProgress(); // private mode or blocked storage
  }
}

export function saveProgress(p: Progress): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: progress lasts for this page only */
  }
}

/** The two rounds of the first visit, kept so the dashboard can show the before and after. */
export function saveFirstRounds(before: RoundResult, after: RoundResult): void {
  try {
    window.localStorage.setItem(ROUNDS_KEY, JSON.stringify({ before, after }));
  } catch {
    /* ignore */
  }
}

export function loadFirstRounds(): { before: RoundResult; after: RoundResult } | null {
  try {
    const raw = window.localStorage.getItem(ROUNDS_KEY);
    return raw ? (JSON.parse(raw) as { before: RoundResult; after: RoundResult }) : null;
  } catch {
    return null;
  }
}
