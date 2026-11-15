import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from '@/components/Icons';
import { TopBar } from '@/components/ui';

/**
 * The landing page: one promise, one picture, one action.
 * The button goes straight to choosing Mia or Leo, so the next screen is already the product.
 */
export default function Landing() {
  return (
    <div className="glow flex min-h-[100dvh] flex-col overflow-hidden">
      <TopBar
        right={
          <Link href="/jury" className="btn btn-ghost">
            Jury guide
          </Link>
        }
      />

      <main className="mx-auto grid w-full max-w-[1120px] flex-1 items-center gap-6 px-5 pb-16 pt-2 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-0">
        {/* the picture: the two simulated children inside the three rings */}
        <div className="pop relative mx-auto aspect-square w-full max-w-[340px] sm:max-w-[420px] lg:order-2 lg:max-w-[520px]">
          <div aria-hidden="true" className="absolute inset-[12%] rounded-full bg-violet/45 blur-[80px]" />
          <Image src="/art/rings.png" alt="" fill priority sizes="(min-width: 1024px) 520px, 420px" className="breathe object-contain opacity-90" />
          <Image
            src="/art/duo.png"
            alt="Mia and Leo, two simulated four-year-olds, building a tower of blocks"
            width={1100}
            height={942}
            priority
            sizes="(min-width: 1024px) 400px, 300px"
            className="absolute bottom-[4%] left-1/2 w-[78%] -translate-x-1/2 drop-shadow-[0_24px_40px_rgba(9,8,27,0.6)]"
          />
        </div>

        <div className="text-center lg:text-left">
          <h1 className="title enter d1 text-[40px] font-black text-fg sm:text-[60px] lg:text-[68px]">
            Practise the five minutes of play clinics teach.
          </h1>
          <p className="lede enter d2 mx-auto mt-5 max-w-[500px] sm:text-[19px] lg:mx-0">
            Talk with Mia or Leo, a simulated four-year-old. Every sentence you say is coded as you say it.
          </p>
          <div className="enter d3 mt-9 flex flex-col items-center gap-3 lg:items-start">
            <Link href="/start" className="btn btn-primary w-full max-w-[340px] text-[18px]">
              Start practising
              <ArrowRight size={20} />
            </Link>
            <p className="text-[13px] text-fg-faint">Free to try. No sign-up.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
