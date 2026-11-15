import Link from 'next/link';

/**
 * The PlayReps mark: three bars of decreasing length, the last one in brand violet.
 * Drawn on a 113 x 100 grid. The top bar is two circles (r 16 and r 8) joined by their tangents.
 */
export function LogoMark({ size = 24, tone = 'ink', className }: { size?: number; tone?: 'ink' | 'white'; className?: string }) {
  const bar = 'var(--color-fg)';
  const accent = tone === 'white' ? 'var(--color-lilac)' : 'var(--color-violet)';
  return (
    <svg viewBox="0 0 113 100" width={(size * 113) / 100} height={size} aria-hidden="true" className={className}>
      <path d="M16 32H105A8 8 0 0 0 106.43 16.13L18.85 .26A16 16 0 1 0 16 32Z" fill={bar} />
      <rect y="40.5" width="82.8" height="26" rx="13" fill={bar} />
      <rect y="75" width="52.6" height="25" rx="12.5" fill={accent} />
    </svg>
  );
}

/** Mark and wordmark. Links home unless `href` is null. */
export function Logo({ href = '/', tone = 'ink', size = 22 }: { href?: string | null; tone?: 'ink' | 'white'; size?: number }) {
  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${tone === 'white' ? 'text-white' : 'text-fg'}`}>
      <LogoMark size={size * 0.86} tone={tone} />
      <span className="font-bold tracking-[-0.035em]" style={{ fontSize: size }}>
        PlayReps
      </span>
    </span>
  );
  if (href === null) return inner;
  return (
    <Link href={href} aria-label="PlayReps home" className="rounded-lg focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-violet/50">
      {inner}
    </Link>
  );
}
