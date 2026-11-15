'use client';

import { useState } from 'react';
import { ArrowUp } from './Icons';

/**
 * The one input of the product: a rounded field with the send button inside it, like a message composer.
 * `onSay` gets the trimmed text; the field clears itself after.
 */
export function SayField({
  id,
  label,
  placeholder,
  onSay,
  submitLabel = 'Say',
  autoFocus = false,
  suggestion,
  className = '',
}: {
  id: string;
  /** Read by screen readers; the placeholder carries it visually. */
  label: string;
  placeholder: string;
  onSay: (text: string) => void;
  submitLabel?: string;
  autoFocus?: boolean;
  /** A ready answer the parent can drop into the field with one tap. */
  suggestion?: string;
  className?: string;
}) {
  const [text, setText] = useState('');
  const empty = !text.trim();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (empty) return;
    onSay(text.trim());
    setText('');
  }

  return (
    <form onSubmit={submit} className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="field pr-16 text-left"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="send"
          autoFocus={autoFocus}
          maxLength={600}
        />
        <button
          type="submit"
          aria-label={submitLabel}
          disabled={empty}
          className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl bg-violet text-white shadow-[0_6px_16px_-6px_rgba(108,99,255,0.8)] transition-[opacity,transform,background-color] duration-200 hover:bg-violet-400 active:scale-95 disabled:opacity-30 disabled:shadow-none"
        >
          <ArrowUp size={19} strokeWidth={2.4} />
        </button>
      </div>
      {suggestion && empty && (
        <button
          type="button"
          onClick={() => setText(suggestion)}
          className="mt-3 inline-flex max-w-full items-center rounded-full px-3 py-1.5 text-[14px] text-fg-soft transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <span className="truncate">
            Try <span className="font-medium text-fg-2">“{suggestion}”</span>
          </span>
        </button>
      )}
    </form>
  );
}
