import { cn } from './cn';
import { Segmented, type SegmentedOption } from './Segmented';

export interface CheckInProps<T extends string> {
  /** The question: "How many hard moments this week?" */
  question: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  /** The parent's answer, or null while the question is open. */
  value: T | null;
  onChange(value: T): void;
  className?: string;
}

/** The weekly question about the parent's own log. It records an answer and promises nothing. */
export function CheckIn<T extends string>({ question, options, value, onChange, className }: CheckInProps<T>) {
  return (
    <div className={cn('flex flex-col gap-[10px]', className)}>
      <p className="text-body-strong text-ink">{question}</p>
      {/* An open question selects nothing: the empty string matches no option. */}
      <Segmented<string> label={question} options={options} value={value ?? ''} onChange={(next) => onChange(next as T)} fullWidth />
    </div>
  );
}
