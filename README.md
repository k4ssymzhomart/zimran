# PlayReps

Live: <add the Vercel URL here>

PlayReps lets a parent practise the five-minute play skill that clinics teach, with Mia, a simulated four-year-old.
Every sentence the parent types or speaks is coded live by rules in `/lib`, Mia reacts to it, and three rings fill
toward the clinic pace. After a 60-second round and a 30-second lesson, the parent plays again and sees their own before and after.

## The three-minute path

No login. The same guide is on the site at `/jury`.

1. `/` — answer Mia in your own words.
2. `/play` — a 60-second round, a 30-second lesson, a second round, and the before and after. Type, or tap
   "Speak instead" in Chrome or Edge.
3. `/dashboard` — the plan, the streak, the calm check-in and the 28-day demo.
4. `/pricing` — the paywall and the Stripe test checkout (card `4242 4242 4242 4242`, any future date, any CVC).
5. `/live` (beta, optional) — five minutes with your own child, spoken aloud. Needs Chrome or Edge and a microphone.

## Run it

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

`npm run typecheck` runs `tsc --noEmit`.

## Architecture

| Folder | What lives there |
| --- | --- |
| `app/` | Pages (client components) and two small API routes for the Stripe test checkout. |
| `components/` | Shared pieces: Mia, the rings, the page frame, sentence chips. |
| `hooks/` | The browser side of the pure logic: `useRound` (round reducer + a real clock), `useJourney` (first visit + rounds + storage), `useSpeech` (speech recognition and the spoken coach), `useWakeLock` (screen stays on in live play). |
| `client/` | Guest state in `localStorage`: progress and the paid flag. |
| `lib/` | The engine. Pure TypeScript, no React, no network, no clock. All tests are here. |

### The engine, module by module

| Module | One line |
| --- | --- |
| `lib/types.ts` | The contract between engine and screens: codes, buckets, child state, results. |
| `lib/coding/classify.ts` | Splits a turn into sentences and gives each one code, in a fixed order of checks: criticism, command, question, praise, reflection, description, neutral. |
| `lib/coding/examples.ts`, `heldout.ts`, `blindset.ts` | Labelled sentences the classifier is tested against. |
| `lib/child/model.ts` | Mia. Deterministic: the same seed and the same parent moves give the same child. |
| `lib/child/scenes.ts` | Scenes as data (blocks, drawing): what Mia does and says. |
| `lib/coach/policy.ts` | When the coach speaks and what it says: one line at a time, no criticism. |
| `lib/round/session.ts` | One round as a pure reducer, `(state, event) -> state`. Time arrives as `tick` events. |
| `lib/lesson/lesson.ts` | The 30-second lesson between rounds; every example in it is run through the real classifier in tests. |
| `lib/progress/targets.ts` | The clinic pace for any round length, counts, the round summary, the before and after. |
| `lib/progress/history.ts` | Sessions over days: streak, trend, mastery, the calm check-in. Dates are passed in. |
| `lib/progress/plan.ts` | The 28-day plan: Follow, Describe, Reflect, Praise, one week each. |
| `lib/demo/simulate.ts` | The demo family: a seeded synthetic parent played through the real engine, always labelled as demo data. |
| `lib/flow/journey.ts` | The first visit as a pure state machine: round, result, lesson, second round, before and after, setup, plan. |
| `lib/speech/speech.ts` | Voice input, the pure part: microphone states, and which transcripts are passed on (repeats and the coach's own echo are dropped). |

`lib/index.ts` re-exports the whole engine; a screen imports from it or from the module itself.

## Why this is not a ChatGPT wrapper

Rules in code decide every code, count, target and reaction. There is no LLM call anywhere in this build. The app's
own network requests are the two Stripe routes. Voice input is optional and uses the browser's speech recognition,
which in Chrome sends the audio to Google's speech service; PlayReps receives the text only and does not record or
store audio. Because the engine is pure and deterministic, the same sentences always give the same round, and a
parent can tap "Disagree?" next to a coded sentence (the last three during a round, every one in the round 1
result) to take it out of the count.

## Numbers we stand behind

- **321 unit tests**, all in `lib/`. Run `npm test`.
- **72 of 80 (90%)** on the first run of a blind set, before any rule was changed: 80 casual turns written by a
  separate reviewer who had not seen the rules (`lib/coding/blindset.ts`). After generic fixes that set is 80 of 80,
  so it is no longer blind. An earlier check set of 48 (`lib/coding/heldout.ts`) was 40 of 48 on its first run and
  is 47 of 48 now. `npm test` prints both current numbers.
- **The clinic norm used**: 10 specific praises, 10 reflections, 10 descriptions, and at most 3 questions, commands
  and corrections in five minutes. Shorter rounds keep the same pace (`lib/progress/targets.ts`).

## Dependencies

Next.js, React, Tailwind, the Stripe SDK in test mode, and vitest. There is no database and no login: guest state
lives in `localStorage` on the device.

## Environment variables

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | A Stripe **test** key (`sk_test_...`). The checkout route refuses any other key. |

Without the key the site still runs; only the checkout is unavailable.

## Limits we state openly

- The rules are written for plain English. They miss slang and long compound sentences.
- A sentence in another script is shown as "Not coded"; a sentence in another language typed in Latin letters is
  usually read as neutral talk.
- Mia's reactions follow what the method teaches parents. They are not a validated model of children.
- The demo family is simulated, and labelled as such wherever it appears.
- Voice needs Chrome or Edge. One microphone cannot tell the parent's voice from the child's, so in live play a
  clear sentence from the child may be counted as the parent's, and reflections are not counted there.
- A round ended early is measured over the time it ran, but never over less than half its planned length.
- The paywall is a Stripe test-mode subscription. There is no cancel control in this build.
- The hook and the pages were built in 24 hours.

## Not therapy

PlayReps is skill practice. It gives no diagnosis and makes no promise about a child's behaviour. Families who want
a certified therapist can find one at [pcit.org](https://www.pcit.org).
