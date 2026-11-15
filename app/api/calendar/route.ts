import { REMINDER_MINUTES, parseReminder, reminderIcs } from '@/lib/progress/calendar';
import { ROUTES } from '@/lib/routes';

// No `dynamic` and no `runtime` export: with cacheComponents this Next.js version rejects both. A GET handler is
// prerendered at build only while it reads nothing of the request. This one reads the query first, so it always
// runs at request time, and the clock is read only after that.

const TITLE = 'Fammy: five minutes of play';

/**
 * The daily reminder as a calendar file. The sheet links here with a plain link, so the browser itself takes the
 * file; a file made inside the page (a blob) does not open inside in-app browsers.
 *
 * The query holds a time, a number of days, the first day and the daily moment. Nothing in it says who the family
 * is, and nothing is stored.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const reminder = parseReminder(url.searchParams);
  if (!reminder) {
    return Response.json(
      { error: 'This reminder link is incomplete. Add it to your calendar again from your plan.' },
      { status: 400 },
    );
  }

  // The way back in: the event carries a link to Today on the same address the parent used.
  const today = new URL(ROUTES.today, url.origin).href;
  const ics = reminderIcs({
    title: TITLE,
    startDate: reminder.start,
    time: reminder.time,
    days: reminder.days,
    durationMin: REMINDER_MINUTES,
    description: `${reminder.moment ? `${reminder.moment}: five` : 'Five'} minutes of play practice.\nStart today's session: ${today}`,
    dtstamp: new Date().toISOString(),
  });

  return new Response(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'attachment; filename="fammy-reminder.ics"',
      'cache-control': 'no-store',
    },
  });
}
