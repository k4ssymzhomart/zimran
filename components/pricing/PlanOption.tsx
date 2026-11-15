import { Fragment } from 'react';
import { Tag, cn, colorMotion, focusRingWithin, pickOnEnter } from '@/components/kit';

export interface PlanOptionProps {
  /** "4 weeks" */
  title: string;
  /** "$1.04 a day" */
  perDay: string;
  /** "$29" */
  price: string;
  /** A short label beside the title: "Best value". */
  tag?: string | null;
  /**
   * What the term holds, under the price of a day. The frames draw the card without it, so it is shown where they
   * leave room: always from 1024px and on a screen 740px tall or more. On a shorter phone it comes with the choice:
   * the chosen plan says what it holds, the other one stays as short as drawn, so the action stays in view.
   * On a phone each part (split at ", ") sits on its own line; from 640px the card is wide enough for one line.
   */
  detail?: string | null;
  selected: boolean;
  onSelect(): void;
  /** The plans of one paywall share a name and sit in an element with role="radiogroup": the arrow keys then work. */
  name: string;
  value: string;
}

/**
 * TODO kit: one plan of the paywall, a radio drawn as a card (Figma 27:494 chosen, 27:486 not): 72px, 20px corners,
 * the length over the price of a day at the left, the price at the right. The chosen card has a 2px ink border.
 * The kit Option is the quiz row with a lilac fill and a tick; this card has neither.
 *
 * The border sits inside the 72px, as drawn. The chosen border is 1px thicker and the padding gives that pixel
 * back, so nothing moves on select.
 */
export function PlanOption({ title, perDay, price, tag, detail, selected, onSelect, name, value }: PlanOptionProps) {
  const parts = detail ? detail.split(', ') : [];
  return (
    <label
      className={cn(
        'relative flex min-h-[72px] w-full cursor-pointer items-center justify-between gap-[12px] rounded-[20px] bg-white text-ink',
        selected ? 'border-2 border-ink px-[18px] py-[10px]' : 'border border-line px-[19px] py-[11px]',
        colorMotion,
        focusRingWithin,
      )}
    >
      <input type="radio" name={name} value={value} checked={selected} onChange={onSelect} onKeyDown={pickOnEnter} className="sr-only" />
      <span className="flex min-w-0 flex-col items-start gap-[2px]">
        <span className="flex items-center gap-[8px]">
          <span className="text-body-strong">{title}</span>
          {tag ? <Tag tone="skill">{tag}</Tag> : null}
        </span>
        <span className="text-label text-gray">{perDay}</span>
        {parts.length > 0 ? (
          <span className={cn('text-small text-gray', !selected && 'max-lg:[@media(max-height:739px)]:hidden')}>
            {parts.map((part, index) => (
              <Fragment key={part}>
                <span className="block sm:inline">{index < parts.length - 1 ? `${part},` : part}</span>{' '}
              </Fragment>
            ))}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-heading">{price}</span>
    </label>
  );
}
