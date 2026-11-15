'use client';

import { useEffect } from 'react';
import { startAccount } from '@/client/account';

/** Mounted once in the root layout: checks the optional account and keeps its copy of the progress current. */
export function AccountSync() {
  useEffect(() => {
    void startAccount();
  }, []);
  return null;
}
