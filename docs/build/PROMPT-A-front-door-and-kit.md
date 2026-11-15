# Prompt for developer A: the front door, the kit, the safety net

Paste everything below the line into Claude Code (Fable 5.2, max effort, ultracode on) opened in the repository root,
on the branch `redesign/premium-ui`.

---

ultracode

You are building half of Fammy for a hackathon that closes **today, 15 November, at 12:00 Astana time**. Run
`date` first and plan against the clock. I am developer A. Developer B is building the other half in parallel from
`docs/build/PROMPT-B-app-and-sessions.md`; read that file once so you know what is not yours.

## Read first, in this order

1. `docs/build/FOUNDATION.md`: the deadline, the case rules that decide engineering questions, the design rules, the
   Figma map, the tokens, the kit, the assets, the data API, the lines that must be in the product, how to verify.
   Everything in it binds you.
2. `AGENTS.md`: this Next.js is newer than your training data. Read the matching guide in
   `node_modules/next/dist/docs/` before using a Next API.
3. `docs/figma/frames/`: every frame of the design as an image, named by its Figma node id. And
   `docs/figma/round-5-spec.md` for the written spec of each screen.
4. Open `/kit` in the dev server (config `playreps` in `.claude/launch.json`) to see every component that exists.

The design is finished in Figma (file key `pAxPxb3CU2ZQv0NK90auWe`). Build what is drawn. Do not redesign, do not add
captions, do not change the Figma file.

## What I own

Stories 1, 2, 3, 5, 7, 16, 18 (frame ids are in the table in `FOUNDATION.md`), the kit, the tokens, the deploy, and
the two optional features (recording, AI summary).

Files: `app/globals.css`, `app/layout.tsx`, `components/kit/**`, `app/kit/**`, `app/page.tsx`,
`components/landing/**`, `app/start/**`, `components/first/**`, `app/pricing/**`, `app/unlocked/**`, `app/api/**`,
`app/jury/**`, `lib/flow/**`, `hooks/useJourney.ts`, `lib/lesson/**`, `lib/progress/plan.ts`, `client/profileStore.ts`,
`hooks/useProfile.ts`, `client/entitlement.ts`, `lib/features.ts`, `client/recorder.ts`, `client/audioStore.ts`,
`README.md`, `docs/**`.

Not mine (developer B): `app/(app)/**`, `app/play/**`, `app/session/**`, `app/live/**`, `app/dashboard/**`,
`components/shell/**`, `components/round/**`, `components/screens/**`, `components/dashboard/**`, `hooks/useRound.ts`,
`hooks/useSpeech.ts`, `hooks/useWakeLock.ts`, `client/sessionStore.ts`, `hooks/useSessions.ts`,
`lib/progress/sessions.ts`, `lib/progress/history.ts`, `lib/round/**`, `lib/coding/**`, `lib/child/**`,
`lib/coach/**`, `lib/speech/**`, `lib/demo/**`. `lib/types.ts` and `components/round/types.ts` are frozen for both.
`lib/routes.ts` is append-only for both.

## Step 0: the safety net (done, keep it alive)

Production is live at **https://fammy-app.vercel.app** (Vercel project `playreps`), deployed from this branch. Every
route answers. The Stripe test checkout is not set up yet: I add the test key myself (`STRIPE_SECRET_KEY`, it must
start with `sk_test_`; never print it, never commit it). Until then the paywall says so and the jury link works.

Rules for production from now on:

- It changes only when a newer build has passed `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and
  a walk of the jury path in an incognito window. The redesign goes to preview deployments until the freeze check.
- Deploy from a clean checkout of a pushed commit, never from a working tree with uncommitted files:
  `git worktree add --detach <dir> <commit>`, `vercel link --yes --project playreps` in it once, then
  `vercel deploy --prod --yes` (without `--prod` for a preview).
- Ask me before every production deploy and before every push to `main`. Pushing to `redesign/premium-ui` is fine.

## Step 1: the kit (being checked by agents started before this prompt)

Agents started before this prompt are comparing the kit with the Figma Components page component by component, and
adding an icon set (`Icon`) and the quiz age tile (`NumberTile`). Do not redo that work and do not edit
`components/kit/**` while they run; their fixes land as their own commit. Open `/kit` to see the kit. Developer B is
blocked by every kit defect, so a kit request from B (`// TODO kit`) takes priority over my current screen when more
than three are open.

## Step 2: first priority, the path the jury walks

Build in this order. Each item is done when it passes "How to verify a screen" in `FOUNDATION.md`.

1. **Landing, first screen and frame** (story 1; mobile `20:7` and the top of `66:1267`; desktop `63:224`): top bar,
   the first screen with Mia saying "I made a tower!" and the **live answer field**, the footer with the required
   lines. The answer field is real: the visitor's sentence goes through `codeTurn` from `lib/`, the result is shown
   as drawn, and the sentence is carried into the first visit so they do not type it twice.
2. **The first visit at `/start`** as one route with phases held by `useJourney` (it is mine): pick Mia or Leo →
   first answer with its coding (story 3) → round one → round-one result → lesson (story 5) → round two → before and
   after → the plan result (story 7: "when you play" and "day 1 done" first). The round screen and the two result
   screens are B's components; mount them, never restyle them:
   `RoundRunner` (props in `components/round/types.ts`), `RoundOneResult`, `BeforeAfter` from `components/round/`.
   Until B ships the new visuals they render the old ones; that is fine. Build the whole first visit inside
   `/start`; do not edit `app/play`. The before-and-after screen must carry the line "Clinics don't start with
   discipline. They start with five calm minutes of play a day."
3. **Paywall and return from checkout** (story 16): `/pricing` and `/unlocked`. **4 weeks is selected by default.**
   The 12-week plan says "Weeks 1–4 with Mia, weeks 5–8 live with your child". Show the renewal date computed from
   today, the renewal price, how to cancel, the test-mode line with the test card, and the permanent link "Jury:
   unlock without paying (demo)". If the Stripe key is missing the page says so plainly and the jury link still
   works. After payment the visitor lands on `/unlocked`, then on Today. Set `startedAt` on the entitlement.
4. **Jury guide** (story 18): the three-minute path with real links, what is real, what is simulated and labelled,
   what is not built yet, and ways to try to break it. No demo family, no sample data.

## Step 3: second priority

5. **Personalization** (story 2), placed before the first answer: age, hardest moments, the guess ("How many
   questions do you ask in one minute of play?"), one fact with its source, the partner. Answers go to
   `profileStore`. The guess is passed to `RoundRunner` and shown against the real count after round one.
6. **The rest of the plan story** (7): scene, the plan built from the quiz answers, "your 28 days", and the calendar
   reminder as a file served by a route handler (a blob download fails inside in-app browsers).
7. **The rest of the landing**, in this order: the coded answer and the sentence strip, the four counts, the first
   visit in three steps, before and after, pricing, answers, closing. Sections that show app screens with history
   (the app switcher, the review bento, the month) need pictures: use real screenshots of the built app taken after
   a real session, saved in `public/shots/` and captioned "Example". Until they exist, leave those sections out.
8. **Product fixes on my side**: an access link on `/unlocked` ("Copy link", verified through the existing
   entitlement route so it works in another browser), and the README sections "Business model and sources" and
   "What is real, what is simulated, what is not built yet".

## Step 4: only if steps 2 and 3 are done before 09:45

Both features are off by default and sit behind `lib/features.ts`. Neither is on the jury path. Skip them without
regret if the clock says so.

- **Recording.** `client/recorder.ts` implements `RecorderPort` with `MediaRecorder`; `client/audioStore.ts` keeps
  blobs in IndexedDB on this device only. The consent screen is `49:1516`. The round shows the "Recording" mark
  (`58:1165`, B's screen reads `recorder.state`). The session review shows the kit `Player` when the session has an
  `audioId`. Profile gets "Delete all recordings". Nothing is uploaded. When this ships, replace every "does not
  record audio" line with "Recordings stay on this device".
- **AI summary.** `app/api/summary/route.ts` takes the session's coded sentences and counts and returns a short
  summary. Our rules do the counting; the model only explains the counts in words, and never invents numbers. It
  runs live on the visitor's own session, never on canned text. The key stays in a server environment variable.
  Load the `claude-api` skill before writing the call and read the model id from an environment variable. Opt-in
  through the consent sheet `48:1092`; rendered by the kit `AiSummaryCard`; the rule-built "Patterns" block shows
  regardless. If this ships, the deck and README must say "no language model in the scoring" instead of "no
  language model".

## How to build this fast

- Use a workflow per step. Inside it, one agent per screen with its own files, the frame ids, and the instruction to
  read `FOUNDATION.md` and open the frame image in `docs/figma/frames/`. Then a verify stage per screen: open the
  route at 390×844 and 1440×900, put it beside the frame image, list the differences, fix them. Then one integration agent runs typecheck, lint,
  tests and build.
- One dev server, owned by the orchestrator. Agents check with `npm run typecheck`, not with their own servers.
- Compose from the kit. A screen file should be mostly layout and data wiring.
- Reuse the working logic: `useJourney`, `lib/flow/journey.ts`, `lib/lesson/`, `client/entitlement.ts`, the API
  routes. The engine and its 326 tests are the product's proof; keep them green.
- Commit after every screen. Merge to `redesign/premium-ui` at each checkpoint (08:30, 09:45, 10:30). Pull first.

## The freeze, 10:30

1. Merge both halves. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
2. Any route still in the old dark design is either rebuilt in ten minutes from the kit shells or removed from the
   navigation and from `ROUTES`. The product must not ship in two designs.
3. Walk the jury path in an incognito window at 1440 and at 390, then on a real iPhone in Safari: landing → first
   visit → paywall → test payment → Today → a daily session → its review → reload → still there.
4. Deploy to production. Walk it once more on the production URL.
5. Take real screenshots of the first answer, a running round and the before and after into `docs/deck/shots/` and
   run `docs/deck/build.sh` to rebuild the deck PDF with them.
6. README: the URL, "Track: Skills", the three-minute path, the dependencies, what is real and what is simulated.
7. Push. Submit the deck, the link and the repository by 11:30.

## Things only I can do, remind me

Vercel login and the Stripe test key. The iPhone check. Sending the link to a few US parents and writing down how
many finished the before and after (a real number on the deck is worth more than any model). The submission form.

## Report

At each checkpoint, tell me in five lines: what works on real input, what is not done, what you cut and why, what
you need from B, and the clock.
