import { describe, expect, it } from 'vitest';
import {
  CALENDAR_PATH,
  defaultTimeFor,
  escapeText,
  foldLine,
  isDate,
  isMoment,
  isTime,
  momentLabel,
  parseReminder,
  reminderDays,
  reminderHref,
  reminderIcs,
  repeatsLabel,
  type ReminderEvent,
} from './calendar';

/** Sample values, for these tests only. */
const EVENT: ReminderEvent = {
  title: 'PlayReps: five minutes of play',
  startDate: '2026-11-15',
  time: '18:30',
  days: 28,
  durationMin: 5,
  description: 'After dinner. Five minutes of practice.',
  dtstamp: '2026-11-15T06:30:00.000Z',
};

const octets = (text: string): number => new TextEncoder().encode(text).length;

/** The content lines of a file, unfolded the way a calendar reads them. */
const contentLines = (ics: string): string[] => ics.replace(/\r\n /g, '').split('\r\n');

/** The value of the first content line with this name. */
const valueOf = (ics: string, name: string): string | undefined =>
  contentLines(ics)
    .find((line) => line.startsWith(`${name}:`))
    ?.slice(name.length + 1);

describe('defaultTimeFor', () => {
  it('gives each moment the product offers its own hour, in the order of the day', () => {
    const times = ['After breakfast', 'After daycare', 'After dinner', 'Before bath'].map(defaultTimeFor);
    expect(times).toEqual(['08:00', '17:30', '18:30', '19:00']);
    expect([...times].sort()).toEqual(times);
  });

  it('reads a moment however it was stored', () => {
    expect(defaultTimeFor('after dinner')).toBe('18:30');
    expect(defaultTimeFor('  BEFORE   bath ')).toBe('19:00');
  });

  it('falls back to one neutral hour with no moment, or with one it does not know', () => {
    expect(defaultTimeFor(null)).toBe('18:00');
    expect(defaultTimeFor('')).toBe('18:00');
    expect(defaultTimeFor('After swimming')).toBe('18:00');
    expect(defaultTimeFor('constructor')).toBe('18:00');
  });

  it('always answers with a time the file accepts', () => {
    for (const anchor of [null, 'After breakfast', 'After daycare', 'After dinner', 'Before bath', 'Whenever']) {
      expect(isTime(defaultTimeFor(anchor))).toBe(true);
    }
  });
});

describe('momentLabel', () => {
  it('tidies the moment and starts it with a capital', () => {
    expect(momentLabel('after dinner')).toBe('After dinner');
    expect(momentLabel('  Before   bath ')).toBe('Before bath');
  });

  it('is null when there is no moment', () => {
    expect(momentLabel(null)).toBeNull();
    expect(momentLabel('   ')).toBeNull();
  });
});

describe('isTime, isDate, isMoment', () => {
  it('takes HH:MM on a 24-hour clock and nothing else', () => {
    for (const ok of ['00:00', '07:05', '18:30', '23:59']) expect(isTime(ok)).toBe(true);
    for (const no of ['24:00', '18:60', '7:05', '18:30:00', '6:30 PM', '', '18.30', '18:30\n']) expect(isTime(no)).toBe(false);
  });

  it('takes a real day and nothing else', () => {
    for (const ok of ['2026-11-15', '2028-02-29', '2026-12-31']) expect(isDate(ok)).toBe(true);
    for (const no of ['2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10', '2026-11-00', '1999-11-15', '2026-1-5', '15-11-2026', '']) {
      expect(isDate(no)).toBe(false);
    }
  });

  it('takes a moment as short plain text', () => {
    for (const ok of ['After dinner', 'before bath', 'After Grandma’s visit', "After mom's shift, at 6", 'Après le dîner']) {
      expect(isMoment(ok)).toBe(true);
    }
    const tooLong = 'After dinner and the dishes and the bath too';
    expect(tooLong.length).toBeGreaterThan(40);
    for (const no of ['', ' After dinner', 'After dinner ', 'After\ndinner', 'A;B', 'a\\b', '<b>', 'After: dinner', tooLong]) {
      expect(isMoment(no)).toBe(false);
    }
  });
});

describe('reminderDays', () => {
  it('keeps the days whole and inside the plan', () => {
    expect(reminderDays(28)).toBe(28);
    expect(reminderDays(1)).toBe(1);
    expect(reminderDays(0)).toBe(1);
    expect(reminderDays(-3)).toBe(1);
    expect(reminderDays(40)).toBe(28);
    expect(reminderDays(12.4)).toBe(12);
    expect(reminderDays(Number.NaN)).toBe(1);
  });
});

describe('repeatsLabel', () => {
  it('names the last day: the first day plus the days, minus one', () => {
    expect(repeatsLabel('2026-11-09', 28)).toBe('Daily to 6 December');
    expect(repeatsLabel('2026-11-15', 2)).toBe('Daily to 16 November');
  });

  it('crosses a year and a leap day', () => {
    expect(repeatsLabel('2026-12-20', 28)).toBe('Daily to 16 January');
    expect(repeatsLabel('2028-02-27', 4)).toBe('Daily to 1 March');
  });

  it('says so when one day is left', () => {
    expect(repeatsLabel('2026-11-15', 1)).toBe('Today only');
    expect(repeatsLabel(null, 1)).toBe('Today only');
  });

  it('says for how long while the date is not known yet', () => {
    expect(repeatsLabel(null, 28)).toBe('Daily for 28 days');
  });
});

describe('reminderHref and parseReminder', () => {
  const request = { time: '18:30', days: 28, start: '2026-11-15', moment: 'After dinner' };
  const queryOf = (href: string): URLSearchParams => new URLSearchParams(href.slice(href.indexOf('?') + 1));

  it('builds a link to the route that reads back as the same reminder', () => {
    const href = reminderHref(request);
    expect(href.startsWith(`${CALENDAR_PATH}?`)).toBe(true);
    expect(parseReminder(queryOf(href))).toEqual(request);
  });

  it('carries the time, the days, the first day and the moment, and nothing about the family', () => {
    expect([...queryOf(reminderHref(request)).keys()].sort()).toEqual(['days', 'moment', 'start', 'time']);
  });

  it('leaves out a missing moment, and one the route would refuse', () => {
    expect(queryOf(reminderHref({ ...request, moment: null })).has('moment')).toBe(false);
    expect(queryOf(reminderHref({ ...request, moment: 'After <dinner>' })).has('moment')).toBe(false);
    expect(parseReminder(queryOf(reminderHref({ ...request, moment: null })))).toEqual({ ...request, moment: null });
  });

  it('refuses a query with a part missing or out of range', () => {
    const parse = (query: string) => parseReminder(new URLSearchParams(query));
    expect(parse('time=18:30&days=28&start=2026-11-15')).not.toBeNull();
    expect(parse('')).toBeNull();
    expect(parse('days=28&start=2026-11-15')).toBeNull();
    expect(parse('time=25:00&days=28&start=2026-11-15')).toBeNull();
    expect(parse('time=6pm&days=28&start=2026-11-15')).toBeNull();
    expect(parse('time=18:30&start=2026-11-15')).toBeNull();
    for (const days of ['0', '29', '100', '-1', '1.5', '07', 'seven', '']) {
      expect(parse(`time=18:30&days=${days}&start=2026-11-15`)).toBeNull();
    }
    expect(parse('time=18:30&days=28')).toBeNull();
    expect(parse('time=18:30&days=28&start=2026-02-30')).toBeNull();
    expect(parse('time=18:30&days=28&start=tomorrow')).toBeNull();
    expect(parse('time=18:30&days=28&start=2026-11-15&moment=')).toBeNull();
    expect(parse('time=18:30&days=28&start=2026-11-15&moment=After%0D%0Adinner')).toBeNull();
    expect(parse(`time=18:30&days=28&start=2026-11-15&moment=${'a'.repeat(41)}`)).toBeNull();
  });

  it('takes every day count of the plan', () => {
    for (let days = 1; days <= 28; days += 1) {
      expect(parseReminder(new URLSearchParams(`time=08:00&days=${days}&start=2026-11-15`))?.days).toBe(days);
    }
  });
});

describe('escapeText', () => {
  it('escapes the backslash, the semicolon and the comma', () => {
    expect(escapeText('a\\b; c, d')).toBe('a\\\\b\\; c\\, d');
  });

  it('writes every kind of line break as \\n', () => {
    expect(escapeText('one\ntwo\r\nthree\rfour')).toBe('one\\ntwo\\nthree\\nfour');
  });

  it('leaves colons, quotes and letters of any alphabet as they are', () => {
    expect(escapeText('At 18:30 "sharp": Après le dîner, Алия 🙂')).toBe('At 18:30 "sharp": Après le dîner\\, Алия 🙂');
  });

  it('drops control characters, so no text can start a line of its own', () => {
    expect(escapeText('a\u0000b\u0007c\u001bd\u007fe\tf')).toBe('abcde f');
    expect(escapeText('Play\r\nEND:VEVENT')).toBe('Play\\nEND:VEVENT');
  });
});

describe('foldLine', () => {
  it('leaves a line of 75 octets alone and folds one of 76', () => {
    const exact = `SUMMARY:${'x'.repeat(67)}`;
    expect(octets(exact)).toBe(75);
    expect(foldLine(exact)).toBe(exact);
    expect(foldLine(`${exact}y`)).toBe(`${exact}\r\n y`);
  });

  it('keeps every line at 75 octets or fewer, the space that continues a line included', () => {
    const line = `DESCRIPTION:${'Five minutes of play. '.repeat(20)}`;
    const folded = foldLine(line).split('\r\n');
    expect(folded.length).toBeGreaterThan(5);
    for (const part of folded) expect(octets(part)).toBeLessThanOrEqual(75);
    for (const part of folded.slice(1)) expect(part.startsWith(' ')).toBe(true);
    expect(folded.slice(0, -1).every((part) => octets(part) === 75)).toBe(true);
  });

  it('unfolds to the line it was given', () => {
    const line = `DESCRIPTION:${'Start today’s session: https://playreps.vercel.app/today '.repeat(6)}`;
    expect(foldLine(line).replace(/\r\n /g, '')).toBe(line);
  });

  it('counts octets, not letters, and never cuts a character in half', () => {
    // Two octets each in UTF-8, three for the dash, four for the emoji.
    const line = `SUMMARY:${'é'.repeat(40)}${'—'.repeat(30)}${'🙂'.repeat(25)}`;
    const folded = foldLine(line).split('\r\n');
    for (const part of folded) {
      expect(octets(part)).toBeLessThanOrEqual(75);
      // A cut inside a character would leave a lone surrogate, which encodes as the replacement character.
      expect(new TextDecoder().decode(new TextEncoder().encode(part))).toBe(part);
      expect(part.includes('�')).toBe(false);
    }
    expect(folded.length).toBeGreaterThan(3);
    expect(foldLine(line).replace(/\r\n /g, '')).toBe(line);
  });
});

describe('reminderIcs', () => {
  it('is one event inside one calendar', () => {
    const lines = contentLines(reminderIcs(EVENT));
    expect(lines.slice(0, 2)).toEqual(['BEGIN:VCALENDAR', 'VERSION:2.0']);
    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(1);
    expect(lines.filter((line) => line === 'END:VEVENT')).toHaveLength(1);
    expect(lines.slice(-2)).toEqual(['END:VCALENDAR', '']);
    expect(valueOf(reminderIcs(EVENT), 'PRODID')).toBeTruthy();
  });

  it('ends every line with CRLF and has no bare line feed', () => {
    const ics = reminderIcs({ ...EVENT, description: 'One.\nTwo.\r\nThree.' });
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('starts at the chosen time as a floating local time', () => {
    expect(valueOf(reminderIcs(EVENT), 'DTSTART')).toBe('20261115T183000');
    expect(valueOf(reminderIcs({ ...EVENT, startDate: '2027-01-02', time: '07:05' }), 'DTSTART')).toBe('20270102T070500');
    expect(valueOf(reminderIcs({ ...EVENT, time: '00:00' }), 'DTSTART')).toBe('20261115T000000');
    // No Z and no TZID: the calendar reads it on its own clock.
    expect(reminderIcs(EVENT)).not.toMatch(/DTSTART[^\r]*(Z|TZID)/);
  });

  it('lasts the minutes it is given', () => {
    expect(valueOf(reminderIcs(EVENT), 'DURATION')).toBe('PT5M');
    expect(valueOf(reminderIcs({ ...EVENT, durationMin: 2 }), 'DURATION')).toBe('PT2M');
  });

  it('repeats daily, once for each day', () => {
    expect(valueOf(reminderIcs(EVENT), 'RRULE')).toBe('FREQ=DAILY;COUNT=28');
    expect(valueOf(reminderIcs({ ...EVENT, days: 12 }), 'RRULE')).toBe('FREQ=DAILY;COUNT=12');
    expect(valueOf(reminderIcs({ ...EVENT, days: 1 }), 'RRULE')).toBe('FREQ=DAILY;COUNT=1');
  });

  it('stamps the file with the instant it is handed, in UTC, and reads no clock', () => {
    expect(valueOf(reminderIcs(EVENT), 'DTSTAMP')).toBe('20261115T063000Z');
    expect(valueOf(reminderIcs({ ...EVENT, dtstamp: '2026-11-15T23:59:59+05:00' }), 'DTSTAMP')).toBe('20261115T185959Z');
    expect(reminderIcs(EVENT)).toBe(reminderIcs({ ...EVENT }));
  });

  it('escapes the title and the description', () => {
    const ics = reminderIcs({ ...EVENT, title: 'Play; five, minutes \\ now', description: 'After dinner, with blocks.\nStart: https://playreps.vercel.app/today' });
    expect(valueOf(ics, 'SUMMARY')).toBe('Play\\; five\\, minutes \\\\ now');
    expect(valueOf(ics, 'DESCRIPTION')).toBe('After dinner\\, with blocks.\\nStart: https://playreps.vercel.app/today');
  });

  it('cannot be made to hold a second event by its text', () => {
    const ics = reminderIcs({ ...EVENT, description: 'x\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nSUMMARY:other' });
    const lines = contentLines(ics);
    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(1);
    expect(lines.filter((line) => line.startsWith('SUMMARY:'))).toHaveLength(1);
  });

  it('folds a long description at 75 octets and loses nothing', () => {
    const description = `After dinner. ${'Five minutes of play, every day. '.repeat(12)}Start: https://playreps.vercel.app/today`;
    const ics = reminderIcs({ ...EVENT, description });
    const physical = ics.split('\r\n');
    for (const line of physical) expect(octets(line)).toBeLessThanOrEqual(75);
    expect(physical.some((line) => line.startsWith(' '))).toBe(true);
    expect(valueOf(ics, 'DESCRIPTION')).toBe(escapeText(description));
  });

  it('leaves out the description when there is none', () => {
    const lines = contentLines(reminderIcs({ ...EVENT, description: '' }));
    // The one DESCRIPTION left is the text of the alarm.
    expect(lines.filter((line) => line.startsWith('DESCRIPTION:'))).toEqual([`DESCRIPTION:${EVENT.title}`]);
  });

  it('rings when the event starts', () => {
    const lines = contentLines(reminderIcs(EVENT));
    const from = lines.indexOf('BEGIN:VALARM');
    const to = lines.indexOf('END:VALARM');
    expect(from).toBeGreaterThan(lines.indexOf('BEGIN:VEVENT'));
    expect(to).toBeLessThan(lines.indexOf('END:VEVENT'));
    expect(lines.slice(from + 1, to)).toEqual(['ACTION:DISPLAY', `DESCRIPTION:${EVENT.title}`, 'TRIGGER:PT0M']);
  });

  it('gives the same reminder the same UID, and a changed one another', () => {
    const uid = valueOf(reminderIcs(EVENT), 'UID');
    expect(uid).toMatch(/^[\w-]+@[\w.-]+$/);
    expect(valueOf(reminderIcs({ ...EVENT, dtstamp: '2026-11-16T09:00:00Z' }), 'UID')).toBe(uid);
    for (const changed of [{ time: '19:00' }, { days: 27 }, { startDate: '2026-11-16' }, { description: 'Before bath.' }, { title: 'Play' }, { durationMin: 3 }]) {
      expect(valueOf(reminderIcs({ ...EVENT, ...changed }), 'UID')).not.toBe(uid);
    }
  });

  it('refuses a day, a time, a count or a stamp it cannot write', () => {
    expect(() => reminderIcs({ ...EVENT, startDate: '2026-02-30' })).toThrow(RangeError);
    expect(() => reminderIcs({ ...EVENT, time: '25:00' })).toThrow(RangeError);
    expect(() => reminderIcs({ ...EVENT, days: 0 })).toThrow(RangeError);
    expect(() => reminderIcs({ ...EVENT, days: 1.5 })).toThrow(RangeError);
    expect(() => reminderIcs({ ...EVENT, durationMin: 0 })).toThrow(RangeError);
    expect(() => reminderIcs({ ...EVENT, dtstamp: 'now' })).toThrow(RangeError);
  });
});
