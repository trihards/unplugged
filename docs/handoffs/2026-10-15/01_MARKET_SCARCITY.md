# Claude handoff 01 — A market with actual goods

**Status:** Approved gameplay direction; implementation is the next gameplay priority. Balance numbers are not approved and should be recommended, tested, and reported before treating them as final.

## User value / why
The 30-day intensive is too easy. At present, players can purchase as much as cash and cushion capacity allow at a low price, then unload it all at a higher price. That makes the best move obvious and allows wealth to snowball. Make successful trading depend on supply, timing, and judgment rather than unlimited arbitrage. Preserve the quick, enjoyable Drug Wars-style rhythm.

## Current state / source of truth
- Live: https://trihards.github.io/unplugged/
- Repo: https://github.com/trihards/unplugged
- `index.html` currently includes `PLACES`, `ITEMS`, `genPrices()`, `canBuy()`, `tradeMax()`, `tradeSheet()`, `updateTrade()`, and the trading action. Current `canBuy()` caps buys by cash and cushion space, not seller stock. Prices regenerate on travel. The game persists its run in local storage; review `continueRun()` for migration.
- Confirm the current branch and all relevant mechanisms before modifying code. Follow `CLAUDE.md` and `AGENTS.md` for agent use, tests, and scope.

## Approved desired behavior
1. **Finite buying supply:** Each traded commodity at a location has a limited quantity available for purchase. Buying reduces that stock. When exhausted, players cannot purchase more there until supply legitimately replenishes.
2. **No easy reset exploit:** Leaving and immediately returning to a location cannot magically refill inventory. Supply should persist across visits during a relevant game period and across save/resume.
3. **Softer selling demand:** Selling remains possible, but flooding one location with the same item makes subsequent units less profitable. Do not introduce a surprise hard cap that leaves the player unable to sell.
4. **Trade UI tells the truth:** Show stock available for the selected item and accurately bound the existing quantity slider and “All” action. For sales, show the **actual total proceeds** for the selected quantity when diminishing prices apply, rather than falsely promising one static unit price.
5. **Renewed opportunities:** Stock and buyer appetite should recover naturally in game time so players still find opportunities, particularly over a 30-day run. Do not create new maintenance buttons or a management dashboard.
6. **Keep existing flavor:** Retain changing prices, location advantages, commodity news, random opportunities, Dale, Saffron, and existing trade interaction patterns.

## Design choices Claude should recommend, not silently lock in
- Stock quantity ranges by commodity/location; replenishment cadence and degree, with **day-based refresh** as a simple starting proposal, not yet a fixed requirement.
- How buyer saturation accumulates and recovers, including whether selling a single large batch is priced incrementally and how to make the preview clear.
- A modest price floor / safeguards preventing negative or pathological proceeds.
- Any changes to displayed prices that would be required once zen affects selling (handoff 02). Do not mix future zen balancing into this first change by assumption.

Start with finite purchasing supply, verify it, then implement/tune soft selling demand. Review both together before release. Avoid implementing an elaborate economic simulation or backend.

## Acceptance criteria
- [ ] Buying 3 of 7 available units leaves 4; the buy max, “All,” and disabled states track real remaining stock.
- [ ] Leaving a location and returning the same in-game day cannot generate free new stock.
- [ ] Save/reload retains correct stock and saturation state; existing saved games load safely with defaults.
- [ ] Selling a larger batch at a location yields the properly calculated, clearly previewed total; selling remains possible after demand weakens.
- [ ] No zero/negative/NaN prices, money creation from rounding, fractional stock, over-capacity buys, or spending beyond available cash.
- [ ] Supply eventually recovers in a way that supports the 30-day intensive without restoring infinite arbitrage.
- [ ] Testing covers early, middle, and late 30-day runs as well as short modes; do not “fix” the long mode by making random punishments obnoxious.
- [ ] Phone-sized trade sheets remain fast and legible; purchase/sale mechanics, debt, random events, endings, audio, and offline behavior remain functional.

## Constraints and non-goals
No new commodities, currencies, market screens, inventory management chores, global economy, online sync, difficulty selector, extra buttons, or rewriting character dialogue. Preserve all existing modes, local scores, and save data. Keep randomness delightful and replayable.

## Verify / report back
Run the project test harness (`node tools/test/run.mjs` with the relevant trading, save, and regression suites) per `AGENTS.md`; include actual tests/limits in the report. Manually exercise mobile-sized trade panels and restored saves. Update the handbook only if existing descriptions become false. Bump `sw.js` cache version for changed assets and note unverified physical-iPhone checks. Report the formula/ranges proposed, files changed, test results, and any balance tradeoffs requiring owner approval. Do **not** merge/deploy without the owner's requested workflow.
