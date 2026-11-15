/**
 * The calendar reminder, the pure part: which moments of the day a parent can pick, the link a screen
 * gives them, and the text of the calendar file. Nothing here reads the clock: today's date, the time stamp
 * and the site address arrive as arguments. The route that serves the file is app/api/ics/route.ts.
 */

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

const SUMMARY = 'PlayReps: five minutes of play';
const SESSION_MINUTES = 5;
/** One event a day for the 28 days of the plan. */
const REMINDER_DAYS = 28;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isIsoDay = (v: string): boolean => ISO_DAY.test(v);

/**
 * Where a screen sends the parent for the file: GET /api/ics?anchor=LABEL, plus the parent's own date so that
 * "tomorrow" is their tomorrow and not the server's.
 */
export function calendarPath(anchor: Anchor, today?: string): string {
  return `/api/ics?anchor=${encodeURIComponent(anchor)}${today && isIsoDay(today) ? `&today=${today}` : ''}`;
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
 * The calendar file, or null when the anchor is not one of the four labels. One five-minute event a day for
 * 28 days, starting the day after `today`, with a reminder at its start. The event time is "floating" (no time
 * zone), so 19:00 means 19:00 on the parent's own clock wherever the calendar app runs.
 */
export function buildCalendar(input: { anchor: string; today: string; stamp: string; origin: string }): string | null {
  if (!isAnchor(input.anchor)) return null;
  const time = ANCHOR_TIMES[input.anchor];

  const day = dayAfter(input.today);
  const startMinutes = time.hour * 60 + time.minute;
  const endMinutes = startMinutes + SESSION_MINUTES;
  const at = (minutes: number) => `${day}T${two(Math.floor(minutes / 60))}${two(minutes % 60)}00`;
  const slug = input.anchor.toLowerCase().replace(/[^a-z]+/g, '-');
  const host = input.origin.replace(/^https?:\/\//, '');
  const description = `${input.anchor}: five minutes of play, one small skill a day. Open today's session at ${input.origin}/dashboard`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PlayReps//Five minutes of play//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:playreps-${day}-${slug}@${host}`,
    `DTSTAMP:${input.stamp}`,
    `DTSTART:${at(startMinutes)}`,
    `DTEND:${at(endMinutes)}`,
    `RRULE:FREQ=DAILY;COUNT=${REMINDER_DAYS}`,
    `SUMMARY:${escapeText(SUMMARY)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${input.origin}/dashboard`,
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
