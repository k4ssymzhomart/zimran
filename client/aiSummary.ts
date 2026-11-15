/**
 * The AI summaries written for this device's sessions, kept in localStorage so a reload does not ask the model
 * again. "Erase everything on this device" clears them with the rest.
 */
import type { ExplainInput, Explanation } from '@/lib/ai/explain';
import type { AiSummary, SummaryInput } from '@/lib/ai/summary';
import { ROUTES } from '@/lib/routes';

const KEY = 'playreps.aiSummaries.v1';
const WHY_KEY = 'playreps.aiWhy.v1';

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

/** Clears the summaries and the "Why?" answers. */
export function clearSummaries(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(WHY_KEY);
  } catch {
    /* nothing to clear */
  }
}

const isExplanation = (x: unknown): x is Explanation =>
  typeof x === 'object' &&
  x !== null &&
  typeof (x as Explanation).why === 'string' &&
  ((x as Explanation).tryInstead === null || typeof (x as Explanation).tryInstead === 'string');

/** "Why?" answers already written on this device, by `${sessionId}|${sentence key}`. */
export function readExplanations(sessionId: string): Record<string, Explanation> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(WHY_KEY) ?? '{}');
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<string, Explanation> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (key.startsWith(`${sessionId}|`) && isExplanation(value)) out[key.slice(sessionId.length + 1)] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveExplanation(sessionId: string, sentenceKey: string, value: Explanation): void {
  try {
    const all: unknown = JSON.parse(window.localStorage.getItem(WHY_KEY) ?? '{}');
    const base = typeof all === 'object' && all !== null && !Array.isArray(all) ? (all as Record<string, unknown>) : {};
    window.localStorage.setItem(WHY_KEY, JSON.stringify({ ...base, [`${sessionId}|${sentenceKey}`]: value }));
  } catch {
    /* storage unavailable: the answer lasts for this page only */
  }
}

/** Asks the server why one sentence got its code. A calm message comes back instead when it cannot be written. */
export async function requestExplanation(input: ExplainInput): Promise<Explanation | { error: string }> {
  try {
    const res = await fetch(ROUTES.api.explain, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data: unknown = await res.json().catch(() => null);
    if (res.ok && isExplanation(data)) return data;
    const error = typeof data === 'object' && data !== null && typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : null;
    return { error: error ?? 'The explanation could not be written just now.' };
  } catch {
    return { error: 'The explanation could not be written just now.' };
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
