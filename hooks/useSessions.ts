'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { sessionStore } from '@/client/sessionStore';
import type { SavedSession } from '@/lib/types';

/** What the server renders: no sessions. One constant, so the snapshot is the same object every time. */
const NONE: SavedSession[] = [];
const serverSessions = (): SavedSession[] => NONE;

const never = (): (() => void) => () => {};
const onDevice = (): boolean => true;
const onServer = (): boolean => false;

/**
 * The saved sessions, oldest first, live across tabs. The server and the first client paint see an empty
 * list with `ready: false`, so hydration never mismatches; show the empty state only once `ready` is true.
 */
export function useSessions(): { sessions: SavedSession[]; ready: boolean } {
  const sessions = useSyncExternalStore(sessionStore.subscribe, sessionStore.all, serverSessions);
  const ready = useSyncExternalStore(never, onDevice, onServer);
  return useMemo(() => ({ sessions, ready }), [sessions, ready]);
}
