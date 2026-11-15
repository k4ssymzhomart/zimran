'use client';

import { useSyncExternalStore } from 'react';
import { todayISO } from '@/client/progressStore';
import { PageScreen } from '@/components/kit';
import { ProfileScreen } from '@/components/screens/profile/ProfileScreen';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/hooks/useSessions';

/** The local day is read on this device only. The server and the first paint get null, so nothing can mismatch. */
const never = () => () => {};
const noDay = () => null;

/**
 * Profile (Figma 48:1282, 60:651): the child, the plan, the membership, how coding works and erasing this device,
 * all on what is saved here. Nothing is shown until the profile, the sessions, the access and the day are read.
 */
export default function ProfilePage() {
  const { profile, ready: profileReady, update } = useProfile();
  const { sessions, ready: sessionsReady } = useSessions();
  const { entitlement, ready: entitlementReady } = useEntitlement();
  const today = useSyncExternalStore(never, todayISO, noDay);

  if (!profileReady || !sessionsReady || !entitlementReady || today === null) {
    return (
      <PageScreen embedded title="Profile">
        {null}
      </PageScreen>
    );
  }

  return <ProfileScreen profile={profile} update={update} sessions={sessions} entitlement={entitlement} today={today} />;
}
