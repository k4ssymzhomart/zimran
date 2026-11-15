import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { parseSummaryInput, SUMMARY_SYSTEM, tidySummary } from '@/lib/ai/summary';

// No `runtime` export: with cacheComponents this Next.js version always uses Node.js and rejects the option.

const MODEL = 'claude-opus-5-5';

/** The shape the model must answer in, enforced by the API. */
const Answer = z.object({
  summary: z.string(),
  rewrites: z.array(z.object({ original: z.string(), rewrite: z.string() })),
});

/**
 * Writes the optional AI summary of one session (FEATURES.aiSummary). The device sends the counts and the
 * sentences the rules already coded (lib/ai/summary.ts); the model puts them into words and suggests rewrites.
 * Nothing is stored here and nothing of the session is logged. Without a key the route answers 503.
 */
export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json({ error: 'The AI summary is not set up on this deployment.' }, { status: 503 });
  }
  const input = parseSummaryInput(await req.json().catch(() => null));
  if (!input) {
    return Response.json({ error: 'This session cannot be summarized.' }, { status: 400 });
  }

  try {
    const response = await new Anthropic({ apiKey: key }).beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // If the model declines, the API runs the same request on a fallback model inside this call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(Answer) },
      system: SUMMARY_SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(input) }],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      return Response.json({ error: 'No summary could be written for this session.' }, { status: 422 });
    }
    return Response.json(tidySummary(response.parsed_output));
  } catch (err) {
    // The status only: the sentences of a session never go to the log.
    console.error('summary failed:', err instanceof Anthropic.APIError ? err.status : err instanceof Error ? err.name : 'unknown');
    const status = err instanceof Anthropic.RateLimitError ? 429 : 502;
    return Response.json({ error: 'The summary could not be written just now.' }, { status });
  }
}
