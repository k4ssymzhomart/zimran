import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { EXPLAIN_SYSTEM, parseExplainInput, tidyExplanation } from '@/lib/ai/explain';

// No `runtime` export: with cacheComponents this Next.js version always uses Node.js and rejects the option.

const MODEL = 'claude-opus-5-5';

/** The shape the model must answer in, enforced by the API. */
const Answer = z.object({ why: z.string(), tryInstead: z.string().nullable() });

/**
 * "Why?" next to one coded sentence (FEATURES.aiSummary). The device sends the sentence, the code the rules gave it
 * and the rule's name (lib/ai/explain.ts); the model says in plain words what made it that code. Nothing is stored
 * here and nothing of the sentence is logged. Without a key the route answers 503.
 */
export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json({ error: 'AI explanations are not set up on this deployment.' }, { status: 503 });
  }
  const input = parseExplainInput(await req.json().catch(() => null));
  if (!input) {
    return Response.json({ error: 'This sentence cannot be explained.' }, { status: 400 });
  }

  try {
    const response = await new Anthropic({ apiKey: key }).beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // If the model declines, the API runs the same request on a fallback model inside this call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(Answer) },
      system: EXPLAIN_SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(input) }],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      return Response.json({ error: 'No explanation could be written for this sentence.' }, { status: 422 });
    }
    return Response.json(tidyExplanation(response.parsed_output));
  } catch (err) {
    // The status only: the sentence never goes to the log.
    console.error('explain failed:', err instanceof Anthropic.APIError ? err.status : err instanceof Error ? err.name : 'unknown');
    const status = err instanceof Anthropic.RateLimitError ? 429 : 502;
    return Response.json({ error: 'The explanation could not be written just now.' }, { status });
  }
}
