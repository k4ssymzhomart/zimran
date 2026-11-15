'use client';

import { useEffect } from 'react';
import { ANSWER_ID } from './anchors';

/**
 * The links of the landing that lead to a place on the same page: the section links of the top bar and every
 * "Try one answer". It draws nothing.
 *
 * The router scrolls to an anchor only when the address changes. So a second press of the same link, or
 * "Try one answer" at the foot of the page after the one at the top, would leave the visitor where they are.
 * This scrolls every time, at once (the page has no smooth scrolling), and then puts the keyboard where the
 * visitor now is: in the answer field, or at the start of the section, so the next Tab goes on from there and
 * not back to the top bar.
 */
export function InPageLinks() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      // A link opened in a new tab or window stays the browser's business.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      const href = link?.getAttribute('href');
      if (!href?.startsWith('#')) return;
      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      target.scrollIntoView();

      // With a mouse or a keyboard "Try one answer" lands in the field, ready to type.
      // On a touch screen the keyboard would cover the section the visitor just arrived at.
      const field = id === ANSWER_ID ? target.querySelector('input') : null;
      if (field && window.matchMedia('(pointer: fine)').matches) {
        field.focus({ preventScroll: true });
        return;
      }

      // Anywhere else the section itself takes the focus, without a ring, and only until the focus moves on.
      target.setAttribute('tabindex', '-1');
      target.style.outline = 'none';
      target.addEventListener(
        'blur',
        () => {
          target.removeAttribute('tabindex');
          target.style.outline = '';
        },
        { once: true },
      );
      target.focus({ preventScroll: true });
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
