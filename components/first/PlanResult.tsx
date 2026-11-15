'use client';

import { forChild } from '@/components/child';
import { Art, Button, Pattern, SplitScreen, Tag, cn } from '@/components/kit';
import { PLAN, PLAN_DAYS, planDay } from '@/lib/progress/plan';
import type { PartnerId } from '@/lib/types';
import type { PlanResultProps } from './types';

/** One row per week of the plan: the first day of a week names its skill ("Follow her lead"). */
const WEEKS = PLAN.filter((one, index) => index === 0 || one.week !== PLAN[index - 1].week);

/**
 * What comes after today, as a fact: "Tomorrow" over "A way to turn any question into a statement."
 * The plan writes every teaser as "Tomorrow: ..." or "Next: ..." (lib/progress/plan.test.ts holds each one to it).
 */
function comingUp(teaser: string): { label: string; text: string } {
  const colon = teaser.indexOf(': ');
  if (colon < 1) return { label: 'Next', text: teaser };
  const text = teaser.slice(colon + 2);
  return { label: teaser.slice(0, colon), text: text.charAt(0).toUpperCase() + text.slice(1) };
}

/**
 * The plan's words on their way to the screen, about the chosen child.
 * TODO components/child.tsx: forChild turns "her sportscaster" into "him sportscaster", because the word is not in
 * its list of what follows a possessive "her". Corrected here until it is corrected there.
 */
function shown(text: string, partner: PartnerId): string {
  return forChild(text, partner).replace(/\bhim sportscaster\b/g, 'his sportscaster');
}

/**
 * The screen before this one is gone with the button that was pressed. The headline takes the focus, without a
 * ring: a screen reader reads it, and the next Tab reaches the action.
 */
function takeFocus(heading: HTMLElement | null) {
  heading?.focus({ preventScroll: true });
}

/**
 * A day of the plan starts and the 28 days are laid out. Phones are Figma 24:568, from 1024px it is 32:272;
 * the daily moment sits in the mist card that 49:1651 keeps it in.
 *
 * Everything shown comes from `day`, `anchor` and the plan in lib/progress/plan.ts: the weeks and their skills,
 * which week is now, and the plan's own line about tomorrow, which is the teaser of the day that is done.
 * This screen is given no results, so the share of the clinic pace and the pace cards of 49:1651 are not here.
 *
 * The two actions are the two of the frame, and each leads where it says: "Open my plan" to the plan itself
 * (`onOpenPlan`), the quiet "Unlock daily sessions" to the plans and their price (`onNext`). A flow that has only
 * the way to the plans passes no `onOpenPlan`, and the screen then has that one control.
 */
export function PlanResult({ partner, anchor, day, onNext, onOpenPlan }: PlanResultProps) {
  const done = Number.isFinite(day) ? Math.min(PLAN_DAYS, Math.max(1, Math.floor(day))) : 1;
  const today = planDay(done);
  const next = comingUp(shown(today.teaser, partner));
  const moment = anchor?.trim() || null;

  return (
    <SplitScreen
      // The phone frame is flat violet; the bars come with the desktop block.
      pattern={<Pattern kind="bars" size={1440} className="hidden lg:block" />}
      picture={<Art name="plan" size={320} priority className="size-[170px] lg:size-[min(320px,43dvh)]" />}
      action={
        onOpenPlan ? (
          // 4px between the pill and the quiet action, as drawn (24:568, 32:272).
          <div className="flex flex-col gap-[4px]">
            <Button fullWidth onClick={onOpenPlan}>
              Open my plan
            </Button>
            <Button variant="ghost" fullWidth onClick={onNext}>
              Unlock daily sessions
            </Button>
          </div>
        ) : (
          <Button fullWidth onClick={onNext}>
            Open my plan
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-[12px] pt-[4px] lg:pt-0">
        <h1 ref={takeFocus} tabIndex={-1} className="text-title outline-none">
          Day {done} of {PLAN_DAYS} starts now.
        </h1>

        <ol aria-label="The weeks of your plan" className="flex flex-col">
          {WEEKS.map((week, index) => {
            const now = week.week === today.week;
            return (
              <li
                key={week.week}
                aria-current={now ? 'step' : undefined}
                className={cn('flex items-center gap-[14px] py-[11px]', index > 0 && 'border-t border-line')}
              >
                <span className={cn('w-[62px] shrink-0 text-label whitespace-nowrap', now ? 'text-violet' : 'text-gray')}>Week {week.week}</span>
                <span className={cn('min-w-0 flex-1 text-ink', now ? 'text-body-strong' : 'text-body')}>{shown(week.title, partner)}</span>
                {now && <Tag tone="skill">Now</Tag>}
              </li>
            );
          })}
        </ol>

        {/* TODO kit: the facts of SummaryCard on their own. The kit card always leads with a share of the clinic pace. */}
        <dl className="grid grid-cols-3 gap-[8px] rounded-[24px] bg-mist p-[18px]">
          <div className={cn('flex min-w-0 flex-col gap-[2px]', moment ? 'col-span-2' : 'col-span-3')}>
            <dt className="text-small text-gray">{next.label}</dt>
            <dd className="text-label text-ink">{next.text}</dd>
          </div>
          {moment && (
            <div className="flex min-w-0 flex-col gap-[2px]">
              <dt className="text-small whitespace-nowrap text-gray">Daily moment</dt>
              <dd className="text-label wrap-break-word text-ink">{moment}</dd>
            </div>
          )}
        </dl>
      </div>
    </SplitScreen>
  );
}
