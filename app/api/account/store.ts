import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { copyOf, type SavedCopy } from '@/lib/account/account';

/**
 * The account store on the server: Upstash Redis through its REST API, with the KV_REST_API_URL and KV_REST_API_TOKEN
 * variables that the Vercel Marketplace integration adds. Passwords are hashed with scrypt and never stored or logged.
 * A sign-in is a random token in an httpOnly cookie; the server remembers the token's account for 30 days.
 */

export const COOKIE = 'fammy_session';
const SESSION_SECONDS = 30 * 24 * 60 * 60;
/** Sign-in attempts allowed per email in TRIES_SECONDS. */
const TRIES = 10;
const TRIES_SECONDS = 15 * 60;

const storeUrl = () => process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const storeToken = () => process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const inDevelopment = () => process.env.NODE_ENV === 'development';

/** A deployment without a store has no accounts, and the Profile screen shows none. `next dev` keeps them in memory. */
export function accountsAvailable(): boolean {
  return Boolean(storeUrl() && storeToken()) || inDevelopment();
}

type Reply = string | number | null;

async function redis(...command: (string | number)[]): Promise<Reply> {
  const url = storeUrl();
  const token = storeToken();
  if (!url || !token) return inMemory(command);
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => null)) as { result?: Reply; error?: string } | null;
  if (!res.ok || !data || data.error) throw new Error(`account store answered ${res.status}`);
  return data.result ?? null;
}

const local = globalThis as typeof globalThis & { fammyAccounts?: Map<string, string> };

/** `next dev` without a store: the five commands used here, in memory until the server restarts. Never in production. */
function inMemory([name, key, value, ...options]: (string | number)[]): Reply {
  if (!inDevelopment()) throw new Error('No account store is configured.');
  const map = (local.fammyAccounts ??= new Map<string, string>());
  const k = String(key);
  switch (name) {
    case 'GET':
      return map.get(k) ?? null;
    case 'SET':
      if (options.includes('NX') && map.has(k)) return null;
      map.set(k, String(value));
      return 'OK';
    case 'DEL':
      return map.delete(k) ? 1 : 0;
    case 'INCR': {
      const n = Number(map.get(k) ?? 0) + 1;
      map.set(k, String(n));
      return n;
    }
    case 'EXPIRE':
      return 1;
    default:
      throw new Error(`Unsupported command ${String(name)}.`);
  }
}

const KEY = {
  user: (email: string) => `fammy:user:${email}`,
  copy: (id: string) => `fammy:copy:${id}`,
  session: (token: string) => `fammy:session:${token}`,
  tries: (email: string) => `fammy:tries:${email}`,
};

interface User {
  id: string;
  email: string;
  salt: string;
  hash: string;
  createdAt: string;
}

/** The signed-in account, as a session knows it. */
export interface Account {
  id: string;
  email: string;
}

function hashOf(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))));
}

async function userOf(email: string): Promise<User | null> {
  const raw = await redis('GET', KEY.user(email));
  return typeof raw === 'string' ? (JSON.parse(raw) as User) : null;
}

/** A new account, or null when the email already has one. */
export async function createAccount(email: string, password: string): Promise<Account | null> {
  const salt = randomBytes(16);
  const user: User = {
    id: randomBytes(12).toString('hex'),
    email,
    salt: salt.toString('hex'),
    hash: (await hashOf(password, salt)).toString('hex'),
    createdAt: new Date().toISOString(),
  };
  const created = await redis('SET', KEY.user(email), JSON.stringify(user), 'NX');
  return created === 'OK' ? { id: user.id, email } : null;
}

/** The account when the password matches. The same work is done with or without one, so timing tells nothing. */
export async function checkPassword(email: string, password: string): Promise<Account | null> {
  const user = await userOf(email);
  const given = await hashOf(password, user ? Buffer.from(user.salt, 'hex') : randomBytes(16));
  if (!user) return null;
  const saved = Buffer.from(user.hash, 'hex');
  return saved.length === given.length && timingSafeEqual(saved, given) ? { id: user.id, email: user.email } : null;
}

/** Counts one attempt for this email; true past the limit. */
export async function tooManyTries(email: string): Promise<boolean> {
  const tries = Number(await redis('INCR', KEY.tries(email)));
  if (tries === 1) await redis('EXPIRE', KEY.tries(email), TRIES_SECONDS);
  return tries > TRIES;
}

export async function forgetTries(email: string): Promise<void> {
  await redis('DEL', KEY.tries(email));
}

/** A new sign-in for the account: the token for the cookie. */
export async function startSession(account: Account): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await redis('SET', KEY.session(token), JSON.stringify(account), 'EX', SESSION_SECONDS);
  return token;
}

/** Who is signed in on this browser, or null. An account deleted on another device signs its sessions out. */
export async function signedIn(req: NextRequest): Promise<Account | null> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token || !accountsAvailable()) return null;
  const raw = await redis('GET', KEY.session(token));
  if (typeof raw !== 'string') return null;
  const account = JSON.parse(raw) as Account;
  const user = await userOf(account.email);
  return user?.id === account.id ? account : null;
}

export async function endSession(req: NextRequest): Promise<void> {
  const token = req.cookies.get(COOKIE)?.value;
  if (token) await redis('DEL', KEY.session(token));
}

/** The account's copy of the progress; empty when it has none yet. */
export async function readCopy(id: string): Promise<SavedCopy> {
  const raw = await redis('GET', KEY.copy(id));
  return (typeof raw === 'string' && copyOf(JSON.parse(raw))) || {};
}

export async function saveCopy(id: string, copy: SavedCopy): Promise<void> {
  await redis('SET', KEY.copy(id), JSON.stringify(copy));
}

/** Deletes the account and its copy of the progress, and signs this browser out. */
export async function deleteAccount(account: Account, req: NextRequest): Promise<void> {
  await redis('DEL', KEY.user(account.email));
  await redis('DEL', KEY.copy(account.id));
  await endSession(req);
}

/** Sets the sign-in cookie on a response, or clears it for null. */
export function withSession(res: NextResponse, token: string | null): NextResponse {
  res.cookies.set(COOKIE, token ?? '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: token ? SESSION_SECONDS : 0,
  });
  return res;
}
