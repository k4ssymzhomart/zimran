import { NextResponse, type NextRequest } from 'next/server';
import { copyOf, emailOf, passwordProblem, type SavedCopy } from '@/lib/account/account';
import {
  accountsAvailable,
  checkPassword,
  createAccount,
  endSession,
  forgetTries,
  readCopy,
  saveCopy,
  startSession,
  tooManyTries,
  withSession,
  type Account,
} from '../store';

/**
 * POST { mode: 'create' | 'sign-in', email, password, copy? } creates the account, keeping this device's progress as
 * its first copy, or signs in. Either way it sets the sign-in cookie and answers with the email and the account's copy.
 */
export async function POST(req: NextRequest) {
  if (!accountsAvailable()) {
    return NextResponse.json({ error: 'Accounts are not set up on this deployment.' }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const mode = body?.mode;
  const email = emailOf(body?.email);
  if (!email || (mode !== 'create' && mode !== 'sign-in')) {
    return NextResponse.json({ error: 'Enter your email address.' }, { status: 400 });
  }
  const problem = passwordProblem(body?.password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const password = String(body?.password);

  try {
    if (await tooManyTries(email)) {
      return NextResponse.json({ error: 'Too many tries. Wait 15 minutes, then try again.' }, { status: 429 });
    }
    let account: Account | null;
    let copy: SavedCopy;
    if (mode === 'create') {
      const first = copyOf(body?.copy ?? {});
      if (!first) return NextResponse.json({ error: 'This device’s progress could not be read.' }, { status: 400 });
      account = await createAccount(email, password);
      if (!account) {
        return NextResponse.json({ error: 'This email already has an account. Sign in instead.' }, { status: 409 });
      }
      await saveCopy(account.id, first);
      copy = first;
    } else {
      account = await checkPassword(email, password);
      if (!account) return NextResponse.json({ error: 'That email and password do not match.' }, { status: 401 });
      copy = await readCopy(account.id);
    }
    await forgetTries(email);
    return withSession(NextResponse.json({ email: account.email, copy }), await startSession(account));
  } catch (err) {
    console.error('account sign-in failed:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Signing in did not work just now. Try again.' }, { status: 502 });
  }
}

/** Signs this browser out. The progress stays on the device and in the account. */
export async function DELETE(req: NextRequest) {
  await endSession(req).catch(() => undefined);
  return withSession(NextResponse.json({ ok: true }), null);
}
