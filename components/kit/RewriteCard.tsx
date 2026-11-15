import { cn } from './cn';
import { Tag } from './Tag';

export interface RewriteCardProps {
  /** The sentence to say instead, without quotation marks. */
  text: string;
  label?: string;
  /** Who wrote it. Rule output is a "Coach tip" and is never labeled as AI. */
  source?: string;
  className?: string;
}

/** A sentence to try in place of one to swap. */
export function RewriteCard({ text, label = 'Try', source = 'Coach tip', className }: RewriteCardProps) {
  return (
    <div className={cn('flex flex-col gap-[6px] rounded-[16px] bg-mist px-[14px] py-[12px]', className)}>
      <div className="flex items-center justify-between">
        <span className="text-small text-gray">{label}</span>
        <Tag tone="quiet">{source}</Tag>
      </div>
      <p className="text-body-strong text-ink">“{text}”</p>
    </div>
  );
}
