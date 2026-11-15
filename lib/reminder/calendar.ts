/**
 * The calendar reminder, the pure part: which moments of the day a parent can pick, the links a screen
 * gives them, and the text of the calendar file. Nothing here reads the clock: today's date, the time stamp
 * and the site address arrive as arguments. The route that serves the file is app/api/ics/route.ts.
 */
import { ROUTES } from '../routes';

/** The four moments a parent can pick in setup, and the local time each one stands for. */
const ANCHOR_TIMES = {
  'After breakfast': { hour: 8, minute: 0 },
  'After daycare': { hour: 17, minute: 30 },
  'After dinner': { hour: 19, minute: 0 },
  'Before bath': { hour: 19, minute: 30 },
} as const;

export type Anchor = keyof typeof ANCHOR_TIMES;

/** The labels as the setup question shows them, in order. */
export const ANCHORS = Object.keys(ANCHOR_TIMES) as Anchor[];

export const isAnchor = (v: unknown): v is Anchor => typeof v === 'string' && Object.hasOwn(ANCHOR_TIMES, v);

/** The words of the link on every screen that offers the reminder. */
export const CALENDAR_LINK_TEXT = 'Add my five minutes to the calendar';
/** The words of the second link, for a parent who keeps a Google calendar and no calendar app for files. */
export const GOOGLE_CALENDAR_LINK_TEXT = 'Add to Google Calendar';

const SUMMARY = 'Fammy: five minutes of play';
const SESSION_MINUTES = 5;
/** One event a day for the days of the plan that are left: 28 at most, and 28 when nobody says. */
const REMINDER_DAYS = 28;
/** Where the reminder takes the parent: straight into today's session, not to a page with one more tap. */
/** Where the reminder opens: the daily session, wherever the route map puts it. */
const SESSION_PATH = ROUTES.daily;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isIsoDay = (v: string): boolean => ISO_DAY.test(v);

/** How many daily events to write: the plan days left, kept between 1 and 28. Anything that is not a number is 28. */
export function reminderDays(days?: number): number {
  if (days === undefined || !Number.isFinite(days)) return REMINDER_DAYS;
  return Math.min(REMINDER_DAYS, Math.max(1, Math.floor(days)));
}

/**
 * Where a screen sends the parent for the file: GET /api/ics?anchor=LABEL, plus the parent's own date so that
 * "tomorrow" is their tomorrow and not the server's, plus the plan days left so that a family on day 20
 * does not get reminders for three weeks after the plan ends.
 */
export function calendarPath(anchor: Anchor, today?: string, days?: number): string {
  const date = today && isIsoDay(today) ? `&today=${today}` : '';
  const count = days === undefined ? '' : `&days=${reminderDays(days)}`;
  return `/api/ics?anchor=${encodeURIComponent(anchor)}${date}${count}`;
}

const two = (n: number): string => String(n).padStart(2, '0');

/** Text values in iCalendar escape backslash, semicolon, comma and line breaks (RFC 5545, 3.3.11). */
export const escapeText = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 characters continue on the next line after one space (RFC 5545, 3.1). Content here is ASCII. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(' ' + line.slice(i, i + 74));
  return parts.join('\r\n');
}

/** The calendar day after `isoDay` ("YYYY-MM-DD"), as "YYYYMMDD". Month and year ends roll over. */
export function dayAfter(isoDay: string): string {
  const m = ISO_DAY.exec(isoDay);
  if (!m) throw new Error('dayAfter expects YYYY-MM-DD');
  const next = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1));
  return `${next.getUTCFullYear()}${two(next.getUTCMonth() + 1)}${two(next.getUTCDate())}`;
}

/**
 * The daily event both the file and the Google link describe: five minutes at the anchor's local time,
 * starting the day after `today`. The times are "floating" (no time zone), so 19:00 means 19:00 on the
 * parent's own clock wherever the calendar runs.
 */
function dailyEvent(anchor: Anchor, today: string, origin: string, days?: number) {
  const time = ANCHOR_TIMES[anchor];
  const day = dayAfter(today);
  const startMinutes = time.hour * 60 + time.minute;
  const at = (minutes: number) => `${day}T${two(Math.floor(minutes / 60))}${two(minutes % 60)}00`;
  const link = `${origin}${SESSION_PATH}`;
  return {
    day,
    start: at(startMinutes),
    end: at(startMinutes + SESSION_MINUTES),
    rule: `RRULE:FREQ=DAILY;COUNT=${reminderDays(days)}`,
    link,
    description: `${anchor}: five minutes of play, one small skill a day. Open today's session at ${link}`,
  };
}

/**
 * The calendar file, or null when the anchor is not one of the four labels. One five-minute event a day for
 * `days` days (the plan days left; 28 when left out), starting the day after `today`, with a reminder at its start.
 */
export function buildCalendar(input: { anchor: string; today: string; stamp: string; origin: string; days?: number }): string | null {
  if (!isAnchor(input.anchor)) return null;
  const event = dailyEvent(input.anchor, input.today, input.origin, input.days);
  const slug = input.anchor.toLowerCase().replace(/[^a-z]+/g, '-');
  const host = input.origin.replace(/^https?:\/\//, '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fammy//Five minutes of play//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:fammy-${event.day}-${slug}@${host}`,
    `DTSTAMP:${input.stamp}`,
    `DTSTART:${event.start}`,
    `DTEND:${event.end}`,
    event.rule,
    `SUMMARY:${escapeText(SUMMARY)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `URL:${event.link}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(SUMMARY)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/**
 * The same daily event as a Google Calendar link, for a parent whose phone does nothing with a calendar file.
 * Null when the anchor is not one of the four labels or `today` is not a date. Nothing is sent by this code:
 * the link opens Google's own "new event" page with the fields filled in, and the parent saves it there.
 */
export function googleCalendarUrl(input: { anchor: string; today: string; origin: string; days?: number }): string | null {
  if (!isAnchor(input.anchor) || !isIsoDay(input.today)) return null;
  const event = dailyEvent(input.anchor, input.today, input.origin, input.days);
  const fields: [string, string][] = [
    ['action', 'TEMPLATE'],
    ['text', SUMMARY],
    ['dates', `${event.start}/${event.end}`],
    ['recur', event.rule],
    ['details', event.description],
  ];
  return `https://calendar.google.com/calendar/render?${fields.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}
