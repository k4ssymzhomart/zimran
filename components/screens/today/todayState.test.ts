import { describe, expect, it } from 'vitest';
import { NO_ENTITLEMENT, type Entitlement } from '../../../client/entitlement';
import type { SavedSession, SessionKind } from '../../../lib/types';
import { todayState } from './todayState';

const PAID: Entitlement = { paid: true, plan: 'four_weeks', demo: true, startedAt: '2026-11-01T10:00:00.000Z' };
const TODAY = '2026-11-14';

/** Only the fields the state reads; the rest of a saved session does not matter here. */
const session = (id: string, date: string, kind: SessionKind = 'daily', durationSec = 300): SavedSession =>
  ({ id, date, kind, durationSec, startedAt: `${date}T18:00:00.000Z` }) as unknown as SavedSession;

describe('todayState', () => {
  it('is empty with nothing saved, paid or not', () => {
    expect(todayState([], TODAY, NO_ENTITLEMENT)).toEqual({ kind: 'empty' });
    expect(todayState([], TODAY, PAID)).toEqual({ kind: 'empty' });
  });

  it('is locked without access once something is saved, even after a long break', () => {
    expect(todayState([session('a', '2026-11-13', 'first_after')], TODAY, NO_ENTITLEMENT)).toEqual({ kind: 'locked' });
    expect(todayState([session('a', '2026-10-01', 'first_after')], TODAY, NO_ENTITLEMENT)).toEqual({ kind: 'locked' });
  });

  it('is done when a daily session was saved today, and opens the latest one', () => {
    const sessions = [session('a', '2026-11-13'), session('b', TODAY), session('c', TODAY), session('d', TODAY, 'practice')];
    expect(todayState(sessions, TODAY, PAID)).toEqual({ kind: 'done', session: sessions[2] });
  });

  it('is not done for a daily ended before half, which is saved at half its length', () => {
    expect(todayState([session('a', TODAY, 'daily', 150)], TODAY, PAID)).toEqual({ kind: 'today' });
    const sessions = [session('a', TODAY, 'daily', 210), session('b', TODAY, 'daily', 150)];
    expect(todayState(sessions, TODAY, PAID)).toEqual({ kind: 'done', session: sessions[0] });
  });

  it('is not done for a practice round or a first visit today', () => {
    expect(todayState([session('a', TODAY, 'practice')], TODAY, PAID)).toEqual({ kind: 'today' });
    expect(todayState([session('a', TODAY, 'first_after')], TODAY, PAID)).toEqual({ kind: 'today' });
  });

  it('welcomes back when the last session is more than a day ago', () => {
    expect(todayState([session('a', '2026-11-12')], TODAY, PAID)).toEqual({ kind: 'back' });
    expect(todayState([session('a', '2026-11-13')], TODAY, PAID)).toEqual({ kind: 'today' });
  });

  it('reads the latest date, not the last in the list', () => {
    expect(todayState([session('a', '2026-11-13'), session('b', '2026-11-01')], TODAY, PAID)).toEqual({ kind: 'today' });
  });
});
