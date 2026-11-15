import type { KeyboardEvent } from 'react';

/** Joins class names, dropping anything falsy. The whole kit uses it to merge a `className` prop. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Keyboard focus in the kit: a 2px violet ring, 2px off the control. */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet';

/** The same ring on a label that wraps a visually hidden radio or checkbox. */
export const focusRingWithin =
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-violet';

/** The ring of a control that sits on a violet block, where a violet ring would not show: white. */
export const focusRingOnViolet =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/** The white ring on a label that wraps a visually hidden radio or checkbox, on a violet block. */
export const focusRingWithinOnViolet =
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-white';

/** Color changes use the one Split ease and duration, and stop for people who ask for less motion. */
export const colorMotion = 'transition-colors duration-quick ease-out-quint motion-reduce:transition-none';

/**
 * Lets Enter pick a radio or a checkbox the way Space does. Inside a form the key is left alone:
 * there Enter belongs to the form, which submits.
 */
export function pickOnEnter(event: KeyboardEvent<HTMLInputElement>): void {
  if (event.key !== 'Enter' || event.repeat || event.currentTarget.form) return;
  event.preventDefault();
  event.currentTarget.click();
}
