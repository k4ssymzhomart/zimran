'use client';

import { useRef, useState } from 'react';
import { saveFirstAnswer } from '@/client/firstAnswer';
import { CHILDREN, forChild } from '@/components/child';
import { Button, Chip, Composer, Divider, Pattern, Portrait, Tag, type TagTone } from '@/components/kit';
import { cn, colorMotion, focusRing } from '@/components/kit/cn';
import { codeTurn } from '@/lib/coding/classify';
import { initialJourney, openerInsight } from '@/lib/flow/journey';
import { countCodes } from '@/lib/progress/targets';
import { ROUTES } from '@/lib/routes';
import { BUCKET, LABEL, type Bucket, type CodedSentence, type PartnerId } from '@/lib/types';
import { ANSWER_ID } from './anchors';
import { Section } from './Section';

/** The landing answers Mia, as drawn. The first visit asks who to practice with. */
const PARTNER: PartnerId = 'mia';

/** The line the first visit opens with, so a sentence typed here is read there the same way. */
const OPENER = initialJourney().opener;

/** Sentences to try with one click (Figma 63:276). Each goes through the same rules as a typed one. */
const TRY_SAYING = ['You made a tower!', 'Good job stacking so gently.', 'What is that?'];

const TONE: Record<Bucket, TagTone> = { target: 'skill', avoid: 'swap', neutral: 'quiet', none: 'quiet' };

interface Reading {
  /** The answer as it was sent. */
  text: string;
  coded: CodedSentence[];
}

/** What the panel shows for an answer: the tag, one line about what it did, and the four counts. */
function describe({ text, coded }: Reading) {
  const insight = openerInsight(coded);
  // The sentence the line is about is the engine's own pick: ask it about each sentence alone.
  const code = coded.find((sentence) => openerInsight([sentence]) === insight)?.code ?? 'unknown';
  const bucket = BUCKET[code];
  const counts = countCodes(coded);
  return {
    text,
    // A sentence to swap says so, as it does on every screen of the product.
    label: bucket === 'avoid' ? `${LABEL[code]}, to swap` : LABEL[code],
    tone: TONE[bucket],
    line: forChild(insight.headline, PARTNER),
    tallies: [
      { label: 'Praise', value: counts.specific_praise, skill: true },
      { label: 'Reflect', value: counts.reflection, skill: true },
      { label: 'Describe', value: counts.description, skill: true },
      { label: 'To swap', value: counts.avoid, skill: false },
    ],
  };
}

export interface LiveAnswerProps {
  /** The anchor every "Try one answer" on the page leads to. */
  id?: string;
}

/**
 * Section 2 of the landing (Figma 66:1282 on phones, 63:252 from 1024px). Mia says her first line and the
 * visitor answers in their own words. The rules in lib/coding read the sentence on the spot, and the one
 * action carries it into the first visit, so nobody types it twice.
 * "Try one answer" anywhere on the page leads here; InPageLinks scrolls to it and lands in the field.
 */
export function LiveAnswer({ id = ANSWER_ID }: LiveAnswerProps) {
  const child = CHILDREN[PARTNER];
  const [value, setValue] = useState('');
  const [reading, setReading] = useState<Reading | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  // A reading belongs to the sentence in the field. Once the visitor edits the sentence, it steps aside.
  const shown = reading !== null && reading.text === value.trim() ? describe(reading) : null;

  function read(text: string) {
    setValue(text);
    setReading({ text, coded: codeTurn(text, { childLastSaid: OPENER.childSaid }) });
    // A phone keyboard would cover the reading: put it away, then bring the whole panel into view.
    if (window.matchMedia('(pointer: coarse)').matches && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    requestAnimationFrame(() => panel.current?.scrollIntoView({ block: 'nearest' }));
  }

  return (
    <Section id={id}>
      <h2 className="text-title lg:text-title-xl">Say one thing to {child.name}.</h2>

      {/* Under 360px the card and the panel keep 8px at the sides, so the field has room for its own words. */}
      <div
        className="relative flex flex-col gap-[12px] overflow-clip rounded-[28px] bg-violet px-[14px] pt-[18px] pb-[14px] text-white max-[360px]:px-[8px] lg:min-h-[440px] lg:flex-row lg:items-center lg:gap-[44px] lg:rounded-[32px] lg:py-0 lg:pr-[40px] lg:pl-[48px]"
      >
        <Pattern kind="sentences" className="[--pattern-size:864px] lg:[--pattern-size:1440px]" />

        {/* The child and her line: beside the portrait on phones, above it from 1024px. */}
        <div className="relative flex items-end gap-[8px] pl-[6px] lg:w-[280px] lg:shrink-0 lg:flex-col lg:items-start lg:gap-[10px] lg:self-stretch lg:pt-[36px] lg:pl-0 xl:w-[330px]">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-[10px] pb-[14px] lg:contents">
            <Chip tone="on-violet">Simulated child</Chip>
            <p className="text-heading lg:mt-auto lg:text-title">“{forChild(OPENER.childSaid, PARTNER)}”</p>
          </div>
          <Portrait partner={PARTNER} pose="smiling" size={250} className="h-auto w-[120px] lg:w-[250px]" />
        </div>

        <div
          ref={panel}
          className="relative flex flex-col gap-[12px] rounded-[22px] bg-white p-[14px] text-ink max-[360px]:px-[8px] lg:my-[20px] lg:min-w-0 lg:flex-1 lg:gap-[18px] lg:rounded-[28px] lg:p-[28px]"
        >
          <Composer
            value={value}
            onChange={setValue}
            onSubmit={read}
            placeholder={`Say something to ${child.name}`}
            className="max-[360px]:[&_input]:placeholder:text-label"
          />

          {/* TODO kit: a chip that is 38px tall and lilac while its sentence is the one that was read. */}
          <ul aria-label="Sentences to try" className="hidden flex-wrap gap-[8px] lg:flex">
            {TRY_SAYING.map((sentence) => {
              const on = shown?.text === sentence;
              return (
                <li key={sentence}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => read(sentence)}
                    className={cn(
                      'inline-flex h-[38px] cursor-pointer items-center rounded-[19px] px-[16px] text-label whitespace-nowrap text-ink',
                      on ? 'bg-lilac' : 'bg-mist active:bg-line',
                      colorMotion,
                      focusRing,
                    )}
                  >
                    {sentence}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Always on the page, so a screen reader hears the reading when it arrives. */}
          <p role="status" className="sr-only">
            {shown ? `${shown.label}. ${shown.line}` : ''}
          </p>

          {shown && (
            <>
              <Divider className="hidden lg:block" />
              <p className="flex items-center gap-[10px] lg:gap-[12px]">
                <Tag tone={shown.tone}>{shown.label}</Tag>
                <span className="min-w-0 flex-1 text-label lg:text-body-strong">{shown.line}</span>
              </p>
              {/* Side by side once the panel is wide enough for both, from 1280px. */}
              <div className="flex flex-col gap-[12px] lg:gap-[18px] xl:flex-row xl:items-center xl:justify-between">
                <dl className="flex justify-between xl:justify-start xl:gap-[28px]">
                  {shown.tallies.map((tally) => (
                    <div key={tally.label} className="flex flex-col-reverse">
                      <dt className="text-small text-gray">{tally.label}</dt>
                      <dd className={cn('text-body-strong lg:text-heading', tally.skill && tally.value > 0 && 'text-violet')}>
                        {tally.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <Button href={ROUTES.start} fullWidth className="xl:w-[200px]" onClick={() => saveFirstAnswer(shown.text)}>
                  Build my plan
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}
