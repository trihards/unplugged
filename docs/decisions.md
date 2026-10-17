# Decisions

Grouped by topic. Labels are defined in `README.md`. Where a handoff brief in `handoffs/` and this file differ, this file is newer.

## Process

- **Approved.** Release notes ("A Note from Guide Saffron") are published only for features that actually ship, newest first, under Options and the in-game menu. Published notes stay as they are; the one exception so far is the owner-approved sign-off correction below.
- **Approved.** All of Guide Saffron's notes sign off "With care, Guide Saffron". She believes her authority is entirely benevolent and never sounds self-aware about it.
- **Approved.** `GAME_VERSION` (shown beside What's New) changes only when a release ships, together with its note. 1.0 was the launch, then 1.1, 1.2, 1.3 as in `status.md`.
- **Approved.** Every release that changes player-facing mechanics includes a handbook and "How it works" accuracy check against the final approved tuning. `HB_MARKS` marks only the sections the latest feature release changed and is replaced each release. (Also in `CLAUDE.md`.)
- **Approved.** Market balancing ships as its own release, separate from other improvements.
- **Approved.** Balance numbers are calibrated with human play-testing, not only bot simulation.

## Credits and voice

- **Approved.** TORiTiA is the production and metadata credit only: kept in the Options credit line, the README and the track metadata in code, never shown as an in-world artist. The Dale-Fi shows each song's companion-card artist.
- **Approved.** The handbook stays the practical reference; it doesn't reveal hidden encounters or collectible unlock conditions.

## Stage 01: market scarcity (handoff 01)

**Provisionally approved** (to be recalibrated from play-testing): the branch `stage-01-market-scarcity` as built.

- Stock per spot rolled per run from per-good ranges (burner phones 3–8 up to espresso 60–150), more where a spot runs cheap; buying draws it down.
- Each morning stock refills by half its usual amount, never past it. Walking away and back the same day gives nothing.
- Selling never stops. Buyers take a typical stock's worth at full price; past that each extra unit fetches less (depth 2× typical stock), never below 40% of the price; buyers forget half overnight.
- Gossip ties in: a crash adds stock (capped at 2.5× usual), a spike makes buyers hungry again, at most once per spot per day (**approved**, with the once-a-day guard implemented at the owner's request).
- The sell sheet shows the exact total and "Avg. $X each" (**approved** wording).
- Rank thresholds re-matched by percentile against the bot: weekend 5k/20k/60k/125k, five days 25k/75k/175k/275k, week 50k/125k/225k/400k, 30-day 200k/1M/1.6M/2.5M.
- Randomness split into a gameplay stream and a cosmetic stream, ready for seeded runs (**approved**).

**Proposed** (drafted by Claude Code, not separately approved): the new trade-sheet strings ("N for sale", "sold out", "Sold out here", "Buyers here are filling up.") and the handbook paragraph describing supply.

**Open question:** final text of Saffron's note "On the Nature of Abundance". The owner has a draft and will supply the final text at release.

## Stage 02: zen as composure (handoff 02)

**Proposed.** Built on `stage-02-zen-composure` and reviewed; none of these is approved:

- Sell bonus up to 6% at full zen, sliding to nothing at zen 70 and below; low zen never a penalty.
- Walking wears 1 zen per hour, never below 70 by walking alone.
- Rest restores up to 20 zen a night in every length (currently 10, and 15 on the 30-day intensive).
- Report-card peace grade: A from zen 70 (currently 85), B 55, C 40, D 25.
- Sell-sheet note "Your zen adds N%." and the handbook paragraph describing composure.

**Open questions for the owner:**

1. Approve, adjust or reject the numbers above. A stronger variant (1.5 zen per walked hour) makes zen swing more but raised 30-day snaps for a player who always runs from about 29% to about 40% in simulation; it is parked, not proposed.
2. Approve the report-card grade shift.
3. Ship Stage 02 together with Stage 01, or after it.
4. The quiet-moment walk event now restores zen more often (zen is rarely at 100). Accept as a side effect?

## Stage 03: four-day Daily Challenge (handoff 03)

**Approved** direction, sequenced after Stages 01 and 02. **Checkpoint:** the brief requires recommendations on these to be presented and approved before implementation. No recommendation has been presented yet.

1. **Calendar boundary:** UTC date or the player's local day, with the fairness and offline implications.
2. **Repeat policy:** whether a day's seed can be played more than once, and whether the best or the latest result counts.
3. **Score:** confirm what `netWorth()` includes (cash plus glovebox minus debt; cushion goods are confiscated at checkout) and how the challenge uses it.
4. **Entry and results copy:** a minimal mockup or text proposal.

**Out of scope (from the brief):** online leaderboard, accounts, cross-device sync, sharing, prizes, streaks, achievements, challenge-specific rules.

## Journey map (handoff 04)

**Shipped** in 1.2: layout "C". The art is unaltered (square frame). Small dots sit at each landmark with 44 px tap targets, one-line labels show walk hours, the arrival time shows only for arrivals at 8pm or later, and one tap walks.

## Dale-Fi companion cards

**Shipped** in 1.3: one card per recording (approved art and editorial copy), opened from the cover on each Dale-Fi row. A card is revealed the first time a song is ever found: queued after any check-in for the Meditation Hall and staff USB finds, immediately when buying Dale's CD. Unlock paths, odds and prices are unchanged.

## Handbook

- **Shipped:** the 2026-10-16 accuracy audit. The line "the deeper into the retreat you go, the more tech is worth" was removed (no such mechanic exists), and the undocumented-on-screen 1–6 map shortcut was dropped from the handbook (the keys still work).

## Ambiguous, awaiting confirmation

- The code comments "Decoy endurance (proposed, pending approval)" and "Checkout and results music. PROVISIONAL mapping, pending approval" describe behavior that shipped in 1.1. Whether the owner approved them at release is not recorded. They are left as they are until confirmed.
