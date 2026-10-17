# Claude handoff 02 — Zen that matters without babysitting

**Status:** Approved gameplay direction. Implement **after or alongside balancing** market scarcity, not independently with an untested large price buff. Exact percentages and drain rates remain open to owner approval.

## User value / why
Players barely notice the zen/vibe meter, especially in the 30-day intensive. Make zen feel like useful **trader composure**, not just a countdown to the “start a podcast” game-over gag. High composure should quietly make you better at getting a price, while sustained reckless behavior can make you lose your edge. Crucially, **the player should not be managing a survival meter all the time.**

## Current state / source of truth
- Live: https://trihards.github.io/unplugged/; repo: https://github.com/trihards/unplugged
- `index.html` already tracks zen, its minimum for report-card grading, restoration on rest and some events, and losses in encounters. Rest currently restores by retreat mode; encounter randomness scales by mode. `tradeSheet()` currently displays per-item market prices and trade totals.
- Read the active branch's code and `CLAUDE.md`/`AGENTS.md` before implementation. Do not assume previous conversations capture every change.

## Approved desired behavior
1. Zen represents composure in trading. **Higher zen passively earns a modest premium when selling** (approved first expression; purchase discounts were mentioned as an alternative, not yet approved for both directions). Lower zen diminishes or removes that advantage.
2. Show the effective selling price or total transparently in the existing trade UI. Players shouldn't need to consult a formula page, but should be able to understand why they got a better or worse offer. If saturation from handoff 01 also applies, preview and payout must agree.
3. Adjust the current gain/loss balance enough that zen isn't effectively pinned near 100 for most of the 30-day run. Sustained busy movement and/or aggressive hustle can wear composure down **gradually**, while existing overnight rest and occasional good events restore it naturally.
4. The zen effect should reward judgment (“one more trip?”) without forcing deliberate meditation, frequent rest, or a new action every few turns.
5. Keep the established rare possibility of snapping at zero and the existing humorous ending, but avoid a dramatic increase in unavoidable random losses.

## Design choices Claude should recommend, not silently lock in
- A small, bounded sell-price modifier/curve, with no large automatic bonus at 100 that makes the already-easy economy easier.
- The **lightest** way to apply gradual wear through already meaningful behavior (e.g., travel or trading intensity) without punishing every tap. Avoid adding penalties to harmless UI interactions.
- Adjusted nightly restoration and event gains so high and low zen are both encountered in real runs, without making it exhausting.
- Tiny, clear feedback in the existing trade panel if helpful; no extra status panel or new compulsory mechanic.

## Acceptance criteria
- [ ] A high-zen seller receives a slightly better offer than an otherwise identical low-zen seller; calculations and UI agree.
- [ ] Low zen does not silently multiply losses into an unavoidable death spiral; a player can recover through normal existing play.
- [ ] Zen varies meaningfully over representative long runs but isn't a meter requiring constant checking.
- [ ] The 30-day intensive remains completable and less trivially profitable when evaluated **with** the scarcity changes.
- [ ] Saved runs survive upgrades; zen stays within valid bounds; trade, report card, journal, Saffron events, and endings work.
- [ ] Existing mobile UI stays uncluttered and playable without sound.

## Constraints / non-goals
No manual zen chores, extra consumable wellness items, meditation minigame, new trading dialogue choices, new buttons, or a separately managed “haggling” system. Do not add **both** buying and selling price buffs unless approved. No overhaul of Dale's interest schedule as a shortcut to difficulty.

## Verify / report back
Test money arithmetic, sell totals, saved-game defaults, zen recovery and zero-zen endings, and representative 4/short/30-day play. Use the test harness and verification level required by `AGENTS.md`; note mobile/Safari checks as applicable. Show proposed zen-to-price tuning and a few simple simulated play outcomes before calling the balance final. If modifying cached files, bump `sw.js` VERSION. Summarize changes and unapproved decisions separately; do not silently expand scope.
