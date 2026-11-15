/**
 * The sentence a visitor typed into the answer field on the landing, carried into the first visit so they do
 * not type it twice. It lives in sessionStorage for this tab only and is read once.
 */
const KEY = 'playreps.firstAnswer.v1';

export function saveFirstAnswer(text: string): void {
  const clean = text.trim();
  if (!clean) return;
  try {
    window.sessionStorage.setItem(KEY, clean);
  } catch {
    /* storage unavailable: the visitor types the sentence again */
  }
}

/** Returns the carried sentence and forgets it. Call in an effect or a handler, never during render. */
export function takeFirstAnswer(): string | null {
  try {
    const text = window.sessionStorage.getItem(KEY);
    if (text !== null) window.sessionStorage.removeItem(KEY);
    return text && text.trim() ? text : null;
  } catch {
    return null;
  }
}
