'use client';

import { useState } from 'react';
import { Art, Pattern, cn } from '@/components/kit';
import { NORM_SECONDS, paceTargets } from '@/lib/progress/targets';
import { Section } from './Section';

/** The clinic norm is written for five minutes of play, so the slider ends there. One minute is the shortest round. */
const MAX_MINUTES = NORM_SECONDS / 60;
const MIN_MINUTES = 1;
const IN_WORDS = ['One minute', 'Two minutes', 'Three minutes', 'Four minutes', 'Five minutes'];

function lengthInWords(minutes: number): string {
  return IN_WORDS[minutes - 1] ?? `${minutes} minutes`;
}

/**
 * The knob is 28px wide and stays inside the track, as a native range thumb does:
 * its left edge sits at a share of the room that is left beside it.
 */
const ROOM = '(100% - 28px)';
/** Where the knob's left edge is at the shortest length: the track starts at 0:00, the slider at one minute. */
const FIRST_STOP = `${MIN_MINUTES / MAX_MINUTES} * ${ROOM}`;

/**
 * Landing section 10, "The pace clinics teach." (Figma 66:1711 on phones, 64:442 from 1024px).
 * The slider sets the length of play; the four numbers are paceTargets() for that length, the same function
 * that sets the rings of every round. Nothing is stored.
 */
export function PaceBand() {
  const [minutes, setMinutes] = useState(MAX_MINUTES);
  const pace = paceTargets(minutes * 60);

  const numbers = [
    { id: 'praise', count: pace.specific_praise, one: 'praise', many: 'praises' },
    { id: 'reflection', count: pace.reflection, one: 'reflection', many: 'reflections' },
    { id: 'description', count: pace.description, one: 'description', many: 'descriptions' },
    { id: 'swap', count: pace.maxAvoid, one: 'question or command, at most', many: 'questions or commands, at most' },
  ].map((n) => ({ id: n.id, count: n.count, label: n.count === 1 ? n.one : n.many }));

  const share = minutes / MAX_MINUTES;

  return (
    <Section tone="violet" className="overflow-clip lg:pt-[88px] lg:pb-[88px]">
      <Pattern kind="bars" className="lg:[--pattern-size:1440px]" />

      <div className="relative flex flex-col lg:flex-row lg:items-center lg:gap-[64px]">
        <div className="flex min-w-0 flex-col gap-[22px] lg:flex-1 lg:gap-[36px]">
          <div className="flex items-end gap-[12px]">
            <h2 className="min-w-0 flex-1 text-title lg:text-title-xl">The pace clinics teach.</h2>
            <Art name="scales" size={96} className="lg:hidden" />
          </div>

          <ul className="grid grid-cols-2 gap-x-[12px] gap-y-[16px] lg:flex lg:items-start lg:gap-[56px]">
            {numbers.map((n) => (
              /* The columns keep the width of the widest number, so nothing moves as the slider does. */
              <li key={n.id} className={cn('flex flex-col lg:gap-[2px]', n.id === 'swap' ? 'lg:w-[190px]' : 'lg:min-w-[83px]')}>
                <span className="text-number lg:text-display-xl">{n.count}</span>
                <span className="text-label lg:text-body">{n.label}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-[22px] lg:max-w-[640px] lg:gap-[10px]">
            <div className="relative h-[8px] rounded-[4px] bg-violet-press">
              {/*
               * The control is a native range input, invisible, laid over the part of the track it can reach
               * (one minute to five). Its thumb is 44px for the thumb of a hand, so the input reaches 8px past
               * the knob on each side and a tap lands where the knob is drawn. The fill and the knob follow it.
               */}
              <input
                type="range"
                min={MIN_MINUTES}
                max={MAX_MINUTES}
                step={1}
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                aria-label="Length of play"
                aria-valuetext={`${lengthInWords(minutes)}: ${numbers.map((n) => `${n.count} ${n.label}`).join(', ')}`}
                style={{ left: `calc(${FIRST_STOP} - 8px)`, width: `calc(100% - ${FIRST_STOP} + 16px)` }}
                className="peer absolute top-1/2 m-0 h-[44px] -translate-y-1/2 cursor-pointer appearance-none opacity-0 [&::-moz-range-thumb]:size-[44px] [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:size-[44px] [&::-webkit-slider-thumb]:appearance-none"
              />
              {/* A tap on the track before the first stop goes to the first stop. The keyboard has Home for it. */}
              <span
                aria-hidden="true"
                onClick={() => setMinutes(MIN_MINUTES)}
                style={{ width: `calc(${FIRST_STOP} - 8px)` }}
                className="absolute top-1/2 left-0 h-[44px] -translate-y-1/2 cursor-pointer"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none h-full rounded-[4px] bg-white"
                style={{ width: `calc(${share} * ${ROOM} + 28px)` }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 size-[28px] -translate-y-1/2 rounded-full bg-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white"
                style={{ left: `calc(${share} * ${ROOM})` }}
              />
            </div>
            <div className="flex items-start justify-between text-small lg:text-label">
              <span>0:00</span>
              <span>{lengthInWords(minutes)}</span>
            </div>
          </div>

          <p className="text-small lg:hidden">PCIT protocol, Eyberg &amp; Funderburk, 2011</p>
          <p className="text-small max-lg:hidden">Parent–Child Interaction Therapy protocol, Eyberg &amp; Funderburk, 2011</p>
        </div>

        <Art name="scales" size={300} className="max-lg:hidden lg:size-[220px] xl:size-[300px]" />
      </div>
    </Section>
  );
}
