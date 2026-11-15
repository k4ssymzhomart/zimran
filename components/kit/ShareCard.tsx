import type { Counts } from '@/lib/types';
import { cn } from './cn';
import { Logo } from './Logo';
import { Pattern } from './Pattern';

export interface ShareCardProps {
  /** One line above the headline: "Tue 10 Nov · five minutes". */
  when: string;
  /** The session in one sentence: "Six praises, nine questions." */
  headline: string;
  counts: Pick<Counts, 'specific_praise' | 'reflection' | 'description' | 'avoid'>;
  /** Live play does not count reflections: the card shows a dash there, never a zero. */
  live?: boolean;
  className?: string;
}

/** The one picture a parent can share: counts only, no audio and no sentences. */
export function ShareCard({ when, headline, counts, live = false, className }: ShareCardProps) {
  const stats = [
    { label: 'Praise', value: String(counts.specific_praise) },
    { label: 'Reflect', value: live ? '–' : String(counts.reflection) },
    { label: 'Describe', value: String(counts.description) },
    { label: 'To swap', value: String(counts.avoid) },
  ];
  return (
    <div className={cn('relative h-[430px] w-[342px] max-w-full overflow-clip rounded-[32px] bg-violet text-white', className)}>
      <Pattern kind="reps" size={864} />
      <div className="relative flex h-full flex-col gap-[14px] px-[24px] pt-[24px] pb-[28px]">
        <Logo tone="white" className="self-start" />
        <div className="flex-1" />
        <p className="text-label">{when}</p>
        <p className="text-display">{headline}</p>
        <dl className="flex gap-[8px]">
          {stats.map((stat) => (
            <div key={stat.label} className="flex min-w-0 flex-1 flex-col-reverse gap-[2px]">
              <dt className="text-small">{stat.label}</dt>
              <dd className="text-title tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
