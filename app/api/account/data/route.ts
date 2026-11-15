import { NextResponse, type NextRequest } from 'next/server';
import { copyOf } from '@/lib/account/account';
import { readCopy, saveCopy, signedIn } from '../store';

const notSignedIn = () => NextResponse.json({ error: 'You are not signed in.' }, { status: 401 });
const unavailable = () => NextResponse.json({ error: 'Your account could not be reached just now.' }, { status: 502 });

/** The signed-in account's copy of the progress. */
export async function GET(req: NextRequest) {
  try {
    const account = await signedIn(req);
    if (!account) return notSignedIn();
    return NextResponse.json({ copy: await readCopy(account.id) });
  } catch {
    return unavailable();
  }
}

/** PUT { copy }: this device's saved entries become the account's copy. An empty copy is refused, never stored. */
export async function PUT(req: NextRequest) {
  try {
    const account = await signedIn(req);
    if (!account) return notSignedIn();
    const body = (await req.json().catch(() => null)) as { copy?: unknown } | null;
    const copy = copyOf(body?.copy);
    if (!copy || Object.keys(copy).length === 0) {
      return NextResponse.json({ error: 'There is nothing to save.' }, { status: 400 });
    }
    await saveCopy(account.id, copy);
    return NextResponse.json({ ok: true });
  } catch {
    return unavailable();
  }
}
