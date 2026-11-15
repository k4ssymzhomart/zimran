import { describe, expect, it } from 'vitest';
import { ROUTES } from '../routes';
import {
  ANCHORS, buildCalendar, calendarPath, CALENDAR_LINK_TEXT, dayAfter, escapeText, GOOGLE_CALENDAR_LINK_TEXT, googleCalendarUrl, isAnchor,
  reminderDays,
} from './calendar';

const STAMP = '20261115T120000Z';
const ORIGIN = 'https://playreps.example';
const file = (anchor: string, today = '2026-11-15', days?: number) => buildCalendar({ anchor, today, stamp: STAMP, origin: ORIGIN, days });
/** A folded file back as logical lines. */
const unfold = (text: string): string[] => text.replace(/\r\n /g, '').split('\r\n');

describe('the moments a parent can pick', () => {
  it('are the four labels of the setup question, and nothing else passes', () => {
    expect(ANCHORS).toEqual(['After breakfast', 'After daycare', 'After dinner', 'Before bath']);
    for (const anchor of ANCHORS) expect(isAnchor(anchor)).toBe(true);
    for (const other of ['', 'after dinner', 'Midnight', 'toString', '__proto__', null, 7]) expect(isAnchor(other)).toBe(false);
  });
  it('says the link the same way on every screen', () => {
    expect(CALENDAR_LINK_TEXT).toBe('Add my five minutes to the calendar');
    expect(GOOGLE_CALENDAR_LINK_TEXT).toBe('Add to Google Calendar');
  });
});

describe('calendarPath', () => {
  it('is the address the route reads back: /api/ics?anchor=LABEL', () => {
    for (const anchor of ANCHORS) {
      const url = new URL(calendarPath(anchor, '2026-11-15'), ORIGIN);
      expect(url.pathname).toBe('/api/ics');
      expect(url.searchParams.get('anchor')).toBe(anchor);
      expect(url.searchParams.get('today')).toBe('2026-11-15');
    }
    expect(calendarPath('After dinner')).toBe('/api/ics?anchor=After%20dinner');
  });
  it('leaves out a date that is not a date', () => {
    expect(calendarPath('Before bath', 'tomorrow')).toBe('/api/ics?anchor=Before%20bath');
  });
  it('carries the plan days left, kept between 1 and 28, and says nothing when nobody asked', () => {
    expect(calendarPath('After dinner', '2026-11-15', 9)).toBe('/api/ics?anchor=After%20dinner&today=2026-11-15&days=9');
    expect(calendarPath('After dinner', undefined, 9)).toBe('/api/ics?anchor=After%20dinner&days=9');
    expect(new URL(calendarPath('After dinner', '2026-11-15', 0), ORIGIN).searchParams.get('days')).toBe('1');
    expect(new URL(calendarPath('After dinner', '2026-11-15', 400), ORIGIN).searchParams.get('days')).toBe('28');
    expect(new URL(calendarPath('After dinner', '2026-11-15'), ORIGIN).searchParams.has('days')).toBe(false);
  });
});

describe('reminderDays', () => {
  it('is the plan days left, between 1 and 28, and 28 when it is not a number', () => {
    expect(reminderDays()).toBe(28);
    expect(reminderDays(28)).toBe(28);
    expect(reminderDays(9)).toBe(9);
    expect(reminderDays(9.8)).toBe(9);
    expect(reminderDays(1)).toBe(1);
    expect(reminderDays(0)).toBe(1);
    expect(reminderDays(-4)).toBe(1);
    expect(reminderDays(29)).toBe(28);
    expect(reminderDays(Number.NaN)).toBe(28);
    expect(reminderDays(Infinity)).toBe(28);
  });
});

describe('dayAfter', () => {
  it('rolls over the end of a month, of a year, and a leap day', () => {
    expect(dayAfter('2026-11-15')).toBe('20261116');
    expect(dayAfter('2026-11-30')).toBe('20261201');
    expect(dayAfter('2026-12-31')).toBe('20270101');
    expect(dayAfter('2028-02-28')).toBe('20280229');
    expect(dayAfter('2027-02-28')).toBe('20270301');
  });
  it('refuses anything that is not YYYY-MM-DD', () => {
    expect(() => dayAfter('15 Nov 2026')).toThrow();
  });
});

describe('buildCalendar', () => {
  it('gives each moment a five-minute event at its own local time, starting tomorrow', () => {
    const times: Record<string, [string, string]> = {
      'After breakfast': ['080000', '080500'],
      'After daycare': ['173000', '173500'],
      'After dinner': ['190000', '190500'],
      'Before bath': ['193000', '193500'],
    };
    for (const anchor of ANCHORS) {
      const lines = unfold(file(anchor) ?? '');
      // Floating time: no Z and no TZID, so it is the time on the parent's own clock.
      expect(lines).toContain(`DTSTART:20261116T${times[anchor][0]}`);
      expect(lines).toContain(`DTEND:20261116T${times[anchor][1]}`);
    }
  });
  it('repeats daily for the 28 days of the plan, with a reminder when it starts', () => {
    const lines = unfold(file('After dinner') ?? '');
    expect(lines).toContain('RRULE:FREQ=DAILY;COUNT=28');
    expect(lines).toContain('SUMMARY:Fammy: five minutes of play');
    expect(lines).toContain('TRIGGER:PT0M');
    // Changed by design: the reminder used to open /dashboard, one tap away from the session.
    expect(lines).toContain(`URL:${ORIGIN}${ROUTES.daily}`);
    expect(lines.find((l) => l.startsWith('DESCRIPTION:After dinner'))).toContain(`Open today's session at ${ORIGIN}${ROUTES.daily}`);
    expect(lines.join('\n')).not.toContain('/dashboard');
    // The reminder at the start of the event is still there.
    const alarm = lines.slice(lines.indexOf('BEGIN:VALARM'), lines.indexOf('END:VALARM') + 1);
    expect(alarm).toEqual(['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Fammy: five minutes of play', 'TRIGGER:PT0M', 'END:VALARM']);
    expect(lines.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1);
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines[lines.length - 2]).toBe('END:VCALENDAR');
  });
  it('repeats only for the plan days that are left', () => {
    expect(unfold(file('After dinner', '2026-11-15', 9) ?? '')).toContain('RRULE:FREQ=DAILY;COUNT=9');
    expect(unfold(file('After dinner', '2026-11-15', 1) ?? '')).toContain('RRULE:FREQ=DAILY;COUNT=1');
    expect(unfold(file('After dinner', '2026-11-15', 0) ?? '')).toContain('RRULE:FREQ=DAILY;COUNT=1');
    expect(unfold(file('After dinner', '2026-11-15', 90) ?? '')).toContain('RRULE:FREQ=DAILY;COUNT=28');
    expect(unfold(file('After dinner', '2026-11-15', Number.NaN) ?? '')).toContain('RRULE:FREQ=DAILY;COUNT=28');
    // Nothing else in the file depends on the count.
    expect((file('After dinner', '2026-11-15', 9) ?? '').replace('COUNT=9', 'COUNT=28')).toBe(file('After dinner'));
  });
  it('is a well-formed file: CRLF line ends and no line over 75 characters', () => {
    const text = file('After daycare') ?? '';
    expect(text.endsWith('\r\n')).toBe(true);
    expect(text.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    for (const line of text.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75);
    // The long description was folded and reads back whole.
    expect(unfold(text).some((l) => l.startsWith('DESCRIPTION:After daycare: five minutes of play\\, one small skill a day.'))).toBe(true);
  });
  it('escapes backslash, semicolon, comma and line breaks in text values', () => {
    expect(escapeText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne');
    // The event text itself: every semicolon and comma in SUMMARY and DESCRIPTION is escaped.
    const text = unfold(file('After dinner') ?? '').filter((l) => /^(?:SUMMARY|DESCRIPTION)/.test(l));
    expect(text.length).toBeGreaterThan(1);
    for (const line of text) expect(line.slice(line.indexOf(':') + 1)).not.toMatch(/(?<!\\)[;,]/);
  });

  it('gives no file for a label it does not know', () => {
    expect(file('After lunch')).toBeNull();
    expect(file('toString')).toBeNull();
    expect(file('')).toBeNull();
  });
  it('is the same file for the same input', () => {
    expect(file('Before bath')).toBe(file('Before bath'));
  });
});

describe('googleCalendarUrl', () => {
  const link = (anchor: string, today = '2026-11-15', days?: number) => googleCalendarUrl({ anchor, today, origin: ORIGIN, days });

  it('opens Google\'s new-event page with the same daily event as the file', () => {
    const url = new URL(link('After dinner') ?? '');
    expect(`${url.origin}${url.pathname}`).toBe('https://calendar.google.com/calendar/render');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      action: 'TEMPLATE',
      text: 'Fammy: five minutes of play',
      // Floating local time, like the file: no Z and no time zone.
      dates: '20261116T190000/20261116T190500',
      recur: 'RRULE:FREQ=DAILY;COUNT=28',
      details: `After dinner: five minutes of play, one small skill a day. Open today's session at ${ORIGIN}${ROUTES.daily}`,
    });
  });
  it('is one safe address: nothing in it needs escaping twice', () => {
    expect(link('After daycare')).toBe(
      'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Fammy%3A%20five%20minutes%20of%20play' +
        '&dates=20261116T173000%2F20261116T173500&recur=RRULE%3AFREQ%3DDAILY%3BCOUNT%3D28' +
        "&details=After%20daycare%3A%20five%20minutes%20of%20play%2C%20one%20small%20skill%20a%20day.%20Open%20today's%20session%20at%20" +
        'https%3A%2F%2Fplayreps.example%2Fdaily',
    );
  });
  it('starts tomorrow at the anchor\'s time and repeats for the plan days left', () => {
    const times: Record<string, string> = {
      'After breakfast': '20261201T080000/20261201T080500',
      'After daycare': '20261201T173000/20261201T173500',
      'After dinner': '20261201T190000/20261201T190500',
      'Before bath': '20261201T193000/20261201T193500',
    };
    for (const anchor of ANCHORS) {
      const url = new URL(link(anchor, '2026-11-30', 12) ?? '');
      expect(url.searchParams.get('dates')).toBe(times[anchor]);
      expect(url.searchParams.get('recur')).toBe('RRULE:FREQ=DAILY;COUNT=12');
    }
    expect(new URL(link('Before bath', '2026-11-30', 0) ?? '').searchParams.get('recur')).toBe('RRULE:FREQ=DAILY;COUNT=1');
    expect(new URL(link('Before bath', '2026-11-30', 99) ?? '').searchParams.get('recur')).toBe('RRULE:FREQ=DAILY;COUNT=28');
  });
  it('agrees with the file on the start, the end and the rule', () => {
    for (const anchor of ANCHORS) {
      const lines = unfold(file(anchor, '2026-12-31', 5) ?? '');
      const url = new URL(link(anchor, '2026-12-31', 5) ?? '');
      const value = (name: string) => lines.find((l) => l.startsWith(`${name}:`))?.slice(name.length + 1);
      expect(url.searchParams.get('dates')).toBe(`${value('DTSTART')}/${value('DTEND')}`);
      expect(lines).toContain(url.searchParams.get('recur'));
    }
  });
  it('gives no link for a label it does not know or a date that is not a date', () => {
    expect(link('After lunch')).toBeNull();
    expect(link('toString')).toBeNull();
    expect(link('After dinner', 'tomorrow')).toBeNull();
    expect(link('After dinner', '')).toBeNull();
  });
  it('is the same link for the same input', () => {
    expect(link('Before bath')).toBe(link('Before bath'));
  });
});
