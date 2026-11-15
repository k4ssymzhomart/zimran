import { Children, useId, type ReactNode } from 'react';
import { cn } from './cn';

export interface SettingsSectionProps {
  title: string;
  /** The rows, usually SettingRow. A hairline is drawn between them, none after the last. */
  children: ReactNode;
  /** The desktop look: the group in its own bordered card. The default is the full-width group of the phone. */
  card?: boolean;
  className?: string;
}

/** A titled group of rows on the Profile screen: "Recordings", "Your plan". */
export function SettingsSection({ title, children, card = false, className }: SettingsSectionProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn('bg-white', card ? 'rounded-[28px] border border-line px-[28px] pt-[24px] pb-[10px]' : 'px-[24px] pt-[26px]', className)}
    >
      <h2 id={titleId} className="pb-[6px] text-heading text-ink">
        {title}
      </h2>
      <ul>
        {Children.toArray(children).map((row, index) => (
          <li key={index} className={index > 0 ? 'border-t border-line' : undefined}>
            {row}
          </li>
        ))}
      </ul>
    </section>
  );
}
