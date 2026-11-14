/** Per-minute trend, one point per day, drawn in plain SVG. The dashed line is the clinic pace. */

export interface TrendPoint {
  date: string;
  specific_praise: number;
  /** null on a day with only live play: reflections were not measured, so the line skips that day. */
  reflection: number | null;
  description: number;
}

const SERIES = [
  { key: 'specific_praise', label: 'Praise', stroke: 'stroke-sun', fill: 'fill-sun' },
  { key: 'reflection', label: 'Reflect', stroke: 'stroke-sky', fill: 'fill-sky' },
  { key: 'description', label: 'Describe', stroke: 'stroke-leaf', fill: 'fill-leaf' },
] as const;

const W = 320;
const H = 150;
const PAD = { left: 26, right: 10, top: 10, bottom: 20 };
const CLINIC_PACE = 2; // sentences per minute for each skill

/** `span` is how many days the x axis leaves room for, so a short history starts at the left and grows. */
export function TrendChart({ points, span = 7 }: { points: TrendPoint[]; span?: number }) {
  const days = Math.max(span, points.length, 2);
  const top = Math.max(4, ...points.flatMap((p) => SERIES.map((s) => p[s.key] ?? 0)));
  const x = (i: number) => PAD.left + (i * (W - PAD.left - PAD.right)) / (days - 1);
  const y = (v: number) => H - PAD.bottom - (v * (H - PAD.top - PAD.bottom)) / top;
  const latest = points.at(-1);
  const summary = latest
    ? `Latest day, per minute: praise ${latest.specific_praise}, reflections ${latest.reflection ?? 'not counted in live play'}, descriptions ${latest.description}. Clinic pace is ${CLINIC_PACE} of each.`
    : 'No days yet.';

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Skill trend over ${points.length} day${points.length === 1 ? '' : 's'}. ${summary}`}>
        {/* frame and scale */}
        <line x1={PAD.left} y1={y(0)} x2={W - PAD.right} y2={y(0)} className="stroke-ink" strokeWidth="2" strokeLinecap="round" />
        {[0, CLINIC_PACE, top].map((v) => (
          <text key={v} x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className="fill-ink-soft text-[10px] font-semibold">
            {Math.round(v * 10) / 10}
          </text>
        ))}
        <line x1={PAD.left} y1={y(CLINIC_PACE)} x2={W - PAD.right} y2={y(CLINIC_PACE)} className="stroke-ink" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.6" />
        <text x={W - PAD.right} y={y(CLINIC_PACE) - 5} textAnchor="end" className="fill-ink-soft text-[10px] font-semibold">
          clinic pace · 2 a minute
        </text>
        <text x={PAD.left} y={H - 5} className="fill-ink-soft text-[10px]">day 1</text>
        <text x={W - PAD.right} y={H - 5} textAnchor="end" className="fill-ink-soft text-[10px]">day {days}</text>

        {SERIES.map((s) => {
          // A day without a reading for this skill is left out of its line, not drawn at zero.
          const dots = points.flatMap((p, i) => {
            const v = p[s.key];
            return v === null ? [] : [{ i, v, date: p.date }];
          });
          return (
            <g key={s.key}>
              {dots.length > 1 && (
                <polyline
                  points={dots.map((d) => `${x(d.i)},${y(d.v)}`).join(' ')}
                  fill="none"
                  className={s.stroke}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {/* Every reading on a short history; on a long one, only the newest reading of this skill. */}
              {dots.map((d) =>
                points.length <= 10 || d.i === dots[dots.length - 1].i ? (
                  <circle key={d.date} cx={x(d.i)} cy={y(d.v)} r="4" className={`${s.fill} stroke-ink`} strokeWidth="1.5" />
                ) : null,
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 font-semibold">
            <svg width="10" height="10" aria-hidden="true">
              <circle cx="5" cy="5" r="4" className={`${s.fill} stroke-ink`} strokeWidth="1.5" />
            </svg>
            {s.label}
          </span>
        ))}
        <span>sentences per minute</span>
      </figcaption>
    </figure>
  );
}
