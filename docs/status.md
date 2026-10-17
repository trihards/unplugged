# Status

As of 2026-10-17. Live version: **1.4** (deployed to GitHub Pages from `main`).

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
| Stage 01: market scarcity (handoff 01) | `stage-01-market-scarcity` | Provisionally approved. Built, reviewed, 3 commits, behind `main`. | Final text of Saffron's "On the Nature of Abundance"; the decision whether Stage 02 ships with it. | Once decided: bring `main` in, docs accuracy check, release. |
| Stage 02: zen as composure (handoff 02) | `stage-02-zen-composure` (contains Stage 01) | Proposed. Built and reviewed; numbers not approved. | Owner decisions listed in `decisions.md` under Stage 02. | Owner decides; then integrate with or after Stage 01. |

Both branches predate What's New, the version label, the map, the handbook marks and the companion cards. They conflict with `main` in `index.html` and `sw.js`; integration is a careful merge, not a fast-forward. The Dale's Outstanding Balance release takes **1.4**; the market release becomes **1.5**.

## Approved and queued

| Item | Status | Blocked on | Next action |
| --- | --- | --- | --- |
| Market release (Stage 01, with or without Stage 02) | Approved as its own release, after the cards. | Stage 01/02 decisions and the note text. | Integrate, set `GAME_VERSION` 1.5, `HB_MARKS`, cache `VERSION`, release. |
| Stage 03: four-day Daily Challenge (handoff 03) | Approved direction; no code. Sequenced after Stages 01 and 02. | The decision checkpoint in `decisions.md`. | Present the checkpoint recommendations to the owner before writing code. |

## Known issues

| Issue | Status | Next action |
| --- | --- | --- |
| Two live code comments still say "pending approval": decoy endurance (`DECOY_SHARES`) and the checkout-music mapping (`endingSong`). Both shipped in 1.1. | Ambiguous: approval may have happened at release, or may still be outstanding. | Owner confirms; then update the comments. Not changed by guesswork. |
| No systematic iPhone or offline regression pass is recorded for 1.2 or 1.3. The owner has personally tested and approved the 1.3 companion cards; that is an approval of the feature, not a regression test. Still unchecked: the map image offline after an update, What's New and the version label, cards at iPhone SE size, map label crowding at 320 px late in the day. | Outstanding. | Run the README's manual iPhone checklist items that apply, when convenient. |
| In-game menu at 320 px scrolls slightly; its bottom Close button sits partly below the fold. The X at the top is always visible. | Minor, cosmetic. | Owner decides whether it matters. |
| Meditate This Way: in the 1.4 playtest (a fresh browser), its companion card didn't open on the first find; the notification, journal entry and song all worked. **Cause unknown.** It didn't recur on retest, and the automated reveal tests pass. The commit message of `3431b78` ("the missing reveal was a repeat find") is wrong: the owner confirmed none of the proposed explanations applied (repeat find from shared saved data or an earlier retreat, an accidental tap closing the card, or closing the app while the card was queued). | Dropped by the owner; no code change. | If it recurs, note what was on screen just before. |
| A first-time song discovery whose card is still queued is lost if the app is closed first. The song and its card are kept. | Minor edge case. | None unless it's reported. |
| On iPhone, the home-screen app and Safari keep separate storage, and Safari can clear storage for sites not visited for about seven days. Collections can look reset. | Platform behavior; the game requests persistent storage where supported. | None in code. |
| During a retreat the Dale-Fi plays only songs found on that retreat (by design and in the handbook); players could read it as losing songs. | Open question for the owner. | Owner decides whether to change it. |
| `assets/img/z`: a 1-byte file from the first upload (2026-10-09), unused but deployed. | Unclear whether it is intentional. | Owner confirms before it is removed. |

## Branches

| Branch | State |
| --- | --- |
| `main` | Live. |
| `stage-01-market-scarcity`, `stage-02-zen-composure` | Active, unmerged (see above). |
| `map-preview` | Superseded by `release-map` (merged as 1.2). Kept, not deleted. |
| `docs-project-state` | This documentation. |
| `claude/optimistic-dijkstra-9bdhx3` | Release 1.4. Fully merged into `main`. |
| `claude-agent-setup`, `unplugged-handoff-1`, `whats-new`, `whats-new-version`, `release-map`, `handbook-audit`, `dalefi-cards` | Fully merged into `main`. Safe to delete when the owner chooses. |

## Tools

- `tools/test/`: the regression harness (see its README).
- `tools/sim/sim.mjs`: the bot simulator used to tune Stage 01 and Stage 02 and to re-match the rank thresholds. Bots walk at random, so a good human beats them; use it for before-and-after comparisons, not absolute targets.
