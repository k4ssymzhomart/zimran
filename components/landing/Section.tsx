import type { ReactNode } from 'react';
import { cn } from '@/components/kit/cn';

export type SectionTone = 'white' | 'mist' | 'violet' | 'lilac';

export interface SectionProps {
  /** The anchor a link scrolls to, such as "pricing". */
  id?: string;
  tone?: SectionTone;
  children: ReactNode;
  /** Lands on the same element as the padding. To change one side, use the longhand: `lg:pt-[56px]`. */
  className?: string;
}

const TONE: Record<SectionTone, string> = {
  white: 'bg-white text-ink',
  mist: 'bg-mist text-ink',
  violet: 'bg-violet text-white',
  lilac: 'bg-lilac text-ink',
};

/**
 * One section of the landing (Figma 66:1267 on phones, 63:224 from 1024px).
 * The color runs edge to edge. The content keeps the page column: 24px at the sides on phones,
 * 1200px wide on a 1440px screen and centered on anything wider.
 * Children stack 20px apart under 44px of padding on phones, 44px apart under 104px from 1024px.
 * The section is `relative`, so a <Pattern> can be the first child of a violet one.
 */
export function Section({ id, tone = 'white', children, className }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'relative flex flex-col gap-[20px] px-[24px] py-[44px] lg:gap-[44px] lg:px-[48px] lg:py-[104px] xl:px-[max(120px,calc(50%-600px))]',
        TONE[tone],
        className,
      )}
    >
      {children}
    </section>
  );
}
