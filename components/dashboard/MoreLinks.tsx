import Link from 'next/link';
import { ChevronRight } from '@/components/Icons';
import { Pill } from '@/components/ui';

export interface MoreLink {
  href: string;
  label: string;
  beta?: boolean;
}

/** The quiet ways onward, as list rows: they never compete with the page's one action. */
export function MoreLinks({ links }: { links: MoreLink[] }) {
  return (
    <nav aria-label="More ways to practise" className="card enter d3 overflow-hidden">
      <ul className="divide-y divide-stroke">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex min-h-[60px] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none sm:px-6"
            >
              <span className="min-w-0 flex-1 text-[16px] font-semibold tracking-[-0.01em] text-fg">{l.label}</span>
              {l.beta && <Pill>Beta</Pill>}
              <ChevronRight size={20} className="shrink-0 text-fg-faint" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
