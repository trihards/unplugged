# Status

As of 2026-10-18. Live version: **1.4** (deployed to GitHub Pages from `main`).

## Shipped

| Version | Date | What | Saffron's note |
| --- | --- | --- | --- |
| 1.0 | 2026-10-09 | Launch | none |
| 1.1 | 2026-10-15 | Handoff 1: iOS music fix, event songs, Pocket Petagotchi, journal prices, decoy endurance | On Dependence and Resolution |
| — | 2026-10-16 | What's New (Options and in-game menu) and the version label; no version bump | none |
| 1.2 | 2026-10-16 | Illustrated journey map (handoff 04, layout "C") | On the Importance of Knowing Where You Are |
| — | 2026-10-16 | Handbook accuracy fixes and section marks (docs only) | none |
| 1.3 | 2026-10-17 | Dale-Fi companion cards; in-world artist credits; all notes sign "With care". Personally tested and approved by the owner. | On Listening Closely |
| 1.4 | 2026-10-17 | Dale's Outstanding Balance: any debt at checkout is the Dale Fail (art and cue); complete post-game journal and a header journal icon; Dale's morning check-ins; time-neutral calm moments; new Dale-Fi song The Unprocessed Self. Owner playtest on macOS Safari and physical iPhone checks passed; background playback deferred (`parking-lot.md`). | On Outstanding Balances |

## In progress

| Item | Branch | Status | Blocked on | Next action |
| --- | --- | --- | --- | --- |
| Release 1.5: limited stock, Radical Acceptance, journal, fresh guestbook (handoff `2026-10-18/01_RELEASE_1_5.md`) | `release-1.5` (from `main`) | Built. In playtest at the permanent `/preview/` on `main` (byte-identical copy of the branch, with its badge, saves and cache kept apart from the live game). Full regression suite passes (89 tests, desktop Chromium and mobile emulation); stock-only simulation run. Not merged, not deployed. | The creator's review and playtest; the Proposed items under Release 1.5 in `decisions.md` (note sign-off, journal wording, sold-out strings, handbook paragraph). | Creator reviews and playtests (a `/preview/` copy on `main` if wanted). Then: set the note's date, merge, deploy. Physical-iPhone checks below. |

`release-1.5` ports only the stock half of `stage-01-market-scarcity` onto `main` (by hand, not a merge), with the Stage 01 rank thresholds. Saturation and all of Stage 02 are left out. `stage-01-market-scarcity` and `stage-02-zen-composure` stay as they are for reference; zen balancing is deferred.

Still to check on a physical iPhone before release (README checklist): Radical Acceptance plays and its card fits at iPhone SE size; the new song and art are available offline after the update (cache `unplugged-1.5-a`); muted audio stays muted; the guestbook reset leaves the saved retreat and the Dale-Fi collection in place.

## Approved and queued

| Item | Status | Blocked on | Next action |
| --- | --- | --- | --- |
| Stage 03: four-day Daily Challenge (handoff 03) | Approved direction; no code. Sequenced after the market (1.5); Stage 02 is deferred. | The decision checkpoint in `decisions.md`. | Present the checkpoint recommendations to the owner before writing code. |

## Known issues

| Issue | Status | Next action |
| --- | --- | --- |
| The morning notification says "Dale's meter ran all night: you owe $0." (styled as bad news at full zen) once you're square with Dale. Found in the 1.5 discovery and reproduced in Chromium; `rest()`. | Live since 1.4 at least. Not in the 1.5 brief, so not fixed. | Owner decides whether to fix and with what wording. |
| Gossip "Dale made a Costco run. Burners are piling up in the van." can fire at any spot, and with limited stock its crash now adds burners *there*, not at the van. Flagged in 1.5 as the handoff asked, not rewritten. | Copy question. | Owner decides (reword, or accept as gossip). |
| Other text-vs-state mismatches from the 1.5 discovery: the Parking Lot arrival says Dale is asleep while the van sheet has him doing his crossword; the quiet-hours notice says "Rest" on the last day, when the button is Check out; time-specific gossip ("The 4am sits started", "Full moon sound bath tonight", "It's 94 degrees in the labyrinth") fires at any hour. | Known; parked as the player-facing text audit (`parking-lot.md`). | Owner decides. |
| Two live code comments still say "pending approval": decoy endurance (`DECOY_SHARES`) and the checkout-music mapping (`endingSong`). Both shipped in 1.1. | Ambiguous: approval may have happened at release, or may still be outstanding. | Owner confirms; then update the comments. Not changed by guesswork. |
| No systematic iPhone or offline regression pass is recorded for 1.2 or 1.3. The owner has personally tested and approved the 1.3 companion cards; that is an approval of the feature, not a regression test. Still unchecked: the map image offline after an update, What's New and the version label, cards at iPhone SE size, map label crowding at 320 px late in the day. | Outstanding. | Run the README's manual iPhone checklist items that apply, when convenient. |
| In-game menu at 320 px scrolls slightly; its bottom Close button sits partly below the fold. The X at the top is always visible. | Minor, cosmetic. | Owner decides whether it matters. |
| Meditate This Way: in the 1.4 playtest (a fresh browser), its companion card didn't open on the first find; the notification, journal entry and song all worked. **Cause unknown.** It didn't recur on retest, and the automated reveal tests pass. The commit message of `3431b78` ("the missing reveal was a repeat find") is wrong: the owner confirmed none of the proposed explanations applied (repeat find from shared saved data or an earlier retreat, an accidental tap closing the card, or closing the app while the card was queued). | Dropped by the owner; no code change. | If it recurs, note what was on screen just before. |
| The journal has no entry cap since 1.4, so saves grow with long runs: an extreme 3,000-entry run measured about 184 KB, about 13 ms per screen update in desktop Chromium. Not measured on an iPhone. | Acceptable so far; no reports. | Watch on long 30-day runs. |
| The Dale Fail's airport line breaks between its sentences using `text-wrap: balance` (Safari 17.5 and later). Older Safari wraps normally. | By design. | None. |
| A first-time song discovery whose card is still queued is lost if the app is closed first. The song and its card are kept. | Minor edge case. | None unless it's reported. |
| On iPhone, the home-screen app and Safari keep separate storage, and Safari can clear storage for sites not visited for about seven days. Collections can look reset. | Platform behavior; the game requests persistent storage where supported. | None in code. |
| During a retreat the Dale-Fi plays only songs found on that retreat (by design and in the handbook); players could read it as losing songs. | Open question for the owner. | Owner decides whether to change it. |
| `assets/img/z`: a 1-byte file from the first upload (2026-10-09), unused but deployed. | Unclear whether it is intentional. | Owner confirms before it is removed. |

## Branches

| Branch | State |
| --- | --- |
| `main` | Live. |
| `release-1.5` | Release 1.5, awaiting review and playtest (see above). |
| `stage-01-market-scarcity`, `stage-02-zen-composure` | Unmerged. Stage 01's stock half is ported into `release-1.5`; the rest is not shipping. Kept for reference. |
| `map-preview` | Superseded by `release-map` (merged as 1.2). Kept, not deleted. |
| `docs-project-state`, `claude-agent-setup`, `unplugged-handoff-1`, `whats-new`, `whats-new-version`, `release-map`, `handbook-audit`, `dalefi-cards`, `claude/optimistic-dijkstra-9bdhx3` (1.4) | Fully merged into `main`. Safe to delete when the owner chooses. |

## Tools

- `tools/test/`: the regression harness (see its README).
- `tools/sim/sim.mjs`: the bot simulator used to tune Stage 01 and Stage 02 and to re-match the rank thresholds. Bots walk at random, so a good human beats them; use it for before-and-after comparisons, not absolute targets.
