<!-- Working notes for the round-5 mockups: the merged spec from the research pass, then the reviewer's open points. The Figma file is the source of truth for the design; where the two differ, Figma wins. -->

# Split v2: merged spec

Markers: **[code]** needs new logic or storage beyond new screens. **[LM]** needs a language model. Unmarked items run on what the engine and storage already hold.

## 1 Navigation

**Mobile tab bar.** Flat white, one hairline on top, four tabs, labels always on. Active: 28 pt glossy violet 3D icon, black label. Inactive: grey line glyph, grey label. No centre button.

1. "Today": rounded house.
2. "Practice": speech bubble with a play cut-out.
3. "Progress": three nested rings.
4. "Profile": the partner's portrait in a disc, violet ring when active.

- House, not sun: the sun already means "After breakfast".
- Rings, not rising bars: rings are what the tab shows.
- The existing tab PNGs are redrawn: the house has cut-out holes and the bubble is too pale on white.
- Shown: the four tab roots. Hidden: landing, onboarding, rounds, lesson, live session, session review, pricing, jury guide.
- Review hides the bar: it is a pushed screen with back arrow "Progress" and its own pill.

**Desktop landing.** Top bar: logo, "How it works", "Method", "Pricing", "Open app", black pill "Try one answer". No "Log in": no account exists.

**Desktop app.** White 88 px left rail: logo, then "Today", "Practice", "Progress" with labels, the Profile portrait at the bottom. Hidden during a round.

## 2 Personalisation onboarding

QuizShell: segmented progress bar, one question per screen. Personalisation opens the flow, as the owner asked; partner, first answer and first round sit at screens 7 to 9.

1. "What is your child called?" Text field; "Next", "Skip".
2. "How old is {Name}?" Chips "2" to "7".
3. "Which moments are hardest?" Choose all: "Mornings", "Mealtimes", "Leaving the house", "Screens off", "Bedtime", "Sharing".
4. "How often do they happen?" "Rarely", "Some days", "Most days", "Every day". Saved as today's check-in.
5. "What do you say most in play?" "Questions", "Instructions", "Praise", "Not sure".
6. Interstitial: "Clinics count ten, ten, ten in five minutes." One source tag.
7. "Pick your practice partner." Portrait cards "Mia", "Leo", tag "Simulated child".
8. "Answer her." Type or speak; coded at once; then say her words back. Existing.
9. "One minute with Mia." Round 1. Result: "Your starting numbers."
10. Interstitial, guess against count: "You guessed praise. You asked six questions."
11. The 30-second lesson chosen by round 1, round 2 ("Now play again."), before and after. Existing.
12. "What does {Name} play with most?" Picture cards "Blocks", "Drawing". Sets the daily scene.
13. "How long can you play daily?" "2 minutes", "3 minutes", "5 minutes". Sets session length.
14. "When will you play?" "After breakfast", "After daycare", "Before dinner", "Before bath"; then "Add to calendar" **[code]**.
15. "Keep recordings of your sessions?" **[code]** Rows: "Stored: on this phone only", "Who can hear it: anyone holding this phone", "Speech to text: your browser's speech service". Buttons "Keep on this phone", "No recordings".
16. Plan building: "Your plan, from your answers." Editable rows "Partner", "Scene", "Length", "Moment", "First focus" (the round-1 lever). Pill "Looks right". No loader: it would fake work.
17. Result: "{Name}'s 28 days start today."
   - SummaryCard: one gauge (share of the clinic pace) and "Strongest skill", "First swap", "Daily moment".
   - NowGoal: "Now" (round-2 counts at five-minute pace) beside "Day 28 goal: 10, 10, 10, at most 3", dated.
   - "A target for you, not a promise about {Name}."
   - Pill "See my plan" opens the paywall, tagged "Test mode" and headed by their answers: "Five minutes before bath, with blocks."

## 3 Home (Today)

- Violet block: pattern, the partner's full-body pose for the scene, tag "Simulated child".
- White: "Day 9 of 28 · 6 sessions", the plan week's title as headline, pill "Start five minutes" (the chosen length).
- States: done ("Done for today.", pill "Review today"); unpaid (pill "Unlock the plan"); sample numbers tagged "Demo data".
- Below: WeekStrip of seven pegs (a tap opens that day's review); last-session card "Six praises, nine questions."; when due, "How were the hard moments this week?" with four chips.

## 4 Practice

- Segmented "Mia | Leo", tag "Simulated child".
- Card "One minute with Mia": chips "Blocks", "Drawing"; the page's only pill, "Start a round".
- Card "30-second lessons": one chevron row per lever.
- Card "Live with your child", tag "Beta", chevron.
- Each card: violet tile, one object, title, duration chip.

## 5 Progress

Segmented "Trends | Sessions". Two named halves, not one long scroll: recordings get a visible home.

**Trends**
1. Template headline: "Praise is up four this week."
2. Four rings, latest day against the clinic pace; streak.
3. Weekly bars, one skill at a time, black hairline at 10.
4. "First visit": before and after.
5. "Hard moments, your log": weekly check-ins as pegs. No forecast.

**Sessions**
- Chips "All", "Recorded", "Live"; rows grouped by week.
- SessionRow: date, "Practice" or "Live", length, four counts, pace tick, waveform glyph when audio exists **[code]**.
- Empty: "No sessions yet.", pill "Start today's session".
- A tap opens the review.

## 6 Session review **[code]**

Sentences and beats must be saved per session with an id; today only counts are saved. Older sessions show items 1 to 3 only.

1. Header: "Tue 10 Nov · 5:00 · with Mia · Day 6", tag "Simulated child" or "Live · Beta".
2. Verdict: "Six praises, nine questions."
3. Four rings with the change since the last session.
4. Player: play, scrubber, black ticks at each "To swap" sentence. Without audio: "Typed session" or "No audio kept".
5. Transcript: one sentence per row; skills carry a violet chip, "To swap" a black underline; the playing row highlights.
6. A tap seeks and opens the row: rule name, confidence, "Change label"; on "To swap" rows a RewriteCard, "You said" / "Try". A tap, not a long-press: nothing hidden.
7. Pill "Practise this". Overflow: "Share summary" (one image, no audio or transcript), "Delete recording".

Labels:
- Rules: codes, counts, verdict, rings, ticks. "Coded by rules on this device".
- Rules: "Try" from the lever line. "Coach tip".
- **[LM]**: a three-sentence summary and "Try" in the parent's own words. "Written by AI from your text".

The AI parts appear only after "Write AI summary" is tapped. Its sheet: "Your sentence text is sent to a language model. Your recordings are never sent." The model never changes a code.

## 7 Profile

Header: violet block, partner portrait, "{Name}, {age}", "Practising with Mia · Simulated child", SummaryCard.

1. **Your child:** "Name", "Age", "Hardest moments", "Practice partner".
2. **Your plan:** "Day 9 of 28", "Daily moment", "Scene", "Length", "Add to calendar" **[code]**, "Restart plan".
3. **Recordings [code]:** toggle "Keep audio"; toggle "Record live sessions" (off); "Stored on this phone only"; "Anyone holding this phone can play them"; "14 recordings · 38 MB"; "Delete all recordings".
4. **Analysis:** toggle "AI summaries" (off) **[LM]**; "How coding works".
5. **Membership:** "12 weeks · $69 · Test mode" or "Demo unlock"; "Started" **[code]**; "See plans".
6. **This device:** "Speak or type"; "Jury guide"; "Erase everything on this device".

No sign-out, renewal date or cancel row: none exists.

## 8 Landing

Violet alternates sides. Every pill reads "Try one answer". At most 25 words of body per section.

1. "Five minutes of play, practised." `mia/body-blocks.png` on the pattern.
2. "Say one thing to Mia." Live input, code chip, portrait changes expression; tag "Simulated child".
3. "Questions crowd out play." `leo/pouting.png`; one cited line.
4. "Three things to say more. One to swap." Three ring arcs building on scroll.
5. "One round. One lesson. One more round." `stairs.png`.
6. "Hear yourself, sentence by sentence." `phone.png` holding the review screen.
7. "Built around your child's day." `name-tag.png` and the answer chips.
8. "28 days, five minutes each." `day-grid.png`.
9. "Then try it with your own child." `parent-and-child.png`, tag "Beta".
10. "The pace clinics teach." `scales.png`; "10, 10, 10 and at most 3"; citation.
11. "One plan. Two lengths." `card.png`; "$69 per 12 weeks", "$29 per 4 weeks", tag "Test mode".
12. "Five straight answers." Accordion: recordings, AI, ages, time, therapy. "Therapy" replaces "refund": no refund flow exists.

## 9 Background pattern and interactive pictures

**Pattern: sentence bars.** The logo unit, three stacked pills at 100%, 72% and 44% width, repeated like lines of counted speech. Built from the logo, so it is ours the way the zigzag is Zimran's.

- Flat #665EFF on #5B52FF, no fades.
- Bar height h is 1/40 of the block's short side; gap 0.75h; pitch 12h by 8h; alternate rows shift 6h and mirror.
- Hard knockout around the picture's box plus 12%.
- One SVG tile. Static on mobile; a 40-second sideways drift on desktop (not 20: plainer).

**Behaviours**, all off under `prefers-reduced-motion`:
1. Tilt: `pointermove` sets two CSS variables; the PNG rotates up to 6° and the pattern shifts 4 px the other way.
2. Squash: on press, `scale(0.94, 1.04)`, back in 240 ms.
3. Expression swap: stacked `neutral`, `smiling`, `beaming` PNGs switch opacity on a tap or a coded skill.
4. Ring build: three arc PNGs rotate and scale in when the block enters the viewport. Not a scroll-tied mask: simpler.

## 10 New components

TabBar, SideRail, TopBar, PatternBlock, TiltImage, QuizShell, ChoiceCard, ChoiceChip, FactScreen, PlanRow, SummaryCard, NowGoal, WeekStrip, CheckInCard, SegmentedControl, SessionRow, Player, TranscriptRow, RewriteCard, SettingsRow, ConsentSheet, ShareCard, Accordion, EmptyState, Tag.

## 11 New assets

Reused unchanged: `card.png`, `play.png`, the four daily-moment icons, the existing portraits and poses.

- `pattern-bars.svg`: the sentence-bar tile.
- `tab-home.png`, `tab-practice.png`, `tab-progress.png`: redrawn with violet bodies for white; progress becomes nested rings.
- `tab-home-line.svg`, `tab-practice-line.svg`, `tab-progress-line.svg`: grey inactive glyphs, replacing the grey 3D `-off` files.
- `ring-outer.png`, `ring-middle.png`, `ring-inner.png`: separate arcs at 246°, no halo.
- `waveform.png`: ribbon of bars.
- `pause.png`, `record.png`: discs matching `play.png`.
- `mic-off.png`: typed session.
- `name-tag.png`: blank tag on a cord.
- `day-grid.png`: 28 pegs, some filled.
- `stairs.png`: three steps.
- `scales.png`: two pans.
- `phone.png`: chunky phone, blank screen.
- `mia/` and `leo/`: `body-showing.png`, `body-offering.png`, `body-peek.png`.
- `leo/body-blocks.png`, `leo/body-drawing.png`: Leo lacks the two scene poses Mia has.
- `parent-and-child.png`: parent in white and lavender, child in violet.

## 12 Risks and honesty notes

1. Review, recordings and "Started" need new storage (session id, sentences, beats, audio in IndexedDB, purchase date); browsers can evict it.
2. Recorder plus recogniser on Android Chrome is untested; test before building the player.
3. The browser's recogniser may send speech to its vendor, so no screen says audio never leaves the phone.
4. Live mode records a child and the room: off by default, with a visible "Recording" mark.
5. Recording reverses every "does not record or store audio" line (README, `/jury`, `/live`, `RoundStage`, ARCHITECTURE). A model call reverses "There is no LLM call anywhere in this build." Rewrite them first. Rule output is never labelled AI.
6. Name, age and hardest moments change wording only; the simulated child stays four. Scene, length, moment and the check-in are real. Rewrite "The plan is the same for every family."
7. "Day N" counts calendar days, so Today also shows sessions played. The daily session is not gated in code yet.
8. Verify the clinic-pace citation before it appears. No user counts, testimonials, countdowns or struck prices. Nothing promises fewer tantrums.

## 13 Decisions for the owner

1. Do we record audio, reversing "does not record or store audio"?
2. Do we add an optional AI summary, off by default, reversing "no LLM call anywhere in this build"?
3. May live mode record a child and the room, off by default?
4. Does onboarding open with the child's name, putting the first coded answer on screen 8?

# Reviewer's open points

1. **[high]** The call to action does not match what follows, and the product's hook is pushed back. Every landing pill reads "Try one answer", but onboarding now opens with six quiz screens and a partner pick, so the first coded answer is on screen 8. Landing section 2 also has a live input, so the visitor answers Mia on the landing and is asked the same thing again at screen 8. The approved flow had the answer on the second screen.
   - Fix: Make the landing input (section 2) step 0 of onboarding. The pill scrolls to or opens it, the coded reply appears in place, and the next pill reads "Build my plan" and enters the quiz. Carry the landing answer into the flow and drop screen 8 when one exists. Personalisation still opens the plan flow, and the pill's promise is kept.

2. **[high]** Personalisation is mostly cosmetic, yet the copy claims otherwise. By the spec's own risk note 6, name, age and hardest moments change wording only, and the "what do you say most" guess is used once. The plan is the fixed Follow, Describe, Reflect, Praise order in /Users/k4ssym/Downloads/zimran/lib/progress/plan.ts. "Your plan, from your answers." and "Built around your child's day." promise more than that.
   - Fix: Give each kept answer a visible job using what the engine already has. (1) Map each hard moment to a Habit (sharing, patient, gentle, tidy): CodedSentence.namedBehavior already detects these, so show a plan row "Praise to practise: sharing" and count it in the review. (2) Make the weekly check-in ask about exactly the chosen moments. (3) Start the plan on the week matching the round-1 lever (small [code]). (4) Age: one honest line, "Mia is four. The skills are the same from 2 to 7." Drop any question that drives nothing, and retitle landing 7 to what is true: "You pick the moment, the toy and the length."

3. **[high]** Audio recording is promised to everyone but can only work for some. Typing is the default input, and /Users/k4ssym/Downloads/zimran/README.md says voice needs Chrome or Edge, so many iPhone parents have no voice at all. On Android Chrome there are reports that speech recognition and a recorder cannot share the microphone (the file comes out silent); the spec only says "untested" and gives no fallback. Landing 6 still says "Hear yourself, sentence by sentence." Consent is asked at screen 15, after both first rounds, so the first rounds can never be recorded.
   - Fix: Run a one-second capability probe (recogniser plus recorder together) before any recording surface is shown; hide screen 15, the "Recorded" chip, the Player and the Profile recordings section when it fails. Design the fallback now: transcript-only review. Lead landing 6 with what always works ("See every sentence you said, coded.") and make audio the second line. Ask for recording consent at the first microphone tap, not as quiz screen 15. Sources on the conflict: https://lilting.ch/en/articles/webrtc-webspeech-realtime-translation and https://groups.google.com/a/chromium.org/g/blink-dev/c/4ibjEVQ-i0s

4. **[high]** The session-length choice (2, 3 or 5 minutes) breaks the clinic scale and is unmarked as code. history.ts onNormScale never scales a short session up, so a 2-minute parent at perfect pace tops out at 4 of 10, the gauge caps at 40% and "Day 28 goal: 10, 10, 10" is unreachable. The daily session is hard-coded to 300 seconds in /Users/k4ssym/Downloads/zimran/app/play/page.tsx (line 304). NowGoal's "round-2 counts at five-minute pace" multiplies a 40-second round by 7.5, which the engine refuses to do on purpose.
   - Fix: Either keep five minutes as the only length (the question becomes when, not how long), or mark it [code] and express every goal per minute: "2 a minute each, at most 3 swaps in five". Show NowGoal in per-minute rates, the unit the existing before-and-after already uses, and keep the day-28 check at a full five minutes.

5. **[high]** The pattern will be close to invisible, and the violet half still holds one asset. #665EFF on #5B52FF is about 7% white, a contrast of 1.13 to 1. The rectangular knockout "box plus 12%" will read as a window cut in the wallpaper, more so while the pattern drifts. Nothing says what sits on the violet half for the 17 onboarding screens or for the desktop Progress, Review, Practice and Profile pages, so "half the page with one asset" repeats on every new screen.
   - Fix: Show three strengths side by side in Figma before choosing: #6B63FF (10%), #726AFF (14%), #7971FF (18%). Drop the knockout and let the opaque picture cover the bars. Add a desktop-only depth rule: the main picture plus two small supporting objects from the same scene at fixed anchors, moving at three depths on pointer move. Write a desktop template for content pages: rail, a 360 px violet panel (pattern, portrait, one number), white content in two columns. On Review, put the play disc and waveform in the violet panel so the violet has a job.

6. **[high]** The asset list is out of step with the disk and still thin on new screens. /Users/k4ssym/Downloads/zimran/public/art already holds about 110 objects; the spec uses about a dozen. It lists as "new" files that exist: pause, record, mic-off, phone, stairs, scales, nametag (as name-tag), pegboard (as day-grid), body-showing for both children, and scene/mum-mia.png and scene/dad-leo.png (as parent-and-child). The personalisation screens, Profile rows and Practice cards have no pictures assigned.
   - Fix: Add a screen-to-file table. Use the library first: name: nametag; age: cake; hard moments as picture chips: alarm, dinner, door, tablet, moon, teddies; length: stopwatch; recordings: cassette; plan: clipboard; result: target; settings rows: gear, key, trash, toggle; milestones: the four medals. Keep the truly new list short: pattern tile, Leo body-blocks and body-drawing, the offering and peek poses, three ring arcs, waveform. Rename in the spec to the real file names.

7. **[high]** AI analysis is buried and under-specified. It is off by default behind a Profile toggle and behind "Write AI summary" in an overflow menu, so the owner will not see it and the product stays implicit. No provider, server route, key, missing-key state or abuse limit is named for a public no-login site. Live transcripts can contain the child's words (one microphone cannot tell voices apart). The sheet line "Your recordings are never sent" contradicts risk note 3, since the browser's recogniser may send the live audio to its vendor.
   - Fix: Put a rule-built "Analysis" block on every review, no model needed: most repeated question opener, longest run without a question, first half against second half, behaviours named in praise. Show "Write AI summary" as a visible card on the review. Specify /api/summary with an env key, a 503 state "AI summary is not set up here" (as Stripe has) and a per-device daily cap. Exclude Live sessions and the child's name from the prompt. Run every AI "Try" through classify and show it only if it codes as a skill. Reword the sheet: "PlayReps sends the text only. The saved audio file stays on this device."

8. **[high]** The jury path gets longer and the jury's door is buried. The jury has about three minutes on a laptop. The new flow is 17 screens with two rounds before Today; "Jury guide" moves from the landing's top bar to Profile, This device. The demo family in /Users/k4ssym/Downloads/zimran/lib/demo/simulate.ts stores counts only, so Sessions, the review transcript, the Player and the AI card would all be empty for a juror who taps "Open app".
   - Fix: Keep "Jury guide" in the landing top bar and footer and at the foot of the desktop rail. Define "Open app" for a new visitor: Today with the demo family, tagged "Demo data". Extend the demo to keep its sentences (it already generates them through the real engine) so demo reviews show a transcript marked "Typed session". Never ship sample audio. Add one jury step: "Speak one round to see the player."

9. **[medium]** The rule-based "Try" is the same line on every row. RewriteCard takes "Try" from the lever line, and LEVER_TEXT in /Users/k4ssym/Downloads/zimran/lib/progress/targets.ts holds one generic sentence per lever. Nine questions in a session show nine identical tips; the only real rewrite is the AI one, which is off by default.
   - Fix: Author one ready description per scene action in the scenes data ("You are stacking the red block."), keyed to the beat that was on screen when the sentence was said. Show that as "Try" in practice sessions. In Live sessions, where there is no beat, show the lever line once above the transcript, not on each row.

10. **[medium]** The mobile landing and the returning visitor have no navigation, and there is no route map. The top bar is specified for desktop only and the tab bar is hidden on the landing. A parent who reopens the site on a phone lands on a 12-section page with no way into Today. Old routes (/dashboard, /start, /play?daily=1) and the jury guide's route list are not mapped to the four tabs.
   - Fix: Mobile landing: sticky white bar with logo, a text link "Open app" and the pill. If saved progress exists, the hero pill becomes "Continue day 9". Add a route table: /today (redirect from /dashboard), /practice, /progress, /progress/[session], /profile, /start for onboarding, all under one shared layout that owns the tab bar and rail. Update the jury guide's list.

11. **[medium]** The tab bar is the plainest possible bar and mixes two icon languages. Active is a glossy 3D raster, inactive a grey line glyph, so each icon changes shape and weight on tap. The Profile tab is a colour portrait in both states, so it always looks active. The spec orders a redraw because the current icons are pale on white. Nothing covers the iOS Safari bottom toolbar or the safe area.
   - Fix: Use the Split rule in miniature: the active tab is a 44 pt flat violet rounded tile holding the existing 3D icon (those were drawn for violet, so no redraw), with a black label; inactive is a grey glyph with the same silhouette, Profile included. Height 56 px plus env(safe-area-inset-bottom) inside a 100dvh shell; test in iOS Safari. Show this bar and the flat-white one side by side in Figma for the owner to pick.

12. **[medium]** The Profile page shows the wrong person. Its header is Mia's portrait captioned with the real child's name and age ("{Name}, {age}"), and the Profile tab icon is also the simulated child. That blurs the real child with the simulated one, which the "Simulated child" label exists to prevent. The parent, who is the user, appears nowhere, though /Users/k4ssym/Downloads/zimran/public/parent/mum.png and dad.png exist.
   - Fix: Header: the nametag object on violet with the child's name set on it, or the parent portrait chosen by one tap in onboarding. Put the partner in its own row, "Practice partner: Mia", with a small portrait and the tag once. Make every row in "Your child" and "Your plan" editable through one edit sheet.

13. **[medium]** Filler text is creeping back. Middle-dot meta strings appear in six places ("Tue 10 Nov · 5:00 · with Mia · Day 6", "Day 9 of 28 · 6 sessions", "12 weeks · $69 · Test mode", and more). The "Simulated child" tag sits on at least six surfaces; the approved mockups state it once. The review stacks three provenance labels plus rule name, confidence and "Typed session". The landing allows 25 words of body in each of 12 sections.
   - Fix: Set a budget: at most one tag and one grey line per screen. Split meta strings into the headline plus one chip. "Simulated child" appears at the partner pick, on the Practice tab and in the Profile partner row only. On the review keep one foot line, "Coded by rules on this device", label only the AI card, and move rule name and confidence into "How coding works". Landing body text only where a number or citation needs it (sections 3, 10, 11, 12).

14. **[medium]** The landing is longer but reads generic and repeats itself. Twelve identical pills break "one action". Most headlines share one clipped cadence ("One round. One lesson. One more round.", "One plan. Two lengths.", "Five straight answers."), which reads as machine copy. The approved hero (both children, "Practise the play skill clinics teach.") is swapped for the vaguer "Five minutes of play, practised.", though the owner asked for more explicit. Only section 6 shows real product UI.
   - Fix: Keep the approved hero picture and headline. Pill in the hero, the sticky bar and the last section only; section 2's input is its own action. Rewrite headlines as plain statements of what happens ("Mia says something. You answer. Every sentence is counted.") and vary their shape. Add two sections that show real screens, Today and Progress, inside phone.png and tablet.png.

15. **[medium]** Membership and paywall are less explicit than the rest. The paywall prints a renewal date, but Profile shows no renewal and no way to end the plan. "See my plan" opens a price screen. "$69 per 12 weeks" sells twelve weeks of a 28-day plan with no word on weeks 5 to 12. Nothing says which tabs and rows are free and which are paid.
   - Fix: Profile, Membership: "Renews 7 February 2027 at $69" (start date plus term) and a row "End test membership" that clears the local flag. The result pill reads "Open my plan" and lands on Today; the paywall opens from "Unlock the plan". Add one FAQ row on what follows day 28 (the plan's own Phase 2). State the boundary: one-minute rounds, lessons and their reviews are free; the daily session, Live and AI summary are paid, each with a lock glyph.

16. **[medium]** The markers understate the build. Listed as unmarked ("runs on what storage already holds") but needing new logic: a profile store (name, age, moments, guess, scene, length, consent); new quiz phases in lib/flow/journey.ts; the check-in changing from a daily tantrum count (TantrumBucket) to a weekly frequency; "Change label" (today only "Disagree?" exists and it removes a sentence); the share image; "Restart plan" and "Erase everything"; the anchor "Before dinner" (code and approved mockup say "After dinner"); and per-sentence audio offsets (atSec is the end of the utterance, so a tap would seek past the sentence).
   - Fix: Mark each of these [code]. Keep "Disagree?" as the only correction. Keep the daily tantrum check-in and add the hard-moments question as a separate weekly entry. Keep "After dinner". Store each sentence's speech-start time and seek to one second before it.

17. **[medium]** Live sessions are shown with four rings and four counts everywhere (SessionRow, the review, Trends), but reflections are not measured in live play. The engine returns null there and the existing rule is to show "Not counted in live play", never zero.
   - Fix: Live rows and reviews show three counts (Praise, Describe, To swap) and a dash for Reflect. The Trends ring for Reflect uses the latest practice day and says so in its label.

18. **[medium]** The component list has names but no states, and misses pieces the screens already call for: Toggle, TextField, bottom Sheet, confirm dialog, a "Recording" mark, a locked row, a toast. Four destructive actions ("Erase everything", "Delete all recordings", "Delete recording", "Restart plan") have no confirm step and no style, and red is not allowed. The SummaryCard gauge is a second chart form for the quantity the rings already show.
   - Fix: Add the seven components. Give every component default, pressed, focus (2 px black ring), disabled and empty states on the Figma Components page. Destructive confirm: a sheet with a black pill that names the thing ("Delete 14 recordings") and a text button "Keep". Recording mark: a white dot and the word "Recording" in the round's top bar. Replace the gauge with the existing rings.

19. **[medium]** Motion and pattern are specified without regard to text or task. The child's quote and the action line sit in white on the violet block, now over the bars. A 40-second drift runs beside a timed typing task. Tilt rotates a flat PNG in 3D, which looks like a tilting card. On a phone pointermove does not fire, so the only interaction there is the squash.
   - Fix: No pattern under text on violet, and no drift on round, lesson or quiz screens. Replace rotation with a flat shift of up to 8 px for the picture and 4 px the other way for the pattern. Give a tap a result: Mia or Leo says one of the scene's own lines, the day pegs fill, the rings count up.

20. **[medium]** There is no order of work and no approval step. The spec puts the recorder, IndexedDB, a model route, a 17-screen quiz, four tabs, the review, 25 components, about 20 assets and a 12-section landing in one release. The owner's standing rule is Figma first, then code; the four owner decisions are all policy and none is visual.
   - Fix: Phase A (no new storage risk): tab bar, rail, top bar, Profile, the quiz, pattern, landing, asset map. Phase B: the session store and transcript review, which works for typed sessions. Phase C: audio, then AI. Each phase starts with Figma frames. Add visual decisions for the owner: pattern strength, the two tab bars, the desktop depth rule.

21. **[low]** The recording copy says "this phone" throughout ("Keep on this phone", "anyone holding this phone", "Stored on this phone only"), but the jury reads it on a laptop. Browsers can also clear this storage, which the screens do not say.
   - Fix: Use "this device" everywhere. Call navigator.storage.persist() when recording is turned on and add one row: "Your browser may clear these."

22. **[low]** Citations are loose. "Questions crowd out play." has no source that says this. "10, 10, 10 and at most 3" is flagged "verify" but no source is named.
   - Fix: Cite the PCIT child-directed interaction mastery criteria: 10 labelled praises, 10 reflections, 10 behaviour descriptions and no more than 3 questions, commands or criticisms in a five-minute coding (Eyberg and Funderburk, PCIT Protocol, 2011; see https://pcit.ucdavis.edu/wp-content/uploads/2012/08/Section-4_CDI-Coaching.pdf). Reword section 3 as the method's rationale: "A question asks her to stop and answer. A statement lets her keep leading." That line is already in the approved lesson.

23. **[low]** Templates are missing for the awkward cases. The guess screen has one example ("You guessed praise. You asked six questions."), which reads as a gotcha and does not cover a right guess or "Not sure". The Trends headline covers only "up". Name is skippable but every later line uses {Name}. The review's back arrow reads "Progress" even when it was opened from Today.
   - Fix: Guess screen: "You said praise. Round one: 1 praise, 6 questions."; a right guess gets "You called it."; "Not sure" shows the counts alone. Trends: add flat, down and first-week lines. Fall back to "your child" or "Your 28 days start today." when the name is skipped. The back arrow carries no label and returns to where the parent came from.
