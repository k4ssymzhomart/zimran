# PlayReps build guide

Read this whole file before writing code. It is shared by both developers and by every agent they start.
The two task prompts are `docs/build/PROMPT-A-front-door-and-kit.md` and `docs/build/PROMPT-B-app-and-sessions.md`.

## 1. The deadline

Submission closes on **15 November at 12:00** (Astana time). The jury opens the link between 12:00 and 15:00.
Three things are submitted: the deck as a PDF, the production link, the public GitHub repository. Missing any one of
them means the work is not scored.

| Time | What is true |
|---|---|
| 07:20 | Foundation is committed and pushed, production is live at https://playreps.vercel.app. Both developers start. |
| 08:30 | Checkpoint 1. Each developer's first-priority screens render on real data. Merge, preview deploy. |
| 09:45 | Checkpoint 2. The whole jury path works in the preview in the new design. Second priority starts. |
| 10:30 | **Freeze.** No new screens. Walk the path in an incognito window at 390 and 1440 and on a real iPhone. |
| 11:00 | Production deploy. Real screenshots go into the deck. The URL goes into the README. |
| 11:30 | Submit. Thirty minutes stay in reserve. |

Cut, do not slip. A screen that is not finished at the freeze is removed from the navigation, not shipped half done.

## 2. What the case rules mean for the code

These come from the organisers' FAQ (question numbers in brackets). They decide engineering questions, so they are
not optional.

1. **A live link the jury can walk end to end with no sign-up** (1, 47, 65). A local server, a Figma link or a video
   does not count. `localStorage` and anonymous sessions are fine (135). The link must stay up until the end of the
   final on 15 November (73).
2. **The key scenario works for real, with no stubs and no hardcoded answers** (3, 66, 96). This is 40% of the score.
   The jury types its own input and reads the code. Our key scenario: the parent answers Mia, plays a 60-second
   round, takes a 30-second lesson, plays a second round on a new scene and sees their own before and after. Every
   number on screen is computed from what the visitor typed or said.
3. **No dead buttons** (85). Anything that does not work is hidden or removed. One feature that works beats ten
   buttons that lead nowhere (3).
4. **A paywall with a clear price is the minimum; a Stripe test checkout the jury can finish is stronger** (37, 55,
   95). The test card `4242 4242 4242 4242` is shown on screen. The jury must also be able to pass without paying
   (115): keep the labelled link "Jury: unlock without paying (demo)".
5. **At least one return mechanic is built and visible at once** (72, 100): the plan, the streak, the progress, the
   reminder. The jury scores renewal, not daily opens (30).
6. **More than a ChatGPT wrapper** (32, 56): a structured path, the user's own data over time, behavioral mechanics.
   If an LLM is used it must run live on the user's input; "our code does the calculation and an LLM explains it"
   counts as real (96).
7. **English interface, American spelling** (75). Mobile-adaptive is a plus and the jury may open the link on a phone
   (60, 70, 103).
8. **The repository is public, holds the full source of what is deployed, and has no secrets** (46). Keys live in
   server environment variables (48). List the key dependencies in the README (48). The commit history may be read
   (64): commit often with honest messages.
9. **Sensitive topic** (138, 150): no medical advice, no promise of a cure, no extra sensitive data. Do not collect
   more personal data than the product needs (26).
10. **Data shown as the visitor's own must be the visitor's own.** The FAQ allows labelled sample data that runs
    through the real logic (35, 66, 69, 94, 127). The owner's rule for this product is stricter: **no demo, sample or
    synthetic data in the app.** Screens read real stored sessions and show an honest empty state when there are
    none. The numbers in the Figma file ("Aru, 4", "Day 5 of 28", a streak of 4, the dates in November) are
    placeholders that show the layout. Never copy them into code.

## 3. The product in one paragraph

A parent practices the five-minute play skill that clinics teach, with Mia or Leo, a simulated four-year-old. Rules
in `lib/` code every sentence the parent types or says. Three rings fill toward the clinic numbers: 10 specific
praises, 10 reflections and 10 descriptions in five minutes, with 3 or fewer questions and commands. The first visit
is free and ends with the parent's own before and after. The paid plan is five coached minutes a day for 28 days.
The one line the product is sold with: **"Practice tonight. Use it tomorrow."**

## 4. The design: Split

The design is finished in Figma and is the source of truth. Build what is drawn; do not redesign.

- A flat violet block holds the picture (a child portrait or one 3D object). White holds the words. One black pill is
  the action. Inter.
- One action per screen. No filler text: if a caption does not help the parent act, it is not there.
- No gradients, no shadows, no glows, no translucency, no dark theme, no second hue, no red, no emoji.
- Sentences "to swap" are calm gray. The interface never says wrong, bad, mistake, should or don't.
- Every destination has a visible, named place: the tab bar on phones, the rail on desktop.

### Figma

File key `pAxPxb3CU2ZQv0NK90auWe`. Pages: mobile flows `13:2`, desktop `13:3`, components `13:4`, assets `13:5`.

**Every frame is also in the repository as its own image**: `docs/figma/frames/mobile/` (390 wide) and
`docs/figma/frames/desktop/` (1440 wide). The file name starts with the Figma node id, so frame `47:665` is
`docs/figma/frames/mobile/47-665_8-1-today.png`, and `docs/figma/frames/index.json` lists all 98 with their story,
name and size. Open the image to see exactly what to build. You do not need Figma access for that.

For exact measurements (padding, radius, type style, which component is used) read the frame with the Figma MCP
server: `get_design_context` on the node id, after loading the `figma:figma-design-to-code` skill. If Figma is not
connected in your session, build from the frame image and the kit; the kit already carries the measurements of
every component. **Read only: nobody changes the Figma file during the build.**

`docs/figma/round-5-spec.md` has the written spec. The older contact sheets in `docs/figma/*.png` predate the last
copy fixes (American spelling, 4 weeks as the default plan, the footer lines, the slogan on the landing): for
wording, trust the frame images, Figma and section 6 below.

| # | Story | Mobile row and frames | Desktop frames | Owner |
|---|---|---|---|---|
| 1 | Start (landing) | row `20:3`: first screen `20:7`, full page `66:1267` | `63:224` | A |
| 2 | Personalization | row `49:994`: `49:998`, `49:1045`, `49:1099`, `49:1163`, `49:1218`, fact `49:1273`, partner `49:1316` | `54:908`, `54:955`, `54:1010`, pick a child `32:74` | A |
| 3 | First answer | row `20:70`: `20:74`, `20:109`, `20:156`, `20:178` | `32:91` | A |
| 4 | Round one | row `21:91`: `21:95`, `21:139`, `21:205`, `21:280`, `21:403`, recording on `58:1165`, `21:468`, `21:543`, guess `49:1371`, `21:598` | `32:109`, result `32:164` | B |
| 5 | Lesson | row `24:212` | `32:212` | A |
| 6 | Round two | row `24:397`: `24:401`, `24:477` | mobile layout in a centered column | B |
| 7 | Your plan | row `24:519`: scene `49:1412`, when you play `24:523`, calendar sheet `62:1460`, recordings consent `49:1516`, plan from answers `49:1573`, your 28 days `49:1651`, day 1 done `24:568` | `32:240`, `32:272` | A |
| 8 | Today | row `47:661`: `47:665`, `47:749`, `47:842`, welcome back `62:1176` (skip `50:1165`, it is the demo-data variant) | `54:137` | B |
| 9 | Streak | row `57:1141`: `57:1145`, `57:1348` | mobile layout in a centered column | B |
| 10 | Practice | row `47:917`: `47:921`, `47:1021` | `54:221` | B |
| 11 | Progress | row `47:1121`: `47:1125`, `47:1270`, `47:1375` | `60:223` | B |
| 12 | Session review | row `48:894`: `48:898`, AI consent sheet `48:1092`, typed `48:1117`, share `48:1232` | `54:725` | B |
| 13 | Week and finish | row `62:1268`: `62:1272`, `62:1344` | mobile layout in a centered column | B |
| 14 | Profile | row `48:1282`: `48:1286`, `48:1509`, `48:1580`, `48:1634`, how coding works `62:1494` | `60:651` | B |
| 15 | Daily session | row `25:595`: `25:599`, three examples `62:1413`, `25:628`, `25:704` | mobile layout in a centered column | B |
| 16 | Paywall | row `27:458` | `33:171`, you are in `33:204` | A |
| 17 | Live with your child | row `27:710` | `33:220`, `33:260` | B |
| 18 | Jury guide | row `27:969`: `27:973` | `33:315` | A |

A frame link is `https://www.figma.com/design/pAxPxb3CU2ZQv0NK90auWe/zimran?node-id=` plus the id with a hyphen
(`47-665`).

### Background patterns

Three tone-on-tone patterns on `violet` (the `Pattern` component draws each in the tone Figma uses), chosen by
what the screen is about:

| Pattern | Where |
|---|---|
| `bars` (the giant logo mark) | Brand and result moments: landing first screen and closing, the pace band, the pricing card, paywall, facts, plan result, your 28 days, share card, Profile header |
| `sentences` (diagonal dashes) | Talking moments: rounds, lesson, live mode, session review, the live answer and the sentence strip on the landing |
| `reps` (the logo unit repeated) | Everyday screens: Today, Practice, Progress, quiz questions, streak, plan cards |

## 5. What is already in the code

The foundation was built before you started. Use it; do not rebuild it.

### Tokens (`app/globals.css`)

Colors, as Tailwind classes (`bg-violet`, `text-gray`, `border-line`): `white`, `ink` #0B0B0F, `gray` #76767E,
`faint` #A9A9B2, `line` #E8E8ED, `mist` #F5F5F7, `violet` #5B52FF, `violet-press` #4B42E6, `violet-tint` #6961FF,
`lilac` #EEEDFF, `lilac-2` #DCDAFF.

Text styles, one class each: `text-display` 40/44, `text-title` 32/36, `text-heading` 22/28, `text-body` 17/24,
`text-body-strong`, `text-label` 15/20, `text-small` 13/18, `text-small-strong`, `text-number` 56/56, `text-tab`
11/14, `text-display-xl` 72/76, `text-title-xl` 48/52, `text-lead` 20/28.

No hex color and no font size outside these. Radii and spacing are the px values from Figma.

New screens sit inside an element with the class `split-root`. Old dark screens keep working beside them until they
are rebuilt; the old theme tokens in `globals.css` are marked as legacy and are deleted with the last old screen.

### The kit (`components/kit/`), the shell (`components/shell/`)

Every component is on one page: run the dev server and open `/kit`. Import from `@/components/kit`.

| Group | Components |
|---|---|
| Screen shells (`components/kit/Screen.tsx`) | `SplitScreen` (slots: `picture`, `pattern`, `bar`, the words as children, `action`, `below`, and `dock` for the chips and the answer field of a talking screen; `rest="center"` for portraits, `"bottom"` for full-body poses; the violet block becomes the left half on desktop, where `lg:[--split-column:460px]` on `className` sets the width of the words), `PageScreen` (`title`, `aside`, `bar`, children; with a `picture` or a `pattern`, and `rest`, it is a split from 1024px) |
| App shell (`components/shell/`) | `AppShell`, `TabBar` (phones), `Rail` (from 1024px), `TopBar` (landing: `logo`, `links`, `action`) |
| Icons (`components/kit/Icon.tsx`) | `Icon` (`name`, `size`, `strokeWidth`, `title`), 25 line icons drawn with `currentColor`: back, close, chevron-left, chevron-right, chevron-up, chevron-down, check, plus, minus, arrow-up, arrow-right, mic, mic-off, speaker, speaker-off, play, pause, more, info, lock, calendar, share, trash, external, search. `ICON_NAMES` lists them. A glossy 3D object is `Art`, not an icon |
| Actions | `Button` (`variant`: ink, violet, white, soft, ghost; `size`: lg, md; with `href` it is a link), `IconButton` (`label`; `variant`: plain, on-violet, ink, violet; the icon as children: `<Icon name="back" />`) |
| Choices | `Option`, `ChoiceTile`, `Tile` (single or `multiple`; `art` is a public path such as `/art/sun.png`), `NumberTile` (the age tiles of the quiz, three to a row; `size="sm"` is the 48px tile of the desktop Profile), `Chip`, `ChipGroup` (both take `tone="on-violet"` on a violet card), `Segmented`, `Toggle`, `CheckIn` |
| Text in | `Composer` (the answer field: `value`, `onChange`, `onSubmit`, `placeholder`, `onMic`, `micState`: idle, listening, unavailable), `TextField` (`compact`: the 56px field of a settings card) |
| Labels and rows | `Tag` (`tone`: skill, quiet, swap), `Divider`, `SettingRow` (`compact`: the 52px row of a short list), `RowChevron`, `SettingsSection` (`card`: the bordered desktop card), `PlanRow` (`compact`: the 52px row inside a sheet), `PatternRow`, `QuizProgress` |
| Overlays | `Sheet` (bottom sheet on phones, dialog from 768px; title, `art` as a public path or any node, body, up to two actions) |
| Pictures | `Art` (`name`, `size`), `Picture` (`file`, `size`), `Portrait` (`partner`, `pose`, `size`), `Avatar`, `Logo`, `LogoMark` (`tone`), `Pattern` (`kind`: bars, sentences, reps) |
| Numbers | `Rings`, `Ring`, `NowAndGoal`, `SummaryCard`, `WeekStrip`, `MonthCalendar` (`selected` is the open day; `compact` for the desktop card) |
| Sessions | `LastSessionCard`, `SessionRow`, `TranscriptRow`, `RewriteCard`, `ShareCard`, `Player` (`tone="violet"` on the desktop review) and `AiSummaryCard` (both render nothing without data and are shown only behind their flags) |
| Helpers (`components/kit/cn.ts`) | `cn`, `focusRing`, `focusRingWithin`, `focusRingOnViolet` and `focusRingWithinOnViolet` (the white ring of a control on violet), `colorMotion`, `pickOnEnter` (Enter picks a radio or a checkbox that is not in a form) |

Things that will trip you up:

- Every new screen sits inside `split-root` (the shells add it). A kit component on a page without it gets the old
  violet and a dark body.
- Import pictures from `@/components/kit/Art` and `@/components/kit/art-manifest`. Never `@/components/kit/art`: on
  this disk it is the same file as `Art.tsx`.
- The parent of `<Pattern>` needs `relative` and a clip (`overflow-clip` or a radius); anything drawn over the pattern
  needs `relative`. On desktop blocks pass `size={1440}`.
- Radios of one question (`Option`, `ChoiceTile`, `Tile`, `NumberTile`) share a `name` and sit in an element with
  `role="radiogroup"` and a label. That is what makes the arrow keys work.
- `Composer` is controlled: clear `value` after `onSubmit`, feed interim speech into `value` while listening.
- `TabBar` and `Rail` read the pathname, so outside `AppShell` they need a `<Suspense>` around them
  (`cacheComponents` is on).
- Icons come from the kit: `<Icon name="back" />`, not inline SVG. `size` scales the drawing and keeps the stroke
  Figma draws. Three places use another weight and pass `strokeWidth`: the check at 14px (2.6), the arrow-up at 22px
  in the composer (2.4), the play at 30px in the desktop player (2).
- `Sheet` puts the focus on the sheet itself, not on the black pill, so the key that opened it cannot also confirm
  it. To start in a field, focus it from an effect of the screen when `open` turns true: React's `autoFocus` is not
  reliable inside a sheet. An action that navigates closes the sheet first.
- Pass the image itself as the `picture` of `SplitScreen` (in a fragment when words follow it), not wrapped in an
  element: only then does it scale down on a short screen, so the action stays in view.
- Not in the kit yet: the second tab bar style.

If a component you need is missing or differs from Figma: developer A fixes it in the kit. Developer B builds the
piece next to the screen, marks it `// TODO kit`, tells A, and moves on.

### Assets

| Where | What |
|---|---|
| `public/art/*.png` | About 108 glossy violet 3D objects: the tab icons (`tab-home`, `tab-practice`, `tab-progress`, `tab-profile` and their `-off` versions), toys, medals, tools, objects for facts and empty states |
| `public/mia/`, `public/leo/` | Portraits by mood and full-body poses (`body-waving`, `body-jumping`, `body-pouting`, `body-crying`, `body-showing`, `body-running`, and more) |
| `public/parent/mum.png`, `dad.png`; `public/scene/mum-mia.png`, `dad-leo.png` | Parents, and a parent with a child |
| `public/brand/` | The logo files |
| `public/pattern/` | The three background patterns as SVG |
| `components/kit/art-manifest.ts` | A typed manifest of all of the above with pixel sizes. Use `<Art name="..." />` and the portrait components; do not write image paths by hand |
| `docs/figma/image-hashes.json` | Maps the image hash Figma reports for a fill to the file name in `public/`. When `get_design_context` shows an image fill, look the hash up here |
| `docs/figma/new-assets.png`, `docs/asset-library.png` | Contact sheets of the whole library |

Every picture in Figma is one of these files. If a frame uses an image you cannot find, look its hash up before
drawing or generating anything. After replacing an image file, delete `.next/dev/cache/images` or Next serves the old
one. `scripts/assets/` has the tools that cut and recolored the sheets.

### Real data (`client/`, `hooks/`, `lib/progress/sessions.ts`)

| What | Where | API |
|---|---|---|
| Sessions | `client/sessionStore.ts` | `sessionStore.add(draft): string`, `all()`, `get(id)`, `remove(id)`, `clear()`, `subscribe(fn)`. Key `playreps.sessions.v2`. Old v1 progress is migrated once, with no sentences |
| Profile | `client/profileStore.ts` | `profileStore.get()`, `update(patch)`, `reset()`, `subscribe(fn)`. Key `playreps.profile.v1` |
| Access | `client/entitlement.ts` | `readEntitlement()`, `startCheckout(plan)`, `confirmCheckout(sessionId)`, `demoUnlock()`, `clearEntitlement()`, `termWeeks(plan)`, `renewsOn(entitlement)`, `isLocked(feature, entitlement)` |
| Hooks | `hooks/useSessions.ts`, `hooks/useProfile.ts`, `hooks/useEntitlement.ts` | `useSessions(): { sessions, ready }`, `useProfile(): { profile, ready, update }`, `useEntitlement(): { entitlement, ready }`. `ready` is false on the server and on the first client render: show the skeleton or nothing until it is true |
| Selectors | `lib/progress/sessions.ts` | `streakOf(sessions, today)`, `bestStreakOf(sessions)`, `monthGrid(sessions, year, monthIndex, today)`, `weekNumbers(sessions, today)`, `planDayOf(sessions, today)`, `totalsOf(sessions)`, `beforeAfter(sessions)`, `sessionPatterns(session)` |
| Flags | `lib/features.ts` | `FEATURES.recording`, `FEATURES.aiSummary` (both off unless `NEXT_PUBLIC_FEATURE_RECORDING` / `NEXT_PUBLIC_FEATURE_AI_SUMMARY` is set), `FEATURES.live` |

What a later screen needs to know:

- Weeks start on Monday. `weekNumbers` uses calendar weeks, so early in a week compare per-session averages, not raw
  totals.
- A migrated session has `sentences: []`, `partner: null` and may have `sceneId: ''`. Screens must cope with all three.
- "Erase everything on this device" calls `sessionStore.clear()`, `profileStore.reset()` and `clearEntitlement()`,
  never `localStorage.clear()`.
- What is free: the first visit, one-minute rounds, the lessons, and reading back your own coded sentences. What
  needs access: the daily five-minute session and live mode (`isLocked('daily' | 'live', entitlement)`).

Types are frozen in the bottom section of `lib/types.ts`: `PartnerId`, `SessionKind`, `InputMode`, `SavedSentence`,
`SessionDraft`, `SavedSession`, `Profile`. Changing one needs both developers.

Rules:

- A screen reads sessions and the profile through the hooks and derives everything else with the pure selectors.
  Dates are passed into selectors as strings. Do not call `new Date()` during render.
- With no sessions a screen shows its empty state and one action that starts a session. No placeholder numbers.
- Sample values live in test files and in `app/kit/Gallery.tsx` only.
- Nothing leaves the device. There is no account and no server database.

### The round screen (`components/round/`)

`RoundRunner` (`components/round/RoundRunner.tsx`) takes exactly `RoundStageProps` from `components/round/types.ts`:
`{ mode, sceneId, partner, durationSec, seed?, title?, guess?, recorder?, onDone(done) }`. It owns `useRound`, starts
the round on mount, and calls `onDone` once with a `RoundDone`: the engine's `RoundResult`, the sentences as
`SavedSentence[]`, the input mode, `startedAt`, `durationSec`, the child's goodbye line, and an `audioId` when a
recorder was passed.

- To play a second round, mount it again with a new `key`.
- To save a finished round: `sessionStore.add(sessionDraft(done, { kind, date: todayISO(), sceneId, partner }))`, with
  `sessionDraft` from `@/hooks/useRound` and `todayISO` from `@/client/progressStore`.
- Today it renders the old dark `components/RoundStage.tsx` in one line. Developer B replaces that one line with the
  new stage. The stage receives the full return of `useRound()` (`state`, `view`, `rings`, and the moves `say`,
  `saySpoken`, `copy`, `wait`, `dispute`, `end`) plus `partner` and `guess` from the props. Typed sentences go through
  `say` and microphone sentences through `saySpoken`; that is how the input mode is known.
- The default recorder does nothing (`noopRecorder`). A real one implements `RecorderPort` (`start`, `stop`,
  `cancel`).

### Routes (`lib/routes.ts`)

`ROUTES` holds every path: `home`, `start`, `quiz` (`/start/quiz`), `plan` (`/plan`), `pricing`, `unlocked`, `jury`,
`play` and `daily` (the old round page, until the new daily session at `/session` replaces it: then point
`ROUTES.daily` there), `live`, `today`, `practice`, `progress`, `profile`, `session(id)` (the review of one session,
`/progress/[id]`), `dashboard` (old, until Today replaces it) and `api.checkout`, `api.entitlement`. `APP_TABS` and
`tabAt(pathname)` drive the tab bar and the rail, which show on the four tab roots only.

The four tabs live under `app/(app)/` inside `AppShell`. Inside that group pass `embedded` to `SplitScreen` and
`PageScreen`; everywhere else use them without it, and they bring their own `split-root`.

No route string outside `ROUTES`.

## 6. Lines that must be in the product

| Line | Where |
|---|---|
| "Practice tonight. Use it tomorrow." | Landing first screen, page title |
| "Clinics don't start with discipline. They start with five calm minutes of play a day." | Landing, and the before-and-after result screen |
| "Mia is a simulated child. Real children vary." (Leo when Leo is chosen) | Where the child first appears, and the footer |
| "Skill practice, not therapy." | Landing first screen or footer, paywall |
| "On a waitlist? Stay on it. PlayReps is practice while you wait. In crisis: call or text 988. Childhelp: 1-800-422-4453." | Landing footer, Profile |
| "Not affiliated with or endorsed by PCIT International." | Landing footer, jury guide |
| "Test mode. No real card is charged. Use 4242 4242 4242 4242, any future date, any CVC." | Paywall, beside the pay button |
| "Renews every 4 weeks at $29. Cancel anytime: email <address>" with a real address, or a "Manage or cancel" link | Paywall and Profile |
| "Typing? Go for the mix, not the speed." | Round screen when the parent types |
| "Weeks 1–4 with Mia, weeks 5–8 live with your child" | The 12-week plan |

Prices: **$29 every 4 weeks ($1.04 a day), selected by default**, and $69 every 12 weeks ($0.82 a day). The same
price on renewal.

Never claim: "ends tantrums", "clinically proven", "AI therapist", "mastery" in the clinical sense, a number of
users, a testimonial, a countdown timer. Do not promise anything about the child's behavior.

Recordings and the AI summary are drawn in Figma but are optional features behind `lib/features.ts`. While a flag is
off in production, nothing on any screen mentions that feature: no row, no card, no pricing line, no answer on the
landing. A plan lists only what is built: weeks 9–12 are not, so no screen sells them.

## 7. How two developers stay out of each other's way

- One owner per file. The ownership lists are in the two prompts. To change the other developer's file, ask them.
- `lib/routes.ts` is append-only for both: add a line, never reorder.
- Both work on short branches from `redesign/premium-ui` and merge back at least at every checkpoint. Pull before
  starting a new screen. A merge must pass `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.
- When the last importer of an old dark file is gone, delete the file in the same commit.
- Commit messages say what changed for the parent, in plain words. Do not push to `main` before the freeze check
  passes.

## 8. How to verify a screen

1. `npm run typecheck`, `npm run lint`, `npm test`.
2. Open the route in the browser at 390×844 and at 1440×900. Put it beside the Figma screenshot of the same frame.
   Check: layout, type styles, colors, radii, the pattern, the picture, the one action.
3. Use it with real input: type your own sentences, finish the round, reload the page, check that what you did is
   still there and that every number matches what you typed.
4. Keyboard only: every control reachable, focus visible. Phone: the keyboard does not cover the input or the action.
5. Empty state: clear site data and open the route cold.

This project's Next.js is newer than most training data. Before using a Next API, read the matching guide in
`node_modules/next/dist/docs/` (see `AGENTS.md`).
