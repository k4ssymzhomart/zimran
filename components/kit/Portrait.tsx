import type { PartnerId } from '@/lib/types';
import { Picture, type PictureProps } from './Art';
import { portraitFile, type Pose } from './art-manifest';

export interface PortraitProps extends Omit<PictureProps, 'file'> {
  partner: PartnerId;
  /** A face ('smiling', 'pouting') or a full-body pose ('body-waving'). */
  pose?: Pose;
}

/** Mia or Leo, the simulated four-year-old, as a portrait or a full-body pose. */
export function Portrait({ partner, pose = 'smiling', ...rest }: PortraitProps) {
  return <Picture file={portraitFile(partner, pose)} {...rest} />;
}
