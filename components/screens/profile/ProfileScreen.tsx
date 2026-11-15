'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { clearSummaries } from '@/client/aiSummary';
import { clearEntitlement, renewsOn, type Entitlement } from '@/client/entitlement';
import { profileStore } from '@/client/profileStore';
import { sessionStore } from '@/client/sessionStore';
import { CHILDREN } from '@/components/child';
import { Button, PARENT, Pattern, Picture, SettingRow, SettingsSection, Sheet, Tag, cn } from '@/components/kit';
import { DEFAULT_PLAN, lengthOf, longDate, planOf, priceOf } from '@/components/pricing/plans';
import { SCENES } from '@/lib/child/scenes';
import { PLAN_DAYS } from '@/lib/progress/plan';
import { planDayOf, streakOf } from '@/lib/progress/sessions';
import { ROUTES } from '@/lib/routes';
import type { Profile, SavedSession } from '@/lib/types';
import { ChildEditor, ChildFields, childDraftOf, cleanName, type ChildDraft } from './ChildEditor';
import { CodingGuide } from './CodingGuide';
import { daysLabel, firstSwapOf, paceOf, strongestOf } from './facts';

const NOT_SET = 'Not set';

/** A phone section becomes a bordered card from 1024px (the `card` look of SettingsSection, at one breakpoint). */
const CARD = 'lg:rounded-[28px] lg:border lg:border-line lg:px-[28px] lg:pt-[24px] lg:pb-[10px]';

const SCENE_ART: Partial<Record<string, string>> = { blocks: '/art/blocks.png', drawing: '/art/crayons.png', kitchen: '/art/dinner.png', cleanup: '/art/teddies.png' };

const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

export interface ProfileScreenProps {
  profile: Profile;
  update(patch: Partial<Profile>): void;
  sessions: readonly SavedSession[];
  entitlement: Entitlement;
  /** The device's own day, YYYY-MM-DD. */
  today: string;
}

type View = 'main' | 'child' | 'coding';

interface Fact {
  label: string;
  value: string;
}

/**
 * Profile (Figma 48:1286 on phones, 60:651 from 1024px), on what is saved on this device: the child and the practice
 * partner (edited in 48:1509), the plan, the membership and its renewal, how coding works (62:1494), and erasing
 * everything (48:1634).
 */
export function ProfileScreen({ profile, update, sessions, entitlement, today }: ProfileScreenProps) {
  const router = useRouter();
  const [view, setView] = useState<View>('main');
  const [erasing, setErasing] = useState(false);
  const [ending, setEnding] = useState(false);
  const childTitle = useId();

  const open = (next: View): void => {
    setView(next);
    window.scrollTo(0, 0);
  };

  if (view === 'child') {
    return (
      <ChildEditor
        profile={profile}
        onBack={() => open('main')}
        onSave={(draft: ChildDraft) => {
          update(draft);
          open('main');
        }}
      />
    );
  }
  if (view === 'coding') return <CodingGuide partner={profile.partner} onBack={() => open('main')} />;

  const partner = CHILDREN[profile.partner];
  const scene = SCENES.find((s) => s.id === profile.sceneId);
  const played = sessions.length > 0;
  const day = played ? planDayOf(sessions, today) : null;
  const last = sessions.at(-1);
  const pace = last ? paceOf(last) : null;

  const facts: Fact[] = played
    ? [
        { label: 'Strongest', value: strongestOf(sessions) ?? 'None yet' },
        { label: 'First swap', value: firstSwapOf(sessions) ?? 'None yet' },
        { label: 'Streak', value: daysLabel(streakOf(sessions, today).days) },
      ]
    : [];

  const who = [profile.childName, profile.childAge === null ? null : String(profile.childAge)].filter(Boolean).join(', ');
  const subtitle = [who ? `${who}.` : null, day ? `Day ${day} of ${PLAN_DAYS}.` : null].filter(Boolean).join(' ');

  // The one action of an empty profile starts a session: the daily five minutes with access, the first visit without.
  const start = entitlement.paid
    ? { href: ROUTES.daily, label: 'Start today’s five minutes' }
    : { href: ROUTES.start, label: 'Play the first round' };

  // Membership: the plan on this device, or the free first visit.
  const plan = planOf(entitlement.plan ?? DEFAULT_PLAN);
  const renewal = renewsOn(entitlement);
  const every = `every ${lengthOf(plan)} at ${priceOf(plan)}. Cancel anytime.`;
  const renewLine = !entitlement.paid
    ? `The paid plan renews ${every}`
    : entitlement.demo
      ? `Demo access: nothing is charged and nothing renews. The paid plan renews ${every}`
      : `Renews ${every}`;

  const eraseAll = (): void => {
    sessionStore.clear();
    profileStore.reset();
    clearEntitlement();
    clearSummaries();
    setErasing(false);
    router.push(ROUTES.home);
  };

  const editChild = (patch: Partial<ChildDraft>): void =>
    update('childName' in patch ? { ...patch, childName: cleanName(patch.childName ?? null) } : patch);

  return (
    <div className="flex w-full flex-col pb-[16px] lg:pb-[40px]">
      {/* The header: the violet block with the parent; from 1024px the title and the numbers sit in it. */}
      <section className="relative flex h-[256px] shrink-0 items-end justify-center overflow-clip bg-violet lg:mx-[48px] lg:mt-[40px] lg:h-[272px] lg:justify-start lg:gap-[56px] lg:rounded-[32px] lg:px-[60px]">
        <Pattern kind="bars" className="lg:hidden" />
        <Pattern kind="bars" size={1440} className="hidden lg:block" />
        <Picture file={PARENT.mum} size={236} priority className="relative" />
        <div className="relative hidden flex-1 items-center gap-[48px] self-center text-white lg:flex">
          <div className="shrink-0">
            <p aria-hidden className="text-title-xl">
              Profile
            </p>
            {subtitle && <p className="pt-[6px] text-lead">{subtitle}</p>}
          </div>
          {played && (
            <dl className="flex flex-1 flex-wrap justify-end gap-x-[40px] gap-y-[16px]">
              {pace !== null && (
                <div className="flex flex-col-reverse">
                  <dt className="text-label">of the clinic pace</dt>
                  <dd className="text-title">{pace}%</dd>
                </div>
              )}
              {facts.map((fact) => (
                <div key={fact.label} className="flex flex-col-reverse">
                  <dt className="text-label">{fact.label}</dt>
                  <dd className="text-title">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <h1 className="px-[24px] pt-[24px] text-title lg:sr-only">Profile</h1>

      {/* The numbers on phones, or the empty state on every size. */}
      {played ? (
        <div className="mx-[24px] mt-[16px] rounded-[24px] bg-mist p-[18px] lg:hidden">
          {pace !== null && (
            <>
              <p className="flex items-baseline gap-[8px]">
                <span className="text-title text-ink">{pace}%</span>
                <span className="text-label text-gray">of the clinic pace</span>
              </p>
              <div aria-hidden className="mt-[12px] h-[6px] overflow-clip rounded-full bg-line">
                <div className="h-full rounded-full bg-violet" style={{ width: `${pace}%` }} />
              </div>
            </>
          )}
          <dl className={cn('grid grid-cols-3 gap-[12px]', pace !== null && 'pt-[16px]')}>
            {facts.map((fact) => (
              <div key={fact.label} className="flex min-w-0 flex-col gap-[2px]">
                <dt className="text-small text-gray">{fact.label}</dt>
                <dd className="text-body-strong text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <div className="mx-[24px] mt-[16px] flex flex-col gap-[14px] rounded-[24px] bg-mist p-[18px] lg:mx-[48px] lg:mt-[24px] lg:flex-row lg:items-center lg:justify-between lg:p-[24px]">
          <div>
            <p className="text-body-strong text-ink">No sessions yet.</p>
            <p className="text-label text-gray">Your numbers start with the first round you play.</p>
          </div>
          <Button href={start.href} size="md">
            {start.label}
          </Button>
        </div>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-3 lg:items-start lg:gap-[24px] lg:px-[48px] lg:pt-[24px]">
        {/* Your child: rows that open the editor on phones, the editor itself in a card from 1024px. */}
        <div className="flex flex-col">
          <SettingsSection title="Your child" className="lg:hidden">
            <SettingRow art="/art/nametag.png" label="Name" value={profile.childName ?? NOT_SET} chevron onClick={() => open('child')} />
            <SettingRow
              art="/art/cake.png"
              label="Age"
              value={profile.childAge === null ? NOT_SET : String(profile.childAge)}
              chevron
              onClick={() => open('child')}
            />
            <SettingRow
              art="/art/moon.png"
              label="Hardest moments"
              value={profile.moments.length > 0 ? `${profile.moments.length} chosen` : NOT_SET}
              chevron
              onClick={() => open('child')}
            />
            <SettingRow
              art="/art/tab-profile.png"
              label="Partner"
              tag={<Tag tone="quiet">Simulated child</Tag>}
              value={partner.name}
              chevron
              onClick={() => open('child')}
            />
          </SettingsSection>
          <section aria-labelledby={childTitle} className="hidden rounded-[28px] border border-line px-[28px] pt-[24px] pb-[28px] lg:block">
            <h2 id={childTitle} className="pb-[16px] text-heading text-ink">
              Your child
            </h2>
            <ChildFields value={childDraftOf(profile)} onChange={editChild} />
          </section>
        </div>

        <div className="flex flex-col lg:gap-[24px]">
          <SettingsSection title="Your plan" className={CARD}>
            <SettingRow art="/art/plan.png" label="Day" value={day ? `${day} of ${PLAN_DAYS}` : 'Not started'} />
            <SettingRow art="/art/alarm.png" label="Daily moment" value={profile.anchor ? capitalized(profile.anchor) : NOT_SET} />
            <SettingRow art={SCENE_ART[profile.sceneId] ?? '/art/blocks.png'} label="Scene" value={scene?.title ?? NOT_SET} />
          </SettingsSection>

          <SettingsSection title="Membership" className={CARD}>
            {entitlement.paid ? (
              <SettingRow
                art="/art/card.png"
                label={`${lengthOf(plan)}, ${priceOf(plan)}`}
                tag={<Tag tone="quiet">{entitlement.demo ? 'Demo' : 'Test mode'}</Tag>}
              />
            ) : (
              <SettingRow art="/art/card.png" label="Free first visit" value="See plans" href={ROUTES.pricing} />
            )}
            {renewal && <SettingRow label={`Renews ${longDate(renewal)}`} />}
            <p className="py-[14px] text-label text-gray">{renewLine}</p>
            {entitlement.paid && (
              <SettingRow label={entitlement.demo ? 'End demo access' : 'End test membership'} onClick={() => setEnding(true)} />
            )}
          </SettingsSection>
        </div>

        <div className="flex flex-col lg:gap-[24px]">
          <SettingsSection title="Analysis" className={CARD}>
            <SettingRow art="/art/search-speech.png" label="How coding works" chevron onClick={() => open('coding')} />
          </SettingsSection>

          <SettingsSection title="This device" className={CARD}>
            <SettingRow art="/art/document.png" label="Jury guide" href={ROUTES.jury} />
            <SettingRow art="/art/door.png" label="Erase everything on this device" onClick={() => setErasing(true)} />
          </SettingsSection>
        </div>
      </div>

      <footer className="flex flex-col gap-[6px] px-[24px] pt-[28px] text-center text-small text-gray lg:px-[48px]">
        <p>Skill practice. Not therapy and not a diagnosis.</p>
        <p>
          On a waitlist? Stay on it. Fammy is practice while you wait. In crisis: call or text 988. Childhelp:{' '}
          <span className="whitespace-nowrap">1-800-422-4453</span>.
        </p>
      </footer>

      <Sheet
        open={erasing}
        onClose={() => setErasing(false)}
        title="Erase everything on this device?"
        art="/art/door.png"
        primary={{ label: 'Erase everything', onClick: eraseAll }}
        secondary={{ label: 'Keep my data', onClick: () => setErasing(false) }}
      >
        Your sessions, your child’s details, your plan and your membership on this device. This cannot be undone.
      </Sheet>

      <Sheet
        open={ending}
        onClose={() => setEnding(false)}
        title={entitlement.demo ? 'End demo access?' : 'End test membership?'}
        art="/art/card.png"
        primary={{
          label: entitlement.demo ? 'End demo access' : 'End membership',
          onClick: () => {
            clearEntitlement();
            setEnding(false);
          },
        }}
        secondary={{ label: 'Keep it', onClick: () => setEnding(false) }}
      >
        The daily five minutes and live mode lock again on this device. Your sessions stay.
      </Sheet>
    </div>
  );
}
