/**
 * The words of "Your plan, from your answers." (Figma 49:1573) and the one rule behind its "Praise to practice" row.
 * Pure functions with no state: the screen shows only what the parent chose and what round one counted.
 *
 * This file is not called planFromAnswers.ts because PlanFromAnswers.tsx sits beside it: on a disk that ignores
 * case an import of "./PlanFromAnswers" would land here instead of on the screen.
 */
import type { Habit, Lever } from '@/lib/types';
import type { MomentId } from './quiz/moments';

const HABIT_LABEL: Record<Habit, string> = {
  gentle: 'Being gentle',
  sharing: 'Sharing',
  patient: 'Being patient',
  tidy: 'Tidying up',
};

/** How the plan names a behavior the simulated child shows in play and the parent can praise. */
export function habitLabel(habit: Habit): string {
  return HABIT_LABEL[habit];
}

/**
 * The same advice as LEVER_TEXT in lib/progress/targets.ts, cut down to the two to four words a plan row holds.
 * No "her" or "his" in them, so they read the same with Mia and with Leo.
 */
const LEVER_LABEL: Record<Lever, string> = {
  question: 'Swap questions',
  command: 'Swap instructions',
  criticism: 'Swap corrections',
  specific_praise: 'Name what you liked',
  reflection: 'Say the words back',
  description: 'Describe what you see',
};

/** How the plan names the one thing to work on first. */
export function leverLabel(lever: Lever): string {
  return LEVER_LABEL[lever];
}

/**
 * Each hard moment of the quiz (./quiz/moments.ts) points to the behavior that helps in it. Play is where that
 * behavior shows up calm and small, so that is where the parent practices catching it and praising it by name.
 * A moment added to the quiz does not compile until it has its line here.
 */
const HABIT_OF_MOMENT: Record<MomentId, Habit> = {
  // Mornings are a row of small jobs to finish and put away: clothes, cup, shoes.
  mornings: 'tidy',
  // A meal asks for careful hands: the food stays on the plate, the cup is set down.
  mealtimes: 'gentle',
  // Leaving the house starts with stopping the game and packing it up.
  leaving: 'tidy',
  // A screen that goes off is a wait for the next turn.
  screens_off: 'patient',
  // Bedtime is a long wait with very little to do.
  bedtime: 'patient',
  // The moment names the behavior itself: handing a toy over, giving a turn.
  sharing: 'sharing',
};

function isMoment(id: string): id is MomentId {
  return Object.hasOwn(HABIT_OF_MOMENT, id);
}

/**
 * The one behavior to praise first, from the hardest moments the parent picked.
 * The behavior that most of the picked moments point to comes first. When two are level, the one whose moment comes
 * earlier in the list stays. A moment counts once, an id this rule does not know counts for nothing, and with
 * nothing to go on the answer is null: the plan then says so and makes nothing up.
 */
export function habitFor(momentIds: readonly string[]): Habit | null {
  const votes = new Map<Habit, number>();
  for (const id of new Set(momentIds)) {
    if (!isMoment(id)) continue;
    const habit = HABIT_OF_MOMENT[id];
    votes.set(habit, (votes.get(habit) ?? 0) + 1);
  }

  // A Map hands its keys back in the order they first came in, so on a level count the earlier moment keeps its place.
  let first: Habit | null = null;
  let most = 0;
  for (const [habit, count] of votes) {
    if (count > most) {
      first = habit;
      most = count;
    }
  }
  return first;
}
