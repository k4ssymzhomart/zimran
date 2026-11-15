import type { Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';

/** The browser chrome around the light screens is white; the root layout still sets the old dark value. */
export const viewport: Viewport = { themeColor: 'white' };

/** Today, Practice, Progress, Profile and the session review share one shell: the rail on desktop, the tab bar on phones. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
