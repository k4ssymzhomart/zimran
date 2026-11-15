import type { JourneyPhase } from '@/lib/flow/journey';

/** How far along the first visit a phase is, for the progress line at the top of the funnel screens. */
const ORDER: JourneyPhase[] = ['opener', 'opener_reveal', 'ready1', 'round1', 'result1', 'lesson', 'round2', 'change', 'setup', 'plan'];

export function journeyProgress(phase: JourneyPhase): number {
  const i = ORDER.indexOf(phase);
  return i < 0 ? 0 : (i + 1) / ORDER.length;
}
