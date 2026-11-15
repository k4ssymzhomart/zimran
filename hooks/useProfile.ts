'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { DEFAULT_PROFILE, profileStore } from '@/client/profileStore';
import type { Profile } from '@/lib/types';

const serverProfile = (): Profile => DEFAULT_PROFILE;

const never = (): (() => void) => () => {};
const onDevice = (): boolean => true;
const onServer = (): boolean => false;

/**
 * The parent's profile, live across tabs. The server and the first client paint see the defaults with
 * `ready: false`, so hydration never mismatches; wait for `ready` before trusting an empty answer.
 */
export function useProfile(): { profile: Profile; ready: boolean; update(patch: Partial<Profile>): void } {
  const profile = useSyncExternalStore(profileStore.subscribe, profileStore.get, serverProfile);
  const ready = useSyncExternalStore(never, onDevice, onServer);
  return useMemo(() => ({ profile, ready, update: profileStore.update }), [profile, ready]);
}
