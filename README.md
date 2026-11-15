# Fammy

Five-minute play practice for parents, with a simulated four-year-old and rules that code every sentence.

Live: https://fammy-app.vercel.app

Track: Skills. Business Cup 2.0.

Fammy lets a parent practice the five-minute play skill that clinics teach, with Mia or Leo, a simulated
four-year-old girl or boy. Every sentence the parent types or speaks is coded on the spot by rules in `lib/`, the
child reacts to it, and three rings fill toward the clinic pace for praise, reflection and description. The first
visit is free: a 60-second round, a 30-second lesson, a second round, and the parent's own before and after. A few
questions then set up a 28-day plan, one skill a week, and a daily reminder the parent can add to their calendar. The
daily session is five minutes.

## The three-minute path

No login. Everything you do is kept in this browser. An optional account in Profile (an email and a password) keeps a
copy for other devices; the walk never needs it. On `/jury`, "Load a demo month" adds 27 days of a simulated family
(every sentence coded by the real rules, `lib/demo/month.ts`), marked "Demo data" on every screen and removable, so the
streak, the four-week trend and day 28 can be seen in one visit. The site carries its own version of this guide at `/jury`.

1. `/`: the landing. Answer Mia in the field on the page; the rules code your sentence in the browser and show what
   it counted. "Build my plan" carries it into the first visit.
2. `/start`: the first visit, on one route. Pick Mia or Leo, "What do you say most in play?", one fact, your first
   answer and how it was read, round one (60 seconds), its result with "Disagree?", a 30-second lesson, round two
   (40 seconds, a new scene), your own before and after. Then the questions that set up the plan: name, age, hardest
   moments, how often they happen (asked when a moment is picked), scene, when you play (with a calendar reminder);
   then your plan from your answers and the 28 days. The first answer is typed; in the rounds and the lesson you can
   also tap the microphone (voice works in Chrome and Edge).
3. `/pricing`: the two plans and their price. "Continue" opens Stripe's checkout in test mode: card
   `4242 4242 4242 4242`, any future date, any CVC, any name and ZIP. Stripe sends you back to `/unlocked`, which
   asks the server whether the session was really paid before it gives access. "Jury: unlock without paying (demo)"
   under the button skips the card. Without a Stripe key on the server, "Continue" gives demo access at once;
   `/jury` says which of the two the deployment runs.
4. `/today`: your plan day, your week and your last session. Empty until you have played. The other tabs are
   `/practice`, `/progress` and `/profile`.
5. `/progress`: every session you played. Open one to read your sentences as they were coded.
6. `/jury`: this path, sentences to type to try to break the rules, and what is real. Profile links to it.
7. `/live` (beta, optional): five minutes with your own child, spoken aloud. Needs a microphone and a browser with
   speech recognition, such as Chrome or Edge.

## What is real, what is simulated, what is not built yet

**Real**

- The rules engine: plain TypeScript in `lib/`. Every sentence gets one code, and coding makes no network call.
- The counts: set against the clinic numbers. A shorter round keeps the same pace.
- Your before and after: computed per minute from the sentences of your own two rounds.
- Your sessions: saved in this browser with every sentence (`localStorage`, key `playreps.sessions.v2`).
- The plan: "Your plan, from your answers." shows what you chose and the first focus round one counted. The 28 days
  are the same for every family: one skill a week, day 28 a skill check.
- The calendar file: `/api/calendar` returns a five-minute event that repeats every day at the time you pick, for
  the days left in the plan. The link carries no name, and nothing is stored.

**Simulated, and labeled**

- Mia and Leo: two simulated four-year-olds on one engine. Their reactions follow what the method teaches parents;
  they are not a validated model of children.

**Not built yet**

- Accounts: no login and no server database. Clearing this site's data erases your sessions.
- Real payments: the live site uses a Stripe test key, and the three Stripe routes refuse any key that is not a
  test key, so no real card is charged.
- Measured renewal: the code takes no real payment, so no renewal has been measured. The renewal rates below are
  assumptions.
- Results with real families: not measured. Fammy has no real users yet.
- Accuracy on real speech: not measured. The 72 of 80 below is typed text, and no certified coder has checked it.
- Recordings: off by default (`lib/features.ts`) and not built. Nothing records audio.
- The AI summary of a session: built, off by default. When it is switched on and the parent agrees, the sentence
  text of that one session goes to Anthropic's Claude to be put into words (`app/api/summary/route.ts`).

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

`npm run dev` serves the site at http://localhost:3000. `npm run typecheck` runs `tsc --noEmit`, and `npm run lint`
runs ESLint.

## Architecture

| Folder | What lives there |
| --- | --- |
| `app/` | The routes: `/`, `/start`, `/pricing`, `/unlocked`, `/jury`, the four tabs and the session review in `app/(app)/`, the daily session `/daily`, the practice round `/round` and live mode `/live`. The first addresses `/play` and `/dashboard` redirect to `/start`, `/daily` and `/today` (`next.config.ts`). API routes in `app/api/`: `checkout`, `entitlement` and `cancel` (Stripe, test keys only), `calendar` and `ics` (calendar files). `/kit` and `app/preview/` are test benches for development; production answers 404 there. |
| `components/` | `kit/` (the screen kit, every part on `/kit`), `shell/` (app shell, tab bar, rail, top bar), `first/` (the first visit, with its round screen in `first/round/`), `landing/`, `pricing/`, `jury/` (the guide's statements), `daily/` (the daily session and the practice round), `live/` (live mode), `round/` (the frozen props of a round). `child.tsx` rewrites the engine's texts for Leo. |
| `hooks/` | The browser side of the pure logic: `useRound` (round reducer plus a real clock), `useFirstVisit` (the first visit at `/start`), `useSpeech` (speech recognition and the spoken coach), `useWakeLock` (keeps the screen on in live play), and `useSessions`, `useProfile`, `useEntitlement` (the stores, for React). |
| `client/` | What stays on the device, in `localStorage`: the sessions with their sentences (`sessionStore.ts`), the quiz answers (`profileStore.ts`), access (`entitlement.ts`), and the older progress format, still written beside the sessions (`progressStore.ts`). `firstAnswer.ts` carries the landing's answer to `/start` in `sessionStorage`. |
| `lib/` | The engine. Pure TypeScript: no React, no network, no clock. Most tests are here. |
| `docs/` | `docs/build/FOUNDATION.md` (the build guide, with the design rules), the Figma frames as images, the deck. |

### The engine, module by module

| Module | One line |
| --- | --- |
| `lib/types.ts` | The contract between engine and screens: codes, buckets, child state, results, the saved session and the profile. |
| `lib/coding/classify.ts` | Splits a turn into sentences and gives each one code, in a fixed order of checks: criticism, command, question, praise, reflection, description, neutral. Unkind talk is criticism even in a praise frame ("Great job being a pain."); an order anywhere in a sentence, or one dressed as a question or a suggestion, is a command. |
| `lib/coding/vocabulary.ts` | The words the coder knows: a ring needs a real word, and a sentence with almost no English in it is not coded. |
| `lib/coding/safety.ts` | A short word filter for talk of hitting or hurting a child or oneself, or of not being able to go on: the sentence is not scored, and the rounds with Mia or Leo and the first answer show the 988 and Childhelp lines (live play does not yet). |
| `lib/coding/examples.ts`, `heldout.ts`, `blindset.ts` | Labeled sentences the classifier is tested against. |
| `lib/child/model.ts` | The simulated child, Mia or Leo. Deterministic: the same seed and the same parent moves give the same child. |
| `lib/child/scenes.ts` | Scenes as data (blocks, drawing, kitchen, cleanup): what the child does and says. |
| `lib/coach/policy.ts` | When the coach speaks and what it says: one line at a time, no criticism. |
| `lib/round/session.ts` | One round as a pure reducer, `(state, event) -> state`, with time arriving as `tick` events. It holds the repeat window, the cap of three counted sentences per turn, "Disagree?" and the early end. |
| `lib/lesson/lesson.ts` | The 30-second lesson between rounds; every example in it is run through the real classifier in tests. |
| `lib/lesson/days.ts` | A lesson for every day of the plan, each sentence run through the classifier in tests. The daily session shows the day's idea and its three sentences. |
| `lib/progress/targets.ts` | The clinic pace for any round length, counts, the round summary, the before and after. |
| `lib/progress/history.ts` | Progress over days: streak (one missed day in any seven is forgiven), trend, the calm check-in, and the older progress format. Dates are passed in. |
| `lib/progress/plan.ts` | The 28-day plan: Follow, Describe, Reflect, Praise, one week each; day 28 is a skill check. |
| `lib/progress/sessions.ts` | What the saved sessions say: streak, month calendar, week totals, plan day, the before and after, patterns in one session. |
| `lib/progress/calendar.ts` | The daily reminder as a calendar file, served at `/api/calendar` and linked from the first visit. |
| `lib/reminder/calendar.ts` | A second calendar file, for four fixed moments, served at `/api/ics`. No screen links to it now. |
| `lib/demo/simulate.ts` | A seeded synthetic parent played through the real engine, used only by its own tests. No screen shows it. |
| `lib/flow/journey.ts` | The core of the first visit as a pure state machine: first answer, round one, result, lesson, round two, before and after, setup, plan. |
| `lib/flow/visit.ts` | The first visit around the journey: the personalization screens before and after it, and the way back from each. |
| `lib/speech/speech.ts` | Voice input, the pure part: microphone states, and which transcripts are passed on (repeats and the coach's own echo are dropped). |
| `lib/routes.ts` | The paths the screens link to (`ROUTES`) and the four tabs. `/api/cancel` and `/api/ics` are not in it, and `quiz` (`/start/quiz`) and `plan` (`/plan`) name pages that do not exist; nothing links to them. |
| `lib/features.ts` | The switches for recordings, the AI summary and live mode. |

`lib/index.ts` re-exports most of the engine; a screen imports from it or from the module itself.

## Why this is not a ChatGPT wrapper

Rules in code decide every code, count, target and reaction. A language model never codes or counts anything. The
one place a model is used is the optional AI summary of a session, off by default: the parent agrees first, the
device sends that session's sentence text and the counts the rules already computed, and Claude puts them into
words (`lib/ai/summary.ts`, `app/api/summary/route.ts`). It may also suggest what to say instead of a question or a
command; a suggestion is shown only when the same rules code it as specific praise, a reflection or a description,
so the model suggests and the rules decide. Behind the same switch, "Why this label?" next to a sentence asks Claude
to say in plain words what made the rules give that label (`lib/ai/explain.ts`, `app/api/explain/route.ts`); the label
never changes. With the switch off, the only calls out from the server are to Stripe.
Voice input is optional and uses the browser's speech recognition, which in Chrome sends the audio to Google's
speech service; Fammy receives the text only and keeps no audio. Because the engine is pure and deterministic,
the same sentences at the same moments give the same round every time. The product is a path, not a chat: a first
visit with two rounds and a lesson, the parent's own sessions over days, a 28-day plan and a daily reminder. A
parent who disagrees with a code can tap "Disagree?" to take that sentence out of the count, at most three a round.

## Numbers we stand behind

- **1,977 unit tests** in 36 files: the count `npx vitest run` printed on 15 November 2026, the day of submission.
  They cover the rules engine in `lib/`, the stores in `client/`, the round hook, the checkout route (with Stripe
  replaced by a stand-in) and the pure parts of the screens, among them the jury guide's statements about the rules,
  run against the engine (`components/jury/guide.test.ts`). Run `npm test`.
- **72 of 80 (90%)** on the first run of a blind set, before any rule was changed (`lib/coding/blindset.ts`): 80
  turns typed the way people type in a chat box, ten per main category, labeled from the category table alone
  before the author had read the rules or the other example sets. The eight misses led to generic fixes in
  `classify.ts`, and the set is now 80 of 80, so it is no longer blind: the 72 is the honest estimate for unseen
  phrasing, and the 80 only guards against regressions. A check set of 48 casual turns written after the rules
  (`lib/coding/heldout.ts`) was 40 of 48 on its first run and is 48 of 48 now. `npm test` prints both current
  numbers. Neither set is validated against certified coders or on real speech.
- **The clinic norm used**: 10 specific praises, 10 reflections and 10 descriptions in five minutes, with at most 3
  questions, commands and corrections (PCIT protocol, Eyberg & Funderburk, 2011). Shorter rounds keep the same pace
  (`lib/progress/targets.ts`).

## Dependencies

Next.js 16, React 19 and Tailwind CSS 4; the Stripe Node SDK, used only by the server routes and only with a test
key; TypeScript, ESLint and Vitest for development. There is no database and no login: a visitor's sessions and
answers stay in `localStorage` on their device.

## Environment variables

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Optional. A Stripe **test** key (`sk_test_...`). Without it the paywall runs in demo mode: no payment is taken and "Continue" gives demo access. With it, "Continue" opens Stripe's test checkout. The routes refuse any key that is not a test key. To set it locally, copy `.env.example` to `.env.local`. |
| `NEXT_PUBLIC_FEATURE_LIVE` | Optional. `false` takes live mode off the Practice tab and the jury guide, and `/live` answers 404. On by default. |
| `NEXT_PUBLIC_FEATURE_RECORDING` | Optional. Off unless set to `true` or `1`. Leave it off: the recorder is not built. |
| `NEXT_PUBLIC_FEATURE_AI_SUMMARY` | Optional. `true` shows "Write an AI summary" on the session review. Needs `ANTHROPIC_API_KEY`; without it the button answers that the summary is not set up. |
| `ANTHROPIC_API_KEY` | Optional. A Claude API key for the AI summary, read only by `app/api/summary/route.ts`. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Optional. Upstash Redis, added by Vercel Marketplace → Upstash for Redis. With them, Profile offers the optional account: an email and a scrypt-hashed password, a sign-in cookie, and a copy of the device's saved progress (`app/api/account/`, `client/account.ts`). Without them there is no account section. `next dev` keeps accounts in memory. |

`VERCEL_PROJECT_PRODUCTION_URL` is set by Vercel and gives link previews their address.

## Limits we state openly

- The rules are written for plain English. Each sentence gets one code, from the first check that matches, so a
  sentence that does two things counts once, and slang and unusual phrasing can be misread.
- A sentence in another script is not coded and moves no count. One in another language typed in Latin letters is
  not coded when it has a common word of a language on a short list and fewer than half its words are English;
  other languages can be misread. Made-up words fill no ring: "You're blahing the foo." is neutral talk.
- The same skill sentence said again within 20 seconds fills no ring, and neither does a near-repeat (another
  article, "Mia" or a pet name such as "honey" added, another praise word), so a parent who honestly repeats a praise
  gets one count. Any other name added, "Leo" included, makes it a new sentence. One turn counts three skill
  sentences at most, so a pasted paragraph of praise counts three; every question, command and correction in it
  still counts.
- A round ended early is measured over the time it ran, never under half its planned length; ended before half, it
  gets no pace verdict. A reload in the middle of the first visit starts it over: its two rounds are saved together
  once the before and after shows.
- A sentence about hitting or hurting a child, or oneself, or about not being able to go on, is not scored. In the
  rounds with Mia or Leo and on the first answer the screen then shows the 988 and Childhelp lines; live play
  (`/live`) does not show them yet. The filter is a short word list, not an assessment, and it misses most ways of
  saying these things.
- Mia's reactions follow what the method teaches parents. They are not a validated model of children. Leo uses the
  same engine: the engine's texts are written about Mia, and for Leo the screens rewrite the name and pronouns on
  display (`components/child.tsx`, tested in `components/child.test.ts`).
- Voice uses the browser's own speech recognition: the microphone shows only where the browser has it (Chrome and
  Edge do), and typing works everywhere. One microphone cannot tell the parent's voice from the child's, so in live
  play a clear sentence from the child may be counted as the parent's, and reflections are not counted there.
- Access is saved on the device only, so it does not follow the parent to another browser. The daily session and
  live mode need it (`isLocked` in `client/entitlement.ts`); without it they open the plans page. In demo mode the
  terms under the plans still name the day a paid plan would renew. A route that stops the renewal of a Stripe test
  subscription exists (`app/api/cancel/route.ts`); no screen calls it.
- Fammy was built during the hackathon.

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

Fammy is skill practice. It gives no diagnosis and makes no promise about a child's behavior. Families who want
a certified therapist can find one at [pcit.org](https://www.pcit.org).

In crisis, call or text 988. Childhelp: 1-800-422-4453.

Not affiliated with or endorsed by PCIT International.
