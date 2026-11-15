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
  const titleId = useId();

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
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
      // A browser may still close the dialog by itself (a second Escape in Chrome); keep the parent in step.
      onClose={() => {
        if (open) onClose();
      }}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none bg-transparent"
    >
      {/* The flat backdrop. A tap on it, and not on the sheet, closes. */}
      <div
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        className="flex h-full items-end justify-center bg-faint md:items-center"
      >
        <div
          className={cn(
            'flex max-h-full w-full flex-col gap-[14px] overflow-y-auto rounded-t-[32px] bg-white px-[24px] pt-[28px] text-ink',
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
