'use client';

import Image from 'next/image';
import { useState } from 'react';
import { forChild } from '@/components/child';
import { Composer, Icon, IconButton, Tag, type TagTone } from '@/components/kit';
import { codeSentence } from '@/lib/coding/classify';
import { isSafetyConcern, SAFETY_NOTE } from '@/lib/coding/safety';
import { BUCKET, LABEL, type Code, type CodedSentence, type PartnerId } from '@/lib/types';

/** What the simulated child just said while the parent tries a sentence: it is what a reflection says back. */
const CHILD_SAID = 'I made a tower!';

/** The three skills and the tray "to swap" (Figma 62:1494). Written about Mia: passed through forChild. */
const KINDS: readonly { art: string; title: string; line: string; example: string }[] = [
  { art: '/art/praise.png', title: LABEL.specific_praise, line: 'Names what you liked.', example: '“Good job stacking so gently.”' },
  { art: '/art/reflect.png', title: LABEL.reflection, line: 'Her words, said back.', example: 'She says “I made a tower!” You say “You made a tower!”' },
  { art: '/art/describe.png', title: LABEL.description, line: 'What she is doing, said as she does it.', example: '“You are putting the red block on top.”' },
  {
    art: '/art/swap.png',
    title: 'To swap',
    line: `A ${LABEL.question.toLowerCase()}, a ${LABEL.command.toLowerCase()} or a ${LABEL.criticism.toLowerCase()} takes the lead from her. Each one can become a skill.`,
    example: '“What are you making?” becomes “You are making a tall tower.”',
  },
];

/** The order of the checks in lib/coding/classify.ts: the first one that fits gives the code. */
const ORDER: readonly { code: Code; rule: string }[] = [
  { code: 'reflection', rule: 'Her own line, said back word for word.' },
  { code: 'criticism', rule: 'Says no to what she is doing, or puts it down.' },
  { code: 'command', rule: 'Tells her what to do, also when it is asked: “Can you hand me that?”' },
  { code: 'question', rule: 'Asks her something.' },
  { code: 'specific_praise', rule: 'Praise that names what exactly.' },
  { code: 'general_praise', rule: 'Praise that names nothing: “Good job!”' },
  { code: 'reflection', rule: 'Says her words back.' },
  { code: 'description', rule: 'Says what she is doing.' },
  { code: 'neutral', rule: 'Any other play talk.' },
];

/** What a coded sentence means, beside its tag. Written about Mia. */
const MEANING: Record<Code, string> = {
  specific_praise: 'Names what you liked.',
  reflection: 'Her words, said back.',
  description: 'What she is doing, said as she does it.',
  general_praise: 'Kind words. Name what you liked to make it specific.',
  neutral: 'Play talk. It counts neither way.',
  question: 'A question leads. Try saying what she is doing.',
  command: 'An instruction leads. Try saying what she is doing.',
  criticism: 'A correction. Try praising what went well.',
  unknown: 'Not play talk, so it counts for nothing.',
};

const TONE: Record<string, TagTone> = { target: 'skill', avoid: 'swap', neutral: 'quiet', none: 'quiet' };

/** "How coding works" (Figma 62:1494): the codes, the order of the rules, and a field to try a sentence. */
export function CodingGuide({ partner, onBack }: { partner: PartnerId; onBack(): void }) {
  const [draft, setDraft] = useState('');
  const [tried, setTried] = useState<{ coded: CodedSentence; safety: boolean } | null>(null);
  const about = (text: string): string => forChild(text, partner);

  const tryIt = (text: string): void => {
    const sentence = text.trim();
    if (sentence === '') return;
    setTried({ coded: codeSentence(sentence, { childLastSaid: about(CHILD_SAID) }), safety: isSafetyConcern(sentence) });
    setDraft('');
  };

  return (
    <div className="flex w-full max-w-[640px] flex-col px-[24px] pb-[24px] lg:mx-auto lg:pt-[24px]">
      <div className="flex min-h-[56px] items-center">
        <IconButton label="Back to Profile" onClick={onBack} className="ml-[-10px]">
          <Icon name="back" />
        </IconButton>
      </div>
      <h1 className="pb-[14px] text-title">How coding works</h1>

      <div className="divide-y divide-line border-b border-line">
        {KINDS.map((kind, i) => (
          <details key={kind.title} open={i === 0} className="group">
            <summary className="flex min-h-[54px] cursor-pointer list-none items-center gap-[14px] [&::-webkit-details-marker]:hidden">
              <Image src={kind.art} alt="" width={30} height={30} className="size-[30px] shrink-0 object-contain" />
              <span className="flex-1 text-body-strong">{kind.title}</span>
              <span className="text-gray transition-transform group-open:rotate-180">
                <Icon name="chevron-down" size={20} />
              </span>
            </summary>
            <div className="flex flex-col gap-[6px] pb-[16px]">
              <p className="text-body text-gray">{about(kind.line)}</p>
              <p className="text-body text-ink">{about(kind.example)}</p>
            </div>
          </details>
        ))}
      </div>

      <section aria-labelledby="coding-order" className="pt-[22px]">
        <h2 id="coding-order" className="text-heading">
          The order of the rules
        </h2>
        <p className="pt-[6px] text-label text-gray">Each sentence is checked in this order. The first rule that fits gives the code.</p>
        <ol className="flex flex-col gap-[10px] pt-[12px]">
          {ORDER.map((step, i) => (
            <li key={`${step.code}-${i}`} className="flex items-start gap-[12px]">
              <span className="w-[20px] shrink-0 text-label text-gray">{i + 1}.</span>
              <span className="flex flex-1 flex-wrap items-center gap-[8px] text-label text-ink">
                <Tag tone={TONE[BUCKET[step.code]]}>{LABEL[step.code]}</Tag>
                {about(step.rule)}
              </span>
            </li>
          ))}
        </ol>
        <p className="pt-[12px] text-label text-gray">
          {LABEL.unknown}: talk that is not play, or another language. It counts for nothing.
        </p>
      </section>

      <section aria-labelledby="coding-try" className="pt-[26px]">
        <h2 id="coding-try" className="text-label text-gray">
          Try a sentence
        </h2>
        <p className="pt-[4px] text-label text-gray">{about(`Mia just said “${CHILD_SAID}”`)}</p>
        <Composer value={draft} onChange={setDraft} onSubmit={tryIt} placeholder="You made a tower!" className="mt-[10px]" />
        <div aria-live="polite" className="min-h-[32px] pt-[12px]">
          {tried && (
            <div className="flex flex-col gap-[8px]">
              <p className="flex flex-wrap items-center gap-[10px]">
                <Tag tone={TONE[tried.coded.bucket]}>{LABEL[tried.coded.code]}</Tag>
                <span className="text-body text-gray">{about(MEANING[tried.coded.code])}</span>
              </p>
              <p className="text-label text-ink">“{tried.coded.text}”</p>
              {tried.safety && <p className="text-label text-ink">{SAFETY_NOTE.body}</p>}
            </div>
          )}
        </div>
      </section>

      <p className="pt-[28px] text-center text-small text-gray">Rules on this device code every sentence.</p>
    </div>
  );
}
