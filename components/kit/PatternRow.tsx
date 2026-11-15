import { cn } from './cn';

export interface PatternRowProps {
  /** What was counted: "Most questions began with". */
  label: string;
  /** What the rules found, already formatted: "“What”". */
  value: string;
  className?: string;
}

/** One finding in the rule-built Patterns block of a session review. */
export function PatternRow({ label, value, className }: PatternRowProps) {
  return (
    <div className={cn('flex min-h-[52px] items-center gap-[10px]', className)}>
      <span className="min-w-0 flex-1 text-body text-gray">{label}</span>
      <span className="shrink-0 text-body-strong whitespace-nowrap text-ink">{value}</span>
    </div>
  );
}
