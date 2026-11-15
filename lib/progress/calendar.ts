/**
 * The daily reminder: five minutes at the family's own moment, as a calendar file any phone can open.
 * Everything here is pure: no clock, no storage, no network. The route app/api/calendar/route.ts serves the file
 * and the sheet components/first/CalendarSheet.tsx links to it.
 */
import { addDays } from './history';
import { PLAN_DAYS } from './plan';

/** Where the file is served. TODO routes: this belongs in lib/routes.ts as ROUTES.api.calendar. */
export const CALENDAR_PATH = '/api/calendar';

/** The length of the daily session the reminder is for. */
export const REMINDER_MINUTES = 5;

// ---------- the time of each moment ----------

/** A usual hour for each moment the product offers, the options of "When can you play for five minutes?". */
const MOMENT_TIMES = new Map<string, string>([
  ['after breakfast', '08:00'],
  ['after daycare', '17:30'],
  ['after dinner', '18:30'],
  ['before bath', '19:00'],
]);

/** Early evening, when most families are home. For no moment, and for one this list does not know. */
const NEUTRAL_TIME = '18:00';

const tidy = (text: string): string => text.trim().replace(/\s+/g, ' ');

/** The time the reminder starts with for a daily moment, as HH:MM. The parent can change it in the sheet. */
export function defaultTimeFor(anchor: string | null): string {
  return (anchor !== null && MOMENT_TIMES.get(tidy(anchor).toLowerCase())) || NEUTRAL_TIME;
}

/** The moment as the sheet shows it: tidy spaces and a capital first letter. Null when there is none. */
export function momentLabel(anchor: string | null): string | null {
  const text = anchor === null ? '' : tidy(anchor);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : null;
}

// ---------- what a reminder may hold ----------

/** HH:MM on a 24-hour clock. */
export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** A real day of this century, YYYY-MM-DD. */
export function isDate(value: string): boolean {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const real = new Date(Date.UTC(year, month - 1, day));
  return real.getUTCFullYear() === year && real.getUTCMonth() === month - 1 && real.getUTCDate() === day;
}

/** A daily moment as short plain text: letters, digits, spaces and the few marks a phrase like "After dinner" needs. */
export function isMoment(value: string): boolean {
  return value.length <= 40 && value === value.trim() && /^[\p{L}\p{N}][\p{L}\p{N} '’,.-]*$/u.test(value);
}

/** The days a reminder repeats for: a whole number inside the plan, so the sheet never asks the route for more. */
export function reminderDays(daysLeft: number): number {
  return Number.isFinite(daysLeft) ? Math.min(PLAN_DAYS, Math.max(1, Math.round(daysLeft))) : 1;
}

// ---------- the "Repeats" row ----------

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "6 December" from YYYY-MM-DD. Read from the string itself, so no time zone can move the day. */
function dayAndMonth(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

/**
 * The value of the "Repeats" row: "Daily to 6 December". The last day is the first day plus `days` minus one.
 * `today` is null until the device's own date is known; the row then says for how long instead of until when.
 */
export function repeatsLabel(today: string | null, days: number): string {
  if (days === 1) return 'Today only';
  return today ? `Daily to ${dayAndMonth(addDays(today, days - 1))}` : `Daily for ${days} days`;
}

// ---------- the link ----------

/** What one reminder link carries. Nothing in it says who the family is: no name, no age. */
export interface ReminderRequest {
  /** HH:MM, on the parent's own clock. */
  time: string;
  /** 1 to 28. */
  days: number;
  /** The first day, YYYY-MM-DD on the parent's own device. */
  start: string;
  /** The daily moment, or null. */
  moment: string | null;
}

/** The link that downloads the reminder. A moment the route would refuse is left out: the reminder works without it. */
export function reminderHref({ time, days, start, moment }: ReminderRequest): string {
  const query = new URLSearchParams({ time, days: String(days), start });
  if (moment !== null && isMoment(moment)) query.set('moment', moment);
  return `${CALENDAR_PATH}?${query.toString()}`;
}

/** Reads a reminder back out of a query. Null when a part is missing or is not what the sheet sends. */
export function parseReminder(query: URLSearchParams): ReminderRequest | null {
  const time = query.get('time');
  const days = query.get('days');
  const start = query.get('start');
  const moment = query.get('moment');
  if (time === null || !isTime(time)) return null;
  if (days === null || !/^[1-9]\d?$/.test(days) || Number(days) > PLAN_DAYS) return null;
  if (start === null || !isDate(start)) return null;
  if (moment !== null && !isMoment(moment)) return null;
  return { time, days: Number(days), start, moment };
}

// ---------- the file ----------

export interface ReminderEvent {
  /** The name of the event in the calendar. */
  title: string;
  /** The first day, YYYY-MM-DD. */
  startDate: string;
  /** HH:MM. Written with no time zone, so it lands at that time on the clock of whoever opens the file. */
  time: string;
  /** How many days in a row, the first one included. */
  days: number;
  durationMin: number;
  /** The notes of the event. Line breaks are kept. */
  description: string;
  /** When the file was made, as an ISO instant. Passed in, because this module reads no clock. */
  dtstamp: string;
}

/**
 * A text value the way RFC 5545 (3.3.11) wants it: backslash, semicolon and comma escaped, a line break written
 * as \n, a tab as a space, every other control character dropped.
 */
export function escapeText(text: string): string {
  let out = '';
  for (const ch of text.replace(/\r\n?/g, '\n')) {
    if (ch === '\n') out += '\\n';
    else if (ch === '\\' || ch === ';' || ch === ',') out += `\\${ch}`;
    else if (ch === '\t') out += ' ';
    else if (ch >= ' ' && ch !== '\u007f') out += ch;
  }
  return out;
}

/** The octets one character takes in UTF-8. */
function octetsOf(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  if (code < 0x80) return 1;
  if (code < 0x800) return 2;
  return code < 0x10000 ? 3 : 4;
}

/**
 * One content line folded the way RFC 5545 (3.1) wants it: no line longer than 75 octets, a longer one continued
 * on the next line after a single space. The cut falls between characters, never inside one.
 */
export function foldLine(line: string): string {
  let out = '';
  let octets = 0;
  for (const ch of line) {
    const size = octetsOf(ch);
    if (octets + size > 75) {
      out += '\r\n ';
      octets = 1;
    }
    out += ch;
    octets += size;
  }
  return out;
}

/** Eight hex digits that change when the text does (FNV-1a). It keeps the UID a function of the event alone. */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * The reminder as an iCalendar file: one event that starts on `startDate` at `time`, lasts `durationMin` minutes,
 * repeats daily `days` times and rings when it starts.
 *
 * The start is a floating local time (no Z, no TZID): 18:30 is 18:30 on the parent's phone wherever it is.
 * The UID is made from the event itself, so adding the same reminder twice leaves one event in the calendar and
 * a changed one is a new event. Lines end in CRLF and are folded at 75 octets.
 */
export function reminderIcs({ title, startDate, time, days, durationMin, description, dtstamp }: ReminderEvent): string {
  if (!isDate(startDate)) throw new RangeError(`startDate is not a day: ${startDate}`);
  if (!isTime(time)) throw new RangeError(`time is not HH:MM: ${time}`);
  if (!Number.isInteger(days) || days < 1) throw new RangeError(`days is not a count of days: ${days}`);
  if (!Number.isInteger(durationMin) || durationMin < 1) throw new RangeError(`durationMin is not a count of minutes: ${durationMin}`);
  const made = Date.parse(dtstamp);
  if (Number.isNaN(made)) throw new RangeError(`dtstamp is not an instant: ${dtstamp}`);

  const day = startDate.replace(/-/g, '');
  const clock = time.replace(':', '');
  const summary = escapeText(title);
  const notes = escapeText(description);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PlayReps//Daily five minutes//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${day}T${clock}-${days}d-${fingerprint(`${durationMin}\n${title}\n${description}`)}@playreps.vercel.app`,
    // 2026-11-15T06:30:00.000Z becomes 20261115T063000Z.
    `DTSTAMP:${new Date(made).toISOString().replace(/[-:]|\.\d+/g, '')}`,
    `DTSTART:${day}T${clock}00`,
    `DURATION:PT${durationMin}M`,
    `RRULE:FREQ=DAILY;COUNT=${days}`,
    `SUMMARY:${summary}`,
    ...(notes ? [`DESCRIPTION:${notes}`] : []),
    // Without an alarm most calendars only show the event; with it the phone rings at the moment.
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${summary}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
