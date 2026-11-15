import { ArrowRight } from '@/components/Icons';
import { Mia } from '@/components/Mia';
import { ActionLink, Art } from '@/components/ui';
import { useChild } from '@/components/child';

/** No sessions yet: Mia waiting, and the one action that fills this page. */
export function EmptyStart() {
  const { child } = useChild();
  return (
    <section aria-labelledby="empty-h" className="enter">
      <Art>
        <Mia face="smiling" posture="at_toy" size={176} priority fade={false} />
        <span className="absolute left-4 top-4 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium text-fg-2 backdrop-blur">
          Simulated child
        </span>
      </Art>
      <h1 id="empty-h" className="title mt-6 text-[28px] text-fg sm:text-[32px]">
        {child.name} has the blocks out and is waiting for you.
      </h1>
      <p className="mt-2 text-[16px] leading-snug text-fg-soft">Play two short rounds and this page fills with your own numbers.</p>
      <div className="mt-6">
        <ActionLink href="/play">
          Play your first round
          <ArrowRight size={20} />
        </ActionLink>
      </div>
    </section>
  );
}
