import Image from 'next/image';
import { SentenceChip } from '@/components/Bits';
import { Check, ChevronRight } from '@/components/Icons';
import { Mia } from '@/components/Mia';
import { SKILLS } from '@/components/Rings';
import { Art, Stat } from '@/components/ui';
import type { TimedSentence } from '@/lib/round/session';
import type { Face, Posture, RoundResult } from '@/lib/types';

/** Pieces only the /play screens use. They render what the engine returns; nothing here computes. */

/** Mia standing on the violet art card, with the honesty label in its corner. */
export function MiaCard({ face, posture = 'at_toy', size = 'md' }: { face: Face; posture?: Posture; size?: 'sm' | 'md' }) {
  return (
    <Art size={size}>
      <Mia face={face} posture={posture} size={size === 'sm' ? 140 : 200} fade={false} />
      <span className="absolute left-4 top-3.5 text-[11px] font-medium text-fg-faint">Simulated child</span>
    </Art>
  );
}

/** The three skills as a small legend: their 3D object and their name. */
export function SkillRow() {
  return (
    <ul className="enter d2 mx-auto mt-7 grid max-w-[340px] grid-cols-3 gap-2" aria-label="The three skills">
      {SKILLS.map((s) => (
        <li key={s.key} className="flex flex-col items-center gap-1.5">
          <Image src={s.art} alt="" width={40} height={40} className="h-10 w-10" />
          <span className="text-[14px] font-semibold tracking-[-0.01em] text-fg-2">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

const TONE = { specific_praise: 'violet', reflection: 'sky', description: 'mint' } as const;

/** A round's numbers: the three skills against their targets, and the sentences to swap against their limit. */
export function ResultStats({ result, caption, className = '' }: { result: RoundResult; caption?: string; className?: string }) {
  return (
    <section aria-label={caption ?? 'Your round against the clinic pace'} className={`enter d2 ${className}`}>
      {caption && <p className="mb-2.5 text-[13px] font-medium text-fg-soft">{caption}</p>}
      <div className="card grid grid-cols-4 divide-x divide-stroke px-1 py-4">
        {SKILLS.map((s) => (
          <Stat
            key={s.key}
            tone={TONE[s.key]}
            label={s.label}
            value={
              <>
                {result.counts[s.key]}
                <span className="text-[0.56em] tracking-[-0.02em] opacity-45">/{result.targets[s.key]}</span>
              </>
            }
          />
        ))}
        <div>
          <Stat value={result.counts.avoid} label="To swap" />
          <p className="text-[12px] tabular-nums text-fg-faint">at most {result.targets.maxAvoid}</p>
        </div>
      </div>
    </section>
  );
}

/** One short line the parent takes away, on a soft violet card. */
export function Takeaway({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`enter d3 rounded-[1.25rem] bg-violet/10 px-5 py-4 text-left ${className}`}>
      <p className="text-[13px] font-semibold text-lilac">{label}</p>
      <p className="mt-1 text-[17px] font-semibold leading-snug tracking-[-0.015em] text-fg">{children}</p>
    </div>
  );
}

/** Every coded sentence of a round, folded away, with the parent's right to disagree. */
export function SentenceDisclosure({
  sentences,
  onDispute,
  className = '',
}: {
  sentences: TimedSentence[];
  onDispute: (index: number) => void;
  className?: string;
}) {
  return (
    <details className={`group enter d3 text-left ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-fg-2 transition-colors hover:bg-surface-2 focus-visible:outline-3 focus-visible:outline-violet/50 [&::-webkit-details-marker]:hidden">
        <span className="flex-1">Every sentence and how it was read</span>
        <span className="text-[14px] font-medium tabular-nums text-fg-faint">{sentences.length}</span>
        <ChevronRight size={18} className="shrink-0 text-fg-faint transition-transform duration-200 group-open:rotate-90" />
      </summary>
      {sentences.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {sentences.map((s, i) => (
            <SentenceChip key={i} sentence={s} disputed={s.disputed} onDispute={() => onDispute(i)} />
          ))}
        </ul>
      ) : (
        <p className="px-4 pb-2 text-[14px] text-fg-soft">Nothing was said in this round.</p>
      )}
    </details>
  );
}

/** One line of the before and after. Good news carries a check; the rest a quiet dot. */
export function ChangeRow({ text, good }: { text: string; good: boolean }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {good ? (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet text-white">
          <Check size={15} strokeWidth={3} />
        </span>
      ) : (
        <span className="grid h-7 w-7 shrink-0 place-items-center" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-fg-faint/60" />
        </span>
      )}
      <span className={`text-[15px] leading-snug ${good ? 'font-semibold text-fg' : 'text-fg-soft'}`}>{text}</span>
    </li>
  );
}
