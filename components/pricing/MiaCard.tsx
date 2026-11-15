import { Mia } from '@/components/Mia';
import { Art } from '@/components/ui';
import type { Face, Posture } from '@/lib/types';

/**
 * Mia standing on the violet art card, with the "Simulated child" label in its corner.
 * `sm` keeps the paywall short enough that the plans, the terms and the button fit on the first screen.
 */
export function MiaCard({
  face,
  posture = 'at_toy',
  size = 'md',
  priority = false,
}: {
  face: Face;
  posture?: Posture;
  size?: 'sm' | 'md';
  priority?: boolean;
}) {
  return (
    <Art size={size}>
      <span className="absolute left-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-[12px] font-medium text-fg-2 backdrop-blur">
        Simulated child
      </span>
      <Mia face={face} posture={posture} size={size === 'sm' ? 136 : 180} priority={priority} fade={false} />
    </Art>
  );
}
