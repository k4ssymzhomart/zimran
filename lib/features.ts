/**
 * Switches for the parts that wait for the owner's decision. Set at build time in the environment;
 * Next.js inlines NEXT_PUBLIC_ values, so each one is read by its full name.
 */
function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

export const FEATURES = {
  /** Keep the parent's audio on this device. Off until recording is approved. */
  recording: flag(process.env.NEXT_PUBLIC_FEATURE_RECORDING, false),
  /** The optional summary written by a language model. Off until it is approved. */
  aiSummary: flag(process.env.NEXT_PUBLIC_FEATURE_AI_SUMMARY, false),
  /** Live mode with the parent's own child. On; NEXT_PUBLIC_FEATURE_LIVE=false hides it. */
  live: flag(process.env.NEXT_PUBLIC_FEATURE_LIVE, true),
} as const;
