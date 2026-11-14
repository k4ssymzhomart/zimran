import Link from 'next/link';
import type { Code, CodedSentence } from '@/lib/types';
import { DEMO_LABEL } from '@/lib/demo/simulate';
import { LABEL } from '@/lib/types';

/** Page frame: one centred column, a wordmark, and a few wooden blocks scattered behind on wide screens. */
export function Shell({ children, jury = true }: { children: React.ReactNode; jury?: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[460px] px-5 pt-5">
      <Blocks />
      <header className="relative flex items-center justify-between pb-4">
        <Link href="/" className="font-display text-2xl font-semibold italic tracking-tight">
          Play<span className="text-tomato">Reps</span>
        </Link>
        {jury && (
          <Link href="/jury" className="btn btn-quiet">
            Jury guide
          </Link>
        )}
      </header>
      <main className="relative">{children}</main>
    </div>
  );
}

function Blocks() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
      <div className="sticker-sm absolute -left-44 top-28 h-16 w-16 rotate-[-12deg] bg-sun" />
      <div className="sticker-sm absolute -left-28 top-52 h-12 w-24 rotate-[8deg] bg-sky" />
      <div className="sticker-sm absolute -right-40 top-40 h-20 w-20 rotate-[14deg] rounded-full bg-leaf" />
      <div className="sticker-sm absolute -right-52 top-80 h-14 w-28 rotate-[-6deg] bg-tomato" />
    </div>
  );
}

const BAR = [
  { key: 'connection', label: 'Connection', color: 'bg-sun' },
  { key: 'focus', label: 'Focus', color: 'bg-leaf' },
  { key: 'talk', label: 'Talking', color: 'bg-sky' },
] as const;

/** Three slim bars. Tension is shown by Mia's face, not by a bar. */
export function Bars({ connection, focus, talk }: { connection: number; focus: number; talk: number }) {
  const value = { connection, focus, talk };
  return (
    <div className="grid grid-cols-3 gap-3">
      {BAR.map((b) => (
        <div key={b.key}>
          <div className="mb-1 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            <span>{b.label}</span>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full border-2 border-ink bg-[#fffaf0]"
            role="meter"
            aria-label={b.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(value[b.key])}
          >
            <div className={`h-full ${b.color}`} style={{ width: `${value[b.key]}%`, transition: 'width 500ms ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The coach talks to the parent the way the parent is learning to talk to the child. */
export function CoachBubble({ text }: { text: string | null }) {
  if (!text) return <div className="min-h-[3.25rem]" />;
  return (
    <div key={text} className="pop sticker-sm flex min-h-[3.25rem] items-center gap-3 bg-[#fffaf0] px-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun text-sm font-bold">
        C
      </span>
      <p className="text-sm leading-snug">
        <span className="font-bold">Coach: </span>
        {text}
      </p>
    </div>
  );
}

const TONE: Record<Code, string> = {
  specific_praise: 'bg-sun',
  reflection: 'bg-sky text-white',
  description: 'bg-leaf text-white',
  general_praise: 'bg-[#fffaf0]',
  neutral: 'bg-[#fffaf0]',
  question: 'bg-sand',
  command: 'bg-sand',
  criticism: 'bg-sand',
  unknown: 'bg-[#fffaf0]',
};

/** One coded sentence, with the parent's right to disagree. */
export function SentenceChip({
  sentence,
  disputed = false,
  onDispute,
}: {
  sentence: CodedSentence;
  disputed?: boolean;
  onDispute?: () => void;
}) {
  return (
    <li className={`flex items-start justify-between gap-3 rounded-xl border-2 border-ink/80 bg-[#fffdf8] px-3 py-2 ${disputed ? 'opacity-50' : ''}`}>
      <div className="min-w-0">
        <p className={`text-sm ${disputed ? 'line-through' : ''}`}>“{sentence.text}”</p>
        <span className={`mt-1 inline-block rounded-full border-2 border-ink px-2 py-0.5 text-[11px] font-bold ${TONE[sentence.code]}`}>
          {sentence.bucket === 'avoid' ? `${LABEL[sentence.code]} · to swap` : LABEL[sentence.code]}
        </span>
      </div>
      {onDispute && sentence.code !== 'unknown' && (
        <button onClick={onDispute} className="shrink-0 text-xs font-semibold underline decoration-dotted underline-offset-2">
          {disputed ? 'Count it' : 'Disagree?'}
        </button>
      )}
    </li>
  );
}

export function DemoBadge({ children = DEMO_LABEL }: { children?: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border-2 border-ink bg-plum px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
      {children}
    </span>
  );
}
