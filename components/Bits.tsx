import type { Code, CodedSentence } from '@/lib/types';
import { DEMO_LABEL } from '@/lib/demo/simulate';
import { LABEL } from '@/lib/types';
import { Sparkle } from './Icons';
import { TopBar } from './ui';

/** Page frame for content pages: the top bar and one centred column. One-action screens use `Screen` instead. */
export function Shell({ children, right, wide = false }: { children: React.ReactNode; right?: React.ReactNode; wide?: boolean }) {
  return (
    <div className="glow min-h-[100dvh]">
      <TopBar right={right} />
      <main className={`mx-auto w-full px-5 pb-12 pt-4 sm:pt-8 ${wide ? 'max-w-[640px]' : 'max-w-[480px]'}`}>{children}</main>
    </div>
  );
}

const BAR = [
  { key: 'connection', label: 'Connection', color: 'bg-violet' },
  { key: 'focus', label: 'Focus', color: 'bg-describe' },
  { key: 'talk', label: 'Talking', color: 'bg-reflect' },
] as const;

/** Three hairline meters for how Mia is doing. Her frustration shows in her face, not in a bar. */
export function Bars({ connection, focus, talk }: { connection: number; focus: number; talk: number }) {
  const value = { connection, focus, talk };
  return (
    <div className="grid grid-cols-3 gap-4">
      {BAR.map((b) => (
        <div key={b.key}>
          <div className="text-[11px] font-medium text-fg-soft">{b.label}</div>
          <div
            className="mt-1 h-1 overflow-hidden rounded-full bg-stroke"
            role="meter"
            aria-label={b.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(value[b.key])}
          >
            <div className={`h-full rounded-full ${b.color}`} style={{ width: `${value[b.key]}%`, transition: 'width 600ms var(--ease-out-quint)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The coach talks to the parent the way the parent is learning to talk to the child: one short line. */
export function CoachBubble({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div key={text} className="pop flex items-start gap-2.5 rounded-2xl bg-violet/10 px-3.5 py-2.5 text-left" role="status">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet text-white">
        <Sparkle size={13} strokeWidth={2.4} />
      </span>
      <p className="text-[14px] leading-snug text-lilac">{text}</p>
    </div>
  );
}

/** Tag colours: the three skills in their ring colours, sentences to swap in calm slate, the rest quiet. */
const TONE: Record<Code, string> = {
  specific_praise: 'bg-praise/25 text-lilac-2',
  reflection: 'bg-reflect/18 text-lilac-2',
  description: 'bg-describe/14 text-describe',
  general_praise: 'bg-surface-2 text-fg-soft',
  neutral: 'bg-surface-2 text-fg-soft',
  question: 'bg-white/8 text-fg-2',
  command: 'bg-white/8 text-fg-2',
  criticism: 'bg-white/8 text-fg-2',
  unknown: 'bg-surface-2 text-fg-faint',
};

/** The label a parent sees for a coded sentence. */
export function CodeTag({ sentence }: { sentence: CodedSentence }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${TONE[sentence.code]}`}>
      {LABEL[sentence.code]}
      {sentence.bucket === 'avoid' && <span className="ml-1 font-medium opacity-70">to swap</span>}
    </span>
  );
}

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
    <li className={`flex items-start justify-between gap-3 rounded-2xl bg-surface px-4 py-3 text-left shadow-card ${disputed ? 'opacity-55' : ''}`}>
      <div className="min-w-0">
        <p className={`text-[15px] leading-snug text-fg ${disputed ? 'line-through' : ''}`}>“{sentence.text}”</p>
        <div className="mt-1.5">
          <CodeTag sentence={sentence} />
        </div>
      </div>
      {onDispute && sentence.code !== 'unknown' && (
        <button
          onClick={onDispute}
          className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-semibold text-lilac hover:bg-violet/10 focus-visible:outline-2 focus-visible:outline-violet/50"
        >
          {disputed ? 'Count it' : 'Disagree?'}
        </button>
      )}
    </li>
  );
}

export function DemoBadge({ children = DEMO_LABEL }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.02em] text-fg-2 ring-1 ring-inset ring-white/15">
      {children}
    </span>
  );
}
