import { Shell } from '@/components/Bits';

const BLOCK = 'motion-safe:animate-pulse';

/** Before the device has been read: quiet shapes in the page's layout, never zeros that could pass for data. */
export function DashboardSkeleton() {
  return (
    <Shell wide>
      <div className="flex flex-col gap-5" aria-busy="true">
        <p className="sr-only" role="status">
          Opening your notebook…
        </p>
        <div className="flex flex-col gap-3">
          <div className={`h-[264px] rounded-[1.75rem] bg-violet/10 p-6 sm:h-[300px] sm:p-8 ${BLOCK}`}>
            <div className="h-3.5 w-24 rounded-full bg-violet/16" />
            <div className="mt-2 h-3 w-16 rounded-full bg-violet/12" />
            <div className="mt-10 h-8 w-3/5 rounded-xl bg-violet/16" />
            <div className="mt-4 h-6 w-32 rounded-full bg-violet/12" />
          </div>
          <div className={`h-14 rounded-2xl bg-surface-2 ${BLOCK}`} />
        </div>
        <div className={`h-[380px] rounded-card bg-surface-2 ${BLOCK}`} />
      </div>
    </Shell>
  );
}
