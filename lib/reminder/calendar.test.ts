import { describe, expect, it } from 'vitest';
import { ANCHORS, buildCalendar, calendarPath, CALENDAR_LINK_TEXT, dayAfter, escapeText, isAnchor } from './calendar';

const STAMP = '20261115T120000Z';
const ORIGIN = 'https://playreps.example';
const file = (anchor: string, today = '2026-11-15') => buildCalendar({ anchor, today, stamp: STAMP, origin: ORIGIN });
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
    expect(lines).toContain('SUMMARY:PlayReps: five minutes of play');
    expect(lines).toContain('TRIGGER:PT0M');
    expect(lines).toContain(`URL:${ORIGIN}/dashboard`);
    expect(lines.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1);
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines[lines.length - 2]).toBe('END:VCALENDAR');
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
