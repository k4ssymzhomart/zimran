import { cn } from './cn';

export interface SummaryFact {
  label: string;
  value: string;
}

export interface SummaryCardProps {
  /** Share of the clinic pace, 0 to 100. */
  percent: number;
  caption?: string;
  /** Up to three short facts under the bar: "Strongest: Describe", "First swap: Questions", "Streak: 5 days". */
  facts: readonly SummaryFact[];
  className?: string;
}

/** Where the parent stands against the clinic pace, in one number and three facts. */
export function SummaryCard({ percent, caption = 'of the clinic pace', facts, className }: SummaryCardProps) {
  const share = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div className={cn('flex flex-col gap-[14px] rounded-[24px] bg-mist p-[18px]', className)}>
      <p className="flex items-baseline gap-[8px]">
        <span className="text-title text-ink tabular-nums">{share}%</span>
        <span className="text-label text-gray">{caption}</span>
      </p>
      <div aria-hidden="true" className="h-[6px] overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-violet" style={{ width: `${share}%` }} />
      </div>
      <dl className="flex gap-[8px]">
        {facts.map((fact) => (
          <div key={fact.label} className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <dt className="text-small text-gray">{fact.label}</dt>
            <dd className="text-body-strong text-ink">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
