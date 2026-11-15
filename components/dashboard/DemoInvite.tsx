import Image from 'next/image';
import { DemoBadge } from '@/components/Bits';

/** The invitation to watch a simulated month. Nothing it shows is the parent's, and it says so. */
export function DemoInvite({ onPlay }: { onPlay: () => void }) {
  return (
    <section aria-labelledby="demo-h" className="enter d4 relative overflow-hidden rounded-[1.75rem] bg-night p-6 text-white sm:p-8">
      <Image src="/bg/night.jpg" alt="" fill sizes="(min-width: 640px) 600px, 100vw" className="object-cover" />
      <div className="relative">
        <span className="inline-flex rounded-full ring-1 ring-white/20">
          <DemoBadge>Demo, simulated family</DemoBadge>
        </span>
        <h2 id="demo-h" className="title mt-5 text-[28px] sm:text-[34px]">
          See a month in 30 seconds
        </h2>
        <p className="mt-2 max-w-[440px] text-[15px] leading-relaxed text-white/70">
          A simulated parent plays all 28 days, coded by the same rules as you. Their learning curve is invented, and your
          data stays as it is.
        </p>
        <button type="button" className="btn btn-light mt-6 w-full sm:w-auto" onClick={onPlay}>
          Play the demo
        </button>
      </div>
    </section>
  );
}
