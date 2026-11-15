'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Art, Pattern, Ring, Tag, type ArtName, type TagTone } from '@/components/kit';
import { cn, focusRing, focusRingOnViolet } from '@/components/kit/cn';
import { codeTurn } from '@/lib/coding/classify';
import { initialJourney, ROUND1 } from '@/lib/flow/journey';
import { countCodes, paceTargets } from '@/lib/progress/targets';
import { LABEL, type Bucket } from '@/lib/types';
import { Section } from './Section';

/**
 * The line the first visit opens with. A reflection is the child's own words said back,
 * so the rules read every sentence of the strip against this line.
 */
const OPENER = initialJourney().opener;

/** The strip as drawn (Figma 63:334): six things a parent might say after that line. */
const SENTENCES = [
  'Good job stacking so gently.',
  'You made a tower!',
  'What is that?',
  'Put it here.',
  'You are putting the blue one on top.',
  'Thank you for sharing the blocks.',
];

/**
 * A ring is full at the clinic pace for round one of the first visit: paceTargets() scales the clinic norm
 * (NORM_PER_SKILL of each skill in NORM_SECONDS) to the length of that round, as it does for every round.
 */
const PACE = paceTargets(ROUND1.seconds);

type Skill = 'specific_praise' | 'reflection' | 'description';

const SKILLS: { key: Skill; name: string; art: ArtName }[] = [
  { key: 'specific_praise', name: 'Praise', art: 'praise' },
  { key: 'reflection', name: 'Reflect', art: 'reflect' },
  { key: 'description', name: 'Describe', art: 'describe' },
];

const TONE: Record<Bucket, TagTone> = { target: 'skill', avoid: 'swap', neutral: 'quiet', none: 'quiet' };

/** Every sentence of the strip as the rules in lib/coding read it. Nothing about a sentence is labelled by hand. */
function readStrip() {
  return SENTENCES.flatMap((text) =>
    codeTurn(text, { childLastSaid: OPENER.childSaid })
      .slice(0, 1)
      .map((coded) => ({
        text,
        coded,
        tone: TONE[coded.bucket],
        label: coded.bucket === 'avoid' ? `${LABEL[coded.code]}, to swap` : LABEL[coded.code],
      })),
  );
}

/** Scrolls the strip, gliding unless the visitor asked for less motion. */
function glide(row: HTMLElement, left: number) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  row.scrollTo({ left, behavior: still ? 'auto' : 'smooth' });
}

const NUMBER = 'text-title tabular-nums lg:text-display';
/** 20px of text inside a 44px target. Only the text color eases, so the focus ring shows in its own color at once. */
const TEXT_ACTION = cn(
  'h-[44px] cursor-pointer rounded-[22px] px-[18px] text-label transition-[color] duration-quick ease-out-quint motion-reduce:transition-none',
  focusRing,
);
/** A label takes `duration-quick` (200ms) to open. Its sentence is measured just after. */
const LABEL_OPEN_MS = 220;

/**
 * Landing section 3, "Three things to say more. One to swap." (Figma 66:1319 and 66:1353 on phones;
 * 63:304, 63:334 and 63:349 from 1024px). The visitor sorts the sentences of the strip: a tap shows the label
 * the rules give a sentence and counts it. Every number here is a count of the sentences sorted so far.
 */
export function FourCounts() {
  const strip = useMemo(() => readStrip(), []);
  const [sorted, setSorted] = useState<boolean[]>(() => strip.map(() => false));
  const [touched, setTouched] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const reveal = useRef<number | undefined>(undefined);
  const sortAllButton = useRef<HTMLButtonElement>(null);
  const startOverButton = useRef<HTMLButtonElement>(null);

  useEffect(() => () => window.clearTimeout(reveal.current), []);

  const counts = countCodes(strip.filter((_, i) => sorted[i]).map((sentence) => sentence.coded));
  const anySorted = sorted.some(Boolean);
  const allSorted = sorted.every(Boolean);

  function toggle(index: number) {
    setTouched(true);
    setSorted((was) => was.map((on, i) => (i === index ? !on : on)));
    window.clearTimeout(reveal.current);
    if (!sorted[index]) reveal.current = window.setTimeout(() => showLabel(index), LABEL_OPEN_MS);
  }

  /** A sentence grows when its label opens. Bring its far end into view, so the edge of the strip does not cut the label. */
  function showLabel(index: number) {
    const row = list.current;
    const item = row?.children[index];
    if (!row || !(item instanceof HTMLElement)) return;
    const edge = Number.parseFloat(getComputedStyle(row).paddingRight) || 0;
    const left = item.offsetLeft + item.offsetWidth + edge - row.clientWidth;
    if (left > row.scrollLeft) glide(row, left);
  }

  /** "Sort all" and "Start over" each step aside once done, and hand the keyboard focus to the other. */
  function setAll(on: boolean) {
    const leaving = on ? sortAllButton.current : startOverButton.current;
    const hadFocus = leaving !== null && document.activeElement === leaving;
    window.clearTimeout(reveal.current);
    flushSync(() => {
      setTouched(true);
      setSorted(strip.map(() => on));
    });
    if (hadFocus) (on ? startOverButton : sortAllButton).current?.focus();
    // Starting over goes back to the first sentence.
    if (!on && list.current) glide(list.current, 0);
  }

  return (
    <div>
      <Section className="pt-[12px] pb-[24px] lg:pt-[56px] lg:pb-[48px]">
        <div className="flex flex-col gap-[20px] lg:items-center lg:gap-[48px]">
          <h2 className="text-title lg:text-center lg:text-title-xl">Three things to say more. One to swap.</h2>

          <dl className="grid grid-cols-2 gap-x-[22px] gap-y-[20px] lg:flex lg:w-full lg:max-w-[960px] lg:justify-between">
            {SKILLS.map((skill) => (
              <Count key={skill.key} name={skill.name} art={skill.art}>
                <Ring progress={counts[skill.key] / PACE[skill.key]} size={108} className="lg:size-[168px]!">
                  <span className={NUMBER}>
                    {counts[skill.key]}
                    <span className="sr-only"> of {PACE[skill.key]}</span>
                  </span>
                </Ring>
              </Count>
            ))}
            {/* Sentences to swap are a count on a flat disc, never a ring to fill. */}
            <Count name="To swap" art="swap">
              <span className="grid size-[108px] shrink-0 place-items-center rounded-full bg-mist lg:size-[168px]">
                <span className={NUMBER}>{counts.avoid}</span>
              </span>
            </Count>
          </dl>

          {/* Always on the page, so a screen reader hears the counts when they change. */}
          <p role="status" className="sr-only">
            {touched
              ? `Praise ${counts.specific_praise}, reflect ${counts.reflection}, describe ${counts.description}, to swap ${counts.avoid}.`
              : ''}
          </p>
        </div>
      </Section>

      <div className="relative overflow-clip bg-violet">
        <Pattern kind="sentences" className="[--pattern-size:864px] lg:[--pattern-size:1440px]" />
        {/* The row scrolls sideways under the page column: its first sentence starts where the words above start. */}
        <ul
          ref={list}
          aria-label="Sentences to sort"
          className={cn(
            'relative flex gap-[10px] overflow-x-auto px-[24px] py-[20px] scroll-px-[24px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            'lg:gap-[12px] lg:px-[48px] lg:py-[34px] lg:scroll-px-[48px]',
            'xl:px-[max(120px,calc(50%-600px))] xl:scroll-px-[max(120px,calc(50%-600px))]',
          )}
        >
          {strip.map((sentence, i) => {
            const on = sorted[i];
            return (
              <li key={sentence.text} className="shrink-0">
                {/* TODO kit: a white sentence pill on violet that opens to show its label. */}
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(i)}
                  className={cn(
                    'flex h-[44px] cursor-pointer items-center rounded-[22px] bg-white pl-[16px] text-label whitespace-nowrap text-ink active:bg-lilac',
                    'lg:h-[52px] lg:rounded-[26px] lg:pl-[22px] lg:text-body-strong',
                    on ? 'pr-[9px] lg:pr-[13px]' : 'pr-[16px] lg:pr-[22px]',
                    'transition-[background-color,padding] duration-quick ease-out-quint motion-reduce:transition-none',
                    focusRingOnViolet,
                  )}
                >
                  “{sentence.text}”
                  {/* The label slides out of the sentence: the column grows from nothing to the width of the tag. */}
                  <span
                    aria-hidden={on ? undefined : true}
                    className={cn(
                      'grid transition-[grid-template-columns] duration-quick ease-out-quint motion-reduce:transition-none',
                      on ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]',
                    )}
                  >
                    <span className="flex min-w-0 overflow-hidden">
                      <Tag tone={sentence.tone} className="ml-[8px]">
                        {sentence.label}
                      </Tag>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Drawn from 1024px only. On phones a second tap on a sentence takes it back out of the count. */}
      <div className="relative z-[1] -mb-[12px] hidden justify-center pt-[16px] lg:flex">
        <button
          ref={sortAllButton}
          type="button"
          onClick={() => setAll(true)}
          className={cn(TEXT_ACTION, 'text-violet', allSorted && 'invisible')}
        >
          Sort all
        </button>
        <button
          ref={startOverButton}
          type="button"
          onClick={() => setAll(false)}
          className={cn(TEXT_ACTION, 'text-gray hover:text-ink', !anySorted && 'invisible')}
        >
          Start over
        </button>
      </div>
    </div>
  );
}

/** One of the four counts: the ring or the disc, then the picture and the name of what is counted. */
function Count({ name, art, children }: { name: string; art: ArtName; children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse items-center gap-[6px] lg:gap-[10px]">
      <dt className="flex items-center gap-[6px] lg:flex-col lg:gap-[10px]">
        <Art name={art} size={40} className="size-[24px] lg:size-[40px]" />
        <span className="text-body-strong lg:text-heading">{name}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
