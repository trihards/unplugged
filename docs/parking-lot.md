# Parking lot

Ideas that have been explicitly deferred. **Nothing here is approved for implementation.** Moving an item out of this list takes the owner's decision, and then it goes to `decisions.md`.

## Dingleberryzune: a premium MP3 player sold by Dale

**Deferred. Not approved.** A pricier alternative to the Dale-Fi that Dale sells. Ideas noted so far:

- Skipping tracks for automatic playback (moving on to the next song by itself).
- Repeating a single track.
- Low-resolution album art on its display.

Open before it could be considered: price and where it's sold, how it relates to the existing Dale-Fi and the companion-card art, and whether it touches gameplay at all.

## Music

- **More recordings and multi-track releases** for the Dale-Fi. The companion-card system is designed to support them. Radical Acceptance was approved for 1.5 (see `decisions.md`); nothing beyond it is planned or approved.

- **Dale-Fi playback in the background** (other tab, other app, locked phone, Home Screen app). Deferred from 1.4. Today the game pauses on purpose when you leave: `musicAway()` runs on `visibilitychange`/`pagehide`, saves the position and unloads the song, and `clearMediaSession()` keeps the lock screen empty (README iPhone check 4); the handbook says so. Removing that pause alone wouldn't be enough: every song is routed through the Web Audio graph (`routed()`) so the in-game volume buttons work on iOS, where element volume is read-only, and iOS silences that graph when the page is hidden. Real background play would mean leaving the Dale-Fi unrouted (the + and − buttons stop working on iPhone, the hardware buttons still work), dropping the pause, deciding what Saffron's theme and the event songs do meanwhile, and allowing lock-screen controls. Behavior differs by iOS version and between Safari and the Home Screen app, and only a physical iPhone can verify it. Needs an owner decision and a prototype on a device.

## Audits (analysis first, nothing changes without review)

- **Player-facing text audit.** Extract all in-game text (dialogue, random events, place lines, notifications, contextual messages) and review character voice, game-state accuracy, time of day, weather and event eligibility; in particular, time-specific wording against when each event can fire. Known candidates from 1.4: the price-news lines "The 4am sits started…", "Full moon sound bath tonight", "It's 94 degrees in the labyrinth".
- **Journal coverage audit.** Done in the 1.5 discovery and acted on in 1.5 (what the journal records is in `decisions.md`). Left open: morning flavor lines, the quiet-hours and last-day notices, and declined actions other than offers are still not recorded, on purpose.

## Balance and mechanics

- **Stronger zen wear (1.5 per walked hour)**, if play-testing shows zen feels too quiet. See Stage 02 in `decisions.md`.
- **Zen discount on purchases**, offered in handoff 02 as an alternative expression of composure. Not approved; the brief rules out buffs in both directions without approval.
- **All of Stage 02 (zen as composure)**: deferred for 1.5; zen trading bonuses and walking fatigue were explicitly rejected for it.
- **Market saturation** (diminishing prices on big sales, buyer memory): built in Stage 01, **rejected** for 1.5 by the owner. Recorded here so it isn't rebuilt by accident; bringing it back would take a new decision.

## Daily Challenge

- **Online leaderboard**, accounts and cross-device score sync: a separate future product and technical decision (handoff 03).
- Daily streaks, achievements, prizes and challenge-specific rules: explicitly outside handoff 03.

## Handbook

- **More tips.** Candidate already drafted and accurate: "The Meditation Hall pays well for caffeine and tech." Left out on purpose for now.
