# Decisions

Grouped by topic. Labels are defined in `README.md`. Where a handoff brief in `handoffs/` and this file differ, this file is newer.

## Process

- **Approved.** Release notes ("A Note from Guide Saffron") are published only for features that actually ship, newest first, under Options and the in-game menu. Published notes stay as they are; the one exception so far is the owner-approved sign-off correction below.
- **Approved.** All of Guide Saffron's notes sign off "With care, Guide Saffron". She believes her authority is entirely benevolent and never sounds self-aware about it.
- **Approved.** `GAME_VERSION` (shown beside What's New) changes only when a release ships, together with its note. 1.0 was the launch, then 1.1, 1.2, 1.3, 1.4 as in `status.md`.
- **Approved.** Every release that changes player-facing mechanics includes a handbook and "How it works" accuracy check against the final approved tuning. `HB_MARKS` marks only the sections the latest feature release changed and is replaced each release. (Also in `CLAUDE.md`.)
- **Approved, then superseded.** Market balancing ships as its own release, separate from other improvements. The owner's 1.5 handoff bundles limited stock with Radical Acceptance, the journal and the guestbook reset (see Release 1.5).
- **Approved.** Balance numbers are calibrated with human play-testing, not only bot simulation.
- **Approved** (2026-10-18, replacing the earlier remove-at-release rule). `/preview/` on `main` is permanent. Each release in testing is copied there byte for byte from its release branch, replacing the last, and it stays after the release ships. The build detects the path itself, so only under `/preview/` does the same code show Beta, Guide Saffron's betta, in her bowl beside the wordmark with "BETA · version" under it (from `GAME_VERSION`; she swims one short turn every 20 to 40 seconds, never with reduced motion or while the page is hidden), and a "PREVIEW · version" tab at the bottom wherever that header is missing or covered (other screens, sheets, notifications). Her art is in `assets/preview/`, cached only by the preview's service worker (`PREVIEW_ONLY` in `sw.js`).
- **Approved** (2026-10-18). Tapping Beta's bowl opens **Beta's Inspection Notes**: the manual playtest checklist for the release in the preview, informational only (no ticking off, no storage). **Rule:** every preview release replaces the checklist with one for its own changes. It lives in one place, `INSPECT` in `index.html`, tagged with its version; the sheet shows it only when that version equals `GAME_VERSION` (otherwise "Beta has no notes for this version yet."), and the `static` test fails until a new version gets its own list. Never carry the old items forward by default. Under `/preview/` it also keeps its own saves (`unpw-preview.*` keys) and its own offline cache (`preview:` prefix in `sw.js`), so testing never touches the live game's saves, guestbook, Dale-Fi collection, settings or cache. Before 1.5 the preview shared saved data with the live game.

## Credits and voice

- **Approved.** TORiTiA is the production and metadata credit only: kept in the Options credit line, the README and the track metadata in code, never shown as an in-world artist. The Dale-Fi shows each song's companion-card artist.
- **Approved.** The handbook stays the practical reference; it doesn't reveal hidden encounters or collectible unlock conditions.

## Dale's Outstanding Balance (1.4)

**Shipped** in 1.4. Owner playtest (Safari on macOS) and physical iPhone checks passed, except background playback (deferred, see `parking-lot.md`).

- **You always repay Dale.** Any debt at checkout, even $1, is the Dale Fail, whatever the net worth: heading "You didn't square up, man.", Dale's clipboard art, the one-shot cue "The Unsettled Account", takeaway "Dale Fail: Owes Dale forever", superlative "Dale's favorite liability". The lede is "You had the money. Dale had the tab." when net worth covers the debt, otherwise "You couldn't pay. Dale still had the tab.", followed by "Dale still gave you a ride to the airport. He didn't say a word the entire way." Snapping stays its own ending (you never reach checkout). Net worth, the guestbook score and the report card's financial numbers are unchanged; nothing is deducted at checkout and there is no last-minute payment.
- The checkout sheet and the last-morning notification show the balance but don't announce the ending; discovering the Dale Fail keeps some surprise. The handbook and "How it works" state the rule; Saffron's notes never spoil it.
- Financial Wellness is F whenever any debt remains, even after an earlier payoff.
- **Journal:** the 80-entry cap is gone; during a retreat it shows the last 20; after checkout, **Review your journal** shows the whole run, read only. A book icon in the header opens it in one tap; the menu entry stays.
- **Dale's morning check-in:** once each morning while you owe him anything, folded into the morning notification and journaled with the balance. Approved lines, never the same twice running; the "six grand" line only for balances of $5,500–6,499. No zen cost; his random notes (over $2,200 owed, after the first fifth of the retreat) are unchanged.
- **The Unprocessed Self** (The Low Maintenance Orchestra, Sunspill Records, 1977, funk; production credit TORiTiA): Dale-Fi song `w3`, a 45% find per Kitchen Garden visit (the Meditation Hall's odds). Card subtitle "45 · Sunspill Records · 1977 · Funk" (45 is the format). Hint "Some things grow better with a little funk." Discovery line and review are the approved copy. The sleeve's "A quieter kind of funk" against the review's "gloriously filthy" is intentional.
- Calm moments on walks are time-neutral ("A deer walks right up to you.", "The fog lifts off the Pacific and you forget your inbox exists.").

## Release 1.5 (handoff `handoffs/2026-10-18/01_RELEASE_1_5.md`)

**Approved** by the owner on 2026-10-18; **built** on `release-1.5`, awaiting the creator's review and playtest. Not merged or deployed. Where this differs from Stage 01 and Stage 02 below, this is newer.

- **Release shape:** 1.5 is limited stock, Radical Acceptance, the journal, a fresh guestbook and Saffron's note. It supersedes the earlier rule that market balancing ships on its own.
- **Limited stock, from Stage 01:** stock per spot and good (the Stage 01 ranges, more where a spot runs cheap), drawn down by buying, half the usual amount back each morning up to the usual amount, no refill from walking away and back, a crash in the gossip brings stock at most once per spot per day. The quantity shows on the buy sheet; sold out shows on the row and the button. Gameplay and cosmetic randomness stay split.
- **Rejected for 1.5:** market saturation, diminishing returns on big sales, buyer memory, and every zen trading bonus or walking cost (Stage 02). Every unit sells at the price on the board, spikes included.
- **Rank thresholds:** the Stage 01 values, checked against a stock-only simulation (1,000 runs per length and bot, 2026-10-18) and kept. Recalibrate from playtesting.
- **Radical Acceptance** (VANTAGE, 12″ single, Horizon Beat Records HB-008, 1985, Synth-Pop): Dale-Fi song `w4`, card meta "12″ · Horizon Beat Records · 1985 · Synth-Pop" and the approved review. Found in the Labyrinth on the fourth or fifth visit of a retreat (chosen at random when the retreat starts, cosmetic stream), with the approved discovery line. No progress counter, hint or breadcrumb. Production credit TORiTiA. Audio from the owner's master, converted to AAC and lowered 1 dB to match the other songs.
- **Journal:** records what happened and where, not routine walks. The arrival line still shows on screen. Offers shown are recorded whether taken or not; gossip with the good and its price; each round with Saffron with the goods and zen it cost; getaways; songs with how they were found; the snap or checkout, including whether Dale was paid. Same look, last 20 during a retreat, everything after checkout.
- **Circulation** (preview fix, 2026-10-18): whatever you let go of at a spot goes back on sale there, with no cap. Morning refill and crashes never lower stock that selling raised.
- **Sold out stays visible** (preview fix): a SOLD OUT tag on the row (next to "N held" when you hold some) and beside the item name on the trade sheet, in both Receive and Let go. When Receive is off for another reason, the sheet says which ("Not enough cash for one." or "Your cushion is full.").
- **Guestbook:** cleared once per browser on the first load of 1.5. Nothing else in storage is touched.
- **What's New:** "On the Nature of Abundance", body verbatim.

**Proposed** (built, Claude Code's wording or interpretation, needs the owner's approval):

- The note's sign-off is "With care, Guide Saffron" (the approved convention) instead of the brief's "With gratitude and appropriate restraint, Guide Saffron", and its subtitle line "An update from Guide Saffron — Version 1.5" is left out because the sheet already shows the heading and version. This is our reading of "the cross-project branding error"; confirm it was the right one. The note's date is set to 2026-10-18; change it to the release day.
- Trade-sheet strings: "N for sale", "sold out" on the row and the sheet, "Sold out" on the button.
- The handbook's supply paragraph, and "The Dale-Fi" now saying the player hints at "most of the ones you haven't found" (Radical Acceptance has no hint).
- Journal entry wording, all factual: the time-and-place prefix ("2pm, The Labyrinth. …") on the first entry at each stop; "A guest offered you a bigger cushion for $X." and "A guest from Marin offered to be your decoy for $X."; gossip followed by "(Good, $price)"; "Guide Saffron confiscated … Zen -N."; "Slipped away from Guide Saffron (N% chance)."; "Checked out. Square with Dale. / You still owed Dale $X. … Net worth $X. <takeaway>." The snap entry reuses the end screen's lede.
- Radical Acceptance has no Dale-Fi hint (the brief rules out breadcrumbs), so its unfound row shows the existing line "Turns up somewhere on a retreat."
- Only a crash moves stock now, so only a crash uses up a spot's once-a-day gossip effect; a spike earlier the same day no longer blocks it.

## Stage 01: market scarcity (handoff 01)

**Superseded by Release 1.5** for what ships: limited stock only, no saturation. The record below is the branch as built.

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

**Deferred** by the owner for 1.5: no zen changes ship in 1.5, and zen trading bonuses and walking fatigue are rejected for it. The record below stays for when zen balancing is taken up again.

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

**Shipped** in 1.3, and personally tested and approved by the owner (not a comprehensive iPhone or offline regression pass): one card per recording (approved art and editorial copy), opened from the cover on each Dale-Fi row. A card is revealed the first time a song is ever found: queued after any check-in for the Meditation Hall and staff USB finds, immediately when buying Dale's CD. Unlock paths, odds and prices are unchanged.

## Handbook

- **Shipped:** the 2026-10-16 accuracy audit. The line "the deeper into the retreat you go, the more tech is worth" was removed (no such mechanic exists), and the undocumented-on-screen 1–6 map shortcut was dropped from the handbook (the keys still work).

## Ambiguous, awaiting confirmation

- The code comments "Decoy endurance (proposed, pending approval)" and "Checkout and results music. PROVISIONAL mapping, pending approval" describe behavior that shipped in 1.1. Whether the owner approved them at release is not recorded. They are left as they are until confirmed.
