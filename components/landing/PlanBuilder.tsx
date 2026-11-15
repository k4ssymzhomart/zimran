'use client';

import { useId, useState } from 'react';
import { CHILDREN, forChild } from '@/components/child';
import { Art, Button, Pattern, Portrait, cn, colorMotion, focusRingWithin, type ArtName } from '@/components/kit';
import { pickOnEnter } from '@/components/kit/cn';
import { SCENES } from '@/lib/child/scenes';
import { PLAN, PLAN_DAYS } from '@/lib/progress/plan';
import { ROUTES } from '@/lib/routes';
import type { PartnerId } from '@/lib/types';
import { Section } from './Section';

const PARTNERS: PartnerId[] = ['mia', 'leo'];

/** The object that stands for each scene of the engine, and how the plan sentence names it. */
const TOY_OF: Record<string, { art: ArtName; named: string }> = {
  blocks: { art: 'blocks', named: 'the blocks' },
  drawing: { art: 'crayons', named: 'the crayons' },
};

/** The scenes the engine can play (lib/child/scenes.ts), under their own titles. */
const TOYS = SCENES.flatMap((scene) => (TOY_OF[scene.id] ? [{ id: scene.id, title: scene.title, ...TOY_OF[scene.id] }] : []));

/** The four moments of the day the plan can be tied to, as on the "When will you play?" screen. */
const MOMENTS: { label: string; art: ArtName }[] = [
  { label: 'After breakfast', art: 'breakfast' },
  { label: 'After daycare', art: 'daycare' },
  { label: 'After dinner', art: 'dinner' },
  { label: 'Before bath', art: 'bath' },
];

/** The weeks of the real plan (lib/progress/plan.ts): the first day of a week names its skill. */
const WEEKS = [...new Set(PLAN.map((day) => day.week))].map((week) => {
  const days = PLAN.filter((day) => day.week === week);
  return { week, title: days[0].title, days: days.map((day) => day.day) };
});

/**
 * The title of a week, said about the chosen partner. The plan is written about Mia, and forChild rewrites it:
 * "her" becomes "his" before a noun from its own list and "him" before anything else, so a title with a noun
 * it has not met would read "Be him sportscaster". In a week title "her" before a word is the thing that is
 * hers ("her lead", "her words"), so it is settled here. After "let" she is the one acting; forChild keeps that rule.
 */
function weekTitle(title: string, partner: PartnerId): string {
  if (partner === 'mia') return title;
  const hers = title.replace(/\b([Hh])er\b(?=\s+\S)/g, (match: string, h: string, offset: number) =>
    /\blet\s+$/i.test(title.slice(0, offset)) ? match : `${h}is`,
  );
  return forChild(hers, partner);
}

/** A white card with a gray caption from 1024px. On phones the choices sit on the page and the caption is for screen readers. */
const CARD = 'flex flex-col lg:min-w-0 lg:flex-1 lg:gap-[16px] lg:rounded-[28px] lg:bg-white lg:p-[24px]';
const CAPTION = 'text-label text-gray max-lg:sr-only';

/**
 * Landing section 8, "Pick the partner, the toy, the moment." (Figma 66:1596 on phones, 64:301 from 1024px).
 * A taste of the real plan: three choices, the 28 days they lead to, and one sentence that says the plan back.
 * Nothing is stored; the action starts the first visit, where the plan is really built.
 */
export function PlanBuilder() {
  const [partner, setPartner] = useState<PartnerId>('mia');
  const [toyId, setToyId] = useState(TOYS[0].id);
  const [moment, setMoment] = useState(MOMENTS[2].label);
  const id = useId();

  const toy = TOYS.find((t) => t.id === toyId) ?? TOYS[0];
  const sentence = `Five minutes ${moment.toLowerCase()}, with ${CHILDREN[partner].name} and ${toy.named}.`;

  return (
    /*
     * On the page this section follows another one on mist: the frames draw two white sections between them
     * that the landing leaves out. So it starts closer, at the distance the frames keep between two sections
     * of one color (pricing and the answers): 56px on phones, 144px from 1024px.
     */
    <Section tone="mist" className="pt-[12px] lg:pt-[40px]">
      <h2 className="text-title lg:text-title-xl">Pick the partner, the toy, the moment.</h2>

      <div className="flex flex-col gap-[20px] lg:flex-row lg:gap-[24px]">
        <div className={CARD}>
          <h3 id={`${id}-partner`} className={CAPTION}>
            Partner
          </h3>
          <div role="radiogroup" aria-labelledby={`${id}-partner`} className="flex gap-[12px]">
            {PARTNERS.map((p) => (
              // TODO kit: the partner tile, a portrait on violet with an ink outline when chosen.
              <label
                key={p}
                className={cn(
                  'relative flex h-[150px] min-w-0 flex-1 cursor-pointer flex-col overflow-clip rounded-[24px] bg-violet pt-[12px] pl-[14px] text-white lg:h-[190px] lg:pt-[14px] lg:pl-[16px]',
                  focusRingWithin,
                )}
              >
                <input
                  type="radio"
                  name={`${id}-partner`}
                  value={p}
                  checked={p === partner}
                  onChange={() => setPartner(p)}
                  onKeyDown={pickOnEnter}
                  className="sr-only"
                />
                <span className="text-heading">{CHILDREN[p].name}</span>
                <span className="flex min-h-0 flex-1 items-end justify-end">
                  <Portrait partner={p} size={132} className="size-[104px] lg:size-[132px]" />
                </span>
                {/* The outline of the chosen one, drawn over the tile so that nothing moves on select. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute inset-0 rounded-[24px] border-[3px]',
                    p === partner ? 'border-ink' : 'border-transparent',
                    colorMotion,
                  )}
                />
              </label>
            ))}
          </div>
        </div>

        <div className={CARD}>
          <h3 id={`${id}-toy`} className={CAPTION}>
            Toy
          </h3>
          {/* Side by side on phones, as drawn. Under 360px a tile is too narrow for its label, so they stack. */}
          <div role="radiogroup" aria-labelledby={`${id}-toy`} className="flex gap-[12px] max-[360px]:flex-col lg:flex-col lg:gap-[16px]">
            {TOYS.map((t) => (
              // TODO kit: a choice tile at this size (64px on phones, 87px from 1024px) with a strong label.
              <label
                key={t.id}
                className={cn(
                  'relative flex h-[64px] min-w-0 flex-1 cursor-pointer items-center gap-[8px] rounded-[20px] text-ink max-[360px]:flex-none lg:h-[87px] lg:flex-none lg:gap-[12px]',
                  /* The chosen border is 1px thicker; the padding gives that pixel back. */
                  t.id === toyId ? 'border-2 border-violet bg-lilac px-[11px] lg:px-[15px]' : 'border border-line bg-white px-[12px] lg:px-[16px]',
                  colorMotion,
                  focusRingWithin,
                )}
              >
                <input
                  type="radio"
                  name={`${id}-toy`}
                  value={t.id}
                  checked={t.id === toyId}
                  onChange={() => setToyId(t.id)}
                  onKeyDown={pickOnEnter}
                  className="sr-only"
                />
                <Art name={t.art} size={52} className="size-[38px] lg:size-[52px]" />
                <span className="min-w-0 flex-1 text-body-strong">{t.title}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={CARD}>
          <h3 id={`${id}-moment`} className={CAPTION}>
            Moment
          </h3>
          <div role="radiogroup" aria-labelledby={`${id}-moment`} className="flex flex-wrap gap-[8px] lg:flex-col lg:flex-nowrap lg:gap-[16px]">
            {MOMENTS.map((m) => (
              // TODO kit: a white chip on a mist page (phones), and a 40px row with a small object (from 1024px).
              <label
                key={m.label}
                className={cn(
                  /* A 38px chip on phones, reaching 3px past its edges for the thumb; a full-width row from 1024px. */
                  'relative inline-flex h-[38px] cursor-pointer items-center rounded-[19px] text-label whitespace-nowrap after:absolute after:inset-x-0 after:-inset-y-[3px]',
                  'lg:flex lg:h-[40px] lg:gap-[10px] lg:rounded-[16px] lg:text-ink',
                  m.label === moment
                    ? 'bg-ink px-[14px] text-white lg:border-2 lg:border-violet lg:bg-lilac lg:px-[11px]'
                    : 'bg-white px-[14px] text-ink lg:border lg:border-line lg:px-[12px]',
                  colorMotion,
                  focusRingWithin,
                )}
              >
                <input
                  type="radio"
                  name={`${id}-moment`}
                  value={m.label}
                  checked={m.label === moment}
                  onChange={() => setMoment(m.label)}
                  onKeyDown={pickOnEnter}
                  className="sr-only"
                />
                <Art name={m.art} size={26} className="max-lg:hidden" />
                <span className="lg:min-w-0 lg:flex-1">{m.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* The 28 days of the plan, drawn as the plan calendar of the landing is (Figma 66:1637, 64:357), with no day played yet. */}
      <div className="flex flex-col rounded-[24px] bg-white px-[14px] pt-[16px] pb-[14px] lg:gap-[16px] lg:rounded-[28px] lg:px-[24px] lg:pt-[24px] lg:pb-[24px]">
        <h3 id={`${id}-days`} className={CAPTION}>
          {PLAN_DAYS} days
        </h3>
        <ol aria-labelledby={`${id}-days`} className="grid gap-[12px] md:grid-cols-2 md:gap-x-[24px] lg:gap-y-[20px] xl:grid-cols-4">
          {WEEKS.map(({ week, title, days }) => (
            <li key={week} className="flex min-w-0 flex-col gap-[6px] lg:gap-[10px]">
              <p className="flex flex-col">
                <span className="text-small text-gray max-lg:hidden">Week {week}</span>
                <span className="text-small-strong text-gray lg:text-body-strong lg:text-ink">{weekTitle(title, partner)}</span>
                <span className="sr-only">
                  Days {days[0]} to {days[days.length - 1]}
                </span>
              </p>
              <div aria-hidden="true" className="flex justify-between gap-[6px]">
                {days.map((day) => (
                  <span
                    key={day}
                    className="grid aspect-square min-w-0 max-w-[36px] flex-1 place-items-center rounded-full bg-lilac text-small-strong text-ink xl:max-w-[32px]"
                  >
                    {day}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="relative flex flex-col gap-[14px] overflow-clip rounded-[24px] bg-violet pt-[18px] pr-[16px] pb-[16px] pl-[18px] text-white lg:min-h-[104px] lg:flex-row lg:items-center lg:justify-between lg:gap-[24px] lg:rounded-[28px] lg:pt-[24px] lg:pr-[24px] lg:pb-[24px] lg:pl-[36px]">
        <Pattern kind="reps" className="[--pattern-size:864px] lg:[--pattern-size:1440px]" />
        <p aria-live="polite" className="relative text-heading text-balance lg:min-w-0">
          {sentence}
        </p>
        <Button href={ROUTES.start} variant="white" className="relative w-full lg:w-[220px]">
          Build my plan
        </Button>
      </div>
    </Section>
  );
}
