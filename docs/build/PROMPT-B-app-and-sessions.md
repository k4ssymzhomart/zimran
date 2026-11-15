# Prompt for developer B: the app and the sessions

Before you start: `git fetch`, check out the branch `redesign/premium-ui`, `npm install`, then `npm test` (all tests
pass on a clean checkout). If you have the Figma connector in Claude Code, ask the repository owner for view access
to the design file; if you do not, the frame images in `docs/figma/frames/` are enough. Paste everything below the line into Claude Code (Fable 5.2, max effort, ultracode on)
opened in the repository root.

---

ultracode

You are building half of Fammy for a hackathon that closes **today, 15 November, at 12:00 Astana time**. Run
`date` first and plan against the clock. I am developer B. Developer A is building the other half in parallel from
`docs/build/PROMPT-A-front-door-and-kit.md`; read that file once so you know what is not yours.

## Read first, in this order

1. `docs/build/FOUNDATION.md`: the deadline, the case rules that decide engineering questions, the design rules, the
   Figma map, the tokens, the kit, the assets, the data API, the lines that must be in the product, how to verify.
   Everything in it binds you.
2. `AGENTS.md`: this Next.js is newer than your training data. Read the matching guide in
   `node_modules/next/dist/docs/` before using a Next API.
3. `ARCHITECTURE.md` for the engine, `docs/figma/frames/` (every frame of the design as an image, named by its
   Figma node id), and `docs/figma/round-5-spec.md` for the written spec of each screen.
4. Open `/kit` in the dev server (config `playreps` in `.claude/launch.json`) to see every component that exists.

The design is finished in Figma (file key `pAxPxb3CU2ZQv0NK90auWe`). Build what is drawn. Do not redesign, do not add
captions, do not change the Figma file.

## What I own

Stories 4, 6, 8, 9, 10, 11, 12, 13, 14, 15, 17 (frame ids are in the table in `FOUNDATION.md`): everything with a
running clock, the four tabs, the session review, and the session data.

Files: `app/(app)/**`, `app/session/**`, `app/play/**`, `app/live/**`, `app/dashboard/**`, `components/shell/**`,
`components/round/**` (not `types.ts`, it is frozen), `components/screens/**`, `components/dashboard/**`,
`hooks/useRound.ts`, `hooks/useSpeech.ts`, `hooks/useWakeLock.ts`, `client/sessionStore.ts`, `hooks/useSessions.ts`,
`lib/progress/sessions.ts`, `lib/progress/history.ts`, `lib/round/**`, `lib/coding/**`, `lib/child/**`,
`lib/coach/**`, `lib/speech/**`, `lib/demo/**`.

Not mine (developer A): `app/globals.css`, `app/layout.tsx`, `components/kit/**`, `app/page.tsx`,
`components/landing/**`, `app/start/**`, `components/first/**`, `app/pricing/**`, `app/unlocked/**`, `app/api/**`,
`app/jury/**`, `lib/flow/**`, `hooks/useJourney.ts`, `lib/lesson/**`, `lib/progress/plan.ts`,
`client/profileStore.ts`, `hooks/useProfile.ts`, `client/entitlement.ts`, `lib/features.ts`, `README.md`, `docs/**`.
`lib/types.ts` and `components/round/types.ts` are frozen for both. `lib/routes.ts` is append-only for both.

If a kit component is missing or differs from Figma, do not edit the kit. Build the piece next to the screen, mark it
`// TODO kit`, tell A, and move on.

## Step 1: the engine fixes (20 minutes)

A technical judge will try these first. Each one comes with tests in `lib/`.

1. **Repeats do not count.** Today the same sentence said ten times fills a ring. In `lib/round/session.ts`, a
   sentence whose normalized text was already counted in this round is kept in the transcript but adds nothing to
   the counts, and the parent is asked for new words in the calm voice of the coach. Repeating the child's words is
   still a reflection the first time.
2. **"Good job today" is general praise**, not specific praise. Fix the rule in `lib/coding/classify.ts` and add the
   case to the examples.
3. **American spelling** everywhere in `lib/` and in my screens: practice, program, behavior, pediatrician.
4. **The daily session uses the plan day**: its title and its skill of the week come from `lib/progress/plan.ts`,
   and day 28 is the skill check against the clinic numbers.
5. **The paid session is behind the paywall.** A direct link to the daily session checks `isLocked('daily', ...)`
   from `client/entitlement.ts` and sends a visitor without access to the paywall.

## Step 2: first priority, the path the jury walks

Build in this order. Each item is done when it passes "How to verify a screen" in `FOUNDATION.md`.

1. **The round screen** (stories 4 and 6; mobile `21:139`, `21:205`, `21:280`, `21:403`, `24:401`; desktop
   `32:109`). Replace what renders inside `components/round/RoundRunner.tsx` with the new design. Its props are
   frozen in `components/round/types.ts` and A's first visit mounts it, so the props do not change. It must stay
   usable with the phone keyboard open: the child, the rings and the answer field stay in view together (the old
   `RoundStage` already solves this with the visual viewport; keep that logic). Typed and spoken input both work.
   "Disagree?" removes a sentence from the count. When the parent types, show "Typing? Go for the mix, not the
   speed." When `recorder.state` is `recording`, show the recording mark (`58:1165`). Pattern: `sentences`.
2. **The two result screens**, exported from `components/round/` as props-only components for A to mount:
   `RoundOneResult` (`21:468`, `21:543`, the guess against the real count `49:1371`, `21:598`; desktop `32:164`)
   with props `{ result, sentences, guess, onNext }`, and `BeforeAfter` (`24:477`) with props
   `{ before, after, onNext }`. Every number comes from the two `RoundResult` values.
3. **The daily session** at `/session` (story 15): the plan day and its skill, three examples built from the lesson
   data, five minutes with `RoundRunner`, the result. The finished session is saved through `sessionStore` with its
   sentences. Point `ROUTES.daily` at `/session` (`ROUTES.session(id)` is already the review of one session). Leave
   `app/play` alone until A's new first visit at `/start` is live; then delete `app/play` and `ROUTES.play`.
4. **Today** (story 8; `47:665`, `47:749`, `47:842`, welcome back `62:1176`; desktop `54:137`) on real data: the plan
   day, the streak, today's session and its one action, the last session, the daily check-in, tomorrow's teaser.
   With no sessions it shows the empty state and the action that starts the first one. When Today is real, turn
   `/dashboard` into a redirect to it and delete the old dashboard components and `lib/demo` once nothing imports
   them.
5. **Progress and the session review** (stories 11 and 12; `47:1125`, `47:1270`, `47:1375`, `48:898`, `48:1117`;
   desktop `60:223`, `54:725`) on real data: the trend against the clinic numbers, the list of sessions, and for
   one session the counts, the transcript with a tag on every sentence, and the rule-built "Patterns" block from
   `sessionPatterns`. A session saved before today has no sentences: show its counts and say that the transcript
   was not kept. Show the kit `Player` only when `FEATURES.recording` is on and the session has an `audioId`; show
   `AiSummaryCard` only when `FEATURES.aiSummary` is on. A fills those two slots. The "Rewrite" card appears only if
   the rewrite is computed by rules from the lesson data; otherwise leave it out.

## Step 3: second priority

6. **Streak** (story 9): the month calendar from `monthGrid`, the free day rule exactly as `streakOf` computes it.
7. **Profile** (story 14; desktop `60:651`): the child and the partner from `useProfile`, the plan and its renewal
   date from the entitlement, how to cancel, "How coding works" (`62:1494`) with the real rule names, "Delete my
   data on this device" with a confirm sheet, the footer lines from `FOUNDATION.md` section 6.
8. **Practice** (story 10): pick a scene and a length, same round screen, saved as kind `practice`.
9. **Week and finish** (story 13): the week in numbers from `weekNumbers`, and day 28.

## Step 4: only if the clock allows

10. **Live with your child** (story 17) in the new design. It works today in the old design and the 12-week plan
    promises it, so it must stay reachable. If it is not rebuilt by the freeze, wrap it in the new screen shell,
    label it "Beta", and check it in Chrome with a microphone. If the voice does not work, remove the link.
11. The share card (`48:1232`) and the desktop refinements of Progress and Profile.

## Rules for the data

- No demo, sample or synthetic data. The Figma numbers ("Aru, 4", "Day 5 of 28", the November dates) are layout
  placeholders. Every screen reads `useSessions()` and `useProfile()` and derives the rest with the selectors in
  `lib/progress/sessions.ts`.
- Dates go into selectors as strings. Do not call `new Date()` during render: read the clock in an effect or a
  handler, as `todayISO` in `client/progressStore.ts` documents.
- Keep a save-and-load round-trip test and the v1 migration test green. The first thing the jury does after the
  first visit is reload the page.

## How to build this fast

- Use a workflow per step. Inside it, one agent per screen with its own files, the frame ids, and the instruction to
  read `FOUNDATION.md` and open the frame image in `docs/figma/frames/`. Then a verify stage per screen: open the
  route at 390×844 and 1440×900, put it beside the frame image, list the differences, fix them. Then one integration agent runs typecheck, lint,
  tests and build.
- One dev server, owned by the orchestrator. Agents check with `npm run typecheck`, not with their own servers.
- Compose from the kit and the shell. A screen file should be mostly layout and data wiring.
- The engine and its tests are the product's proof. Keep them green and add a test with every engine change.
- Commit after every screen. Merge to `redesign/premium-ui` at each checkpoint (08:30, 09:45, 10:30). Pull first.
  Ask before every push.

## The freeze, 10:30

No new screens. Help A walk the jury path at 1440, at 390 and on a real phone: landing → first visit → paywall →
test payment → Today → a daily session → its review → reload → still there. Anything of mine still in the old dark
design is rebuilt in ten minutes from the kit shells or removed from the navigation and from `ROUTES`.

## Report

At each checkpoint, tell me in five lines: what works on real input, what is not done, what you cut and why, what
you need from A, and the clock.
