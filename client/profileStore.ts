/**
 * What the parent told us in the quiz, kept on this device only.
 * Guest-only: localStorage, with a copy in memory so the page still works when storage is blocked.
 */
import type { PartnerId, Profile } from '@/lib/types';

export const PROFILE_KEY = 'playreps.profile.v1';
/** The old screens keep the chosen child here as a bare 'mia' or 'leo' (components/child.tsx). */
const CHILD_KEY = 'playreps.child.v1';

/** Before the quiz: Mia, the blocks scene, nothing else known. Also what the server renders. */
export const DEFAULT_PROFILE: Profile = Object.freeze({
  childName: null,
  childAge: null,
  moments: [],
  guess: null,
  partner: 'mia',
  sceneId: 'blocks',
  anchor: null,
  recordAudio: false,
  aiSummary: false,
  createdAt: null,
});

const isPartner = (x: unknown): x is PartnerId => x === 'mia' || x === 'leo';
const textOrNull = (x: unknown): string | null => (typeof x === 'string' && x.trim() !== '' ? x : null);

/** Reads a saved profile field by field: a field that does not look right falls back to `base`, and nothing throws. */
export function parseProfile(json: unknown, base: Profile = DEFAULT_PROFILE): Profile {
  let data = json;
  if (typeof json === 'string') {
    try {
      data = JSON.parse(json);
    } catch {
      return base;
    }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return base;
  const x = data as Record<string, unknown>;
  /** A field that is absent keeps the value from `base`; one that is present is checked. */
  const has = (key: keyof Profile): boolean => x[key] !== undefined;
  const age = x.childAge;
  const guess = x.guess;
  return {
    childName: has('childName') ? textOrNull(x.childName) : base.childName,
    childAge: has('childAge') ? (typeof age === 'number' && Number.isInteger(age) && age >= 2 && age <= 7 ? age : null) : base.childAge,
    moments: Array.isArray(x.moments) ? x.moments.filter((m): m is string => typeof m === 'string' && m !== '') : base.moments,
    guess: has('guess') ? (typeof guess === 'number' && Number.isFinite(guess) && guess >= 0 ? guess : null) : base.guess,
    partner: isPartner(x.partner) ? x.partner : base.partner,
    sceneId: textOrNull(x.sceneId) ?? base.sceneId,
    anchor: has('anchor') ? textOrNull(x.anchor) : base.anchor,
    recordAudio: typeof x.recordAudio === 'boolean' ? x.recordAudio : base.recordAudio,
    aiSummary: typeof x.aiSummary === 'boolean' ? x.aiSummary : base.aiSummary,
    createdAt: has('createdAt') ? textOrNull(x.createdAt) : base.createdAt,
  };
}

/** The profile in memory. It is the snapshot React reads, so it is replaced on a change and never edited. */
let cache: Profile | null = null;
const listeners = new Set<() => void>();

function load(): Profile {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw !== null) return parseProfile(raw);
    // No profile yet: a parent who chose Leo on the old screens keeps Leo.
    const child = window.localStorage.getItem(CHILD_KEY);
    return isPartner(child) ? { ...DEFAULT_PROFILE, partner: child } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE; // private mode, blocked storage, or no browser at all
  }
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

/** Another tab changed the profile: read it again. */
function onStorage(e: StorageEvent): void {
  if (e.key !== null && e.key !== PROFILE_KEY) return;
  cache = null;
  emit();
}

/** The same object comes back until something changes, so it is safe as a React snapshot. */
function get(): Profile {
  return (cache ??= load());
}

export const profileStore = {
  get,
  /** Merges the patch. The first change stamps `createdAt`; a new partner is also written where the old screens look. */
  update(patch: Partial<Profile>): void {
    const next = parseProfile(patch, get());
    cache = { ...next, createdAt: next.createdAt ?? new Date().toISOString() };
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(cache));
      if (patch.partner !== undefined) window.localStorage.setItem(CHILD_KEY, cache.partner);
    } catch {
      /* storage unavailable: the profile lasts for this page only */
    }
    emit();
  },
  /** Forgets the quiz answers and the chosen child: back to the defaults. */
  reset(): void {
    cache = DEFAULT_PROFILE;
    try {
      window.localStorage.removeItem(PROFILE_KEY);
      window.localStorage.removeItem(CHILD_KEY);
    } catch {
      /* storage unavailable */
    }
    emit();
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
