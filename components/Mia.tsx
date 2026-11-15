'use client';

import Image from 'next/image';
import type { Face, Posture } from '@/lib/types';
import { CHILDREN, useChild, type ChildId } from './child';

/** Every portrait there is: the five faces, plus the back of the head when turned away and a lean when delighted. */
const SHOTS = ['beaming', 'smiling', 'neutral', 'pouting', 'crying', 'away', 'leaning'] as const;
type Shot = (typeof SHOTS)[number];

const FACE_LABEL: Record<Face, string> = {
  beaming: 'beaming',
  smiling: 'smiling',
  neutral: 'calm',
  pouting: 'pouting',
  crying: 'crying',
};

/**
 * Which portrait the engine's face and posture make. Tears always show the face; otherwise turning away shows
 * the back of the head, and leaning in while beaming shows the child leaning toward you.
 */
function shotFor(face: Face, posture: Posture): Shot {
  if (posture === 'turned_away' && face !== 'crying') return 'away';
  if (posture === 'leaning_in' && face === 'beaming') return 'leaning';
  return face;
}

/** A gentle lean for postures that have no portrait of their own. */
function motion(shot: Shot, posture: Posture): React.CSSProperties {
  if (posture === 'leaning_in' && shot !== 'leaning') return { transform: 'translateY(-3%) scale(1.05)' };
  if (posture === 'turned_away' && shot !== 'away') return { transform: 'translateX(5%) rotate(4deg)' };
  return { transform: 'none' };
}

/**
 * The simulated four-year-old the parent chose, Mia or Leo, as 3D portraits that cross-fade, so a change of
 * mood never flashes. `kid` pins one child (the picker shows both). `fade` softens the cut at the bottom of the
 * portrait; turn it off when the child stands on the edge of a card.
 */
export function Mia({
  face,
  posture = 'at_toy',
  size = 168,
  priority = false,
  fade = true,
  kid,
}: {
  face: Face;
  posture?: Posture;
  size?: number;
  priority?: boolean;
  fade?: boolean;
  kid?: ChildId;
}) {
  const chosen = useChild().child;
  const child = kid ? CHILDREN[kid] : chosen;
  const shot = shotFor(face, posture);
  const away = posture === 'turned_away';
  const mask = 'linear-gradient(to bottom, #000 76%, transparent)';
  return (
    <div
      role="img"
      aria-label={`${child.name}, a simulated child, ${away ? 'turned away' : FACE_LABEL[face]}`}
      className="relative mx-auto"
      style={{ width: size, height: size, ...(fade ? { maskImage: mask, WebkitMaskImage: mask } : {}) }}
    >
      <div className="absolute inset-0 transition-transform duration-500 ease-out-quint" style={{ transformOrigin: '50% 100%', ...motion(shot, posture) }}>
        {SHOTS.map((s) => (
          <Image
            key={`${child.id}-${s}`}
            src={`${child.art}/${s}.png`}
            alt=""
            width={size}
            height={size}
            priority={priority}
            sizes={`${size}px`}
            className="absolute inset-0 h-full w-full transition-opacity duration-300"
            style={{ opacity: s === shot ? 1 : 0 }}
          />
        ))}
      </div>
    </div>
  );
}
