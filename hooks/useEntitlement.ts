'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { entitlementSnapshot, NO_ENTITLEMENT, subscribeEntitlement, type Entitlement } from '@/client/entitlement';

const serverEntitlement = (): Entitlement => NO_ENTITLEMENT;

const never = (): (() => void) => () => {};
const onDevice = (): boolean => true;
const onServer = (): boolean => false;

/**
 * Access on this device, live across tabs. The server and the first client paint see no access with
 * `ready: false`, so hydration never mismatches; decide what is locked only once `ready` is true.
 */
export function useEntitlement(): { entitlement: Entitlement; ready: boolean } {
  const entitlement = useSyncExternalStore(subscribeEntitlement, entitlementSnapshot, serverEntitlement);
  const ready = useSyncExternalStore(never, onDevice, onServer);
  return useMemo(() => ({ entitlement, ready }), [entitlement, ready]);
}
