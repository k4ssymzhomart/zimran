import { Art, Button, Pattern } from '@/components/kit';
import { LandingHeader } from './LandingBar';

export interface HeroProps {
  /** Where "Try one answer" leads: the answer field further down this page. */
  actionHref: string;
}

/**
 * The first screen of the landing.
 * Phones (Figma 20:7): the violet block with the two children takes the height the words leave; the headline,
 * one line and the action sit on white under it, all inside one screen.
 * From 1024px (Figma 63:240): the words on white at the left, a violet band across the bottom, and the children
 * at the right, sitting down into the band.
 */
export function Hero({ actionHref }: HeroProps) {
  return (
    <section className="relative flex min-h-dvh flex-col lg:block lg:h-[640px] lg:min-h-0">
      <div className="relative flex min-h-[300px] flex-1 flex-col bg-violet pt-[env(safe-area-inset-top)] lg:absolute lg:inset-x-0 lg:bottom-0 lg:h-[280px] lg:min-h-0 lg:pt-0">
        <Pattern kind="bars" className="lg:[--pattern-size:1440px]" />
        <LandingHeader className="lg:hidden" />
        {/* The pictures. On phones this is the room under the header; from 1024px it is the band, 1440px wide at most. */}
        <div className="relative min-h-0 flex-1 lg:absolute lg:inset-0 lg:mx-auto lg:max-w-[1440px]">
          <Art name="blocks" size={120} className="absolute top-[110px] left-[7.64%] hidden lg:block" />
          <Art name="stacker" size={120} className="absolute top-[130px] left-[36.1%] hidden lg:block" />
          <Art name="ball" size={110} className="absolute top-[60px] right-[2.78%] hidden lg:block" />
          <Art
            name="duo"
            size={580}
            priority
            alt="Mia and Leo, two simulated four-year-olds, stacking a tower of blocks"
            className="absolute inset-0 m-auto h-auto max-h-[calc(100%-32px)] w-auto max-w-[min(330px,calc(100%-48px))] lg:inset-auto lg:right-[6.25%] lg:bottom-[114px] lg:m-0 lg:max-h-none lg:w-[min(580px,40.3vw)] lg:max-w-none"
          />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[1440px] px-[24px] pt-[28px] pb-[max(34px,env(safe-area-inset-bottom))] lg:px-[48px] lg:pt-[56px] lg:pb-0 xl:px-[120px]">
        <h1 className="text-display lg:text-title-xl xl:text-display-xl">
          <span className="block">Practice tonight.</span> <span className="block">Use it tomorrow.</span>
        </h1>
        <p className="mt-[12px] text-body text-gray lg:hidden">Five minutes a day with a simulated four-year-old.</p>
        <Button href={actionHref} fullWidth className="mt-[24px] lg:w-[240px]">
          Try one answer
        </Button>
      </div>
    </section>
  );
}
