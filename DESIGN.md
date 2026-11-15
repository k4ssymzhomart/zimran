# Fammy — design system

## What the site is
A parent practises a five-minute play skill with **Mia or Leo**, a simulated four-year-old girl or boy. Every
sentence the parent types or speaks is coded live by rules in `/lib`; the child reacts; three rings fill toward the
clinic pace. Audience: US parents aged 25–45, mostly on a phone. The jury opens the live link with no login and
spends about three minutes on a laptop.

## Look: the Zimran house style
The same language as Zimran's own products, **Finelo** and **Coursiv**: a near-black canvas, white Inter set heavy and
tight, **one violet**, glossy 3D objects in that violet, and **one action per screen**, like their quiz funnels.

- **Canvas** `canvas` `#09081B` (Finelo's background). Surfaces: `surface` (cards), `surface-2` (chips, inputs,
  quiet fills), `surface-3`. Hairlines: `stroke`, `stroke-2`.
- **Text**: `fg` (white), `fg-2` (strong secondary), `fg-soft` (supporting lines), `fg-faint` (small print).
- **The one colour: violet `#6C63FF`** (`violet`), lighter `violet-400`, pressed `violet-600`. Violet text on dark
  uses `lilac` (`#B7B3FF`) or `lilac-2`; tints are `bg-violet/10` … `/25`.
- **The three skills are one violet family**, deep to light: Praise `praise` (#6C63FF), Reflect `reflect`
  (#A39EFF), Describe `describe` (#DCDAFF). Rings, tags and the trend chart use these and nothing else.
- **No second hue.** No yellow, no blue, no green, no red. Sentences to swap (questions, commands, corrections)
  are calm grey (`bg-white/8`). Never write "wrong", "bad", "mistake", "should" or "don't" to the user.
- Type: Inter only. Headlines `.title` (800–900, −0.035em, tight leading). Body 15–17px. Numbers `tabular-nums`.
  No all-caps labels, no tracked-out eyebrows, no middle-dot meta strings, no italic accent words.

## One screen, one action
- A screen has **one primary action** (violet button with Finelo's soft gloss, 56px, full width on phones). At
  most one quiet secondary (`btn-ghost` or `btn-secondary`) under it.
- Headline plus **at most one line** under it. No filler. If a sentence does not help the parent act, cut it.
- Funnel screens are centred (`Screen`, default). Content pages (dashboard, jury guide) are left-aligned.
- The art card (`Art`, class `.art`) is a pool of violet light: a 3D object or a child portrait sits in it.

## Building blocks
| Import | What |
| --- | --- |
| `@/components/ui` | `Screen` (one-action page frame), `TopBar` (logo, right slot, optional `progress` 0..1), `Progress`, `Art`, `Heading` (title + one lede), `ActionLink`, `Option` (quiz answer, use inside `role="radiogroup"`), `Stat`, `Pill` |
| `@/components/Brand` | `Logo`, `LogoMark` (the three-bar mark: white bars, one violet bar) |
| `@/components/Bits` | `Shell` (content-page frame), `Bars`, `CoachBubble`, `CodeTag`, `SentenceChip`, `DemoBadge` |
| `@/components/Mia` | `<Mia face posture size fade kid? />`: 3D portraits of the chosen child (Mia or Leo), cross-fading |
| `@/components/child` | `ChildProvider` (in the root layout), `useChild()` → `{ child, ready, choose, t }`. Pass every engine string through `t()` before showing it: the engine writes about Mia, and `t` rewrites name and pronouns for Leo (tested in `child.test.ts`). For copy written in a screen use `child.name`, `child.they`, `child.them`, `child.their`. |
| `@/components/Rings` | `<Rings rings compact? />` and `SKILLS` (label, colour, 3D art per skill) |
| `@/components/SayField` | The input with the send button inside it. `onSay(text)`, optional `suggestion` |
| `@/components/RoundStage` | The full-screen round: the child, rings, coach and input stay visible above the keyboard |
| `@/components/Icons` | Stroke icons: ArrowRight, ArrowUp, ChevronRight, ChevronLeft, Close, Check, Mic, Speaker, SpeakerOff, Lock, Sparkle |
| `@/components/journey` | `journeyProgress(phase)` for the funnel progress line |

CSS classes in `app/globals.css` (inside `@layer components`, so utilities can override them): `.title`, `.lede`,
`.btn` + `.btn-primary | .btn-secondary | .btn-light | .btn-ghost | .btn-chip`, `.btn-block`, `.card`, `.art`,
`.glow`, `.field`, motion `.enter` (+ `.d1`–`.d4`), `.pop`, `.breathe`, `.listening`. Shadows `shadow-card`,
`shadow-float`, `shadow-violet`. Reduced motion is handled.

## Assets (generated for Fammy; transparent PNG unless noted)
- `/mia/` and `/leo/`: `beaming`, `smiling`, `neutral`, `pouting`, `crying`, `away` (turned away), `leaning`
  (leaning in, delighted). Same 3D style, both in violet.
- `/art/`: `duo` (Mia and Leo building blocks, the landing hero), `rings` (three violet rings), skills `praise`
  (star), `reflect` (speech bubbles), `describe` (eye); `swap`, `streak` (flame), `follow` (footprints), `coach`
  (orb); `timer`, `plan`, `medal`, `progress`, `heart`, `lightbulb`, `microphone`, `earbud`, `lock`, `shield`,
  `hourglass`, `typing`, `replay`, `party`, `gift`, `trophy`, `badge`; daily moments `breakfast`, `daycare`,
  `dinner`, `bath`; play objects `blocks`, `crayons`, `drawing`. All in one violet family.
- `/bg/` (JPEG): `night`, `night-rings`, `light`, `together` (photo of a parent and a girl playing).
- `/brand/app-icon.png`, `app/icon.svg`, `app/apple-icon.png`, `app/opengraph-image.png`.
- `docs/asset-library.png` shows all of them on one page.

## Engine API (do not change `lib/`, `hooks/`, `client/`, `app/api/` for design work)
```ts
import { addCheckin, addSession, calmTrend, dayNumber, masteryShare, planDay, skillTrend, streak,
  simulateFamily, DEMO_LABEL } from '@/lib';
// planDay(dayNumber(progress, today)) -> { day, week, theme, focus, title, teaser, isMasteryCheck }
// streak(progress, today) -> { days, freeDayUsed, activeToday }
// masteryShare(progress) -> { specific_praise, reflection, description (0..1), avoidOk, overall }
//   reflection is null after a day with only live play: show "Not counted in live play", never 0
// skillTrend(progress) -> per-day counts on the five-minute scale, clinic norm 10
// simulateFamily(seed, startDate) -> { days: DemoDay[], progress } — always shown with <DemoBadge />
```

## Next.js 16 rules that bite (this project has `cacheComponents: true`)
- Read `node_modules/next/dist/docs/01-app/` when unsure; this version differs from older ones.
- Pages are client components (`'use client'` at the top) with no server data.
- **Never call `Date.now()`, `new Date()` or `Math.random()` during render.** Do it in `useEffect` or in an event
  handler and keep the value in state.
- Do not use `useSearchParams`; read `window.location.search` inside `useEffect`.
- Do not export `dynamic`, `revalidate` or `fetchCache` from any file.
- Anything from `window` or `localStorage` is read inside `useEffect`; render a calm placeholder first.
- Each page wraps its content in a component keyed on `useRouter().bfcacheId`. Keep that wrapper.
- After replacing an image in `/public`, clear `.next/dev/cache/images` or the dev server serves the old one.
- Check your work with `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.

## Honesty rules
- Simulated data is always labelled (`<DemoBadge />`); the child always carries "Simulated child".
- Prices: $29 every 4 weeks or $69 every 12 weeks, renewing at the same price; the renewal date and price are
  printed next to the button. Stripe is in test mode; the test card 4242 4242 4242 4242 is shown on screen.
- No promise that tantrums will stop. Show the parent's own numbers.
- The footer line "Not therapy and not a diagnosis" is on every page (in `app/layout.tsx`).
