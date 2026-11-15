# Build plan for two developers

The design lives in Figma and is the source of truth: [mobile flows](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=13-2), [desktop](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=13-3), [components](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=13-4), [assets](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=13-5). The engine in `lib/` stays. The UI code in the repo is the old dark design and is replaced.

Sizes and percentages below are estimates from the list of screens, not measurements.

## Do not split it as landing against product

The landing is about 13% of the build. It also embeds product pieces: the answer field, the rings, the real Today and review screens, the pricing cards. Splitting there leaves one person with all the state and both open decisions, and the other finished early.

Split along the parent's journey instead:

- **Developer A, the front door and the kit.** Landing, quiz, first answer, lesson, plan, paywall, jury guide. A owns the design tokens and the shared components.
- **Developer B, the app and the sessions.** Everything with a running clock (rounds, daily session, live mode) and the four tabs with the session review. B owns the app shell and the session data.

After a shared day zero that is about 47% each, plus about 6% on B's side (recording, AI summary) that waits for a decision.

## Day zero, together

First commit the baseline: the branch `redesign/premium-ui` has 52 uncommitted entries, including the assets in `public/` and these docs. Then agree the route map and the additions to `lib/types.ts` in one sitting.

| A builds | B builds |
|---|---|
| Light tokens and text styles in `app/globals.css`, named as in Figma | `lib/routes.ts` with one `ROUTES` constant; `app/(app)/layout.tsx` with the tab bar and the rail; stub pages for `/today`, `/practice`, `/progress`, `/progress/[session]`, `/profile`; a redirect from `/dashboard` |
| About 15 primitives, one file each in `components/kit/`: Button, Tag, Chip, Option, TextField, Sheet, Segmented, Toggle, Rings, Pattern, screen shells | `SessionRecord` v2 with a versioned migration in `parseProgress`; a stub `sessionStore`; selector signatures; a demo fixture that keeps its sentences |
| The `Profile` type and a stub `profileStore` | Split `app/play/page.tsx` so the first visit moves under `app/start/` and the daily session stays; freeze the props of the round screen |

This is roughly 10% of the build.

## Who owns which story

| # | Story (mobile frames) | Desktop frames | Size | Owner |
|---|---|---|---|---|
| 1 | [Start](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=20-3) | [Landing](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=63-224) | XL | A |
| 2 | [Personalisation](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=49-994) | [Age](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=54-908), [Hardest moments](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=54-955), [A fact](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=54-1010), [Pick a child](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=32-74) | M | A |
| 3 | [First answer](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=20-70) | [Mia speaks](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=32-91) | S | A |
| 4 | [Round one](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=21-91) | [Round](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=32-109), [Round one result](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=32-164) | L | B |
| 5 | [Lesson](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=24-212) | [Lesson](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=32-212) | M | A |
| 6 | [Round two](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=24-397) | Follows the mobile layout in a centred column | S | B |
| 7 | [Your plan](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=24-519) | [When you play](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=32-240), [Your 28 days](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=32-272) | L | A |
| 8 | [Today](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=47-661) | [Today](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=54-137) | M | B |
| 9 | [Streak](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=57-1141) | Follows the mobile layout in a centred column | S | B |
| 10 | [Practice](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=47-917) | [Practice](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=54-221) | S | B |
| 11 | [Progress](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=47-1121) | [Progress](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=60-223) | L | B |
| 12 | [Session review](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=48-894) | [Session review](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=54-725) | XL | B |
| 13 | [Week and finish](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=62-1268) | Follows the mobile layout in a centred column | M | B |
| 14 | [Profile](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=48-1282) | [Profile](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=60-651) | L | B |
| 15 | [Daily session](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=25-595) | Follows the mobile layout in a centred column | M | B |
| 16 | [Paywall](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=27-458) | [Paywall](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=33-171), [You are in](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=33-204) | M | A |
| 17 | [Live with your child](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=27-710) | [Before you start](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=33-220), [Live session](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=33-260) | M | B |
| 18 | [Jury guide](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=27-969) | [Jury guide](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=33-315) | S | A |

Directories:

- **A:** `app/page.tsx`, `components/landing/`, `app/start/`, `app/pricing`, `app/unlocked`, `app/api/checkout`, `app/jury`, `components/kit/`, `app/globals.css`, `lib/flow/journey.ts`, `hooks/useJourney.ts`, `lib/progress/plan.ts`, `client/profileStore.ts`, `client/entitlement.ts`, the calendar export.
- **B:** `app/(app)/**`, `app/play`, `app/live`, `components/shell/`, `components/round/`, `components/screens/`, `hooks/useRound.ts`, `hooks/useSpeech.ts`, `hooks/useWakeLock.ts`, `client/sessionStore.ts`, `lib/progress/history.ts`, `lib/demo/simulate.ts`.

If recording is approved, Profile (story 14) moves to A to keep the halves even.

## Contracts to freeze on day zero

- `ROUTES`, the token names, and kit props that mirror the Figma component properties.
- `Profile { name, age, moments, guess, partner, scene, moment }` and `useProfile()`.
- `SessionRecord { id, kind, startedAt, durationSec, counts, input, sentences, audioId? }`; reflect is null in live mode. `SavedSentence { text, code, startSec, atSec }`.
- `sessionStore.add(draft)` returning an id, `getSession(id)`, `streak()`, `monthGrid()`, `weekNumbers()`.
- `RoundStageProps { mode, scene, partner, durationSec, guess?, recorder?, onDone(result) }`. A's flow mounts it; B never edits the journey phases.
- `Entitlement { active, startedAt, termWeeks }` and `isLocked(feature)`.
- `TodayScreen` and `SessionReview` as props-only components, so the landing can mount them with the demo fixture.

## Order of work

1. **Path.** A: landing first screen with the live answer field, quiz, first answer. B: rounds one and two, the session store, Today. Demo: an answer on the landing carries into the quiz, round one is played, the session shows on Today.
2. **Depth.** A: lesson, plan, paywall and the return from checkout, the landing sections that embed no app screen. B: Progress, a transcript-only review, streak, Practice, the daily session. Demo: the whole first visit to the test-mode paywall; day 1 opens in Progress as a typed review.
3. **Finish.** A: the landing's phone and tab-switcher sections, the jury guide, the top bar. B: Profile, week and 28 days, live mode, the desktop dashboard and settings page. Both: check every frame against Figma at 390 and 1440. Demo: the jury's three-minute path on a laptop.

## Rules that keep you out of each other's way

- One owner per file. A change to the other person's file goes through their review.
- Only A merges into `components/kit/` and `globals.css`. If B is blocked for half a day, B builds the piece locally, marks it `TODO kit`, and A lifts it into the kit.
- Changes to `lib/types.ts` need both of you.
- No hex colours or font sizes outside the tokens. No route strings outside `ROUTES`.
- Short branches from main, merged daily. A pull request covers at most one story, carries a screenshot beside its Figma frame, and is reviewed by the other person the same day.
- Whoever removes the last importer of an old dark file deletes it.

## Left out until the owner decides

Recording (recorder, IndexedDB, consent, the recording mark, the player, the Profile recordings section, live recording) and the AI summary (`/api/summary`, its card and its sheet).

Build so they slot in later: store `startSec` and an optional `audioId` now; give the round screen a `recorder` port with a no-op default; gate the player and the AI card behind flags in `lib/features.ts`; ship the rule-built "Patterns" block regardless; keep the "does not record audio" copy until a flag flips.

## Background patterns

Three components on the Components page, same size, swapped by context:

| Pattern | Where |
|---|---|
| Bars, the giant logo mark | Brand and result moments: landing hero and closing, the pace band, the 12-week pricing card, paywall, facts, plan result, your 28 days, share card, Profile header |
| Sentences, diagonal dashes | Talking moments: rounds, lesson, live mode, session review, the live answer and the sentence strip on the landing |
| Reps, the logo unit repeated | Everyday screens: Today, Practice, Progress, quiz questions, streak, plan cards |

## Risks to watch

1. **The kit becomes a bottleneck.** A holds both the kit and the largest story. Watch the count of open `TODO kit` items: above three, A pauses the landing.
2. **The session contract drifts.** `parseProgress` drops fields it does not know. Keep a save-and-load round-trip test and a v1 migration test from day zero; the first demo is exactly that path.
3. **The landing overruns.** If more than three landing sections are open at the end of phase 2, B takes the paywall.
