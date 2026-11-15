'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Ring, Segmented, Tag, cn, type SegmentedOption, type TagTone } from '@/components/kit';
import { codeTurn } from '@/lib/coding/classify';
import { ROUND1 } from '@/lib/flow/journey';
import { lessonFor } from '@/lib/lesson/lesson';
import { compareRounds, summarizeRound } from '@/lib/progress/targets';
import { LABEL, type CodedSentence, type Lever, type RoundChange, type RoundResult } from '@/lib/types';
import { Section } from './Section';

/**
 * The example: four moments of one minute of play, each said two ways. They are the first worked example of four
 * lessons (lib/lesson/lesson.ts): round one is the sentence most parents say, round two is the one the lesson teaches.
 * Only the sentences are given. Every tag and every number below comes from running them through the engine.
 */
const MOMENTS: Lever[] = ['question', 'reflection', 'specific_praise', 'command'];

/** Both rounds are one minute, the length of the first round of the first visit. */
const SECONDS = ROUND1.seconds;

type RoundId = 'one' | 'two';

const ROUNDS: ReadonlyArray<SegmentedOption<RoundId>> = [
  { value: 'one', label: 'Round one' },
  { value: 'two', label: 'Round two' },
];

interface Example {
  sentences: Record<RoundId, CodedSentence[]>;
  results: Record<RoundId, RoundResult>;
  change: RoundChange;
}

function runExample(): Example {
  const code = (side: 'insteadOf' | 'say') =>
    MOMENTS.flatMap((lever) => {
      const pair = lessonFor(lever).pairs[0];
      return codeTurn(pair[side], { childLastSaid: pair.childSaid ?? null });
    });
  const sentences = { one: code('insteadOf'), two: code('say') };
  const results = { one: summarizeRound(sentences.one, SECONDS), two: summarizeRound(sentences.two, SECONDS) };
  return { sentences, results, change: compareRounds(results.one, results.two) };
}

const SKILLS = [
  { key: 'specific_praise', name: 'Praise' },
  { key: 'reflection', name: 'Reflect' },
  { key: 'description', name: 'Describe' },
] as const;

/** "+2", "−2": the minus is the real sign, as in the engine's own lines. */
function signed(n: number): string {
  if (n > 0) return `+${n}`;
  return n < 0 ? `−${Math.abs(n)}` : '0';
}

function tagOf(sentence: CodedSentence): { tone: TagTone; label: string } {
  if (sentence.bucket === 'target') return { tone: 'skill', label: LABEL[sentence.code] };
  if (sentence.bucket === 'avoid') return { tone: 'swap', label: `${LABEL[sentence.code]}, to swap` };
  return { tone: 'quiet', label: LABEL[sentence.code] };
}

/** One count with its name and, in round two, its change. The change line keeps its height when it is empty. */
function Count({ name, change, children }: { name: string; change: string | null; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-[6px] lg:gap-[10px]">
      {children}
      <span className="text-small text-gray lg:text-label">{name}</span>
      <span className="min-h-[18px] text-small-strong text-violet">{change}</span>
    </div>
  );
}

const VALUE = 'text-body-strong text-ink lg:text-heading';

/**
 * Landing section 5, "The same minute, played twice." (Figma 66:1429 on phones, 63:431 from 1024px).
 * A worked example, labeled as one: the toggle switches between the two rounds, the rings count the round
 * that is showing, and the lines under them are compareRounds() of the two.
 */
export function BeforeAfterToggle() {
  const [round, setRound] = useState<RoundId>('two');
  const { sentences, results, change } = useMemo(() => runExample(), []);

  const { counts, targets } = results[round];
  /* The change is round two against round one, so it is shown with round two only. */
  const changeOf = (key: keyof RoundChange['perMinute']) => (round === 'two' ? signed(change.perMinute[key]) : null);

  /* The engine lists the good news first: skills that rose, then fewer sentences to swap. The rest is said in gray. */
  const good = SKILLS.filter((skill) => change.perMinute[skill.key] > 0).length + (change.perMinute.avoid < 0 ? 1 : 0);

  return (
    <Section tone="mist">
      <div className="flex flex-col-reverse items-start gap-[10px] lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-title lg:text-title-xl">The same minute, played twice.</h2>
        <Tag tone="quiet">Example</Tag>
      </div>

      <div className="flex flex-col gap-[20px] lg:flex-row lg:items-start lg:gap-[24px]">
        <div className="flex flex-col gap-[14px] rounded-[24px] bg-white px-[16px] pt-[14px] pb-[16px] lg:min-w-0 lg:flex-1 lg:gap-[18px] lg:rounded-[28px] lg:px-[28px] lg:pt-[24px] lg:pb-[24px]">
          <Segmented<RoundId>
            label="Round"
            options={ROUNDS}
            value={round}
            onChange={(next) => setRound(next)}
            fullWidth
            className="lg:[&>label]:h-[40px]"
          />
          <ul className="flex flex-col gap-[14px] lg:gap-[18px]">
            {sentences[round].map((sentence) => {
              const tag = tagOf(sentence);
              return (
                <li key={sentence.text} className="flex flex-col items-start gap-[6px] lg:flex-row lg:items-center lg:gap-[12px]">
                  <span className="text-body text-ink lg:min-w-0 lg:flex-1">“{sentence.text}”</span>
                  <Tag tone={tag.tone}>{tag.label}</Tag>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col rounded-[24px] bg-white px-[16px] pt-[18px] pb-[16px] lg:min-w-0 lg:flex-1 lg:gap-[24px] lg:rounded-[28px] lg:px-[28px] lg:pt-[28px] lg:pb-[28px]">
          <div className="flex items-start justify-between">
            {SKILLS.map((skill) => (
              <Count key={skill.key} name={skill.name} change={changeOf(skill.key)}>
                <Ring
                  progress={targets[skill.key] > 0 ? counts[skill.key] / targets[skill.key] : 0}
                  size={58}
                  className="lg:size-[84px]!"
                >
                  <span className={VALUE}>{counts[skill.key]}</span>
                </Ring>
              </Count>
            ))}
            <Count name="To swap" change={changeOf('avoid')}>
              <span className="grid size-[58px] place-items-center rounded-full bg-mist lg:size-[84px]">
                <span className={VALUE}>{counts.avoid}</span>
              </span>
            </Count>
          </div>

          {/* Drawn on the desktop frame only. */}
          <div className="h-px bg-line max-lg:hidden" />
          <ul className="flex flex-col gap-[24px] max-lg:hidden">
            {change.lines.map((line, i) => {
              const [amount, ...words] = line.split(' ');
              return (
                <li key={line} className="flex items-center gap-[14px]">
                  <span className={cn('w-[52px] shrink-0 text-heading', i < good ? 'text-violet' : 'text-faint')}>{amount}</span>
                  <span className={cn('min-w-0 flex-1 text-body', i < good ? 'text-ink' : 'text-gray')}>{words.join(' ')}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Section>
  );
}
