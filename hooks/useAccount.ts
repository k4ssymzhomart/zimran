'use client';

import { useSyncExternalStore } from 'react';
import { accountStore, type AccountState } from '@/client/account';

/** The optional account on this browser: checking, off on this deployment, a guest, or signed in. */
export function useAccount(): AccountState {
  return useSyncExternalStore(accountStore.subscribe, accountStore.get, accountStore.server);
}
