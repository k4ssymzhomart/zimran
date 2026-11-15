/**
 * Every finished round, kept on this device with its sentences so it can be read back later.
 * Guest-only: localStorage, with a copy in memory so the page still works when storage is blocked.
 */
import type { Code, Counts, InputMode, PartnerId, SavedSentence, SavedSession, SessionDraft, SessionKind, Targets } from '@/lib/types';
// Relative, not '@/': vitest runs these stores without the Next path alias.
import { addDays, parseProgress } from '../lib/progress/history';
import { paceTargets } from '../lib/progress/targets';

export const SESSIONS_KEY = 'playreps.sessions.v2';
const V1_KEY = 'playreps.progress.v1';

// ---------- strict reading ----------

const KINDS: readonly SessionKind[] = ['first_before', 'first_after', 'daily', 'practice', 'live'];
const INPUTS: readonly InputMode[] = ['typed', 'spoken', 'mixed'];
const PARTNERS: readonly (PartnerId | null)[] = ['mia', 'leo', null];
const CODES: readonly Code[] = [
  'specific_praise', 'reflection', 'description', 'general_praise', 'neutral', 'question', 'command', 'criticism', 'unknown',
];
const COUNT_KEYS: readonly (keyof Counts)[] = [
  'specific_praise', 'reflection', 'description', 'general_praise', 'neutral', 'question', 'command', 'criticism', 'target', 'avoid',
];
const TARGET_KEYS: readonly (keyof Targets)[] = ['specific_praise', 'reflection', 'description', 'maxAvoid'];

type Json = Record<string, unknown>;
const isObject = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x);
const isCount = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const isText = (x: unknown): x is string => typeof x === 'string' && x !== '';
/** A real calendar day: 2026-02-31 has the right shape and is refused. */
const isDay = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && addDays(x, 0) === x;
function oneOf<T>(list: readonly T[], x: unknown): x is T {
  return list.includes(x as T);
}
const allCounts = (x: unknown, keys: readonly string[]): boolean => isObject(x) && keys.every((k) => isCount(x[k]));

function readSentence(x: unknown): SavedSentence | null {
  if (!isObject(x) || typeof x.text !== 'string' || !oneOf(CODES, x.code) || !isCount(x.startSec) || !isCount(x.atSec)) return null;
  return {
    text: x.text,
    code: x.code,
    startSec: x.startSec,
    atSec: x.atSec,
    ...(typeof x.rule === 'string' ? { rule: x.rule } : {}),
    ...(x.disputed === true ? { disputed: true } : {}),
  };
}

function readSession(x: unknown): SavedSession | null {
  if (
    !isObject(x) || !isText(x.id) || !oneOf(KINDS, x.kind) || !oneOf(INPUTS, x.input) || !oneOf(PARTNERS, x.partner) ||
    typeof x.startedAt !== 'string' || Number.isNaN(Date.parse(x.startedAt)) || !isDay(x.date) ||
    !isCount(x.durationSec) || typeof x.sceneId !== 'string' || typeof x.met !== 'boolean' ||
    !allCounts(x.counts, COUNT_KEYS) || !allCounts(x.targets, TARGET_KEYS)
  ) {
    return null;
  }
  const sentences = Array.isArray(x.sentences) ? x.sentences.map(readSentence).filter((s): s is SavedSentence => s !== null) : [];
  return {
    id: x.id,
    kind: x.kind,
    startedAt: x.startedAt,
    date: x.date,
    durationSec: x.durationSec,
    sceneId: x.sceneId,
    partner: x.partner,
    counts: { ...(x.counts as Counts) },
    targets: { ...(x.targets as Targets) },
    met: x.met,
    input: x.input,
    sentences,
    ...(isText(x.audioId) ? { audioId: x.audioId } : {}),
  };
}

/**
 * Reads what was saved. A sentence or a session that does not look right is dropped on its own;
 * the rest is kept, and nothing here throws.
 */
export function parseSessions(json: unknown): SavedSession[] {
  let data = json;
  if (typeof json === 'string') {
    try {
      data = JSON.parse(json);
    } catch {
      return [];
    }
  }
  if (!isObject(data) || data.v !== 2 || !Array.isArray(data.sessions)) return [];
  const byId = new Map<string, SavedSession>();
  for (const s of data.sessions.map(readSession)) if (s && !byId.has(s.id)) byId.set(s.id, s);
  return [...byId.values()];
}

/**
 * The old format kept counts only: no sentences, no partner, no scene for practice rounds. Each old session
 * becomes a session with no sentences; midday stands in for the start time, which was never saved.
 */
export function migrateV1(json: unknown): SavedSession[] {
  return parseProgress(json).sessions.map((old, i) => {
    const live = old.mode === 'live';
    const pace = paceTargets(old.seconds);
    return {
      id: `v1-${i + 1}`,
      kind: live ? 'live' : 'daily',
      startedAt: `${old.date}T12:00:00`,
      date: old.date,
      durationSec: old.seconds,
      sceneId: live ? 'blocks' : '', // live play always ran on the blocks scene; practice did not keep its scene
      partner: null,
      counts: { ...old.counts },
      targets: live ? { ...pace, reflection: 0 } : pace, // live play does not measure reflections
      met: old.met,
      input: live ? 'spoken' : 'typed',
      sentences: [],
    };
  });
}

// ---------- the store ----------

/** The list in memory. It is the snapshot React reads, so it is replaced on a change and never edited. */
let cache: SavedSession[] | null = null;
const listeners = new Set<() => void>();

function persist(sessions: SavedSession[]): void {
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify({ v: 2, sessions }));
  } catch {
    /* storage unavailable: the sessions last for this page only */
  }
}

function load(): SavedSession[] {
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (raw !== null) return parseSessions(raw);
    // First run of this version: bring the old sessions over once. The old key stays, old screens still read it.
    const old = window.localStorage.getItem(V1_KEY);
    if (old === null) return [];
    const migrated = migrateV1(old);
    persist(migrated);
    return migrated;
  } catch {
    return []; // private mode, blocked storage, or no browser at all
  }
}

function commit(next: SavedSession[]): void {
  cache = next;
  persist(next);
  listeners.forEach((listener) => listener());
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; // older browsers, plain http
  }
}

/** Another tab changed the sessions: read them again. */
function onStorage(e: StorageEvent): void {
  if (e.key !== null && e.key !== SESSIONS_KEY) return;
  cache = null;
  listeners.forEach((listener) => listener());
}

/** Oldest first. The same array comes back until something changes, so it is safe as a React snapshot. */
function all(): SavedSession[] {
  return (cache ??= load());
}

export const sessionStore = {
  /** Saves a finished round and returns its new id. */
  add(draft: SessionDraft): string {
    const id = newId();
    commit([...all(), { ...draft, id }]);
    return id;
  },
  all,
  get(id: string): SavedSession | null {
    return all().find((s) => s.id === id) ?? null;
  },
  remove(id: string): void {
    commit(all().filter((s) => s.id !== id));
  },
  /** Writes an empty list instead of removing the key, so the old sessions are not brought over again. */
  clear(): void {
    commit([]);
  },
  /** Fires after every change, in this tab or in another one. Returns the unsubscribe. */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    if (listeners.size === 1 && typeof window !== 'undefined') window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
    };
  },
};
