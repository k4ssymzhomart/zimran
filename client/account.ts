/**
 * The optional account in the browser: who is signed in, and keeping the account's copy of this device's progress
 * current. A guest makes one status call per page load and nothing else. Signed in, the device sends its saved
 * entries a few seconds after they change and takes in the account's copy once per page load, so the same sessions,
 * child and plan show on every device. Erasing the device signs out first, and the account keeps its copy.
 */
// Relative imports: the unit tests run this module without the "@/" alias.
import { SAVED_PREFIX, copyOf, type SavedCopy } from '../lib/account/account';
import { ROUTES } from '../lib/routes';
import { SESSIONS_KEY, parseSessions } from './sessionStore';

export type AccountState =
  | { status: 'checking' }
  /** This deployment has no account store. */
  | { status: 'off' }
  | { status: 'guest' }
  | { status: 'signed-in'; email: string };

const CHECKING: AccountState = { status: 'checking' };
const SYNC_MS = 4000;
const FAILED = 'Signing in did not work just now. Try again.';

let state: AccountState = CHECKING;
const listeners = new Set<() => void>();

function set(next: AccountState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

export const accountStore = {
  get: (): AccountState => state,
  /** On the server and before the first check: nothing is known yet. */
  server: (): AccountState => CHECKING,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Every entry the app saved in this browser. */
export function deviceCopy(): SavedCopy {
  const copy: SavedCopy = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(SAVED_PREFIX)) copy[key] = window.localStorage.getItem(key) ?? '';
    }
  } catch {
    /* storage unavailable */
  }
  return copy;
}

function applyCopy(copy: SavedCopy): void {
  try {
    for (const [key, value] of Object.entries(copy)) window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

/** The account's copy over this device's: the sessions of both, and the account's version of everything else. */
export function mergeCopies(device: SavedCopy, account: SavedCopy): SavedCopy {
  const merged: SavedCopy = { ...device, ...account };
  if (device[SESSIONS_KEY] !== undefined && account[SESSIONS_KEY] !== undefined) {
    const byId = new Map(parseSessions(device[SESSIONS_KEY]).map((s) => [s.id, s]));
    for (const s of parseSessions(account[SESSIONS_KEY])) byId.set(s.id, s);
    const sessions = [...byId.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    merged[SESSIONS_KEY] = JSON.stringify({ v: 2, sessions });
  }
  return merged;
}

/** Whether the merged copy holds anything this device does not: another entry, or a session it has not seen. */
export function bringsNew(device: SavedCopy, merged: SavedCopy): boolean {
  if (Object.entries(merged).some(([key, value]) => key !== SESSIONS_KEY && device[key] !== value)) return true;
  const seen = new Set(parseSessions(device[SESSIONS_KEY]).map((s) => s.id));
  return parseSessions(merged[SESSIONS_KEY]).some((s) => !seen.has(s.id));
}

let lastSent = '';
let timer: ReturnType<typeof setInterval> | null = null;

async function send(copy: SavedCopy, keepalive = false): Promise<void> {
  const body = JSON.stringify({ copy });
  if (Object.keys(copy).length === 0 || body === lastSent) return;
  lastSent = body;
  try {
    const res = await fetch(ROUTES.api.accountData, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: keepalive && body.length < 60_000,
    });
    if (!res.ok) lastSent = '';
  } catch {
    lastSent = ''; // tried again on the next tick
  }
}

const sendOnLeave = () => void send(deviceCopy(), true);

function startSync(): void {
  stopSync();
  timer = setInterval(() => void send(deviceCopy()), SYNC_MS);
  window.addEventListener('pagehide', sendOnLeave);
}

function stopSync(): void {
  if (timer) clearInterval(timer);
  timer = null;
  window.removeEventListener('pagehide', sendOnLeave);
}

let started = false;

/** Once per page load: asks who is signed in and, if someone is, brings this device up to date with the account. */
export async function startAccount(): Promise<void> {
  if (started) return;
  started = true;
  const status = (await fetch(ROUTES.api.account, { cache: 'no-store' })
    .then((res) => res.json())
    .catch(() => null)) as { available?: boolean; email?: string | null } | null;
  if (!status?.available) return set({ status: 'off' });
  if (!status.email) return set({ status: 'guest' });
  set({ status: 'signed-in', email: status.email });

  const answer = (await fetch(ROUTES.api.accountData, { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null)) as { copy?: unknown } | null;
  const account = copyOf(answer?.copy);
  if (account) {
    const device = deviceCopy();
    const merged = mergeCopies(device, account);
    await send(merged);
    if (bringsNew(device, merged)) {
      applyCopy(merged);
      window.location.reload(); // every screen reads the newer progress
      return;
    }
  }
  startSync();
}

/** Creates the account from this device's progress, or signs in and takes in the account's. Null, or what went wrong. */
export async function signInWith(mode: 'create' | 'sign-in', email: string, password: string): Promise<string | null> {
  const res = await fetch(ROUTES.api.accountSession, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode, email, password, copy: mode === 'create' ? deviceCopy() : undefined }),
  }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { email?: string; copy?: unknown; error?: string } | null;
  if (!res?.ok || !data?.email) return data?.error ?? FAILED;
  if (mode === 'sign-in') {
    const merged = mergeCopies(deviceCopy(), copyOf(data.copy) ?? {});
    await send(merged);
    applyCopy(merged);
    window.location.reload(); // every screen reads the account's progress
    return null;
  }
  lastSent = JSON.stringify({ copy: deviceCopy() }); // the account starts with exactly this
  set({ status: 'signed-in', email: data.email });
  startSync();
  return null;
}

/** Sends the last changes, then signs this browser out. The progress stays here and in the account. */
export async function signOut(): Promise<void> {
  stopSync();
  await send(deviceCopy());
  await fetch(ROUTES.api.accountSession, { method: 'DELETE' }).catch(() => null);
  lastSent = '';
  set({ status: 'guest' });
}

/** Deletes the account and its copy. Null, or what went wrong. This device keeps its own copy. */
export async function deleteAccount(): Promise<string | null> {
  stopSync();
  const res = await fetch(ROUTES.api.account, { method: 'DELETE' }).catch(() => null);
  if (!res?.ok) {
    startSync();
    return 'The account could not be deleted just now. Try again.';
  }
  lastSent = '';
  set({ status: 'guest' });
  return null;
}
