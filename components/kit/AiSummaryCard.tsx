import { Art } from './Art';
import { cn } from './cn';

export interface AiSummaryCardProps {
  /** The summary the model wrote. Without it the card renders nothing: there is no placeholder summary. */
  text?: string | null;
  title?: string;
  /** Says who wrote the text, so a rule-built count is never mistaken for AI and the other way round. */
  note?: string;
  className?: string;
}

/** The optional AI summary of a session. The only AI-written text on the review, and labeled as such. */
export function AiSummaryCard({
  text,
  title = 'AI summary',
  note = 'Written by AI from your sentence text. It never changes a count.',
  className,
}: AiSummaryCardProps) {
  if (!text?.trim()) return null;
  return (
    <section className={cn('flex flex-col gap-[10px] rounded-[24px] bg-lilac px-[18px] pt-[16px] pb-[18px]', className)}>
      <h3 className="flex items-center gap-[10px] text-body-strong text-ink">
        <Art name="sparkle" size={28} />
        {title}
      </h3>
      <p className="text-body text-ink">{text}</p>
      <p className="text-small text-gray">{note}</p>
    </section>
  );
}
