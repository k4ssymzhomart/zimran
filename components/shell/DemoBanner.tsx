'use client';

import { removeDemoMonth } from '@/client/demoMonth';
import { focusRing } from '@/components/kit';
import { cn } from '@/components/kit/cn';
import { useSessions } from '@/hooks/useSessions';
import { isDemoSession } from '@/lib/demo/month';

/** Over every app screen while the demo month is on this device: it says the data is demo, and takes it off. */
export function DemoBanner() {
  const { sessions } = useSessions();
  if (!sessions.some(isDemoSession)) return null;
  return (
    <div role="note" className="flex items-center gap-[12px] bg-lilac px-[16px] py-[10px] text-small text-ink lg:px-[48px]">
      <p className="flex-1">
        <span className="text-small-strong">Demo data.</span> A simulated family, 27 days. Every sentence is coded by the
        real rules.
      </p>
      <button type="button" onClick={removeDemoMonth} className={cn('shrink-0 rounded-[8px] text-small-strong text-violet underline', focusRing)}>
        Remove
      </button>
    </div>
  );
}
