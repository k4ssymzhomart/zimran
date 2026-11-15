'use client';

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Pattern, Tag, type TagTone } from '@/components/kit';
import { codeTurn } from '@/lib/coding/classify';
import { initialJourney } from '@/lib/flow/journey';
import { LABEL, type Bucket } from '@/lib/types';

/** The line the first visit opens with. A reflection is the child's own words said back. */
const OPENER = initialJourney().opener;

/** The three sentences of the strip and the try-saying chips, in the order they are sorted here. */
const SAID = ['Good job stacking so gently.', 'You made a tower!', 'What is that?'];
/** What the question is swapped for: a sentence of the strip that says what the child is doing. */
const SWAPPED = 'You are putting the blue one on top.';

const TONE: Record<Bucket, TagTone> = { target: 'skill', avoid: 'swap', neutral: 'quiet', none: 'quiet' };

/** A sentence as the rules in lib/coding read it. Nothing here is labeled by hand. */
function read(text: string) {
  const coded = codeTurn(text, { childLastSaid: OPENER.childSaid })[0];
  if (!coded) return { text, tone: 'quiet' as TagTone, label: '' };
  return {
    text,
    tone: TONE[coded.bucket],
    label: coded.bucket === 'avoid' ? `${LABEL[coded.code]}, to swap` : LABEL[coded.code],
  };
}

/**
 * Where on the scroll a piece moves: from `from` to `to`, as shares of the pinned run (0 to 1).
 * CSS reads `--a` and `--k` against `--sort-p`, the progress of the run.
 */
function span(from: number, to: number): CSSProperties {
  return { '--a': from, '--k': 1 / (to - from) } as CSSProperties;
}

/** Each sentence slides in, then its label opens; the question is then swapped for a statement. */
const STEPS = [
  { words: span(0.04, 0.16), label: span(0.16, 0.24) },
  { words: span(0.28, 0.4), label: span(0.4, 0.48) },
  { words: span(0.52, 0.64), label: span(0.64, 0.72) },
];
const SWAP = span(0.78, 0.92);

const PILL =
  'inline-flex min-h-[44px] flex-wrap items-center gap-x-[10px] gap-y-[6px] rounded-[22px] bg-white py-[8px] pr-[10px] pl-[18px] text-label text-ink lg:min-h-[56px] lg:rounded-[28px] lg:pl-[24px] lg:text-heading';

/**
 * The scroll moment of the landing: three sentences a parent might say, and what the rules call each one.
 * While the visitor scrolls, the section stays put and only the words move: each sentence slides in and gets its
 * label, and then the question gives way to a statement.
 * Chrome drives it with a scroll-driven animation (animation-timeline: view(), in app/globals.css). Elsewhere,
 * Safari included, this sets the same progress from the scroll. With reduced motion, or before any of that,
 * the section shows its last step, standing still.
 */
export function SortedWords() {
  const run = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => SAID.map(read), []);
  const swapped = useMemo(() => read(SWAPPED), []);

  useEffect(() => {
    const el = run.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()')) return;

    el.dataset.live = '';
    let frame = 0;
    let watching = false;
    function measure() {
      frame = 0;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const room = rect.height - window.innerHeight;
      const progress = room > 0 ? Math.min(1, Math.max(0, -rect.top / room)) : 1;
      el.style.setProperty('--sort-p', progress.toFixed(4));
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    // The scroll is only read while the section is near the screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !watching) {
          watching = true;
          window.addEventListener('scroll', onScroll, { passive: true });
        } else if (!entry.isIntersecting && watching) {
          watching = false;
          window.removeEventListener('scroll', onScroll);
        }
        measure();
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    measure();
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
      delete el.dataset.live;
      el.style.removeProperty('--sort-p');
    };
  }, []);

  return (
    <section aria-labelledby="sorted-title" className="bg-violet text-white">
      <div ref={run} className="sorted-run relative">
        <div className="sorted-stage relative flex flex-col justify-center overflow-clip px-[24px] py-[56px] lg:px-[48px] lg:py-[104px] xl:px-[max(120px,calc(50%-600px))]">
          <Pattern kind="sentences" className="[--pattern-size:864px] lg:[--pattern-size:1440px]" />
          <div className="relative flex flex-col gap-[8px] lg:gap-[12px]">
            <h2 id="sorted-title" className="text-title lg:text-title-xl">
              Each sentence has a name.
            </h2>
            <p className="text-body lg:text-heading">The app hears these three the way it hears yours.</p>
          </div>

          <ol className="relative mt-[28px] flex flex-col items-start gap-[14px] lg:mt-[48px] lg:gap-[20px]">
            {rows.map((row, i) => {
              const step = STEPS[i];
              const last = i === rows.length - 1;
              const said = (
                <span className={PILL}>
                  <span>“{row.text}”</span>
                  <span className="sorted-label" style={step.label}>
                    <Tag tone={row.tone}>{row.label}</Tag>
                  </span>
                </span>
              );
              return (
                <li key={row.text} className="sorted-words" style={step.words}>
                  {last ? (
                    <span className="grid" style={SWAP}>
                      <span className="sorted-out col-start-1 row-start-1">{said}</span>
                      <span className="sorted-in col-start-1 row-start-1 flex flex-col items-start gap-[8px]">
                        <span className={PILL}>
                          <span>“{swapped.text}”</span>
                          <Tag tone={swapped.tone}>{swapped.label}</Tag>
                        </span>
                        <span className="pl-[18px] text-label lg:pl-[24px]">In place of “{row.text}”</span>
                      </span>
                    </span>
                  ) : (
                    said
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
