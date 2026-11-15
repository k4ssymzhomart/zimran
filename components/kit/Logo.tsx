import { cn } from './cn';

/** `ink` sits on white, `white` on a violet block, `violet` is the single-color mark. */
export type LogoTone = 'ink' | 'white' | 'violet';

/** The two long bars and the short third bar, per tone. */
const BARS: Record<LogoTone, { bars: string; accent: string; word: string }> = {
  ink: { bars: 'fill-ink', accent: 'fill-violet', word: 'text-ink' },
  white: { bars: 'fill-white', accent: 'fill-lilac-2', word: 'text-white' },
  violet: { bars: 'fill-violet', accent: 'fill-violet', word: 'text-violet' },
};

export interface LogoMarkProps {
  tone?: LogoTone;
  /** Height in CSS pixels. The mark is 20.3 wide for every 18 tall. */
  size?: number;
  className?: string;
}

/** The Fammy mark: three bars, each shorter than the last, like lines of counted speech. */
export function LogoMark({ tone = 'ink', size = 18, className }: LogoMarkProps) {
  const { bars, accent } = BARS[tone];
  return (
    /* The mark fills its 20.3 wide box to the edge, and a browser rounds that box to whole pixels before it clips: let the round end of the top bar paint past it. */
    <svg viewBox="0 0 20.3 18" width={(size * 20.3) / 18} height={size} aria-hidden="true" className={cn('shrink-0 overflow-visible', className)}>
      <path
        className={bars}
        d="M2.874 5.76H18.863A1.44 1.44 0 0 0 19.12 2.903L3.386.047A2.88 2.88 0 1 0 2.874 5.76Z"
      />
      <rect className={bars} y="7.29" width="14.875" height="4.68" rx="2.34" />
      <rect className={accent} y="13.5" width="9.449" height="4.5" rx="2.25" />
    </svg>
  );
}

export interface LogoProps {
  tone?: LogoTone;
  className?: string;
}

/** The mark and the wordmark. Wrap it in a link where it leads home. */
export function Logo({ tone = 'ink', className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-[8px]', BARS[tone].word, className)}>
      <LogoMark tone={tone} />
      <span className="text-lead font-semibold tracking-[-0.4px]">Fammy</span>
    </span>
  );
}
