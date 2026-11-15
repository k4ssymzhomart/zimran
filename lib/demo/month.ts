/**
 * The demo month for the jury: a guest mode with demo data and time moved forward, marked as demo (the case FAQ
 * calls this a good solution). It is 27 days of a simulated family that end yesterday, so today is day 28 of the
 * plan. Every sentence goes through the real rules (simulateFamily); only the parent's learning curve is invented.
 * The sessions are saved like real ones, with ids that start with DEMO_ID so they can be shown as demo and removed.
 */
import { BLOCKS, DRAWING } from '../child/scenes';
import { addDays } from '../progress/history';
import type { SavedSession, SavedSentence } from '../types';
import { simulateFamily } from './simulate';

export const DEMO_ID = 'demo-';
export const DEMO_DAYS = 27;
const SEED = 7;

export const isDemoSession = (session: { id: string }): boolean => session.id.startsWith(DEMO_ID);

/**
 * The 27 demo sessions before `today` (YYYY-MM-DD). `startOf` turns a day into the session's start time; the
 * browser passes local 7:30 pm, the tests a fixed time.
 */
export function demoMonth(today: string, startOf: (date: string) => string): SavedSession[] {
  const { days } = simulateFamily(SEED, addDays(today, -DEMO_DAYS), DEMO_DAYS);
  return days.map(({ day, date, result, sentences }) => {
    // The simulation has no clock: the sentences are spread evenly over the five minutes.
    const step = result.seconds / Math.max(1, sentences.length);
    const said: SavedSentence[] = sentences.map((s, i) => ({
      text: s.text,
      code: s.code,
      rule: s.rule,
      startSec: Math.round(i * step),
      atSec: Math.round((i + 1) * step),
    }));
    return {
      id: `${DEMO_ID}${date}`,
      kind: 'daily',
      startedAt: startOf(date),
      date,
      durationSec: result.seconds,
      sceneId: day % 2 === 1 ? BLOCKS.id : DRAWING.id,
      partner: 'mia',
      counts: result.counts,
      targets: result.targets,
      met: result.met,
      input: 'typed',
      sentences: said,
    };
  });
}
