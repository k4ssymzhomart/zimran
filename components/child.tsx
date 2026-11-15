'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Which simulated child the parent practises with: Mia (a girl) or Leo (a boy). Same engine, same scenes;
 * only the portrait, the name and the pronouns change. The engine's texts are written for Mia, so they pass
 * through `forChild` on their way to the screen. The choice lives on this device only.
 */
export type ChildId = 'mia' | 'leo';

export interface Child {
  id: ChildId;
  name: string;
  /** "she" / "he", for screen copy written here (engine copy goes through forChild). */
  they: string;
  /** "her" / "him" */
  them: string;
  /** "her" / "his" */
  their: string;
  /** Folder of the 3D portraits in /public. */
  art: string;
}

export const CHILDREN: Record<ChildId, Child> = {
  mia: { id: 'mia', name: 'Mia', they: 'she', them: 'her', their: 'her', art: '/mia' },
  leo: { id: 'leo', name: 'Leo', they: 'he', them: 'him', their: 'his', art: '/leo' },
};

const KEY = 'playreps.child.v1';

/** After "her", these words make it possessive ("her words" → "his words"); anything else is an object ("asks her to" → "asks him to"). */
const POSSESSED =
  /^(own|words?|hands?|arms?|arm|crayons?|lead|sports|picture|last|latest|line|blocks?|drawing|commentator|play|tower|toys?|turn|face|feelings?|name|ideas?|game|paper|shoulders|head|eyes|voice|choice|way|story|house|dog|car|train)\b/i;

/** Rewrites engine text written about Mia so it is about the chosen child. Mia's text is returned as is. */
export function forChild(text: string, child: ChildId): string;
export function forChild(text: string | null | undefined, child: ChildId): string | null | undefined;
export function forChild(text: string | null | undefined, child: ChildId): string | null | undefined {
  if (!text || child === 'mia') return text;
  return text
    .replace(/\bMia\b/g, 'Leo')
    .replace(/\bherself\b/g, 'himself')
    .replace(/\bHerself\b/g, 'Himself')
    .replace(/\bhers\b/g, 'his')
    // After "let" she is the one acting: "Let her lead" is "Let him lead", not "Let his lead".
    .replace(/\b([Ll]et) her\b/g, '$1 him')
    .replace(/\b(H|h)er\b(\s*)([\w’']+)?/g, (_m, h: string, space: string, next?: string) => {
      const possessive = next !== undefined && POSSESSED.test(next);
      const word = possessive ? 'is' : 'im';
      return `${h}${word}${space}${next ?? ''}`;
    })
    .replace(/\bshe\b/g, 'he')
    .replace(/\bShe\b/g, 'He')
    .replace(/\bgirl\b/g, 'boy')
    .replace(/\bGirl\b/g, 'Boy')
    .replace(/\bdaughter\b/g, 'son');
}

interface ChildContext {
  child: Child;
  /** False until the device has been read; screens that depend on the choice can wait for it. */
  ready: boolean;
  choose: (id: ChildId) => void;
  /** Engine text, rewritten for the chosen child. */
  t: (text: string) => string;
}

const Ctx = createContext<ChildContext | null>(null);

export function ChildProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<ChildId>('mia');
  const [ready, setReady] = useState(false);

  // localStorage exists only in the browser, so the choice is read once after the first paint.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(KEY);
        if (saved === 'leo' || saved === 'mia') setId(saved);
      } catch {
        /* storage blocked: stay with Mia */
      }
      setReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const choose = useCallback((next: ChildId) => {
    setId(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* the choice lasts for this page only */
    }
  }, []);

  const value = useMemo<ChildContext>(
    () => ({ child: CHILDREN[id], ready, choose, t: (text: string) => forChild(text, id) }),
    [id, ready, choose],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The chosen child. Outside the provider (tests, isolated renders) it is Mia. */
export function useChild(): ChildContext {
  return useContext(Ctx) ?? { child: CHILDREN.mia, ready: true, choose: () => {}, t: (s: string) => s };
}
