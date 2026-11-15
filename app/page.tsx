import type { ComponentType } from 'react';
import { Footer } from '@/components/landing/Footer';
import { Hero } from '@/components/landing/Hero';
import { LandingBar } from '@/components/landing/LandingBar';
import { LiveAnswer } from '@/components/landing/LiveAnswer';
// The other sections: uncomment an import here and its line in SECTIONS below.
// import { Answers } from '@/components/landing/Answers';
// import { BeforeAfterToggle } from '@/components/landing/BeforeAfterToggle';
// import { Closing } from '@/components/landing/Closing';
// import { FirstVisitSteps } from '@/components/landing/FirstVisitSteps';
// import { FourCounts } from '@/components/landing/FourCounts';
// import { PaceBand } from '@/components/landing/PaceBand';
// import { PlanBuilder } from '@/components/landing/PlanBuilder';
// import { Pricing } from '@/components/landing/Pricing';

/** The anchor of the answer field. Every "Try one answer" on this page leads there. */
const ANSWER = 'answer';

export interface LandingSection {
  /**
   * The anchor of the section, unique on the page. The page puts it on a wrapper around the section,
   * so pick a name the section does not already use for an id of its own.
   */
  id: string;
  Component: ComponentType;
  /** Set it to link to the section from the top bar: "How it works", "Method", "Pricing". */
  nav?: string;
}

/**
 * ---------- THE OTHER SECTIONS GO HERE ----------
 * Everything between the live answer and the footer, in page order (Figma 66:1267 and 63:224).
 * To add a section, add its line: the page renders it in place, and a line with `nav` gets its link in the top bar.
 */
export const SECTIONS: LandingSection[] = [
  // { id: 'counts', Component: FourCounts },
  // { id: 'how-it-works', Component: FirstVisitSteps, nav: 'How it works' },
  // { id: 'before-after', Component: BeforeAfterToggle },
  // { id: 'builder', Component: PlanBuilder },
  // { id: 'pace', Component: PaceBand, nav: 'Method' },
  // { id: 'pricing', Component: Pricing, nav: 'Pricing' },
  // { id: 'answers', Component: Answers },
  // { id: 'closing', Component: Closing },
];

/**
 * The landing: the top bar, the first screen, the live answer, the sections above, the footer.
 * White is the page; violet comes as bands, cards and tiles.
 */
export default function Landing() {
  const sectionLinks = SECTIONS.flatMap(({ id, nav }) => (nav ? [{ label: nav, href: `#${id}` }] : []));

  return (
    <div className="split-root">
      <LandingBar sections={sectionLinks} actionHref={`#${ANSWER}`} />
      <main>
        <Hero actionHref={`#${ANSWER}`} />
        <LiveAnswer id={ANSWER} />
        {SECTIONS.map(({ id, Component }) => (
          <div key={id} id={id}>
            <Component />
          </div>
        ))}
      </main>
      <Footer />
    </div>
  );
}
