'use client';

import { useState, type FormEvent } from 'react';
import { deleteAccount, signInWith, signOut } from '@/client/account';
import { SettingRow, SettingsSection, Sheet } from '@/components/kit';
import { useAccount } from '@/hooks/useAccount';
import { MIN_PASSWORD } from '@/lib/account/account';

type Form = 'create' | 'sign-in';
type Confirm = 'sign-out' | 'delete';

const FIELD =
  'h-[52px] w-full rounded-[16px] border border-stroke bg-white px-[16px] text-body text-ink outline-none focus-visible:border-violet';

/**
 * Profile's Account group. An account is optional: everything works on one device without it. With one, the
 * sessions, the child and the plan come back on any device the parent signs in on. Hidden on a deployment
 * without an account store.
 */
export function AccountSection({ className }: { className?: string }) {
  const account = useAccount();
  const [form, setForm] = useState<Form | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (account.status === 'checking' || account.status === 'off') return null;

  const close = (): void => {
    setForm(null);
    setConfirm(null);
    setPassword('');
    setError(null);
    setBusy(false);
  };

  const submit = async (event?: FormEvent): Promise<void> => {
    event?.preventDefault();
    if (!form || busy) return;
    setBusy(true);
    setError(null);
    const problem = await signInWith(form, email, password);
    if (problem) {
      setError(problem);
      setBusy(false);
      return;
    }
    close();
  };

  const act = async (): Promise<void> => {
    if (!confirm || busy) return;
    setBusy(true);
    const problem = confirm === 'delete' ? await deleteAccount() : (await signOut(), null);
    if (problem) {
      setError(problem);
      setBusy(false);
      return;
    }
    close();
  };

  const creating = form === 'create';

  return (
    <>
      <SettingsSection title="Account" className={className}>
        {account.status === 'signed-in' ? (
          <>
            <SettingRow art="/art/cloud.png" label={account.email} value="Synced" />
            <SettingRow art="/art/door.png" label="Sign out" onClick={() => setConfirm('sign-out')} />
            <SettingRow art="/art/trash.png" label="Delete account" onClick={() => setConfirm('delete')} />
          </>
        ) : (
          <>
            <SettingRow art="/art/cloud.png" label="Create an account" chevron onClick={() => setForm('create')} />
            <SettingRow art="/art/key.png" label="Sign in" chevron onClick={() => setForm('sign-in')} />
          </>
        )}
      </SettingsSection>

      <Sheet
        open={form !== null}
        onClose={close}
        title={creating ? 'Create an account' : 'Sign in'}
        art="/art/cloud.png"
        primary={{ label: busy ? 'One moment…' : creating ? 'Create account' : 'Sign in', onClick: () => void submit() }}
        secondary={{
          label: creating ? 'I already have an account' : 'Create an account instead',
          onClick: () => {
            setError(null);
            setForm(creating ? 'sign-in' : 'create');
          },
        }}
      >
        <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-[12px] text-left">
          <p className="text-small text-gray">
            {creating
              ? 'Your sessions, your child’s details and your plan go into the account and come back on any device you sign in on. Fammy keeps that copy on its server until you delete the account.'
              : 'The account’s sessions, child and plan come onto this device, next to what is already here.'}
          </p>
          <label className="flex flex-col gap-[6px] text-small-strong text-ink">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-[6px] text-small-strong text-ink">
            Password
            <input
              type="password"
              name="password"
              autoComplete={creating ? 'new-password' : 'current-password'}
              minLength={MIN_PASSWORD}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={FIELD}
            />
          </label>
          {error && (
            <p role="alert" className="text-small-strong text-ink">
              {error}
            </p>
          )}
          {/* Enter in either field submits. */}
          <button type="submit" hidden />
        </form>
      </Sheet>

      <Sheet
        open={confirm !== null}
        onClose={close}
        title={confirm === 'delete' ? 'Delete your account?' : 'Sign out?'}
        art={confirm === 'delete' ? '/art/trash.png' : '/art/door.png'}
        primary={{
          label: busy ? 'One moment…' : confirm === 'delete' ? 'Delete account' : 'Sign out',
          onClick: () => void act(),
        }}
        secondary={{ label: 'Cancel', onClick: close }}
      >
        {confirm === 'delete'
          ? 'The account and its copy of your progress are deleted from the server. This device keeps its own copy. This cannot be undone.'
          : 'Your progress stays on this device and in your account.'}
        {error && (
          <span role="alert" className="mt-[8px] block text-small-strong text-ink">
            {error}
          </span>
        )}
      </Sheet>
    </>
  );
}
