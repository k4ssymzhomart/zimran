# Review findings for the app screens (developer B)

A review of 163 screenshots of the juror walk (phone with Mia, laptop with Leo), each finding checked against the code
by a second agent. These are the confirmed ones in your files, highest first. Line numbers are from commit cd2c838;
some may already be fixed (the Progress rings and Profile pace were fixed in cd2c838).

## 1. [high] The Sessions table's Length column shows times that were never played
- Screen: `laptop-53-progress-full.png`
- File: `components/screens/progress/ProgressScreen.tsx:406`
- Why: hooks/useRound.ts roundDone saves durationSec = round.result.seconds = measuredSeconds(state) (lib/round/session.ts:225-229). For a round ended early that is max(seconds played, ceil(planned/2)). Daily: 4:51 left at the last sentence (about 9 s played) -> max(9, 150) = 150 -> clock(150) = 2:30. Round one: 0:52 of 1:00 left (8 s) -> max(8, 30) = 30 -> 0:30. Round two: 0:32 of 0:40 left (8 s) -> max(8, 20) = 20 -> 0:20. SessionTable prints clock(s.durationSec) under Length. SessionReview.tsx:35-37 leaves the length out for exactly this reason, and lib/progress/sessions.ts:240 warns the measured length 'may be time nobody played'. Still the same in HEAD.
- Fix: ProgressScreen.tsx: delete line 382 `<th scope="col" className={head}>Length</th>` and line 406 `<td>{clock(s.durationSec)}</td>`, and drop `clock` from the import on line 5. This is the call SessionReview already made. Keeping the column would need the played seconds saved with the session, which changes the frozen SessionDraft.

## 2. [high] Found while checking finding 1 (outside screens 1-35): Progress's "First visit" block disagrees with the Before and after screen
- Screen: `phone-52-progress-full.png`
- File: `components/screens/progress/numbers.ts:125`
- Why: The same two saved rounds give two different results. phone-24 (BeforeAfter, through compareRounds) shows +7 descriptions, -2 questions and commands, and -2 reflections in gray. phone-52 (firstVisitRows) shows -2 reflections, +1 specific praise and -2 questions and commands, all in violet. firstVisitRows (125-135) takes raw per-minute rates on three fixed rows. It never lists descriptions, so the +7 disappears. It shows +1 specific praise for the same single praise over a 20 s round two (3/min - 2/min), which compareRounds suppresses on purpose ("Up means more of it was said, not the same count over a shorter round"). It leaves corrections out of the to-swap row. ProgressScreen.tsx 349 also colors every change violet, including a drop in reflections. This breaks the rule that numbers which should agree across screens must agree.
- Fix: In numbers.ts firstVisitRows, compute: const asResult = (s: SavedSession): RoundResult => ({ seconds: s.durationSec, counts: s.counts, targets: s.targets, met: s.met, lever: null, leverText: null }); const { perMinute } = compareRounds(asResult(before), asResult(after)); Build the rows the way BeforeAfter.rowsOf does: skills that rose (largest first), then fewer to swap, then what fell, with zero rows dropped and a `good` flag on each. In ProgressScreen.tsx line 349, color by that flag (row.good ? 'text-violet' : 'text-faint'). Update numbers.test.ts line 71. Better still, move rowsOf into lib/progress/targets.ts so both screens use one function.

## 3. [high] The Progress hero rings show the daily session's counts doubled
- Screen: `laptop-52-progress.png`
- File: `components/screens/progress/numbers.ts:41`
- Why: In the walked build, paceOf scaled by FIVE_MINUTES / Math.max(durationSec, 60). The daily's stored 150 s (the half-length floor, not the ~9 s played) gave x2: 1/0/3/1 -> 2/0/6/2. Round two's 20 s gave x5: 2/0/2/0 -> 10/0/10/0. latestStats' deltas were therefore 2-10 = -8, 0, 6-10 = -4, 2-0 = +2, exactly as drawn. The result, review and table all show 1/0/3/1, and the result says the round has no pace verdict. Commit cd2c838 (10:46, after the walk) changed numbers.ts:41 to Math.max(session.durationSec, FIVE_MINUTES): a shorter round is never scaled up. HEAD now shows 1/0/3/1 with deltas -1/0/+1/+1. The 'This week' header over a 'Today' caption is the Figma 60:223 layout (header is the trend line, rings are the latest session) and is not part of the defect.
- Fix: Already fixed in HEAD by cd2c838: numbers.ts:41 `Math.max(session.durationSec, 60)` -> `Math.max(session.durationSec, FIVE_MINUTES)`, and the caption at ProgressScreen.tsx:174 was rewritten. Nothing left to change; confirm on the next walk.

## 4. [high] Review claims a 146-second run without a question in a round that lasted about 10 seconds
- Screen: `phone-45-daily-result-review.png`
- File: `components/screens/progress/numbers.ts:189`
- Why: reviewRows ends the last run at session.durationSec (numbers.ts:189). That value is round.result.seconds (hooks/useRound.ts roundDone), which is measuredSeconds() in lib/round/session.ts:225-229. For a round ended early it is max(played, ceil(planned/2)): 150 s for the five-minute daily ended at about 9.5 s. I replayed the walk through the real reducer (six sentences, End at 9.5 s). It stored durationSec 150 with the question at startSec 4.5, and reviewRows returned exactly "146 seconds". The comment on summaryOf in SessionReview.tsx (commit 02e5521) already says the stored seconds are not how long the round was played, but the Patterns row still uses them. Unchanged at HEAD b460c91.
- Fix: In reviewRows, end the last run at the last sentence said when the round was ended before half. Before line 189 add: `const planned = (session.targets.specific_praise * FIVE_MINUTES) / CLINIC_PACE; const end = 2 * session.durationSec <= planned ? Math.max(...said.map((s) => s.atSec)) : session.durationSec;`. Then change `const marks = [0, ...questions.map((q) => q.startSec), session.durationSec];` to `const marks = [0, ...questions.map((q) => q.startSec), end];`. Use `end` for the half split at lines 196-197 too. The walk's daily then reads 5 seconds. Full rounds and rounds ended after half are unchanged, and the existing 180-second test still gives 130.

## 5. [medium] The Practice tab is mostly blank on a laptop
- Screen: `laptop-58-practice.png`
- File: `app/(app)/practice/page.tsx:21`
- Why: The page renders PageScreen with no picture and no pattern. From 1024px that is the plain page: a max-w-[480px] column at the top left and white beyond it. Figma 54:221 draws desktop Practice as a split, with a violet panel holding the child on the left and the column centered. PageScreen already turns into that split when given a picture or pattern (components/kit/Screen.tsx:157-161, citing 54:221), and phones keep the plain page.
- Fix: practice/page.tsx:21 `<PageScreen embedded title="Practice">` -> `<PageScreen embedded title="Practice" rest="bottom" pattern={<Pattern kind="reps" size={1440} />} picture={<Portrait partner={profile.partner} pose="body-waving" size={420} alt="" className="size-[min(420px,52dvh)]" />}>`. Pattern and Portrait are already imported.

## 6. [medium] The ring deltas −8, 0, −4, +2 do not say what they are compared with
- Screen: `laptop-52-progress.png`
- File: `components/screens/progress/ProgressScreen.tsx:174`
- Why: latestStats sets each delta to this session's value minus the previous session's (numbers.ts latestStats), and Rings prints it bare under the label. Nothing on screen says so. The caption only mentions the clinic pace of ten, and the header compares this week with last week (trendLine), which is a different base. In the walked build, -8 and -4 came from round two projected x5 to 10. In HEAD (cd2c838) the same data gives -1, 0, +1, +1, still unlabeled, and +1 means a gain under Describe but one more sentence to swap.
- Fix: ProgressScreen.tsx:174, append one sentence to the caption: `... A shorter round is not stretched to five.` -> `... A shorter round is not stretched to five. Under each ring, the change since the session before.`

## 7. [medium] The "Four weeks" chart is an empty box with three dots on its right edge
- Screen: `laptop-53-progress-full.png`
- File: `components/screens/progress/ProgressScreen.tsx:294`
- Why: WeekChart draws no week or value labels. x(i) = 8 + i*544/3 puts this week at x = 552 of 560, and weeks with no sessions draw nothing. With one week of data, which every juror has on day 1, the card is a dashed line plus three dots at the right edge. In the walked build, praise 5.7 and describe 5.3 overlapped (r = 3.5, about 4 px apart). In HEAD the raw means (about 1.3 and 1.7) sit near the baseline, just as crowded.
- Fix: In WeekChart: `const x = (i: number) => 8 + (i * (W - 16)) / (weeks.length - 1);` -> `const x = (i: number) => 48 + (i * (W - 96)) / (weeks.length - 1);`. `viewBox={`0 0 ${W} ${H}`}` -> `viewBox={`0 0 ${W} ${H + 24}`}`. After the baseline line add `{weeks.map((w, i) => <text key={w.from} x={x(i)} y={H + 18} textAnchor="middle" className="fill-gray text-[12px]">{w.label}</text>)}` so the columns read Week 1, Week 2, Week 3, This week.

## 8. [medium] "Four weeks" chart is three loose dots at the right edge, with no axis, dates or values
- Screen: `phone-51-progress.png`
- File: `components/screens/progress/ProgressScreen.tsx:289`
- Why: WeekChart (ProgressScreen.tsx:289-325, itself marked "TODO kit: a trend chart") draws a dashed norm line, a baseline and one dot per skill per week at x(i). It has no week labels, no scale and no values. fourWeeks always returns three earlier weeks, so with one week of play, which is the case for every juror, the only dots sit at x(3), the right edge, as in the screenshot. The dots are this week's mean per session (4.7/1.7/8.7 in the walk build, 1.3/0.3/2.3 at HEAD), not the last session the rings show, and nothing on the screen says so. The rings' caption "Today." also reads as a total for the day, although it is the last of three sessions played today.
- Fix: Show Four weeks only once two weeks have a pace: wrap the phone section at ProgressScreen.tsx:190-194 and the desktop card at 254-261 in `weeks.filter((w) => w.pace).length > 1 && (…)`. When the chart shows, label the weeks: make WeekChart return a fragment with the svg followed by `<div className="flex justify-between text-small text-gray">{weeks.map((w) => <span key={w.from}>{w.label}</span>)}</div>`. x(i) already spreads the four weeks edge to edge.

## 9. [medium] Profile's "13% of the clinic pace" does not match Progress
- Screen: `laptop-60-profile.png`
- File: `components/screens/progress/numbers.ts:41`
- Why: Profile (facts.ts paceOf) averages min(1, count/target) against the session's own targets: (1/10 + 0/10 + 3/10)/3 = 13%. That is the same 1/10, 0/10, 3/10 as the result screen. The walked Progress showed the same session x2 (2, 0, 6 of ten, about 27%) because of numbers.ts paceOf (finding 2). Profile was right and Progress was the outlier. After cd2c838 Progress shows 1, 0, 3 of ten, so the two agree. What remains: the label 'of the clinic pace' does not say it covers only the latest session (ProfileScreen.tsx:81, sessions.at(-1)).
- Fix: The mismatch is already fixed by cd2c838 (numbers.ts:41). Left, optional and low: ProfileScreen.tsx:140 and :164 `of the clinic pace` -> `of the clinic pace, last session`.

## 10. [medium] The "First visit" card does not match the before-and-after screen
- Screen: `laptop-52-progress.png`
- File: `components/screens/progress/numbers.ts:135`
- Why: Both screens use the same measured seconds (30 and 20). Before: 1 praise, 1 command (the question was disputed), 0 descriptions. After: 2 praise, 2 descriptions. Per minute: praise 2 -> 6 (+4), questions and commands 2 -> 0 (-2), descriptions 0 -> 6 (+6), reflections 0 -> 0. firstVisitRows (numbers.ts:129-139) always returns reflections, praise and questions plus commands, and signed(0) prints '0'. BeforeAfter.tsx builds its rows from compareRounds().perMinute, drops measures that did not move, and includes descriptions. firstVisitRows also skips compareRounds' guards (a skill counts as up only when more was said; corrections join the swap count), so with other data the values can differ too.
- Fix: In firstVisitRows, build the rows from compareRounds(r(before), r(after)).perMinute, the same numbers BeforeAfter shows, with r(s) = { seconds: s.durationSec, counts: s.counts, targets: s.targets, met: s.met, lever: null, leverText: null }. Order: skills that grew (largest first), then the swap row, then the rest. Drop any measure whose change is 0. Here that gives '+6 descriptions per minute', '+4 specific praise per minute', '−2 questions and commands per minute'. Update the firstVisitRows test.

## 11. [medium] "First visit" block shows different rows from the visit's own before-and-after, with no before-vs-after label
- Screen: `phone-51-progress.png`
- File: `components/screens/progress/numbers.ts:129`
- Why: firstVisitRows (numbers.ts:129-139) always returns reflections, specific praise and questions plus commands as raw per-minute differences. FirstVisit paints every value violet (ProgressScreen.tsx:349). The first visit's own Before and after uses compareRounds (lib/progress/targets.ts:146-196) through BeforeAfter.rowsOf. That version includes descriptions, drops a rise that is only the same count over a shorter round ("Up means more of it was said"), puts gains first and grays declines. On the walk's saved rounds (measured at 30 s and 20 s), Progress gives −2 reflections, +1 specific praise, −2 questions and commands. The Before and after gives +7 descriptions, −2 questions and commands, −2 reflections. The +1 praise is the change compareRounds deliberately hides, since each round had one praise. On phones nothing says these numbers are round two against round one; the desktop card has that sentence only in its empty state.
- Fix: Build the rows from compareRounds: `const asResult = (s: SavedSession) => ({ seconds: s.durationSec, counts: s.counts, targets: s.targets, met: s.met, lever: null, leverText: null }); const { perMinute } = compareRounds(asResult(before), asResult(after));`. Emit the rows in BeforeAfter's order (skills that grew, largest first; fewer to swap; skills that fell; more to swap; no row for 0), each with a `good` flag. At ProgressScreen.tsx:349 use `row.good ? 'text-violet' : 'text-faint'`. The cleanest version moves rowsOf (components/first/BeforeAfter.tsx:42) into lib/progress/targets.ts and calls it from both screens. Update the numbers.test.ts first-visit case.

## 12. [medium] A 9-second daily session marks the day "Done for today."
- Screen: `laptop-47-daily-back-to-my-plan.png`
- File: `components/screens/today/todayState.ts:26`
- Why: todayState returns 'done' for any daily session dated today, and SavedSession carries no `short` flag. The app's own contract says otherwise: lib/types.ts:167-169 says a short round 'does not complete a plan day', lib/progress/history.ts completedDates skips short records, and SessionResult.tsx:61 shows 'Ended early.' instead of 'Day 1 done.' so as not to claim the day. Today then says 'Done for today.' with the Tomorrow teaser (laptop-47, 49, 62, 68). In HEAD, useSaveRound skips only rounds where nothing was said, so a 9-second session with one sentence still closes the day.
- Fix: todayState.ts:26 `const done = [...sessions].reverse().find((s) => s.kind === 'daily' && s.date === today);` -> `const done = [...sessions].reverse().find((s) => s.kind === 'daily' && s.date === today && s.durationSec > NORM_SECONDS / 2);`, plus `import { NORM_SECONDS } from '../../../lib/progress/targets';`. A daily ended before half is saved with durationSec exactly 150, the measuredSeconds floor. Add a case to todayState.test.ts.

## 13. [medium] Day 1 is declared done, offered again, then marked done after a round that ended early
- Screen: `phone-36-today-after-the-visit.png`
- File: `components/screens/today/todayState.ts:26`
- Why: PlanResult always titles the plan "Day {day} of 28 is done." (components/first/PlanResult.tsx:83). Right after the first visit, day = planDayOf = 1, before any five-minute session. Today then offers Day 1 with "Start five minutes", because todayState counts a day as done only when a 'daily' session was saved today (components/screens/today/todayState.ts:26). After the walk's 9.5-second daily, that same line accepts the session whether or not it ended early, and Today says "Done for today." But SessionResult.tsx:61-62 titles that round "Ended early." precisely so it "does not claim the day", and history.ts (MIN_DAY_SENTENCES, `short`) says a short round completes no plan day.
- Fix: todayState.ts:26: `.find((s) => s.kind === 'daily' && s.date === today)` → `.find((s) => s.kind === 'daily' && s.date === today && 2 * s.durationSec > NORM_SECONDS)`. Import NORM_SECONDS from '../../../lib/progress/targets'; a daily ended before half is stored at exactly half of it. Also PlanResult.tsx:83: `Day {done} of {PLAN_DAYS} is done.` → `Day {done} of {PLAN_DAYS} starts now.`

## 14. [low] Dates are in day-month order
- Screen: `laptop-46-daily-result-review.png`
- File: `app/(app)/labels.ts:9`
- Why: dayLabel builds `${weekday short} ${getDate()} ${month short}` -> 'Sun 15 Nov' (Progress table and rows). SessionReview.tsx longDay builds `${weekday long} ${getDate()} ${month long}` -> 'Sunday 15 November'. Both put the day before the month.
- Fix: labels.ts:9 -> `return `${part({ weekday: 'short' })}, ${part({ month: 'short' })} ${day.getDate()}`;` ('Sun, Nov 15'). SessionReview.tsx:23 -> `return `${part({ weekday: 'long' })}, ${part({ month: 'long' })} ${day.getDate()}`;` ('Sunday, November 15'). Update both doc comments.

## 15. [low] Dates in day-month order
- Screen: `phone-53-progress-sessions.png`
- File: `app/(app)/labels.ts:9`
- Why: dayLabel (app/(app)/labels.ts:9) returns weekday, day, month: "Sun 15 Nov". It is used on Sessions rows, the review header, Streak, Today's card for older days and the desktop table. The desktop review's longDay (SessionReview.tsx:23) gives "Sunday 15 November". The Figma frames use this order, but the stated rule is American order.
- Fix: labels.ts:9 → `return `${part({ weekday: 'short' })}, ${part({ month: 'short' })} ${day.getDate()}`;` ("Sun, Nov 15"). SessionReview.tsx:23 → `return `${part({ weekday: 'long' })}, ${part({ month: 'long' })} ${day.getDate()}`;` ("Sunday, November 15").

## 16. [low] The jury guide and "Session not found" have no violet picture block
- Screen: `laptop-63-jury.png`
- File: `app/(app)/progress/[session]/page.tsx:32`
- Why: Half refuted. The jury guide is all white in Figma 33:315 and the build matches it, so it stays as is. 'Session not found' has no Figma frame. It is a plain PageScreen with no picture or pattern, while the session review it stands in for has the violet half (the SessionReview aside).
- Fix: [session]/page.tsx:32 `<PageScreen` -> `<PageScreen pattern={<Pattern kind="sentences" size={1440} />}`, and add Pattern to the kit import on line 4. Leave app/jury unchanged.

## 17. [low] One label leads to two places, and one action has three names
- Screen: `laptop-71-cold-today.png`
- File: `app/(app)/today/page.tsx:100`
- Why: Confirmed in code and in the walk log. Today's empty state without access: 'Start a round' -> ROUTES.start (/start, the partner picker and first visit). Practice: 'Start a round' -> ROUTES.practiceRound (/round, a one-minute round). Progress empty state: 'Play your first round' -> /start (ProgressScreen.tsx:150). Profile empty state: 'Play the first round' -> /start (ProfileScreen.tsx:98).
- Fix: today/page.tsx:100 `Start a round` -> `Play your first round`, and ProfileScreen.tsx:98 `'Play the first round'` -> `'Play your first round'`.

## 18. [low] The Profile header puts the child's name next to the parent's portrait
- Screen: `laptop-60-profile.png`
- File: `components/screens/profile/ProfileScreen.tsx:137`
- Why: Partly refuted. Figma 60:651 draws the child's name and age beside the parent's portrait ('Aru, 4. Day 5 of 28.') and uses the 'First swap' label, so those parts match the design. The wrap is real. The stats list is `flex-wrap ... gap-x-[40px]` in about 604 px left over by the title block. The four items (about 120, 133, 171 and 75 px) plus three 40 px gaps need 619 px, so '1 day Streak' drops to a second row. Figma keeps all four on one row.
- Fix: ProfileScreen.tsx:137 `gap-x-[40px]` -> `gap-x-[28px]`. That makes 583 px, which fits this row; a much longer child name could still wrap.

## 19. [low] The daily session's Kind reads "Typed"
- Screen: `laptop-53-progress-full.png`
- File: `components/screens/progress/ProgressScreen.tsx:89`
- Why: kindOf returns 'Typed' for any typed daily or practice session. That follows Figma 60:223, where 'Typed' marks a session with no recording next to recorded 'Practice' rows. But FEATURES.recording is off, so no session has a recording. The first-visit rounds, also typed, keep their kind names, and a spoken daily would read 'Daily session'. The review calls this session 'Daily session with Leo, typed'. In a column headed Kind, only this row names how the parent answered instead of what the session was.
- Fix: ProgressScreen.tsx:89: delete `if ((session.kind === 'daily' || session.kind === 'practice') && session.input === 'typed') return 'Typed';` so the row reads 'Daily session' from KIND.

## 20. [low] Sessions list labels the daily session "Typed." and mixes round names
- Screen: `phone-53-progress-sessions.png`
- File: `components/screens/progress/ProgressScreen.tsx:82`
- Why: detailOf writes "First round." for first_before and "Round two." for first_after (ProgressScreen.tsx:81-82); KIND at line 66 uses "Round two" in the desktop table. The review of the same session calls it "Second round with Mia" (SessionReview.tsx:27-28). So one list mixes two styles, and the list and the review name the round differently. The "Typed." row is the drawn row (Figma 47:1270 "Typed. 9 skills, 4 to swap") and is not a defect.
- Fix: ProgressScreen.tsx:82 `Round two. ${counts}` → `Second round. ${counts}`; line 66 `first_after: 'Round two'` → `first_after: 'Second round'`.

## 21. [low] The same count fills a review ring by different amounts, and no target is shown
- Screen: `laptop-57-review-first-round.png`
- File: `components/screens/progress/SessionReview.tsx:122`
- Why: A review ring fills to count / session.targets[skill]. paceTargets(60) is 2 and paceTargets(300) is 10, so one praise fills half the first-round ring and a tenth of the daily's. The review prints only the count, while the result screens showed '/2' and '/10'. Figma 54:725 shows bare counts, but it draws only five-minute sessions, where every target is ten.
- Fix: In SessionReview.tsx, right after `<Rings ... />` closes on line 122, add `<p className="text-small text-gray">A full ring is the clinic pace for this length: {targets.specific_praise} of each skill.</p>`.

## 22. [low] A full ring means different things on different screens, with no explanation
- Screen: `phone-56-review-first-round.png`
- File: `components/screens/progress/SessionReview.tsx:110`
- Why: The review fills each ring at the target for the round's planned length (SessionReview.tsx:68-72). Round one's target is 2, so 1 fills half a ring; the daily's target is 10, so 3 fills 30%. The review has no caption. Progress now says "A full ring is the clinic pace: ten in five minutes. A shorter round is not stretched to five." (ProgressScreen.tsx:174, cd2c838). So the same round-one praise fills 10% on Progress and 50% in its review. This is deliberate, but it is not explained where it is shown.
- Fix: After the Rings (SessionReview.tsx:122) add `<p className="text-small text-gray">A full ring is the clinic pace for this round’s length: {targets.specific_praise} of each.</p>`.

## 23. [low] Trend deltas have no reference, and "−9 Describe" reports a drop that did not happen
- Screen: `phone-51-progress.png`
- File: `components/screens/progress/numbers.ts:115`
- Why: The −9 came from the old scaling (round two ×5, the daily ×2) and is gone at HEAD (cd2c838); replaying the walk now gives +1, 0, 0, +1. Three problems remain. First, latestStats compares the latest session with whatever came before it (numbers.ts:115): here the five-minute daily against round two, a 40-second round. The review of the same daily shows no change, because SessionReview only compares sessions of the same length (SessionReview.tsx:65). Second, the caption (ProgressScreen.tsx:174) never says what the small numbers compare with. Third, the kit paints every delta violet (Rings.tsx:70). A "+1" to swap is a step back, yet it looks like the "+1" praise, while the first visit and the landing gray a decline (BeforeAfter.tsx:74, BeforeAfterToggle.tsx:150).
- Fix: numbers.ts:115 `const prev = sessions.length > 1 ? paceOf(sessions[sessions.length - 2]) : null;` → `const before = sessions.at(-2); const prev = before && before.durationSec === last.durationSec ? paceOf(before) : null;`. This is the review's own rule. Update the numbers.test.ts case that expects a change between a 300 s and a 60 s session. Optional: name the comparison in the caption. Optional for A (kit): add a `good` flag to RingStat so Rings.tsx:70 grays a step back.

## 24. [low] "pace verdict" is unexplained jargon
- Screen: `laptop-44-daily-result.png`
- File: `lib/round/session.ts:116`
- Why: 'pace verdict' appears only in SHORT_ROUND_NOTE and its live twin (components/live/LiveResult.tsx:11), and nothing on screen defines it. It means the round cannot meet the pace: summary() sets met: false when elapsedSec < seconds/2. The jury guide says it plainly: 'Ended before half, a round cannot meet the pace.'
- Fix: session.ts:116 `'This round ended early, so it has no pace verdict.'` -> `'This round ended before its halfway mark, so it cannot meet the clinic pace.'`. Make the same change at LiveResult.tsx:11 (A's file), with 'session' in place of 'round'. lib/copy.test.ts already checks SHORT_ROUND_NOTE.
