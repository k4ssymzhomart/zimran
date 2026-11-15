import { ANCHORS, buildCalendar, isAnchor, isIsoDay } from '@/lib/reminder/calendar';

// No `runtime` export: with cacheComponents this Next.js version always uses Node.js and rejects the option.

/**
 * GET /api/ics?anchor=After%20dinner
 * A daily five-minute reminder for the 28 days of the plan, starting tomorrow. Nothing is stored and nothing is
 * sent anywhere: the parent's own calendar app does the reminding. The file itself is built by the pure
 * `buildCalendar` in lib/reminder/calendar.ts; this handler adds only the clock and the address.
 *
 * Optional `today=YYYY-MM-DD` is the parent's own date. It is used only when it is within one day of the
 * server's date (the server runs on UTC, and a US evening is already the next day there).
 */
export async function GET(req: Request) {
  // Reading the request first keeps this handler request-time only; it is never prerendered at build.
  const url = new URL(req.url);
  const anchor = url.searchParams.get('anchor') ?? '';
  if (!isAnchor(anchor)) {
    return Response.json({ error: `Pick one of: ${ANCHORS.join(', ')}.` }, { status: 400 });
  }

  const now = new Date();
  const serverDay = now.toISOString().slice(0, 10);
  const asked = url.searchParams.get('today') ?? '';
  const askedMs = isIsoDay(asked) ? Date.parse(`${asked}T00:00:00Z`) : NaN;
  const near = Number.isFinite(askedMs) && Math.abs(askedMs - Date.parse(`${serverDay}T00:00:00Z`)) <= 86_400_000;
  const stamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z';

  // How many plan days are left; anything else falls back to the full 28 inside buildCalendar.
  const asksDays = Number(url.searchParams.get('days'));
  const days = Number.isFinite(asksDays) && asksDays >= 1 ? asksDays : undefined;

  const body = buildCalendar({ anchor, today: near ? asked : serverDay, stamp, origin: url.origin, days });
  if (!body) return Response.json({ error: 'That reminder time is not available.' }, { status: 400 });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="playreps.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
