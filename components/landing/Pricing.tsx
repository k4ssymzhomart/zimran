import type { PlanId } from '@/client/entitlement';
import { Button, Pattern, Tag, cn, type ButtonVariant } from '@/components/kit';
import { ROUTES } from '@/lib/routes';
import { Section } from './Section';

/**
 * Landing section 11, "One plan, two lengths." (Figma 66:1735 on phones, 64:469 from 1024px).
 * Three cards: what stays free, then the two lengths of the paid plan. A card lists only what is built.
 * The prices are the ones the checkout route charges (PLANS in app/api/checkout/route.ts).
 */

interface Plan {
  id: 'free' | PlanId;
  name: string;
  price: string;
  /** Under the name on phones, beside the price from 1024px. */
  note: string;
  lines: string[];
  /** On phones this card says its lines as one gray sentence instead (Figma 81:1320). */
  phoneLine?: string;
  action: string;
  button: ButtonVariant;
}

/** In reading order, which is the desktop order. On phones the free card moves to the end, as drawn. */
const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    note: 'Always',
    lines: ['One-minute rounds', '30-second lessons', 'Your coded sentences'],
    action: 'Try one answer',
    button: 'soft',
  },
  {
    id: 'four_weeks',
    name: '4 weeks',
    price: '$29',
    note: '$1.04 a day',
    lines: ['Daily five-minute session', 'One skill a week with Mia', 'Day 28 skill check'],
    action: 'Choose 4 weeks',
    button: 'white',
  },
  {
    id: 'twelve_weeks',
    name: '12 weeks',
    price: '$69',
    note: '$0.82 a day',
    lines: ['Daily five-minute session', 'Weeks 1–4 with Mia', 'Weeks 5–8 live with your child'],
    phoneLine: 'Weeks 1–4 with Mia, weeks 5–8 live with your child',
    action: 'Choose 12 weeks',
    button: 'ink',
  },
];

// TODO kit: the check mark of a plan line, until the kit has an icon set. 18px on phones, 20px from 1024px.
function Check({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-[18px] shrink-0 lg:size-[20px]', className)}
    >
      <path d="M5 12.5l4.2 4.2L19 7" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const violet = plan.id === 'four_weeks';
  // The free card starts the first visit; a paid card opens the paywall with its length chosen.
  const href = plan.id === 'free' ? ROUTES.start : { pathname: ROUTES.pricing, query: { plan: plan.id } };

  return (
    <li
      className={cn(
        'relative flex flex-col gap-[14px] overflow-clip rounded-[28px] p-[20px]',
        // The drawn 32px of padding starts at 1360px (85rem, in rem so that it sorts after `lg`):
        // under that a card is too narrow to keep its longest line whole.
        'lg:min-w-0 lg:flex-1 lg:gap-[20px] lg:rounded-[32px] lg:p-[24px] min-[85rem]:p-[32px]',
        violet ? 'bg-violet text-white' : 'border border-line bg-white text-ink',
        plan.id === 'free' && 'order-last lg:order-none',
      )}
    >
      {violet && <Pattern kind="bars" className="[--pattern-size:864px] lg:[--pattern-size:1440px]" />}

      {/* Phones: the name over its note at the left, the price at the right. From 1024px: the name, then the price with its note. */}
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center lg:flex lg:flex-wrap lg:items-baseline lg:gap-x-[10px] lg:gap-y-[20px]">
        <h3 className="col-start-1 row-start-1 text-body-strong lg:w-full lg:text-heading">{plan.name}</h3>
        <p className="col-start-2 row-span-2 row-start-1 text-display lg:text-display-xl">{plan.price}</p>
        <p className={cn('col-start-1 row-start-2 text-label lg:text-body', !violet && 'text-gray')}>{plan.note}</p>
      </div>

      <div aria-hidden="true" className={cn('relative hidden h-px shrink-0 lg:block', violet ? 'bg-violet-press' : 'bg-line')} />

      {plan.phoneLine && <p className="relative text-label text-gray lg:hidden">{plan.phoneLine}</p>}
      <ul className={cn('relative flex-col gap-[14px] lg:flex lg:gap-[20px]', plan.phoneLine ? 'hidden' : 'flex')}>
        {plan.lines.map((line) => (
          <li key={line} className="flex items-center gap-[10px] lg:gap-[12px]">
            <Check className={violet ? 'text-white' : 'text-violet'} />
            <span className="min-w-0 flex-1 text-label lg:text-body">{line}</span>
          </li>
        ))}
      </ul>

      {/* From 1024px the three cards are one height: this keeps 8px over the action and takes up the rest. */}
      <div aria-hidden="true" className="hidden min-h-[8px] flex-1 lg:block" />

      <Button href={href} variant={plan.button} fullWidth className="relative">
        {plan.action}
      </Button>
    </li>
  );
}

/** The page sets the anchor ("pricing") on its own wrapper, so the section carries no id. */
export function Pricing() {
  return (
    <Section>
      {/* "Demo": no payment is taken on this site. On phones the tag sits over the title. */}
      <div className="flex flex-col-reverse items-start gap-[10px] lg:flex-row lg:items-center lg:gap-[16px]">
        <h2 className="text-title lg:text-title-xl">One plan, two lengths.</h2>
        <Tag tone="quiet">Demo</Tag>
      </div>

      <ul className="flex flex-col gap-[20px] lg:flex-row lg:items-stretch lg:gap-[16px] xl:gap-[24px]">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </ul>
    </Section>
  );
}
