'use client';

import { useEffect } from 'react';

/** How far a floating picture may drift with the scroll, in pixels either way. */
const DRIFT = 40;

/**
 * The motion of the landing. It draws nothing.
 * - Reveals: a block marked `data-reveal` that is still below the screen waits, then rises in when it comes into
 *   view (CSS at the end of app/globals.css). What is on the screen at load is left alone, and once in, it stays.
 * - Parallax: a picture marked `data-parallax="0.1"` drifts against the scroll by that share of its distance
 *   from the middle of the screen, never more than DRIFT. It moves with `translate`, so its own float keeps going.
 * With reduced motion neither runs.
 */
export function LandingMotion() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.querySelector('.split-root');
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = 'in';
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    for (const item of root.querySelectorAll<HTMLElement>('[data-reveal]')) {
      if (item.getBoundingClientRect().top < window.innerHeight) continue;
      item.dataset.reveal = 'wait';
      io.observe(item);
    }

    const floaters = Array.from(root.querySelectorAll<HTMLElement>('[data-parallax]'));
    const applied = new WeakMap<HTMLElement, number>();
    let frame = 0;
    function drift() {
      frame = 0;
      const middle = window.innerHeight / 2;
      for (const el of floaters) {
        const rect = el.getBoundingClientRect();
        const now = applied.get(el) ?? 0;
        const top = rect.top - now;
        if (top > window.innerHeight + 200 || top + rect.height < -200) continue;
        const share = Number(el.dataset.parallax) || 0;
        const offset = Math.max(-DRIFT, Math.min(DRIFT, (top + rect.height / 2 - middle) * -share));
        applied.set(el, offset);
        el.style.translate = `0 ${offset.toFixed(1)}px`;
      }
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(drift);
    }
    drift();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
