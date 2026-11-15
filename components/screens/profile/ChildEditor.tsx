'use client';

import { useId, useState } from 'react';
import { CHILDREN } from '@/components/child';
import { MOMENTS } from '@/components/first/quiz/moments';
import { Button, Chip, Icon, IconButton, NumberTile, Portrait, TextField, cn, focusRingWithin } from '@/components/kit';
import type { PartnerId, Profile } from '@/lib/types';

/** The part of the profile the "Your child" screen edits (Figma 48:1509, and the desktop card of 60:651). */
export type ChildDraft = Pick<Profile, 'childName' | 'childAge' | 'moments' | 'partner'>;

const AGES = [2, 3, 4, 5, 6, 7];
const PARTNERS: readonly PartnerId[] = ['mia', 'leo'];

export const childDraftOf = (profile: Profile): ChildDraft => ({
  childName: profile.childName,
  childAge: profile.childAge,
  moments: profile.moments,
  partner: profile.partner,
});

/** A typed name is kept as typed; an empty one is "not set". */
export const cleanName = (name: string | null): string | null => (name && name.trim() !== '' ? name : null);

/** Name, age, hardest moments and the practice partner, as one controlled form. */
export function ChildFields({ value, onChange }: { value: ChildDraft; onChange(patch: Partial<ChildDraft>): void }) {
  const ageName = useId();
  const ageLabel = useId();
  const momentsLabel = useId();
  const partnerName = useId();
  const partnerLabel = useId();

  const toggleMoment = (id: string): void =>
    onChange({ moments: value.moments.includes(id) ? value.moments.filter((m) => m !== id) : [...value.moments, id] });

  return (
    <div className="flex flex-col gap-[22px]">
      {/* The field names itself to a screen reader; the gray word above it is the label drawn in Figma. */}
      <div className="flex flex-col gap-[10px]">
        <span aria-hidden className="text-label text-gray">
          Name
        </span>
        <TextField label="Name" value={value.childName ?? ''} onChange={(name) => onChange({ childName: name })} autoComplete="off" maxLength={40} />
      </div>

      <div role="radiogroup" aria-labelledby={ageLabel} className="flex flex-col gap-[10px]">
        <span id={ageLabel} className="text-label text-gray">
          Age
        </span>
        <div className="grid grid-cols-6 gap-[8px]">
          {AGES.map((age) => (
            <NumberTile
              key={age}
              name={ageName}
              value={String(age)}
              label={String(age)}
              size="sm"
              selected={value.childAge === age}
              onChange={(on) => {
                if (on) onChange({ childAge: age });
              }}
              className="w-full"
            />
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby={momentsLabel} className="flex flex-col gap-[10px]">
        <span id={momentsLabel} className="text-label text-gray">
          Hardest moments
        </span>
        <div className="flex flex-wrap gap-[8px]">
          {MOMENTS.map((moment) => (
            <Chip key={moment.id} selected={value.moments.includes(moment.id)} onClick={() => toggleMoment(moment.id)}>
              {moment.label}
            </Chip>
          ))}
        </div>
      </div>

      <div role="radiogroup" aria-labelledby={partnerLabel} className="flex flex-col gap-[10px]">
        <span id={partnerLabel} className="text-label text-gray">
          Practice partner
        </span>
        <div className="grid grid-cols-2 gap-[12px]">
          {PARTNERS.map((id) => {
            const selected = value.partner === id;
            return (
              <label
                key={id}
                className={cn(
                  'relative flex h-[150px] cursor-pointer overflow-clip rounded-[24px] border-[3px] bg-violet',
                  selected ? 'border-ink' : 'border-violet',
                  focusRingWithin,
                )}
              >
                <input
                  type="radio"
                  name={partnerName}
                  value={id}
                  checked={selected}
                  onChange={() => onChange({ partner: id })}
                  className="sr-only"
                />
                <span className="relative p-[16px] text-heading text-white">{CHILDREN[id].name}</span>
                <Portrait partner={id} size={92} className="absolute right-[6px] bottom-0" />
              </label>
            );
          })}
        </div>
        <p className="text-small text-gray">Both are simulated four-year-olds. Real children vary.</p>
      </div>
    </div>
  );
}

/** The pushed "Your child" screen of the phone (Figma 48:1509): edits a copy, and Save writes it to the profile. */
export function ChildEditor({ profile, onBack, onSave }: { profile: Profile; onBack(): void; onSave(draft: ChildDraft): void }) {
  const [draft, setDraft] = useState<ChildDraft>(() => childDraftOf(profile));

  return (
    <div className="flex w-full max-w-[640px] flex-col px-[24px] pb-[24px] lg:mx-auto lg:pt-[24px]">
      <div className="relative flex min-h-[56px] items-center justify-center">
        <IconButton label="Back to Profile" onClick={onBack} className="absolute left-[-10px]">
          <Icon name="back" />
        </IconButton>
        <h1 className="text-body-strong">Your child</h1>
      </div>
      <div className="pt-[12px]">
        <ChildFields value={draft} onChange={(patch) => setDraft((before) => ({ ...before, ...patch }))} />
      </div>
      <Button fullWidth className="mt-[32px]" onClick={() => onSave({ ...draft, childName: cleanName(draft.childName) })}>
        Save
      </Button>
    </div>
  );
}
