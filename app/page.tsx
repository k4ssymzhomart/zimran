import type { ComponentType } from 'react';
import { ANSWER_HREF, ANSWER_ID } from '@/components/landing/anchors';
import { Answers } from '@/components/landing/Answers';
import { BeforeAfterToggle } from '@/components/landing/BeforeAfterToggle';
import { Closing } from '@/components/landing/Closing';
import { FirstVisitSteps } from '@/components/landing/FirstVisitSteps';
import { Footer } from '@/components/landing/Footer';
import { FourCounts } from '@/components/landing/FourCounts';
import { Hero } from '@/components/landing/Hero';
import { InPageLinks } from '@/components/landing/InPageLinks';
import { LandingBar } from '@/components/landing/LandingBar';
import { LiveAnswer } from '@/components/landing/LiveAnswer';
import { PaceBand } from '@/components/landing/PaceBand';
import { PlanBuilder } from '@/components/landing/PlanBuilder';
import { Pricing } from '@/components/landing/Pricing';

interface LandingSection {
  /**
   * The anchor of the section, unique on the page. The page puts it on a wrapper around the section,
   * so a section does not use this name for an id of its own.
   */
  id: string;
  Component: ComponentType;
  /** Set it to link to the section from the top bar: "How it works", "Method", "Pricing". */
  nav?: string;
}

/**
 * Everything between the live answer and the footer, in page order (Figma 66:1267 and 63:224).
 * The frames also draw "The app", the session review and the month. They need pictures of app screens with
 * history, and the landing shows no numbers it did not compute, so those three are not on the page.
 * A line with `nav` gets its link in the top bar.
 */
const SECTIONS: LandingSection[] = [
  { id: 'counts', Component: FourCounts },
  { id: 'how-it-works', Component: FirstVisitSteps, nav: 'How it works' },
  { id: 'before-after', Component: BeforeAfterToggle },
  { id: 'builder', Component: PlanBuilder },
  { id: 'pace', Component: PaceBand, nav: 'Method' },
  { id: 'pricing', Component: Pricing, nav: 'Pricing' },
  { id: 'answers', Component: Answers },
  { id: 'closing', Component: Closing },
];

/**
 * The landing: the top bar, the first screen, the live answer, the sections above, the footer.
 * White is the page; violet comes as bands, cards and tiles.
 */
export default function Landing() {
  const sectionLinks = SECTIONS.flatMap(({ id, nav }) => (nav ? [{ label: nav, href: `#${id}` }] : []));

  return (
    <div className="split-root">
      <InPageLinks />
      <LandingBar sections={sectionLinks} actionHref={ANSWER_HREF} />
      <main>
        <Hero actionHref={ANSWER_HREF} />
        <LiveAnswer id={ANSWER_ID} />
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
