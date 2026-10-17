# Claude handoff 03 — Four-day Daily Challenge

**Status:** Approved feature direction, **sequenced after market scarcity and zen balancing**. This is a separate implementation; do not bundle it into the first economy patch. Shared online leaderboard is **not approved as part of this task**.

## User value / why
A distinctive bite-sized reason to return to unplugged: one new **four-in-game-day long-weekend challenge** each calendar day. Everyone starting that day's challenge faces the same scenario and rules, making results meaningful to compare. It should feel punchier than the existing longer retreats, not like another standard length option.

## Current state / source of truth
- Live: https://trihards.github.io/unplugged/; repo: https://github.com/trihards/unplugged
- `index.html` has retreat modes/lengths, random pricing and events (currently via `Math.random()` helpers and direct calls), a local save, net-worth checkout, and local guestbook. The README explicitly says local storage is per browser; there is no global scores backend today.
- Inspect actual mode, event, scoring, save, and run-resume behavior on the target branch. Follow `CLAUDE.md` and `AGENTS.md`.

## Approved desired behavior
1. A separately recognizable **Daily Challenge** entry point, with a **four-day** run, distinct from ordinary retreat lengths. One shared scenario per calendar day.
2. Deterministic, seeded gameplay where the same date + same player decisions produce the same starting conditions, pricing, and relevant random outcomes. All players on that date start with identical cash, debt, item availability, market setup, and underlying odds. Different decisions may naturally lead to different outcomes; do not force an identical event at an identical clock time regardless of actions.
3. The objective is to **finish with the highest net worth** under those common conditions. Reuse the game's existing coherent economic scoring where appropriate; do not invent an unrelated score currency.
4. Respect the new finite supply, sale saturation, and zen-as-composure systems. Keep the quick trading and funny surprises that make the normal game fun.
5. The mode must play offline after installation to the same degree the rest of the game does, and survive closing/resuming the browser without changing its scenario.
6. Normal retreat modes retain their existing random, replayable identity. Daily seeds must not accidentally make ordinary games deterministic.

## Decisions Claude must present for approval before implementing
- **Calendar boundary:** UTC date vs a local-day experience; propose one with clear cross-device fairness implications and offline constraints. Do not silently choose.
- **Repeat policy:** Whether multiple attempts on the same day's seed are allowed and whether the best/latest counts. Do not assume one attempt or invent anti-cheating systems.
- **Score calculation:** Confirm precisely what existing `netWorth()` includes (debt, cash, glovebox, unsold goods, etc.) and recommend any necessary interpretation for the daily challenge.
- **Entry/results copy:** Show a minimal mockup or text proposal instead of inventing elaborate daily-challenge branding.

## Explicitly outside this handoff
No online leaderboard, accounts, cross-device score syncing, paid infrastructure, social/sharing flow, prizes, daily streaks, achievements, challenge-specific restrictions, new gameplay objectives, or rotating rules. A **global leaderboard is a separate future product/technical decision**. The local result can be shown at checkout without claiming it compares your score against other players.

## Acceptance criteria
- [ ] Challenge is exactly four in-game days with a clear entry and finish; standard game lengths remain as before.
- [ ] Same challenge date and same action sequence produce identical results across clean installs and save/resume, including price and supply states, events, and zen-relevant outcomes.
- [ ] Different date produces a different scenario in normal conditions; a run resumed after midnight retains the original challenge seed and date.
- [ ] Ordinary unseeded modes are still genuinely random; seeded games do not leak their RNG state into normal games.
- [ ] No new save incompatibility; progress, music, endings, journal, scores and offline mode survive the new branch of game logic.
- [ ] iPhone-sized screens remain readable and the daily action flow is short and frictionless.

## Verify / report back
First send the short recommendations above for owner approval; only then implement. Test determinism with recorded action sequences, refreshed tabs, crossed-midnight resumes, and independent browser contexts; test random-game independence. Use full verification for RNG/save/score changes and report the Chromium-vs-iOS limit. Update `sw.js` cache version and relevant handbook text if files change. Do not merge/deploy without the owner's requested workflow.
