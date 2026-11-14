import type { RingProgress } from '@/lib/round/session';

const SKILLS = [
  { key: 'specific_praise', label: 'Praise', hint: 'name what she did well', color: '#f4b63a' },
  { key: 'reflection', label: 'Reflect', hint: 'say her words back', color: '#4a7fb5' },
  { key: 'description', label: 'Describe', hint: 'say what she is doing', color: '#3f8f5f' },
] as const;

const R = 26;
const C = 2 * Math.PI * R;

function Ring({ count, target, color, label, hint }: { count: number; target: number; color: string; label: string; hint: string }) {
  const share = target > 0 ? Math.min(1, count / target) : 0;
  const done = share >= 1;
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`relative ${done ? 'pop' : ''}`} key={done ? 'done' : 'open'}>
        <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
          <circle cx="34" cy="34" r={R} fill="#fffaf0" stroke="#211c17" strokeWidth="2.5" />
          <circle
            cx="34"
            cy="34"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${share * C} ${C}`}
            transform="rotate(-90 34 34)"
            style={{ transition: 'stroke-dasharray 420ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-semibold tabular-nums">
          {count}
          <span className="text-xs font-normal text-ink-soft">/{target}</span>
        </span>
      </div>
      <span className="mt-1 text-sm font-bold">{label}</span>
      <span className="text-[11px] leading-tight text-ink-soft">{hint}</span>
    </div>
  );
}

/** Three rings for the three skills, and a calm tray for sentences to swap. Never red, never "wrong". */
export function Rings({ rings }: { rings: RingProgress }) {
  const over = rings.avoid.count > rings.avoid.max;
  const shown = SKILLS.filter((s) => rings[s.key].target > 0);
  return (
    <div>
      <div className={`grid gap-2 ${shown.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`} role="group" aria-label="Progress toward the clinic pace">
        {shown.map((s) => (
          <Ring key={s.key} count={rings[s.key].count} target={rings[s.key].target} color={s.color} label={s.label} hint={s.hint} />
        ))}
      </div>
      <div
        className={`mt-3 flex items-center justify-between rounded-full border-2 border-ink/70 px-4 py-1.5 text-sm ${over ? 'bg-sand' : 'bg-[#fffaf0]'}`}
        aria-live="polite"
      >
        <span className="font-semibold">To swap</span>
        <span className="text-ink-soft">questions · commands · corrections</span>
        <span className="font-display text-base font-semibold tabular-nums">{rings.avoid.count}</span>
      </div>
    </div>
  );
}
