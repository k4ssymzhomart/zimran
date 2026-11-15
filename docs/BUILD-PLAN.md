# Build plan for two developers

The design lives in Figma and is the source of truth: [mobile flows](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=13-2), [desktop](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=13-3), [components](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=13-4), [assets](https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=13-5). The engine in `lib/` stays. The screens are rebuilt in the Split design.

The working documents are in `docs/build/`:

- [`FOUNDATION.md`](build/FOUNDATION.md): the deadline, the case rules that decide engineering questions, the design rules, the Figma map with every frame id, the tokens, the kit, the assets, the data API, the lines that must be in the product, how to verify a screen. Both developers and every agent read it first.
- [`PROMPT-A-front-door-and-kit.md`](build/PROMPT-A-front-door-and-kit.md): the prompt for developer A.
- [`PROMPT-B-app-and-sessions.md`](build/PROMPT-B-app-and-sessions.md): the prompt for developer B.

## The split

Not landing against product: the landing is about 13% of the build and embeds product pieces. The split follows the parent's journey.

- **Developer A, the front door and the kit.** Landing, personalization, first answer, lesson, plan, paywall, jury guide (stories 1, 2, 3, 5, 7, 16, 18). A owns the tokens, `components/kit/`, the deploy, and the two optional features (recording, AI summary).
- **Developer B, the app and the sessions.** Everything with a running clock (rounds, daily session, live mode), the four tabs and the session review (stories 4, 6, 8 to 15, 17). B owns the app shell, the round screen, the session data and the engine fixes.

## How the kit risk was removed

The first version of this plan had A build the kit while B waited for it. Instead the whole foundation was built once, before either developer started, and committed: the light tokens, every kit and shell component from the Components page, the typed asset manifest, the route map, the real-data stores and selectors with tests, and the frozen props of the round screen. Both developers start from the same commit and can work in parallel from the first minute. A's first half hour goes to checking the kit against Figma, because every kit defect blocks B.

## Changes from the first version of this plan

- The saved session type is `SavedSession` (and `SessionDraft` before it has an id), because `SessionRecord` already names the old counts-only record in `lib/progress/history.ts`.
- The first visit lives entirely at `/start` (A). The daily session moves to `/session` (B). `app/play` is deleted once both are live, so nobody edits the same page.
- `/dashboard` keeps working until Today is real, then becomes a redirect.
- No demo, sample or synthetic data in the app. The simulated 28-day family and its dashboard bar go away with the old dashboard.
- The paywall defaults to 4 weeks. The product fixes from the jury review (repeats do not count, American spelling, the paid session behind the paywall, the plan day in the daily session, how to cancel, the footer lines) are in the two prompts.

## Timeline for 15 November

| Time | What is true |
|---|---|
| 07:20 | Foundation is committed and pushed. Production is live at https://fammy-app.vercel.app. Both developers start. |
| 08:30 | Checkpoint 1. Each developer's first-priority screens render on real data. Merge, preview deploy. |
| 09:45 | Checkpoint 2. The whole jury path works in the preview in the new design. Second priority starts. |
| 10:30 | Freeze. No new screens. Walk the path in an incognito window at 390 and 1440 and on a real iPhone. |
| 11:00 | Production deploy. Real screenshots go into the deck. The URL goes into the README. |
| 11:30 | Submit the deck, the link and the repository. Thirty minutes stay in reserve. |

## Risks to watch

1. **The live link must stay good.** Production is at https://fammy-app.vercel.app. It changes only when a newer build has passed every check and a walk of the jury path.
2. **Two designs at once.** Old dark screens and new light screens can run side by side during the build, but must not ship together. At the freeze, anything still dark is rebuilt from the kit shells in ten minutes or removed from the navigation.
3. **The session contract drifts.** Keep the save-and-load round-trip test and the v1 migration test green. The first thing the jury does after the first visit is reload.
4. **The optional features eat the morning.** Recording and the AI summary are not on the jury path. They start only if everything else is done by 09:45.
