/**
 * The optional account, the pure part shared by the server and the browser: what an email and a password must look
 * like, and the copy of a device's progress that an account keeps. The copy is the device's own saved entries, every
 * key that starts with "playreps.", so a signed-in parent finds the same sessions, child and plan on another device.
 * The app works the same without an account: the jury's walk never needs one.
 */

/** The prefix of every entry the app saves in the browser. The account keeps exactly these. */
export const SAVED_PREFIX = 'playreps.';

export const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200;
const MAX_EMAIL = 254;
const MAX_KEY = 64;
/** About 400 KB of text: hundreds of sessions with every sentence in them. */
export const MAX_COPY = 400_000;

/** A device's saved entries, key to raw string, as localStorage holds them. */
export type SavedCopy = Record<string, string>;

/** The email, trimmed and lowercased, or null when it does not look like one. */
export function emailOf(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const email = x.trim().toLowerCase();
  return email.length <= MAX_EMAIL && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** Null when the password can be used, otherwise the sentence that says why not. */
export function passwordProblem(x: unknown): string | null {
  if (typeof x !== 'string' || x.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for the password.`;
  if (x.length > MAX_PASSWORD) return `Use at most ${MAX_PASSWORD} characters for the password.`;
  return null;
}

/** A posted copy, checked: only the app's own keys, only strings, and not too big. Null when it is not one. */
export function copyOf(x: unknown): SavedCopy | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const copy: SavedCopy = {};
  let size = 0;
  for (const [key, value] of Object.entries(x)) {
    if (!key.startsWith(SAVED_PREFIX) || key.length > MAX_KEY || typeof value !== 'string') return null;
    size += key.length + value.length;
    copy[key] = value;
  }
  return size <= MAX_COPY ? copy : null;
}
