/**
 * The AI summaries written for this device's sessions, kept in localStorage so a reload does not ask the model
 * again. "Erase everything on this device" clears them with the rest.
 */
import type { AiSummary, SummaryInput } from '@/lib/ai/summary';
import { ROUTES } from '@/lib/routes';

const KEY = 'playreps.aiSummaries.v1';

const isSummary = (x: unknown): x is AiSummary =>
  typeof x === 'object' &&
  x !== null &&
  typeof (x as AiSummary).summary === 'string' &&
  Array.isArray((x as AiSummary).rewrites) &&
  (x as AiSummary).rewrites.every((r) => typeof r?.original === 'string' && typeof r?.rewrite === 'string');

function readAll(): Record<string, AiSummary> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, AiSummary>) : {};
  } catch {
    return {};
  }
}

export function readSummary(sessionId: string): AiSummary | null {
  const found = readAll()[sessionId];
  return isSummary(found) ? found : null;
}

export function saveSummary(sessionId: string, summary: AiSummary): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [sessionId]: summary }));
  } catch {
    /* storage unavailable: the summary lasts for this page only */
  }
}

export function clearSummaries(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Asks the server for a summary. A calm message comes back instead when it cannot be written. */
export async function requestSummary(input: SummaryInput): Promise<AiSummary | { error: string }> {
  try {
    const res = await fetch(ROUTES.api.summary, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data: unknown = await res.json().catch(() => null);
    if (res.ok && isSummary(data)) return data;
    const error = typeof data === 'object' && data !== null && typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : null;
    return { error: error ?? 'The summary could not be written just now.' };
  } catch {
    return { error: 'The summary could not be written just now.' };
  }
}
