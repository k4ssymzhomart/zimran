'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { todayISO } from '@/client/progressStore';
import { Art, Button, Divider, Pattern, PlanRow, RowChevron, Sheet, cn, focusRingWithin } from '@/components/kit';
import { defaultTimeFor, isTime, momentLabel, reminderDays, reminderHref, repeatsLabel } from '@/lib/progress/calendar';
import type { CalendarSheetProps } from './quizTypes';

/** The frozen props of the sheet, and one more the flow may pass. */
export interface CalendarSheetOwnProps extends CalendarSheetProps {
  /**
   * The Moment row was tapped: the flow goes back to "When can you play for five minutes?".
   * Without it the row only shows the moment, with no arrow, because it would lead nowhere.
   */
  onEditMoment?(): void;
}

/**
 * "Put five minutes in your calendar." Mobile 62:1460: a sheet with the moment, the time and how long it repeats.
 *
 * "Add to calendar" is a plain link to app/api/calendar/route.ts, which answers with a calendar file: one event at
 * the chosen time on the parent's own clock, every day for the days left in the plan. Nothing is saved anywhere
 * else, and the link carries no name.
 */
export function CalendarSheet({ open, anchor, daysLeft, onClose, onEditMoment }: CalendarSheetOwnProps) {
  /** The time the parent set, with the moment it was set for. Until then, and for a new moment, the time follows the moment. */
  const [chosen, setChosen] = useState<{ anchor: string | null; time: string } | null>(null);
  /** Today on this device, YYYY-MM-DD. Read after mount and again each time the sheet opens or closes, never during render. */
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    // One tick later, so the first paint matches the prerendered page and no state is set inside the effect itself.
    const timer = window.setTimeout(() => setToday(todayISO()), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const moment = momentLabel(anchor);
  const time = chosen !== null && chosen.anchor === anchor ? chosen.time : defaultTimeFor(anchor);
  const days = reminderDays(daysLeft);
  const href = today === null ? null : reminderHref({ time, days, start: today, moment });

  return (
    // The frame spaces the picture, the title and the rows 16px apart.
    <Sheet open={open} onClose={onClose} title={TITLE} art={BELL} className="gap-[16px]!">
      <div className="flex flex-col gap-[16px]">
        <div className="flex flex-col">
          <Divider />
          <PlanRow compact label="Moment" value={moment ?? 'Not set'} onClick={onEditMoment} />
          <Divider />
          <TimeRow value={time} onChange={(next) => setChosen({ anchor, time: next })} />
          <Divider />
          <PlanRow compact label="Repeats" value={repeatsLabel(today, days)} />
        </div>
        {/* TODO kit: a Sheet action that is a link. The kit's own actions are buttons, and this one has to be a link. */}
        <div className="flex flex-col gap-[2px]">
          {href === null ? (
            // Only until the date is read, one tick after mount: the same pill, not yet a link.
            <Button fullWidth aria-disabled>
              Add to calendar
            </Button>
          ) : (
            // `download` keeps next/link out of the way: the browser itself follows the link and takes the file.
            // The sheet closes a tick later, after the browser has started on the link.
            <Button fullWidth href={href} download prefetch={false} onClick={() => window.setTimeout(onClose, 0)}>
              Add to calendar
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={onClose}>
            Not now
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

/**
 * "Put five minutes in your calendar." The last two words are held together, so the title breaks after "in", as the
 * frame draws it, on a phone of any width.
 */
const TITLE = 'Put five minutes in your calendar.';

/** The picture of the sheet: the bell on a 76px violet tile with the everyday pattern. */
const BELL = (
  <div className="relative flex size-[76px] shrink-0 items-center justify-center overflow-clip rounded-[22px] bg-violet">
    <Pattern kind="reps" size={576} />
    <Art name="bell" size={52} className="relative" />
  </div>
);

/**
 * "7:30 PM" from "19:30", "12:00 PM" from "12:00", "12:15 AM" from "00:15". Only the drawn copy changes: the state,
 * the native field and the calendar file keep HH:MM. Anything that is not HH:MM is drawn as it is.
 */
function clock12(time: string): string {
  if (!isTime(time)) return time;
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

/**
 * The Time row: the look of a compact PlanRow over a native time field. The field is not drawn, but it covers the
 * whole row, takes every tap and key, and opens the picker the phone already has.
 * TODO kit: a PlanRow that can hold a native control.
 */
function TimeRow({ value, onChange }: { value: string; onChange(time: string): void }) {
  const field = useRef<HTMLInputElement>(null);
  /**
   * The time the field held when it last took focus. It is the field's `value` attribute, and that is what
   * "Reset" in the iPhone picker puts the field back to, while it turns its wheels back to the time they opened
   * with. Kept the same, the two never disagree. (Measured on iOS 26: a field whose attribute follows every
   * change, as a controlled React field does, makes "Reset" move the wheels and leave the time as it was.)
   */
  const [atFocus, setAtFocus] = useState(value);

  // That is why React does not control this field: it keeps its own value while it is being used. A time that
  // changes from outside, with a new moment, is written into it here.
  useEffect(() => {
    const node = field.current;
    if (node && node.value !== value) node.value = value;
  }, [value]);

  return (
    <label className={cn('relative flex min-h-[52px] w-full cursor-pointer items-center gap-[8px]', focusRingWithin)}>
      <span className="min-w-0 flex-1 text-body text-gray">Time</span>
      {/* The field reads its own value aloud; this is the copy that is drawn, on the clock an American reader uses. */}
      <span aria-hidden className="shrink-0 whitespace-nowrap text-body-strong text-ink">
        {clock12(value)}
      </span>
      <RowChevron />
      <input
        ref={field}
        type="time"
        defaultValue={atFocus}
        onFocus={() => setAtFocus(value)}
        // A field cleared halfway while typing has no time yet: the row keeps the last whole one.
        onChange={(event) => {
          if (isTime(event.target.value)) onChange(event.target.value);
        }}
        // And a field left that way goes back to the time the row shows.
        onBlur={(event) => {
          if (event.currentTarget.value !== value) event.currentTarget.value = value;
        }}
        onClick={openPicker}
        className="absolute inset-0 size-full cursor-pointer text-body opacity-0"
      />
    </label>
  );
}

/** With a mouse, a browser opens the picker of a time field only from its small clock icon. Here the row is the field. */
function openPicker(event: MouseEvent<HTMLInputElement>) {
  // A finger already opens the picker by itself.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  try {
    event.currentTarget.showPicker();
  } catch {
    // This browser has no picker to show. Typing the time into the focused row still works.
  }
}
