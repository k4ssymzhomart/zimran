import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Counts, SessionDraft } from '../lib/types';

// ---------- a browser small enough to read ----------

function fakeBrowser(blocked = false) {
  const data = new Map<string, string>();
  const handlers = new Set<(e: { key: string | null }) => void>();
  const localStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  const window = {
    get localStorage() {
      if (blocked) throw new Error('storage is blocked');
      return localStorage;
    },
    addEventListener: (_: string, h: (e: { key: string | null }) => void) => void handlers.add(h),
    removeEventListener: (_: string, h: (e: { key: string | null }) => void) => void handlers.delete(h),
  };
  /** What another tab does: change storage, then the event arrives here. */
  const otherTab = (key: string, value: string) => {
    data.set(key, value);
    handlers.forEach((h) => h({ key }));
  };
  return { window, data, handlers, otherTab };
}

const COUNTS: Counts = {
  specific_praise: 1, reflection: 0, description: 2, general_praise: 0, neutral: 1, question: 3, command: 0, criticism: 0, target: 3, avoid: 3,
};

const draft = (over: Partial<SessionDraft> = {}): SessionDraft => ({
  kind: 'daily',
  startedAt: '2026-11-13T18:00:00.000Z',
  date: '2026-11-13',
  durationSec: 300,
  sceneId: 'blocks',
  partner: 'mia',
  counts: COUNTS,
  targets: { specific_praise: 10, reflection: 10, description: 10, maxAvoid: 3 },
  met: false,
  input: 'typed',
  sentences: [{ text: 'What is that?', code: 'question', startSec: 3, atSec: 5, rule: 'question_mark' }],
  ...over,
});

const V1 = JSON.stringify({
  v: 1,
  startDate: '2026-11-09',
  anchor: 'after dinner',
  sessions: [
    { date: '2026-11-09', seconds: 60, counts: COUNTS, met: false, mode: 'practice' },
    { date: '2026-11-10', seconds: 300, counts: COUNTS, met: true, mode: 'live' },
  ],
  checkins: [],
});

/** Each test gets fresh modules, so no store remembers the test before it. */
const sessions = async () => import('./sessionStore');
const profiles = async () => import('./profileStore');
const entitlements = async () => import('./entitlement');

beforeEach(() => vi.resetModules());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ---------- sessions ----------

describe('parseSessions', () => {
  it('returns nothing for anything that is not a saved list, and never throws', async () => {
    const { parseSessions } = await sessions();
    for (const junk of [null, undefined, 7, '', '{', 'null', '[]', { v: 1, sessions: [] }, { v: 2 }, { v: 2, sessions: 'x' }]) {
      expect(parseSessions(junk)).toEqual([]);
    }
  });

  it('drops a malformed session and keeps the rest', async () => {
    const { parseSessions } = await sessions();
    const good = { ...draft(), id: 'a' };
    const saved = {
      v: 2,
      sessions: [
        good,
        null,
        { ...good, id: 'b', kind: 'weekly' },
        { ...good, id: 'c', date: '13 Nov' },
        { ...good, id: 'c2', date: '2026-02-31' },
        { ...good, id: 'd', counts: { ...COUNTS, question: -1 } },
        { ...good, id: 'e', targets: {} },
        { ...good, id: 'f', startedAt: 'yesterday' },
        { ...good, id: '', partner: 'mia' },
        { ...good, id: 'g', partner: 'max' },
        { ...good, id: 'a', durationSec: 999 }, // the same id twice: the first one stays
        { ...good, id: 'h', partner: null, kind: 'live' },
      ],
    };
    expect(parseSessions(JSON.stringify(saved)).map((s) => s.id)).toEqual(['a', 'h']);
    expect(parseSessions(saved)[0]).toEqual(good);
  });

  it('drops a malformed sentence and keeps the session', async () => {
    const { parseSessions } = await sessions();
    const sentences = [
      { text: 'You are stacking.', code: 'description', startSec: 1, atSec: 3, disputed: true },
      { text: 'No code.', startSec: 4, atSec: 5 },
      { text: 'Made-up code.', code: 'shout', startSec: 4, atSec: 5 },
      { text: 'Bad time.', code: 'neutral', startSec: 'soon', atSec: 5 },
      'not a sentence',
      { text: 'A tower.', code: 'reflection', startSec: 6, atSec: 7, rule: 7, disputed: 'yes', extra: true },
    ];
    const [s] = parseSessions({ v: 2, sessions: [{ ...draft(), id: 'a', sentences, audioId: 9 }] });
    expect(s.sentences).toEqual([
      { text: 'You are stacking.', code: 'description', startSec: 1, atSec: 3, disputed: true },
      { text: 'A tower.', code: 'reflection', startSec: 6, atSec: 7 },
    ]);
    expect('audioId' in s).toBe(false);
    expect(parseSessions({ v: 2, sessions: [{ ...draft(), id: 'a', sentences: 'none' }] })[0].sentences).toEqual([]);
  });
});

describe('sessionStore', () => {
  it('saves a round, gives it an id and reads it back after a reload', async () => {
    const browser = fakeBrowser();
    vi.stubGlobal('window', browser.window);
    const { sessionStore, SESSIONS_KEY } = await sessions();
    expect(sessionStore.all()).toEqual([]);

    const first = sessionStore.add(draft());
    const second = sessionStore.add(draft({ kind: 'live', partner: null, audioId: 'rec-1' }));
    expect(first).not.toBe(second);
    expect(sessionStore.get(first)).toEqual({ ...draft(), id: first });
    expect(sessionStore.get('nobody')).toBeNull();
    expect(JSON.parse(browser.data.get(SESSIONS_KEY)!)).toMatchObject({ v: 2, sessions: [{ id: first }, { id: second }] });

    vi.resetModules(); // a reload: a fresh store over the same storage
    const reloaded = (await sessions()).sessionStore;
    expect(reloaded.all().map((s) => s.id)).toEqual([first, second]);
    expect(reloaded.get(second)).toEqual({ ...draft({ kind: 'live', partner: null, audioId: 'rec-1' }), id: second });
  });

  it('removes one session, and clears them all', async () => {
    vi.stubGlobal('window', fakeBrowser().window);
    const { sessionStore } = await sessions();
    const a = sessionStore.add(draft());
    const b = sessionStore.add(draft());
    sessionStore.remove(a);
    expect(sessionStore.all().map((s) => s.id)).toEqual([b]);
    sessionStore.clear();
    expect(sessionStore.all()).toEqual([]);
  });

  it('hands React the same list until something changes', async () => {
    vi.stubGlobal('window', fakeBrowser().window);
    const { sessionStore } = await sessions();
    const before = sessionStore.all();
    expect(sessionStore.all()).toBe(before);
    sessionStore.add(draft());
    const after = sessionStore.all();
    expect(after).not.toBe(before);
    expect(sessionStore.all()).toBe(after);
    expect(before).toEqual([]); // the old snapshot was not edited
  });

  it('tells its listeners about a change here and in another tab', async () => {
    const browser = fakeBrowser();
    vi.stubGlobal('window', browser.window);
    const { sessionStore, SESSIONS_KEY } = await sessions();
    const listener = vi.fn();
    const stop = sessionStore.subscribe(listener);

    sessionStore.add(draft());
    expect(listener).toHaveBeenCalledTimes(1);

    browser.otherTab(SESSIONS_KEY, JSON.stringify({ v: 2, sessions: [{ ...draft(), id: 'from-tab-2' }] }));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(sessionStore.all().map((s) => s.id)).toEqual(['from-tab-2']);

    browser.otherTab('some.other.key', 'x');
    expect(listener).toHaveBeenCalledTimes(2);

    stop();
    expect(browser.handlers.size).toBe(0);
    sessionStore.add(draft());
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps the sessions in memory when storage is blocked', async () => {
    vi.stubGlobal('window', fakeBrowser(true).window);
    const { sessionStore } = await sessions();
    const id = sessionStore.add(draft());
    expect(sessionStore.all()).toHaveLength(1);
    expect(sessionStore.get(id)?.sentences).toHaveLength(1);
    sessionStore.remove(id);
    expect(sessionStore.all()).toEqual([]);
  });

  it('works with no browser at all', async () => {
    const { sessionStore } = await sessions();
    const stop = sessionStore.subscribe(() => {});
    expect(sessionStore.all()).toEqual([]);
    expect(sessionStore.get(sessionStore.add(draft()))).not.toBeNull();
    stop();
  });

  it('makes an id without crypto.randomUUID', async () => {
    vi.stubGlobal('window', fakeBrowser().window);
    vi.stubGlobal('crypto', {});
    const { sessionStore } = await sessions();
    const ids = [sessionStore.add(draft()), sessionStore.add(draft())];
    expect(ids[0]).toMatch(/^s-/);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('starts fresh from damaged storage instead of throwing', async () => {
    const browser = fakeBrowser();
    browser.data.set('playreps.sessions.v2', '{"v":2,"sessions":[{]');
    vi.stubGlobal('window', browser.window);
    const { sessionStore } = await sessions();
    expect(sessionStore.all()).toEqual([]);
  });
});

describe('migration from the old progress', () => {
  it('brings the old sessions over once and leaves the old key in place', async () => {
    const browser = fakeBrowser();
    browser.data.set('playreps.progress.v1', V1);
    vi.stubGlobal('window', browser.window);
    const { sessionStore, SESSIONS_KEY } = await sessions();

    expect(sessionStore.all()).toEqual([
      {
        id: 'v1-1', kind: 'daily', startedAt: '2026-11-09T12:00:00', date: '2026-11-09', durationSec: 60, sceneId: '', partner: null,
        counts: COUNTS, targets: { specific_praise: 2, reflection: 2, description: 2, maxAvoid: 0 }, met: false, input: 'typed', sentences: [],
      },
      {
        id: 'v1-2', kind: 'live', startedAt: '2026-11-10T12:00:00', date: '2026-11-10', durationSec: 300, sceneId: 'blocks', partner: null,
        counts: COUNTS, targets: { specific_praise: 10, reflection: 0, description: 10, maxAvoid: 3 }, met: true, input: 'spoken', sentences: [],
      },
    ]);
    expect(browser.data.get('playreps.progress.v1')).toBe(V1);
    expect(JSON.parse(browser.data.get(SESSIONS_KEY)!).sessions).toHaveLength(2);
  });

  it('gives sessions that pass the strict reading, so they survive a reload', async () => {
    const { migrateV1, parseSessions } = await sessions();
    const migrated = migrateV1(V1);
    expect(parseSessions({ v: 2, sessions: migrated })).toEqual(migrated);
  });

  it('does not bring them back after the parent cleared the sessions', async () => {
    const browser = fakeBrowser();
    browser.data.set('playreps.progress.v1', V1);
    vi.stubGlobal('window', browser.window);
    const first = (await sessions()).sessionStore;
    expect(first.all()).toHaveLength(2);
    first.clear();

    vi.resetModules();
    expect((await sessions()).sessionStore.all()).toEqual([]);
  });

  it('leaves newer sessions alone when both keys exist, and survives a damaged old key', async () => {
    const both = fakeBrowser();
    both.data.set('playreps.progress.v1', V1);
    both.data.set('playreps.sessions.v2', JSON.stringify({ v: 2, sessions: [{ ...draft(), id: 'new' }] }));
    vi.stubGlobal('window', both.window);
    expect((await sessions()).sessionStore.all().map((s) => s.id)).toEqual(['new']);

    vi.resetModules();
    const damaged = fakeBrowser();
    damaged.data.set('playreps.progress.v1', '{"v":1,"sessions":"all of them"}');
    vi.stubGlobal('window', damaged.window);
    expect((await sessions()).sessionStore.all()).toEqual([]);
  });
});

// ---------- profile ----------

describe('profileStore', () => {
  it('starts with Mia, the blocks scene and nothing else', async () => {
    vi.stubGlobal('window', fakeBrowser().window);
    const { profileStore, DEFAULT_PROFILE } = await profiles();
    expect(profileStore.get()).toEqual({
      childName: null, childAge: null, moments: [], guess: null, partner: 'mia', sceneId: 'blocks',
      anchor: null, recordAudio: false, aiSummary: false, createdAt: null,
    });
    expect(profileStore.get()).toBe(DEFAULT_PROFILE);
  });

  it('takes the partner from the old screens on the first read', async () => {
    const browser = fakeBrowser();
    browser.data.set('playreps.child.v1', 'leo');
    vi.stubGlobal('window', browser.window);
    expect((await profiles()).profileStore.get().partner).toBe('leo');

    vi.resetModules();
    browser.data.set('playreps.child.v1', 'someone else');
    expect((await profiles()).profileStore.get().partner).toBe('mia');
  });

  it('merges an update, stamps the first one and survives a reload', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-13T18:00:00.000Z'));
    const browser = fakeBrowser();
    vi.stubGlobal('window', browser.window);
    const { profileStore, PROFILE_KEY } = await profiles();
    const listener = vi.fn();
    profileStore.subscribe(listener);

    profileStore.update({ childName: 'Aru', childAge: 4, moments: ['bedtime', 'leaving the playground'] });
    vi.setSystemTime(new Date('2026-11-14T09:00:00.000Z'));
    profileStore.update({ partner: 'leo', anchor: 'after dinner' });

    const expected = {
      childName: 'Aru', childAge: 4, moments: ['bedtime', 'leaving the playground'], guess: null, partner: 'leo', sceneId: 'blocks',
      anchor: 'after dinner', recordAudio: false, aiSummary: false, createdAt: '2026-11-13T18:00:00.000Z',
    };
    expect(profileStore.get()).toEqual(expected);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(browser.data.get('playreps.child.v1')).toBe('leo'); // the old screens show the same child

    vi.resetModules();
    expect((await profiles()).profileStore.get()).toEqual(expected);
    expect(JSON.parse(browser.data.get(PROFILE_KEY)!)).toEqual(expected);
  });

  it('hands React the same profile until something changes', async () => {
    vi.stubGlobal('window', fakeBrowser().window);
    const { profileStore } = await profiles();
    const before = profileStore.get();
    profileStore.update({ guess: 3 });
    expect(profileStore.get()).not.toBe(before);
    expect(profileStore.get()).toBe(profileStore.get());
    expect(before.guess).toBeNull();
  });

  it('clears a field set to null, keeps a field left out, and refuses a value that does not fit', async () => {
    vi.stubGlobal('window', fakeBrowser().window);
    const { profileStore } = await profiles();
    profileStore.update({ childName: 'Aru', childAge: 5, anchor: 'before bath', recordAudio: true });
    profileStore.update({ childName: null, childAge: undefined });
    expect(profileStore.get()).toMatchObject({ childName: null, childAge: 5, anchor: 'before bath', recordAudio: true });
    profileStore.update({ childAge: 12, partner: 'max' as never, sceneId: '' });
    expect(profileStore.get()).toMatchObject({ childAge: null, partner: 'mia', sceneId: 'blocks' });
  });

  it('reads a damaged profile field by field', async () => {
    const { parseProfile, DEFAULT_PROFILE } = await profiles();
    for (const junk of [null, 7, '{', '[]', 'null']) expect(parseProfile(junk)).toEqual(DEFAULT_PROFILE);
    expect(parseProfile('{"childName":"Aru","childAge":"four","moments":["bedtime",3],"partner":"leo","aiSummary":"yes"}')).toEqual({
      ...DEFAULT_PROFILE, childName: 'Aru', childAge: null, moments: ['bedtime'], partner: 'leo',
    });
  });

  it('resets to the defaults, here and on the old screens', async () => {
    const browser = fakeBrowser();
    vi.stubGlobal('window', browser.window);
    const { profileStore, DEFAULT_PROFILE, PROFILE_KEY } = await profiles();
    profileStore.update({ childName: 'Aru', partner: 'leo' });
    profileStore.reset();
    expect(profileStore.get()).toEqual(DEFAULT_PROFILE);
    expect(browser.data.has(PROFILE_KEY)).toBe(false);
    expect(browser.data.has('playreps.child.v1')).toBe(false);
  });

  it('follows a change made in another tab', async () => {
    const browser = fakeBrowser();
    vi.stubGlobal('window', browser.window);
    const { profileStore, PROFILE_KEY, DEFAULT_PROFILE } = await profiles();
    const listener = vi.fn();
    const stop = profileStore.subscribe(listener);
    browser.otherTab(PROFILE_KEY, JSON.stringify({ ...DEFAULT_PROFILE, sceneId: 'drawing' }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(profileStore.get().sceneId).toBe('drawing');
    stop();
    expect(browser.handlers.size).toBe(0);
  });

  it('keeps the profile in memory when storage is blocked', async () => {
    vi.stubGlobal('window', fakeBrowser(true).window);
    const { profileStore } = await profiles();
    profileStore.update({ childName: 'Aru' });
    expect(profileStore.get().childName).toBe('Aru');
    profileStore.reset();
    expect(profileStore.get().childName).toBeNull();
  });
});

// ---------- entitlement ----------

describe('entitlement', () => {
  const NONE = { paid: false, plan: null, demo: false, startedAt: null };

  it('locks the daily session and live mode until access starts', async () => {
    const { isLocked } = await entitlements();
    const paid = { paid: true, plan: 'twelve_weeks' as const, demo: false, startedAt: '2026-11-15T10:00:00' };
    for (const feature of ['daily', 'live'] as const) {
      expect(isLocked(feature, NONE)).toBe(true);
      expect(isLocked(feature, paid)).toBe(false);
      expect(isLocked(feature, { ...paid, demo: true })).toBe(false);
    }
  });

  it('keeps one-minute practice, the review and progress free', async () => {
    const { isLocked } = await entitlements();
    for (const feature of ['practice', 'review', 'progress'] as const) {
      expect(isLocked(feature, NONE)).toBe(false);
    }
  });

  it('knows the length of each plan', async () => {
    const { termWeeks } = await entitlements();
    expect([termWeeks('four_weeks'), termWeeks('twelve_weeks'), termWeeks(null)]).toEqual([4, 12, 0]);
  });

  it('renews a paid plan at its start plus its term', async () => {
    const { renewsOn } = await entitlements();
    const paid = { paid: true, plan: 'twelve_weeks' as const, demo: false, startedAt: '2026-11-15T10:00:00' };
    expect(renewsOn(paid)).toBe('2027-02-07');
    expect(renewsOn({ ...paid, plan: 'four_weeks' })).toBe('2026-12-13');
    expect(renewsOn({ ...paid, startedAt: '2028-02-01T23:30:00' })).toBe('2028-04-25'); // across a leap day
  });

  it('has no renewal without a paid plan, a start date, or a payment', async () => {
    const { renewsOn } = await entitlements();
    const paid = { paid: true, plan: 'twelve_weeks' as const, demo: false, startedAt: '2026-11-15T10:00:00' };
    expect(renewsOn(NONE)).toBeNull();
    expect(renewsOn({ ...paid, startedAt: null })).toBeNull(); // unlocked before the start date was saved
    expect(renewsOn({ ...paid, startedAt: 'last week' })).toBeNull();
    expect(renewsOn({ ...paid, demo: true })).toBeNull();
  });

  it('keeps the jury unlock working, and dates it once', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00.000Z'));
    vi.stubGlobal('window', fakeBrowser().window);
    const { demoUnlock, readEntitlement, clearEntitlement } = await entitlements();
    expect(readEntitlement()).toEqual(NONE);

    const unlocked = { paid: true, plan: 'four_weeks', demo: true, startedAt: '2026-11-15T10:00:00.000Z' };
    expect(demoUnlock()).toEqual(unlocked);
    vi.setSystemTime(new Date('2026-11-20T10:00:00.000Z'));
    expect(demoUnlock()).toEqual(unlocked);
    expect(readEntitlement()).toEqual(unlocked);

    clearEntitlement();
    expect(readEntitlement()).toEqual(NONE);
  });

  it('dates a confirmed checkout once, and reads an unlock saved before the date existed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00.000Z'));
    const browser = fakeBrowser();
    browser.data.set('playreps.entitlement.v1', JSON.stringify({ paid: true, plan: 'twelve_weeks', demo: false }));
    vi.stubGlobal('window', browser.window);
    vi.stubGlobal('fetch', async () => ({ json: async () => ({ paid: true, plan: 'twelve_weeks' }) }));
    const { confirmCheckout, readEntitlement } = await entitlements();
    expect(readEntitlement()).toEqual({ paid: true, plan: 'twelve_weeks', demo: false, startedAt: null });

    const confirmed = { paid: true, plan: 'twelve_weeks', demo: false, startedAt: '2026-11-15T10:00:00.000Z' };
    expect(await confirmCheckout('cs_test_1')).toEqual(confirmed);
    vi.setSystemTime(new Date('2026-11-16T10:00:00.000Z'));
    expect(await confirmCheckout('cs_test_1')).toEqual(confirmed); // the success page reloaded

    vi.stubGlobal('fetch', async () => ({ json: async () => ({ paid: false }) }));
    expect(await confirmCheckout('cs_test_2')).toEqual({ paid: false, plan: null, demo: false, startedAt: null });
    expect(readEntitlement()).toEqual(confirmed); // an unpaid answer never removes access
  });
});
