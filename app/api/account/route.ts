import { NextResponse, type NextRequest } from 'next/server';
import { accountsAvailable, deleteAccount, signedIn, withSession } from './store';

/** Whether this deployment has accounts, and who is signed in on this browser. A guest costs no store call. */
export async function GET(req: NextRequest) {
  if (!accountsAvailable()) return NextResponse.json({ available: false, email: null });
  try {
    const account = await signedIn(req);
    return NextResponse.json({ available: true, email: account?.email ?? null });
  } catch (err) {
    console.error('account status failed:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ available: false, email: null });
  }
}

/** Deletes the signed-in account and the copy of the progress it keeps. The device keeps its own copy. */
export async function DELETE(req: NextRequest) {
  try {
    const account = await signedIn(req);
    if (!account) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 });
    await deleteAccount(account, req);
    return withSession(NextResponse.json({ ok: true }), null);
  } catch (err) {
    console.error('account delete failed:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'The account could not be deleted just now. Try again.' }, { status: 502 });
  }
}
