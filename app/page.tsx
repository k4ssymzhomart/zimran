import type { ComponentType } from 'react';
import { ANSWER_HREF, ANSWER_ID } from '@/components/landing/anchors';
import { Answers } from '@/components/landing/Answers';
import { BeforeAfterToggle } from '@/components/landing/BeforeAfterToggle';
import { Closing } from '@/components/landing/Closing';
import { FirstVisitSteps } from '@/components/landing/FirstVisitSteps';
import { Floater, type FloaterProps } from '@/components/landing/Floater';
import { Footer } from '@/components/landing/Footer';
import { FourCounts } from '@/components/landing/FourCounts';
import { Hero } from '@/components/landing/Hero';
import { InPageLinks } from '@/components/landing/InPageLinks';
import { LandingBar } from '@/components/landing/LandingBar';
import { LandingMotion } from '@/components/landing/LandingMotion';
import { LiveAnswer } from '@/components/landing/LiveAnswer';
import { PaceBand } from '@/components/landing/PaceBand';
import { PlanBuilder } from '@/components/landing/PlanBuilder';
import { Pricing } from '@/components/landing/Pricing';
import { SortedWords } from '@/components/landing/SortedWords';

interface LandingSection {
  /**
   * The anchor of the section, unique on the page. The page puts it on a wrapper around the section,
   * so a section does not use this name for an id of its own.
   */
  id: string;
  Component: ComponentType;
  /** Set it to link to the section from the top bar: "How it works", "Method", "Pricing". */
  nav?: string;
  /** A 3D piece floating in the side margin, from 1280px only, where the margin is 120px or more. */
  float?: FloaterProps;
  /** The scroll moment pins itself, so it does not rise in like the others. */
  still?: boolean;
}

/** In the side margin: 72px wide, 24px from the edge, inside the 120px the page column leaves from 1280px. */
const LEFT = 'hidden xl:block left-[24px]';
const RIGHT = 'hidden xl:block right-[24px]';

/**
 * Everything between the live answer and the footer, in page order (Figma 66:1267 and 63:224).
 * The frames also draw "The app", the session review and the month. They need pictures of app screens with
 * history, and the landing shows no numbers it did not compute, so those three are not on the page.
 * A line with `nav` gets its link in the top bar.
 */
const SECTIONS: LandingSection[] = [
  { id: 'sorted', Component: SortedWords, still: true },
  { id: 'counts', Component: FourCounts, float: { art: 'heart', size: 72, className: `${RIGHT} top-[56px]`, delay: 1 } },
  {
    id: 'how-it-works',
    Component: FirstVisitSteps,
    nav: 'How it works',
    float: { art: 'crayons', size: 72, className: `${LEFT} top-[96px]`, delay: 2 },
  },
  { id: 'before-after', Component: BeforeAfterToggle, float: { art: 'duck', size: 72, className: `${RIGHT} top-[96px]` } },
  { id: 'builder', Component: PlanBuilder, float: { art: 'blocks', size: 72, className: `${LEFT} top-[120px]`, delay: 3 } },
  { id: 'pace', Component: PaceBand, nav: 'Method', float: { art: 'ball', size: 64, className: `${RIGHT} top-[64px]`, delay: 1.5 } },
  { id: 'pricing', Component: Pricing, nav: 'Pricing' },
  { id: 'answers', Component: Answers, float: { art: 'puzzle', size: 72, className: `${LEFT} top-[96px]`, delay: 4 } },
  { id: 'closing', Component: Closing },
];

/**
 * The landing: the top bar, the first screen, the live answer, the sections above, the footer.
 * White is the page; violet comes as bands, cards and tiles. LandingMotion brings each section in as it comes
 * into view and lets the 3D pieces drift; the top bar changes as the visitor goes down the page.
 */
export default function Landing() {
  const sectionLinks = SECTIONS.flatMap(({ id, nav }) => (nav ? [{ label: nav, href: `#${id}` }] : []));

  return (
    <div className="split-root">
      <InPageLinks />
      <LandingMotion />
      <LandingBar sections={sectionLinks} actionHref={ANSWER_HREF} />
      <main>
        <Hero actionHref={ANSWER_HREF} />
        <div data-reveal>
          <LiveAnswer id={ANSWER_ID} />
        </div>
        {SECTIONS.map(({ id, Component, float, still }) => (
          <div key={id} id={id} className="relative" data-reveal={still ? undefined : true}>
            <Component />
            {float && <Floater {...float} />}
          </div>
        ))}
      </main>
      <Footer />
    </div>
  );
}
