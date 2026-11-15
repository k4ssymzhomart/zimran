import { describe, expect, it } from 'vitest';
import { bringsNew, mergeCopies } from './account';
import { SESSIONS_KEY, parseSessions } from './sessionStore';

const session = (id: string, startedAt: string) => ({
  id,
  kind: 'practice',
  startedAt,
  date: startedAt.slice(0, 10),
  durationSec: 60,
  sceneId: 'blocks',
  partner: 'mia',
  counts: {
    specific_praise: 1, reflection: 0, description: 2, general_praise: 0, neutral: 0,
    question: 0, command: 0, criticism: 0, target: 3, avoid: 0,
  },
  targets: { specific_praise: 2, reflection: 2, description: 2, maxAvoid: 3 },
  met: false,
  input: 'typed',
  sentences: [],
});
const stored = (...sessions: ReturnType<typeof session>[]) => JSON.stringify({ v: 2, sessions });

describe('merging the account’s copy into a device', () => {
  const phone = { [SESSIONS_KEY]: stored(session('a', '2026-11-14T19:00:00.000Z')), 'playreps.profile.v1': '{"phone":1}' };
  const laptop = { [SESSIONS_KEY]: stored(session('b', '2026-11-15T08:00:00.000Z')), 'playreps.profile.v1': '{"laptop":1}' };

  it('keeps the sessions of both, oldest first, and the account’s version of everything else', () => {
    const merged = mergeCopies(laptop, phone);
    const ids = parseSessions(merged[SESSIONS_KEY]).map((s) => s.id);
    expect(ids).toEqual(['a', 'b']);
    expect(merged['playreps.profile.v1']).toBe('{"phone":1}');
  });

  it('says whether the merge brings this device anything new', () => {
    expect(bringsNew(laptop, mergeCopies(laptop, phone))).toBe(true);
    expect(bringsNew(phone, mergeCopies(phone, phone))).toBe(false);
    expect(bringsNew(phone, mergeCopies(phone, {}))).toBe(false);
  });
});
