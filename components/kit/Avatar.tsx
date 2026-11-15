import type { PartnerId } from '@/lib/types';
import type { FacePose } from './art-manifest';
import { cn } from './cn';
import { Portrait } from './Portrait';

export interface AvatarProps {
  partner: PartnerId;
  pose?: FacePose;
  /** Diameter of the violet disc in CSS pixels. */
  size?: number;
  alt?: string;
  className?: string;
}

/** The child's portrait in a violet disc. The picture stands on the bottom edge and the disc crops it. */
export function Avatar({ partner, pose = 'smiling', size = 56, alt, className }: AvatarProps) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-end justify-center overflow-clip rounded-full bg-violet', className)}
      style={{ width: size, height: size }}
    >
      <Portrait partner={partner} pose={pose} size={Math.round((size * 52) / 56)} alt={alt} />
    </span>
  );
}
