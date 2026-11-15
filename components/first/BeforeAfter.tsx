'use client';

import { Button, Pattern, SplitScreen, cn } from '@/components/kit';
import { compareRounds } from '@/lib/progress/targets';
import type { Counts, RoundChange } from '@/lib/types';
import { Goodbye } from './RoundOneResult';
import type { BeforeAfterProps } from './types';

/**
 * Round one against round two, per minute, because the two rounds differ in length. Mobile 24:477; there is no
 * desktop frame, so from 1024px it takes the split of the round-one result (32:164).
 * A number that went the other way is shown in calm gray and in the same words: it is a count, not a verdict.
 * Every number comes from the two results: `change` when the flow has it, compareRounds otherwise.
 */

type Measure = keyof RoundChange['perMinute'];

interface Row {
  key: Measure;
  /** The change with its sign: "+4", "−1.5". */
  value: string;
  label: string;
  /** More of a skill, or fewer sentences to swap. */
  good: boolean;
}

const SKILLS: ReadonlyArray<{ key: Exclude<Measure, 'avoid'>; label: string }> = [
  { key: 'reflection', label: 'reflections per minute' },
  { key: 'specific_praise', label: 'specific praise per minute' },
  { key: 'description', label: 'descriptions per minute' },
];

const signed = (perMinute: number): string => `${perMinute > 0 ? '+' : '−'}${Math.round(Math.abs(perMinute) * 10) / 10}`;

/** Everything a parent said that the rules could read. */
const saidIn = (counts: Counts): number => counts.target + counts.avoid + counts.general_praise + counts.neutral;

/**
 * Best news first, as the frame orders it: the skills that grew, the largest first, then fewer sentences to swap.
 * What went the other way comes last. A measure that did not move has no row.
 */
function rowsOf(perMinute: RoundChange['perMinute'], swapLabel: string): Row[] {
  const skill = (s: (typeof SKILLS)[number], good: boolean): Row => ({ key: s.key, value: signed(perMinute[s.key]), label: s.label, good });
  const swap = (good: boolean): Row => ({ key: 'avoid', value: signed(perMinute.avoid), label: swapLabel, good });
  const grew = SKILLS.filter((s) => perMinute[s.key] > 0).sort((a, b) => perMinute[b.key] - perMinute[a.key]);
  const fell = SKILLS.filter((s) => perMinute[s.key] < 0);
  return [
    ...grew.map((s) => skill(s, true)),
    ...(perMinute.avoid < 0 ? [swap(true)] : []),
    ...fell.map((s) => skill(s, false)),
    ...(perMinute.avoid > 0 ? [swap(false)] : []),
  ];
}

export function BeforeAfter({ before, after, change, partner = 'mia', farewell, onNext, onAgain }: BeforeAfterProps) {
  const { perMinute } = change ?? compareRounds(before, after);
  // "To swap" is questions and commands, and corrections when either round had one.
  const corrected = before.counts.criticism + after.counts.criticism > 0;
  const rows = rowsOf(perMinute, corrected ? 'questions, commands and corrections per minute' : 'questions and commands per minute');
  const silent = saidIn(before.counts) + saidIn(after.counts) === 0;

  return (
    <SplitScreen
      pattern={<Pattern kind="sentences" size={1440} className="hidden lg:block" />}
      picture={<Goodbye partner={partner} farewell={farewell} pose="leaning" className="size-[min(230px,28dvh)] lg:size-[min(380px,52dvh)]" />}
    >
      <div className="flex flex-col gap-[14px] pt-[4px] lg:pt-0">
        <h1 className="text-title text-ink">Before and after</h1>
        {rows.length > 0 ? (
          /* TODO kit: a change with its sign beside what changed (24:495). */
          <ul className="flex flex-col gap-[10px]">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center gap-[12px]">
                <span className={cn('min-w-[52px] shrink-0 text-heading whitespace-nowrap', row.good ? 'text-violet' : 'text-faint')}>{row.value}</span>
                <span className={cn('min-w-0 flex-1 text-body', row.good ? 'text-ink' : 'text-gray')}>{row.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-gray">{silent ? 'No sentences in either round yet, so there is nothing to compare.' : 'The same pace in both rounds.'}</p>
        )}
        <p className="text-small text-gray">Clinics start with five calm minutes of play a day, not with discipline.</p>
      </div>
      {/* The actions sit 20px under the words with 4px between them, as drawn; the `action` slot of the shell would set them at 16px. */}
      <div className="flex flex-col gap-[4px] pt-[20px]">
        <Button fullWidth onClick={onNext}>
          See my plan
        </Button>
        {onAgain && (
          <Button variant="ghost" fullWidth onClick={onAgain}>
            Play again
          </Button>
        )}
      </div>
    </SplitScreen>
  );
}
