# PlayReps — design and build notes

## What the site is
A parent practises a five-minute play skill with **Mia**, a simulated four-year-old. Every sentence the parent
types is coded live by rules in `/lib`; Mia reacts; three rings fill toward the clinic pace.
Audience: US parents aged 25–45. The jury opens the live link with no login and spends about three minutes.

## Look: wooden toy, sticker, paper
- Cream paper background with a fine dot grain (already on `body`). Dark ink outlines, hard offset shadows.
- Colours (Tailwind utilities exist for each): `paper`, `rug`, `ink`, `ink-soft`, `tomato` (brand, primary button),
  `sun` (praise), `sky` (reflect), `leaf` (describe), `sand` and `plum` (calm, for "to swap" and demo labels), `skin`.
  Card fill is `bg-[#fffaf0]` or `bg-[#fffdf8]`.
- **Never use red for a negative state and never write "wrong", "bad", "mistake", "should" or "don't" to the user.**
  Avoid sentences go to a calm "to swap" tray.
- Type: `font-display` (Fraunces, soft serif) for headings and numbers, default sans (Figtree) for text.
  Headings are `font-display font-semibold`, often with one italic or tomato-coloured word.
- Classes in `app/globals.css`: `.sticker`, `.sticker-sm` (outlined cards), `.btn` + `.btn-primary | .btn-sun |
  .btn-plain | .btn-quiet`, `.field` (inputs), `.rug` (stitched play mat), animations `.rise` (+ `.delay-1..4`),
  `.pop`, `.wobble`, `.glow`. Respect reduced motion (already handled for these classes).
- Layout: one centred column, `max-w-[460px]`, mobile first. Use `<Shell>` from `@/components/Bits` as the page frame.

## Shared components
- `@/components/Mia` — `<Mia face posture size />`, faces: beaming, smiling, neutral, pouting, crying.
- `@/components/Rings` — `<Rings rings={ringProgress(state)} />`.
- `@/components/Bits` — `Shell`, `Bars`, `CoachBubble`, `SentenceChip`, `DemoBadge`.
- `@/hooks/useRound` — the round reducer plus a real clock.
- `@/client/progressStore` — `todayISO()`, `loadProgress()`, `saveProgress()`, `loadFirstRounds()`.
- `@/client/entitlement` — `readEntitlement()`, `startCheckout(plan)`, `confirmCheckout(id)`, `demoUnlock()`.
- Engine API: see `lib/index.ts` and the block below.

## Engine in one screen
```ts
import { addCheckin, addSession, calmTrend, dayNumber, masteryShare, planDay, skillTrend, streak,
  simulateFamily, DEMO_LABEL } from '@/lib';
// progress = loadProgress(); today = todayISO() (in an effect)
// planDay(dayNumber(progress, today)) -> { day, week, theme, focus, title, teaser, isMasteryCheck }
// streak(progress, today) -> { days, freeDayUsed, activeToday }
// masteryShare(progress) -> { specific_praise, reflection, description (0..1), avoidOk, overall }
//   reflection is null after a day with only live play: show "Not counted in live play", never 0
// skillTrend(progress) -> per-day per-minute numbers (reflection may be null: the line skips that day); calmTrend(progress) -> weekly averages
// simulateFamily(seed, startDate) -> { days: DemoDay[], progress } — always shown with <DemoBadge />, which prints DEMO_LABEL
```

## Next.js 16 rules that bite (this project has `cacheComponents: true`)
- Read `node_modules/next/dist/docs/01-app/` when unsure; this version differs from older ones.
- Pages here are client components (`'use client'` at the top) with no server data.
- **Never call `Date.now()`, `new Date()` or `Math.random()` during render.** Do it in `useEffect` or in an event
  handler and keep the value in state. Prerendering fails otherwise.
- Do not use `useSearchParams`; read `window.location.search` inside `useEffect`.
- Do not export `dynamic`, `revalidate` or `fetchCache` from any file.
- Anything from `window` or `localStorage` is read inside `useEffect`; render a calm placeholder first.
- Check your work with `npm run typecheck`, `npm run lint` and `npm run build`.
- Each page wraps its content in a component keyed on `useRouter().bfcacheId`. Keep that wrapper: without it a
  link back to a finished page shows its old last screen.

## Honesty rules
- Simulated data is always labelled (`<DemoBadge />`).
- Prices: $29 every 4 weeks or $69 every 12 weeks, renewing at the same price; the renewal date and price are
  printed next to the button. Stripe is in test mode; the test card 4242 4242 4242 4242 is shown on screen.
- No promise that tantrums will stop. Show the parent's own numbers.
