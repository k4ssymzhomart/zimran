# PlayReps

Live: https://playreps.vercel.app

Track: Skills. Business Cup 2.0.

PlayReps lets a parent practice the five-minute play skill that clinics teach, with Mia or Leo, a simulated four-year-old girl or boy.
Every sentence the parent types or speaks is coded live by rules in `/lib`, Mia reacts to it, and three rings fill
toward the clinic pace. After a 60-second round and a 30-second lesson, the parent plays again and sees their own before and after.

## The three-minute path

No login. The same guide is on the site at `/jury`.

1. `/` — the landing page, with one button: "Start practicing".
2. `/start` — pick Mia or Leo, then answer in your own words.
3. `/play` — a 60-second round, a 30-second lesson, a second round, and the before and after. Type, or tap the
   microphone in Chrome or Edge.
4. `/dashboard` — the plan, the streak, the calm check-in and the 28-day demo.
5. `/pricing` — the paywall and the Stripe test checkout (card `4242 4242 4242 4242`, any future date, any CVC).
6. `/live` (beta, optional) — five minutes with your own child, spoken aloud. Needs Chrome or Edge and a microphone.

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
| `components/` | The screen kit (`ui.tsx`), the child portraits and the Mia/Leo choice (`child.tsx`), the rings, sentence chips. Design rules: `DESIGN.md`. |
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

- **423 unit tests**: the rules engine in `lib/`, the stores in `client/` and the round hook. Run `npm test`.
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
- Leo is the same engine as Mia. The engine's texts are written about Mia; for Leo the screens rewrite the name and pronouns on display (`components/child.tsx`, tested in `components/child.test.ts`).
- The demo family is simulated, and labelled as such wherever it appears.
- Voice needs Chrome or Edge. One microphone cannot tell the parent's voice from the child's, so in live play a
  clear sentence from the child may be counted as the parent's, and reflections are not counted there.
- A round ended early is measured over the time it ran, but never over less than half its planned length.
- The paywall is a Stripe test-mode subscription. There is no cancel control in this build.
- The hook and the pages were built in 24 hours.

## Business model and sources

Track: Skills. The buyer is a US parent aged 25 to 45 with a child aged 2 to 7. Everything below is a model. There
are no real users and no real payers yet; Stripe runs in test mode.

### What is sold

| Plan | Price | Per day | Stripe fee | Kept |
| --- | --- | --- | --- | --- |
| 4 weeks, selected by default | $29 | $1.04 | $1.14 | $27.86 |
| 12 weeks | $69 | $0.82 | $2.30 | $66.70 |

The first visit is free and ends with the parent's own before and after. Weeks 1 to 4 are practice with Mia, one
skill a week. Day 28 is a skill check against the clinic numbers. Weeks 5 to 8 are the same skills in live mode with
the parent's own child (beta). The price is the same on renewal.

### The funnel

The ad lands on the product, not on a quiz, and the paywall comes after the parent's first win.

| Step | Public benchmark | Assumed |
| --- | --- | --- |
| Ad click-through | 1.71% (WordStream 2025, all industries) | 1.5% |
| Cost per click | $0.60 to $1.06 for traffic, $1.80 to $1.92 for leads | $1.20 |
| Click to paywall | 35 to 60% for quiz funnels; none for this mechanic | 20% |
| Paywall to payment | 2 to 5%, the best 8 to 12%, usually with a paid trial | 10% |
| Click to payment | about 1.1% (Consumer App Index, 250 web funnels) | 2.0% as the target |

### Unit economics

Assumed: 60% buy 4 weeks and 40% buy 12 weeks; Stripe takes 2.9% + $0.30; 5% refund; no language-model cost. On the
4-week plan 50% pay a second time, 33% a third, 23% a fourth. On the 12-week plan 35% renew once. A payer brings $45
on day one and $89 over twelve months after fees, refunds and hosting. Margin before ads is 90%.

| Clicks that pay | Benchmark 1.1% | Cautious 1.4% | Target 2.0% | Strong 2.7% |
| --- | --- | --- | --- | --- |
| Cost to win a payer | $109 | $86 | $60 | $44 |
| Day-one cash covers | 37% | 47% | 67% | 91% |
| 12-month value to cost | 0.81 | 1.04 | 1.48 | 2.00 |
| Payback | not within a year | day 336 | day 84 | day 28 |

Break-even is 1.35% of clicks paying at a $1.20 click, or 2.25% at $2.00. The model depends on the cost of winning a
payer more than on renewal: 74% of a payer's yearly revenue arrives in the first 84 days.

### The market

About 22 million US children are aged 2 to 7 (CDC births, 2019 to 2024), in about 15 million homes (our estimate).
8.6% of preschoolers have tantrums every day (Wakschlag et al., 2012), which is about 1.3 million homes. That is
where we start: 4% of it is 50,000 active subscribers and about $17M a year. $100M needs 300,000 active subscribers
and more than tantrums: ages 7 to 12, Spanish, a second caregiver, then the same engine for other hard conversations.

### Sources

- Good Inside, $34M revenue in 2025: [Fortune, 27 February 2026](https://fortune.com/2026/02/27/dr-becky-kennedy-good-inside-revenue-leadership-playbook-for-parenting-34-million-a-year-business/)
- Parents' stress: [US Surgeon General](https://www.hhs.gov/surgeongeneral/priorities/parents/index.html)
- Daily tantrums in 8.6% of preschoolers: [Wakschlag et al., 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3633202)
- US births: [CDC NCHS](https://www.cdc.gov/nchs/products/databriefs/db535.htm)
- PCIT therapist requirements, the role-play clause: [PCIT International, 2013](https://www.aucd.org/docs/LEND%20Resources/Certified%20PCIT%20Therapist%20Training%20Requirements.pdf)
- PCIT sessions and dropout: [review](https://www.dovepress.com/reconceptualizing-attrition-in-parent-child-interaction-therapy-dropou-peer-reviewed-fulltext-article-PRBM)
- Waitlists of about three months: [Wisconsin OCMH](https://children.wi.gov/Pages/WhileYouWait.aspx)
- Happypillar acquired by Manatee: [press release](https://www.newswire.com/news/manatee-acquires-happypillar-to-scale-personalized-mental-health-care-22659782)
- Vipo.AI: [Boston University](https://www.bu.edu/innovate/vipo-ai-transforms-parenting-support-with-ai-powered-therapy-assistant)
- Meta ad benchmarks: [WordStream, 2025](https://www.wordstream.com/blog/facebook-ads-benchmarks-2025)
- Web funnels, 1.1% click to payment: [Consumer App Index](https://cai-breakdowns.pages.dev/web2app-paywalls-2026)
- Paywall conversion and refunds: [Adapty](https://adapty.io/blog/what-is-web-to-app-and-how-does-it-work/)
- Renewals: [RevenueCat, 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/)
- Stripe fees: [stripe.com/pricing](https://stripe.com/pricing)

## Not therapy

PlayReps is skill practice. It gives no diagnosis and makes no promise about a child's behavior. Families who want
a certified therapist can find one at [pcit.org](https://www.pcit.org).
