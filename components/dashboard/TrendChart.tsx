/**
 * Skill trend, one point per day. Values are counts on the five-minute scale (a shorter round is not scaled
 * up); the dashed line is the clinic norm of 10. The lines are drawn in a stretched SVG with strokes that do
 * not scale, and the dots and labels are plain HTML on top, so text stays crisp at every width.
 */

export interface TrendPoint {
  date: string;
  specific_praise: number;
  /** null on a day with only live play: reflections were not measured, so the line skips that day. */
  reflection: number | null;
  description: number;
}

const SERIES = [
  { key: 'specific_praise', label: 'Praise', color: 'var(--color-violet)' },
  { key: 'reflection', label: 'Reflect', color: 'var(--color-reflect)' },
  { key: 'description', label: 'Describe', color: 'var(--color-describe)' },
] as const;

const PLOT_HEIGHT = 168;
const CLINIC_NORM = 10; // of each skill in five minutes

/** `span` is how many days the x axis leaves room for, so a short history starts at the left and grows. */
export function TrendChart({ points, span = 7 }: { points: TrendPoint[]; span?: number }) {
  const days = Math.max(span, points.length, 2);
  // A little headroom above the highest reading, so a line never runs along the top edge.
  const top = Math.max(CLINIC_NORM + 2, ...points.flatMap((p) => SERIES.map((s) => (p[s.key] ?? 0) * 1.1)));
  const x = (i: number) => (i * 100) / (days - 1);
  const y = (v: number) => 100 - (v * 100) / top;
  const normAt = `${y(CLINIC_NORM)}%`;
  const latest = points.at(-1);
  const summary = latest
    ? `Latest day, in five minutes: praise ${latest.specific_praise}, reflections ${latest.reflection ?? 'not counted in live play'}, descriptions ${latest.description}. The clinic norm is ${CLINIC_NORM} of each.`
    : 'No days yet.';

  const lines = SERIES.map((s) => ({
    ...s,
    // A day without a reading for this skill is left out of its line, not drawn at zero.
    dots: points.flatMap((p, i) => {
      const v = p[s.key];
      return v === null ? [] : [{ i, v, date: p.date }];
    }),
  }));

  return (
    <figure>
      <div role="img" aria-label={`Skill trend over ${points.length} day${points.length === 1 ? '' : 's'}. ${summary}`} className="flex gap-2.5">
        {/* y axis: only the two values that matter */}
        <div aria-hidden="true" className="relative w-5 shrink-0 text-right text-[11px] font-medium tabular-nums text-fg-faint" style={{ height: PLOT_HEIGHT }}>
          <span className="absolute right-0 -translate-y-1/2" style={{ top: normAt }}>
            {CLINIC_NORM}
          </span>
          <span className="absolute right-0 -translate-y-1/2" style={{ top: '100%' }}>
            0
          </span>
        </div>

        <div aria-hidden="true" className="relative min-w-0 flex-1" style={{ height: PLOT_HEIGHT }}>
          <div className="absolute inset-x-0 bottom-0 h-px bg-stroke" />
          <div className="absolute inset-x-0 border-t border-dashed border-fg-faint/60" style={{ top: normAt }} />
          {/* Labelled at the start, where a family's early days sit well under it, so the lines rarely cross the words. */}
          <span className="absolute left-0 -translate-y-full pb-1 text-[11px] font-medium text-fg-faint" style={{ top: normAt }}>
            clinic norm
          </span>

          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {lines.map((s) =>
              s.dots.length > 1 ? (
                <polyline
                  key={s.key}
                  points={s.dots.map((d) => `${x(d.i)},${y(d.v)}`).join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null,
            )}
          </svg>

          {/* Every reading on a short history; on a long one, only the newest reading of each skill. */}
          {lines.map((s) =>
            s.dots.map((d) =>
              points.length <= 10 || d.i === s.dots[s.dots.length - 1].i ? (
                <span
                  key={`${s.key}-${d.date}`}
                  className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                  style={{ left: `${x(d.i)}%`, top: `${y(d.v)}%`, background: s.color }}
                />
              ) : null,
            ),
          )}
        </div>
      </div>

      <div aria-hidden="true" className="mt-2 flex justify-between pl-[30px] text-[11px] font-medium text-fg-faint">
        <span>Day 1</span>
        <span>Day {days}</span>
      </div>

      <figcaption className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] font-medium text-fg-2">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
