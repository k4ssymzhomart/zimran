import { Art, Button, Pattern } from '@/components/kit';
import { Floater } from './Floater';
import { Sparkle } from './Sparkle';

export interface HeroProps {
  /** Where "Try one answer" leads: the answer field further down this page. */
  actionHref: string;
}

/**
 * The first screen of the landing.
 * Phones (Figma 20:7): the violet block with the two children takes the height the words leave; the headline,
 * one line and the action sit on white under it, all inside one screen. The top bar (LandingBar) lies over the
 * room left at the top of the block, in white.
 * From 1024px (Figma 63:240): the words on white at the left, a violet band across the bottom, and the children
 * at the right, sitting down into the band.
 * The 3D pieces float and drift with the scroll; sparkles twinkle around the headline and the action.
 */
export function Hero({ actionHref }: HeroProps) {
  return (
    <section className="relative flex min-h-dvh flex-col overflow-x-clip lg:block lg:h-[640px] lg:min-h-0">
      <div
        data-hero-violet
        className="relative flex min-h-[300px] flex-1 flex-col bg-violet pt-[env(safe-area-inset-top)] lg:absolute lg:inset-x-0 lg:bottom-0 lg:h-[280px] lg:min-h-0 lg:pt-0"
      >
        <Pattern kind="bars" className="lg:[--pattern-size:1440px]" />
        {/* The room of the top bar on phones: it draws the logo and "Open app" here, in white. */}
        <div aria-hidden="true" className="h-[48px] shrink-0 lg:hidden" />
        {/* The pictures. On phones this is the room under the header; from 1024px it is the band, 1440px wide at most. */}
        <div className="relative min-h-0 flex-1 lg:absolute lg:inset-0 lg:mx-auto lg:max-w-[1440px]">
          <Floater art="blocks" size={120} depth={0.08} className="top-[110px] left-[7.64%] hidden lg:block" />
          <Floater art="stacker" size={120} depth={0.12} delay={2.5} className="top-[130px] left-[36.1%] hidden lg:block" />
          <Floater art="ball" size={110} depth={0.1} delay={4} className="top-[60px] right-[2.78%] hidden lg:block" />
          {/* On phones two small pieces float in the corners of the block, from 390px wide, where they clear the children. */}
          <Floater art="crayons" size={56} depth={0.06} delay={1} className="top-[6px] left-[16px] hidden min-[390px]:block lg:hidden" />
          <Floater art="duck" size={56} depth={0.06} delay={3} className="right-[16px] bottom-[8px] hidden min-[390px]:block lg:hidden" />

          <Sparkle className="top-[18%] left-[22%] size-[12px] text-white" delay={0.4} />
          <Sparkle className="top-[40%] right-[14%] size-[16px] text-white" delay={1.6} />
          <Sparkle className="bottom-[16%] left-[12%] size-[10px] text-white" delay={2.4} />
          <Sparkle className="top-[24px] right-[30%] hidden size-[14px] text-white lg:block" delay={0.9} />
          <Sparkle className="bottom-[40px] left-[28%] hidden size-[12px] text-white lg:block" delay={2} />

          <Art
            name="duo"
            size={580}
            priority
            alt="Mia and Leo, two simulated four-year-olds, stacking a tower of blocks"
            className="absolute inset-0 m-auto h-auto max-h-[calc(100%-32px)] w-auto max-w-[min(330px,calc(100%-48px))] lg:inset-auto lg:right-[6.25%] lg:bottom-[114px] lg:m-0 lg:max-h-none lg:w-[min(580px,40.3vw)] lg:max-w-none"
          />
        </div>
      </div>

      <div
        data-hero-words
        className="relative mx-auto w-full max-w-[1440px] px-[24px] pt-[28px] pb-[max(34px,env(safe-area-inset-bottom))] lg:px-[48px] lg:pt-[56px] lg:pb-0 xl:px-[120px]"
      >
        {/* Under 360px a sentence at the drawn size takes two lines; one size down keeps the headline at two. */}
        <div className="relative w-fit">
          <h1 className="text-display max-[360px]:text-title lg:text-title-xl xl:text-display-xl">
            <span className="block">Practice tonight.</span> <span className="block">Use it tomorrow.</span>
          </h1>
          <Sparkle className="-top-[18px] left-[2px] size-[12px] text-violet" delay={0.2} />
          <Sparkle className="top-[10%] -right-[30px] hidden size-[18px] text-violet lg:block" delay={1.2} />
          <Sparkle className="-right-[14px] bottom-[6px] hidden size-[10px] text-violet lg:block" delay={2.2} />
        </div>
        <p className="mt-[12px] text-body text-gray lg:hidden">Five minutes a day with a simulated four-year-old.</p>
        <div className="relative mt-[24px] lg:w-[240px]">
          <Button href={actionHref} fullWidth>
            Try one answer
          </Button>
          <Sparkle className="-top-[18px] right-[18px] size-[12px] text-violet" delay={0.8} />
          <Sparkle className="-right-[26px] -bottom-[4px] hidden size-[14px] text-violet lg:block" delay={1.9} />
        </div>
      </div>
    </section>
  );
}
