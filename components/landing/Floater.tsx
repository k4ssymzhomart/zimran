import { Art, type ArtName } from '@/components/kit';
import { cn } from '@/components/kit/cn';

export interface FloaterProps {
  art: ArtName;
  /** Drawn size, in pixels. */
  size?: number;
  /** Position. Keep it in the margin of the page column, clear of words and controls. */
  className?: string;
  /** Share of the scroll the picture drifts against, for depth: 0.05 to 0.15 reads as gentle. */
  depth?: number;
  /** Seconds into its float, so pieces side by side do not bob in step. */
  delay?: number;
}

/**
 * One of the 3D pieces that float slowly at the edges of the landing: a slow bob (CSS), plus a drift against
 * the scroll (LandingMotion). Decoration only. With reduced motion it stays still.
 */
export function Floater({ art, size = 80, className, depth = 0.1, delay = 0 }: FloaterProps) {
  return (
    <div aria-hidden="true" data-parallax={depth} className={cn('pointer-events-none absolute select-none', className)}>
      <div className="landing-float" style={{ animationDelay: `${-delay}s` }}>
        <Art name={art} size={size} />
      </div>
    </div>
  );
}
