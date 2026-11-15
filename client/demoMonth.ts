/**
 * Puts the demo month on this device or takes it off again. The parent's own sessions stay either way. Both end in
 * a full page load, so every screen reads the new list.
 */
import { demoMonth, isDemoSession } from '../lib/demo/month';
import { ROUTES } from '../lib/routes';
import { demoUnlock, readEntitlement } from './entitlement';
import { todayISO } from './progressStore';
import { SESSIONS_KEY, parseSessions } from './sessionStore';

function saveAll(sessions: ReturnType<typeof parseSessions>): void {
  const inOrder = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify({ v: 2, sessions: inOrder }));
}

const own = () => parseSessions(window.localStorage.getItem(SESSIONS_KEY)).filter((s) => !isDemoSession(s));

/** 27 simulated days before today, and demo access when there is no access yet. Opens Today on day 28. */
export function loadDemoMonth(): void {
  try {
    const month = demoMonth(todayISO(), (date) => new Date(`${date}T19:30:00`).toISOString());
    saveAll([...own(), ...month]);
    if (!readEntitlement().paid) demoUnlock();
  } catch {
    return; // storage unavailable: nothing changes
  }
  window.location.assign(ROUTES.today);
}

/** Removes the demo sessions and keeps the parent's own. */
export function removeDemoMonth(): void {
  try {
    saveAll(own());
  } catch {
    return;
  }
  window.location.reload();
}
