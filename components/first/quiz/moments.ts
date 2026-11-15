/**
 * The moments of the day a parent can call hardest (Figma 49:1099, 54:955), in the order the tiles are drawn.
 * The ids are stored in the profile (Profile.moments) and the plan maps them to a behavior to praise: never rename one.
 */
import type { ArtName } from '@/components/kit/art-manifest';

export type MomentId = 'mornings' | 'mealtimes' | 'leaving' | 'screens_off' | 'bedtime' | 'sharing';

export interface Moment {
  id: MomentId;
  label: string;
  /** The 3D object on the tile: a name from components/kit/art-manifest.ts. */
  art: ArtName;
}

export const MOMENTS: readonly Moment[] = [
  { id: 'mornings', label: 'Mornings', art: 'sun' },
  { id: 'mealtimes', label: 'Mealtimes', art: 'dinner' },
  { id: 'leaving', label: 'Leaving the house', art: 'sneaker' },
  { id: 'screens_off', label: 'Screens off', art: 'tablet' },
  { id: 'bedtime', label: 'Bedtime', art: 'moon' },
  { id: 'sharing', label: 'Sharing', art: 'teddies' },
];

/** True for an id of the list above. A saved profile holds plain strings, and an old one may hold an id that is gone. */
export function isMomentId(id: string): id is MomentId {
  return MOMENTS.some((moment) => moment.id === id);
}
