'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import { cn } from './cn';

export interface SheetAction {
  label: string;
  onClick(): void;
}

export interface SheetProps {
  open: boolean;
  /** Called on Escape and on a tap outside the sheet. The two actions do not close it: their handlers decide. */
  onClose(): void;
  title: string;
  /** A 3D object from public/art, such as "/art/door.png", shown at 64px. Or any node for the picture slot. */
  art?: ReactNode;
  /** The body: a sentence, or rows. */
  children?: ReactNode;
  /** The black pill. For a confirm it names the thing: "Erase everything". */
  primary?: SheetAction;
  /** The quiet text action under the pill. */
  secondary?: SheetAction;
  className?: string;
}

/**
 * Sheet/Confirm: a sheet from the bottom edge on phones, a centered dialog from 768px.
 * It is a native modal <dialog>, which traps focus, makes the page behind inert
 * and hands focus back to the opener when it closes.
 */
export function Sheet({ open, onClose, title, art, children, primary, secondary, className }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  /** True while a press that began on the backdrop is down. A drag out of the sheet must not close it. */
  const pressedBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const node = dialog.current;
    if (!node || !open) return;
    if (!node.open) node.showModal();
    // Focus starts on the sheet itself, not on a control: the key that opened it cannot also confirm it.
    // A control in the body that carries the autofocus attribute keeps the focus the browser gave it.
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement && focused.autofocus && node.contains(focused))) panel.current?.focus();
    // The page behind stays where it is while the sheet is up.
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = before;
      // This also runs when a navigation hides the page with the sheet still up (Next keeps the page in the
      // document). A modal dialog left open there would keep the next page inert.
      if (node.open) node.close();
    };
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      // Escape asks the parent to close, so `open` stays the single source of truth.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // The dialog can close while `open` still holds: a second Escape in Chrome, or the page was hidden by a
      // navigation. Keep the parent in step. Our own close and reopen in one pass leaves it open, so that is skipped.
      onClose={(event) => {
        if (open && !event.currentTarget.open) onClose();
      }}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none bg-transparent"
    >
      {/* The flat backdrop. A tap on it, and not on the sheet, closes. A finger on it cannot drag the page behind. */}
      <div
        onPointerDown={(event) => {
          pressedBackdrop.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && pressedBackdrop.current) onClose();
          pressedBackdrop.current = false;
        }}
        className="flex h-full touch-pinch-zoom items-end justify-center bg-faint md:items-center"
      >
        <div
          ref={panel}
          tabIndex={-1}
          className={cn(
            'flex max-h-full w-full touch-pan-y touch-pinch-zoom flex-col gap-[14px] overflow-y-auto overscroll-contain rounded-t-[32px] bg-white px-[24px] pt-[28px] text-ink outline-none',
            'pb-[max(env(safe-area-inset-bottom),16px)] md:w-[390px] md:rounded-[32px] md:pb-[24px]',
            className,
          )}
        >
          {typeof art === 'string' ? (
            <Image src={art} alt="" width={64} height={64} className="size-[64px] object-contain" />
          ) : (
            art
          )}
          <h2 id={titleId} className="text-title">
            {title}
          </h2>
          {children ? <div className="text-body text-gray">{children}</div> : null}
          {primary || secondary ? (
            <div className="flex flex-col gap-[4px] pt-[8px]">
              {primary ? (
                <Button fullWidth onClick={primary.onClick}>
                  {primary.label}
                </Button>
              ) : null}
              {secondary ? (
                <Button variant="ghost" fullWidth onClick={secondary.onClick}>
                  {secondary.label}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
