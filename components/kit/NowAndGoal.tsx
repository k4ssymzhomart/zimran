import { cn } from './cn';
import { Pattern } from './Pattern';

/** Per-minute rates, already formatted: "1.0", "0.8", or "–" for reflections in live play. */
export interface PaceValues {
  praise: string;
  reflect: string;
  describe: string;
  swap: string;
}

const ROWS: ReadonlyArray<{ key: keyof PaceValues; label: string }> = [
  { key: 'praise', label: 'Praise' },
  { key: 'reflect', label: 'Reflect' },
  { key: 'describe', label: 'Describe' },
  { key: 'swap', label: 'To swap' },
];

export interface NowAndGoalProps {
  now: PaceValues;
  goal: PaceValues;
  nowTitle?: string;
  goalTitle?: string;
  /** Where the numbers come from: "From round two". */
  nowNote?: string;
  /** When the goal is checked: "Checked over five minutes on 12 December". */
  goalNote?: string;
  className?: string;
}

/** The parent's own rates beside the clinic pace. A target for the parent, not a promise about the child. */
export function NowAndGoal({ now, goal, nowTitle = 'Now, per minute', goalTitle = 'Clinic pace', nowNote, goalNote, className }: NowAndGoalProps) {
  return (
    <div className={cn('flex items-start gap-[12px]', className)}>
      <Column title={nowTitle} values={now} note={nowNote} />
      <Column title={goalTitle} values={goal} note={goalNote} violet />
    </div>
  );
}

function Column({ title, values, note, violet = false }: { title: string; values: PaceValues; note?: string; violet?: boolean }) {
  const quiet = violet ? 'text-white' : 'text-gray';
  return (
    <div
      className={cn(
        'relative min-w-0 flex-1 overflow-clip rounded-[24px] py-[16px] pr-[14px] pl-[16px]',
        violet ? 'bg-violet text-white' : 'border border-line bg-white text-ink',
      )}
    >
      {violet && <Pattern kind="reps" size={720} />}
      <div className="relative flex flex-col gap-[10px]">
        <h3 className="text-body-strong">{title}</h3>
        <dl className="flex flex-col gap-[4px]">
          {ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between">
              <dt className={cn('text-small', quiet)}>{row.label}</dt>
              <dd className="text-body-strong">{values[row.key]}</dd>
            </div>
          ))}
        </dl>
        {note && <p className={cn('text-small', quiet)}>{note}</p>}
      </div>
    </div>
  );
}
