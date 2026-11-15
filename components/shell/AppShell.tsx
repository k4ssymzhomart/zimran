import { Suspense, type ReactNode } from 'react';
import { cn } from '@/components/kit/cn';
import type { AppTab } from '@/lib/routes';
import { Rail } from './Rail';
import { TabBar } from './TabBar';

export interface AppShellProps {
  children: ReactNode;
  /** The tab to mark as current. Leave it out: the rail and the tab bar read it from the address. */
  current?: AppTab['id'];
  className?: string;
}

/**
 * The frame around the app's tabs: the rail at the left from 1024px, the tab bar at the bottom on phones,
 * the page between them. Screens inside it pass `embedded` to the kit shells, because this is the Split root.
 *
 * The rail and the tab bar read the pathname, which is not known while a dynamic route such as a session review
 * is prerendered, so each waits in its own Suspense. Both stay hidden off the tab roots, so the empty fallback
 * is already the right picture there.
 */
export function AppShell({ children, current, className }: AppShellProps) {
  return (
    <div className={cn('split-root flex flex-col lg:flex-row', className)}>
      <Suspense fallback={null}>
        <Rail current={current} />
      </Suspense>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      <Suspense fallback={null}>
        <TabBar current={current} />
      </Suspense>
    </div>
  );
}
