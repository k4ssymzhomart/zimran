'use client';

import { CHILDREN } from '@/components/child';
import { ART, Button, Divider, PageScreen, Pattern, Portrait, SettingRow, Tag } from '@/components/kit';
import { useProfile } from '@/hooks/useProfile';
import { FEATURES } from '@/lib/features';
import { ROUTES } from '@/lib/routes';

/**
 * Practice (Figma 47:921, 54:221): what a parent can start by hand today, a round with the practice partner
 * and live mode.
 * TODO: the partner switch, the scene chips and the 30-second lessons, once a round and a lesson can be
 * opened on their own.
 */
export default function PracticePage() {
  const { profile, ready } = useProfile();
  if (!ready) return <PageScreen embedded title="Practice">{null}</PageScreen>;

  const partner = CHILDREN[profile.partner];
  return (
    <PageScreen embedded title="Practice">
      <div className="flex w-full max-w-[480px] flex-col gap-[12px] pt-[4px]">
        <div className="relative flex h-[196px] items-end justify-between overflow-clip rounded-[28px] bg-violet pl-[20px] pr-[6px] pt-[18px] text-white">
          <Pattern kind="reps" size={720} />
          <div className="relative flex h-full shrink-0 flex-col items-start justify-between pb-[18px]">
            <span className="flex h-[34px] items-center rounded-[18px] bg-violet-press px-[14px] text-label">Simulated child</span>
            <h2 className="text-heading whitespace-nowrap">One minute with {partner.name}</h2>
          </div>
          <Portrait partner={profile.partner} pose={profile.partner === 'mia' ? 'body-blocks' : 'body-car'} size={150} className="relative" />
        </div>
        <Button href={ROUTES.practiceRound} fullWidth>
          Start a round
        </Button>

        {FEATURES.live && (
          <>
            <Divider className="mt-[12px]" />
            <SettingRow label="Live with your child" art={ART.earbud.src} tag={<Tag tone="quiet">Beta</Tag>} href={ROUTES.live} className="rounded-[12px]" />
          </>
        )}
      </div>
    </PageScreen>
  );
}
