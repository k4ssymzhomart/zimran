import { describe, expect, it } from 'vitest';
import { MAX_COPY, copyOf, emailOf, passwordProblem } from './account';

describe('the optional account', () => {
  it('reads an email trimmed and lowercased, and refuses anything else', () => {
    expect(emailOf('  Sam.Parent@Example.com ')).toBe('sam.parent@example.com');
    expect(emailOf('no-at-sign.com')).toBeNull();
    expect(emailOf('a@b')).toBeNull();
    expect(emailOf(42)).toBeNull();
    expect(emailOf(`${'a'.repeat(250)}@b.co`)).toBeNull();
  });

  it('asks for a password of 8 to 200 characters', () => {
    expect(passwordProblem('short')).toMatch(/at least 8/);
    expect(passwordProblem(undefined)).toMatch(/at least 8/);
    expect(passwordProblem('x'.repeat(201))).toMatch(/at most 200/);
    expect(passwordProblem('long enough')).toBeNull();
  });

  it('keeps only the app’s own saved entries, as strings, under the size limit', () => {
    const copy = { 'playreps.sessions.v2': '{"v":2,"sessions":[]}', 'playreps.profile.v1': '{}' };
    expect(copyOf(copy)).toEqual(copy);
    expect(copyOf({})).toEqual({});
    expect(copyOf({ 'other.key': 'x' })).toBeNull();
    expect(copyOf({ 'playreps.profile.v1': 3 })).toBeNull();
    expect(copyOf({ 'playreps.sessions.v2': 'x'.repeat(MAX_COPY) })).toBeNull();
    expect(copyOf(['playreps.x'])).toBeNull();
    expect(copyOf(null)).toBeNull();
  });
});
