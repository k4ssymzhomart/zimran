import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * The line icons of the Split design, one inline SVG each, drawn with currentColor on a 24 grid with round caps
 * and round joins. Color comes from the text color of the parent: `text-white` on violet, `text-faint` for a row chevron.
 *
 * A glossy 3D object (a tab icon, a medal, the trash can of a settings row) is not an icon: that is `Art`.
 *
 * Figma keeps the stroke of an icon at the same pixel weight when it resizes the icon (the microphone is 2px at
 * 24 and at 22, the chevron 2px at 20 and at 18), so `size` scales the drawing and leaves the stroke alone.
 *
 * Drawn in Figma (the layer, or where it is used; the sizes; the stroke):
 *   back           icon/back              24           2
 *   close          icon/close             24           2
 *   chevron-left   the month before       18           2     the same drawing as back
 *   chevron-right  icon/right             20, 18       2
 *   chevron-down   a closed answer        20, 24       2
 *   chevron-up     an open answer         20, 24       2
 *   check          icon/check             18, 20       2.4   2.6 at 14, inside the 24px radio of an option
 *   arrow-up       icon/up                18, 20, 22   2     2.4 at 22, inside the ink circle of the composer
 *   arrow-right    a number to its goal   18           2
 *   mic            icon/mic               24, 22, 20   2
 *   speaker        icon/sound             24           2
 *   play           icon/play              16, 18, 20   1.5   filled; 2 at 30, in the desktop player
 *   more           icon/more              24           2     three filled dots
 *
 * Not drawn in Figma. Made for the kit in the same hand (24 grid, 2px, round), for states and actions the design
 * names but does not draw: plus, minus, pause, mic-off, speaker-off, info, lock, calendar, share, trash,
 * external, search.
 */
export type IconName =
  | 'back'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'check'
  | 'plus'
  | 'minus'
  | 'arrow-up'
  | 'arrow-right'
  | 'mic'
  | 'mic-off'
  | 'speaker'
  | 'speaker-off'
  | 'play'
  | 'pause'
  | 'more'
  | 'info'
  | 'lock'
  | 'calendar'
  | 'share'
  | 'trash'
  | 'external'
  | 'search';

interface Drawing {
  /** The stroke in CSS pixels, at every size. */
  weight: number;
  shape: ReactNode;
}

const BACK = <path d="M15 6 9 12l6 6" />;
const MIC = (
  <>
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </>
);
const SPEAKER = <path d="M4 9.5h3.5l4.5-4v13l-4.5-4H4z" />;

const ICONS: Record<IconName, Drawing> = {
  back: { weight: 2, shape: BACK },
  close: { weight: 2, shape: <path d="m6 6 12 12M18 6 6 18" /> },
  'chevron-left': { weight: 2, shape: BACK },
  'chevron-right': { weight: 2, shape: <path d="m9 6 6 6-6 6" /> },
  'chevron-up': { weight: 2, shape: <path d="m6 15 6-6 6 6" /> },
  'chevron-down': { weight: 2, shape: <path d="m6 9 6 6 6-6" /> },
  check: { weight: 2.4, shape: <path d="m5 12.5 4.2 4.2L19 7" /> },
  plus: { weight: 2, shape: <path d="M12 6v12M6 12h12" /> },
  minus: { weight: 2, shape: <path d="M6 12h12" /> },
  'arrow-up': { weight: 2, shape: <path d="M12 19V5M18 11l-6-6-6 6" /> },
  'arrow-right': { weight: 2, shape: <path d="M5 12h14M13 18l6-6-6-6" /> },
  mic: { weight: 2, shape: MIC },
  // The Figma microphone with a slash through it; its strokes stop 3 units short of the slash on both sides.
  'mic-off': { weight: 2, shape: <path d="m4 4 16 16M9.19 4.95A3 3 0 0 1 15 6v4.76M19 11a7 7 0 0 1-.7 3.06M5 11a7 7 0 0 0 8.58 6.82M12 18v3" /> },
  speaker: {
    weight: 2,
    shape: (
      <>
        {SPEAKER}
        <path d="M16 9a4 4 0 0 1 0 6" />
      </>
    ),
  },
  'speaker-off': {
    weight: 2,
    shape: (
      <>
        {SPEAKER}
        <path d="m16 9.5 5 5M21 9.5l-5 5" />
      </>
    ),
  },
  play: { weight: 1.5, shape: <path d="M8 5.5v13l11-6.5z" fill="currentColor" /> },
  pause: { weight: 1.5, shape: <path d="M8 5.5h2.5v13H8zM13.5 5.5H16v13h-2.5z" fill="currentColor" /> },
  more: {
    weight: 2,
    shape: (
      <g fill="currentColor">
        <circle cx="5" cy="12" r="1.2" />
        <circle cx="12" cy="12" r="1.2" />
        <circle cx="19" cy="12" r="1.2" />
      </g>
    ),
  },
  info: {
    weight: 2,
    shape: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11.5v5M12 7.75v.01" />
      </>
    ),
  },
  lock: {
    weight: 2,
    shape: (
      <>
        <rect x="5" y="10.5" width="14" height="10.5" rx="3" />
        <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
  calendar: {
    weight: 2,
    shape: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="3" />
        <path d="M4 10h16M8 3v4M16 3v4" />
      </>
    ),
  },
  share: { weight: 2, shape: <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /> },
  trash: {
    weight: 2,
    shape: <path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.7 11.2a2 2 0 0 0 2 1.8h5.6a2 2 0 0 0 2-1.8L17.5 7M10.25 11v5M13.75 11v5" />,
  },
  external: { weight: 2, shape: <path d="M14 5h5v5M19 5l-8 8M11 6H8a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3v-3" /> },
  search: {
    weight: 2,
    shape: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
  },
};

/** Every icon name, in the order of the type. For a picker or a test; the gallery lists them from here. */
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export interface IconProps {
  name: IconName;
  /**
   * Width and height in CSS pixels. Figma uses 24 in a bar, 20 for the chevron of a row, 18 on a week peg and in a
   * month header, 22 inside a filled circle.
   */
  size?: number;
  /** The stroke in CSS pixels. Leave it out: every icon carries the weight Figma draws it in. */
  strokeWidth?: number;
  className?: string;
  /**
   * The name read by screen readers, for an icon that stands alone and means something.
   * Without it the icon is decoration and is hidden from them: inside a button, the button carries the label.
   */
  title?: string;
}

export function Icon({ name, size = 24, strokeWidth, className, title }: IconProps) {
  const { weight, shape } = ICONS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={((strokeWidth ?? weight) * 24) / size}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('shrink-0', className)}
    >
      {title && <title>{title}</title>}
      {shape}
    </svg>
  );
}
