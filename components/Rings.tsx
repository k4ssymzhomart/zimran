import type { RingProgress } from '@/lib/round/session';
import { Check } from './Icons';

/** The three skills, in the order the rings show them. Praise is the brand violet. */
export const SKILLS = [
  { key: 'specific_praise', label: 'Praise', hint: 'name what she did well', color: 'var(--color-praise)', art: '/art/praise.png' },
  { key: 'reflection', label: 'Reflect', hint: 'say her words back', color: 'var(--color-reflect)', art: '/art/reflect.png' },
  { key: 'description', label: 'Describe', hint: 'say what she is doing', color: 'var(--color-describe)', art: '/art/describe.png' },
] as const;

const R = 22;
const C = 2 * Math.PI * R;

function Ring({ count, target, color, label, compact }: { count: number; target: number; color: string; label: string; compact?: boolean }) {
  const share = target > 0 ? Math.min(1, count / target) : 0;
  const done = share >= 1;
  const px = compact ? 42 : 56;
  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${done ? 'pop' : ''}`} key={done ? 'done' : 'open'} style={{ width: px, height: px }}>
        <svg viewBox="0 0 56 56" width={px} height={px} aria-hidden="true" className="-rotate-90">
          <circle cx="28" cy="28" r={R} fill="none" stroke="var(--color-stroke)" strokeWidth="6" />
          <circle
            cx="28"
            cy="28"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${share * C} ${C}`}
            style={{ transition: 'stroke-dasharray 520ms var(--ease-out-quint)' }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          {done ? (
            <span className="grid h-7 w-7 place-items-center rounded-full text-canvas" style={{ background: color }}>
              <Check size={15} strokeWidth={3} />
            </span>
          ) : (
            <span className="text-[15px] font-bold tabular-nums tracking-[-0.02em] text-fg">{count}</span>
          )}
        </span>
      </div>
      <span className={`text-[12px] font-semibold text-fg-2 ${compact ? 'mt-1' : 'mt-1.5'}`}>{label}</span>
      {!compact && (
        <span className="text-[11px] tabular-nums text-fg-faint">
          {count} of {target}
        </span>
      )}
    </div>
  );
}

/**
 * The three rings toward the clinic pace, and a calm counter for sentences to swap.
 * Never red, never "wrong": past the limit the counter only turns a shade darker.
 */
export function Rings({ rings, compact = false }: { rings: RingProgress; compact?: boolean }) {
  const over = rings.avoid.count > rings.avoid.max;
  const shown = SKILLS.filter((s) => rings[s.key].target > 0);
  return (
    <div className="flex items-start justify-center gap-5 sm:gap-7" role="group" aria-label="Progress toward the clinic pace">
      {shown.map((s) => (
        <Ring key={s.key} count={rings[s.key].count} target={rings[s.key].target} color={s.color} label={s.label} compact={compact} />
      ))}
      <div className="flex flex-col items-center" aria-live="polite">
        <div
          className={`grid place-items-center rounded-full text-[15px] font-bold tabular-nums transition-colors duration-300 ${
            over ? 'bg-surface-3 text-fg' : 'bg-surface-2 text-fg-2'
          }`}
          style={{ width: compact ? 42 : 56, height: compact ? 42 : 56 }}
        >
          {rings.avoid.count}
        </div>
        <span className={`text-[12px] font-semibold text-fg-2 ${compact ? 'mt-1' : 'mt-1.5'}`}>To swap</span>
        {!compact && <span className="text-[11px] tabular-nums text-fg-faint">at most {rings.avoid.max}</span>}
      </div>
    </div>
  );
}
