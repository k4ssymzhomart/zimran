'use client';

import { CHILDREN } from '@/components/child';
import { PageScreen, SettingRow, SettingsSection, Tag } from '@/components/kit';
import { useProfile } from '@/hooks/useProfile';
import { SCENES } from '@/lib/child/scenes';
import { ROUTES } from '@/lib/routes';

const NOT_SET = 'Not set';

/**
 * Profile (Figma 48:1282, 60:651), first version: what the quiz saved on this device, read back as it is.
 * An answer that was never given reads "Not set".
 * TODO: the header block, the row pictures, editing through a sheet, recordings, analysis and erasing.
 */
export default function ProfilePage() {
  const { profile, ready } = useProfile();
  if (!ready) return <PageScreen embedded title="Profile">{null}</PageScreen>;

  const scene = SCENES.find((s) => s.id === profile.sceneId);
  return (
    <PageScreen embedded title="Profile">
      {/* The sections bring their own 24px gutters, so they step out of the page's. */}
      <div className="-mx-[24px] flex max-w-[688px] flex-col">
        <SettingsSection title="Your child">
          <SettingRow label="Name" value={profile.childName ?? NOT_SET} />
          <SettingRow label="Age" value={profile.childAge === null ? NOT_SET : String(profile.childAge)} />
          <SettingRow label="Hardest moments" value={profile.moments.length > 0 ? `${profile.moments.length} chosen` : NOT_SET} />
          <SettingRow label="Partner" tag={<Tag tone="quiet">Simulated child</Tag>} value={CHILDREN[profile.partner].name} />
        </SettingsSection>

        <SettingsSection title="Your plan">
          <SettingRow label="Daily moment" value={profile.anchor ?? NOT_SET} />
          <SettingRow label="Scene" value={scene?.title ?? NOT_SET} />
        </SettingsSection>

        <SettingsSection title="Membership">
          <SettingRow label="See plans" href={ROUTES.pricing} />
        </SettingsSection>

        <SettingsSection title="This device">
          <SettingRow label="Jury guide" href={ROUTES.jury} />
        </SettingsSection>

        <p className="px-[24px] pt-[28px] text-center text-small text-gray">Skill practice. Not therapy and not a diagnosis.</p>
      </div>
    </PageScreen>
  );
}
