Unplugged 1.5 — Implementation Handoff

Goal

Release 1.5 should make the contraband economy more believable, add one collectible song, and improve the usefulness of the existing journal.

Version 1.4 is live, tested, and stable. Preserve it as the baseline.

Start by reading the current docs/status.md, docs/decisions.md, and relevant repository documentation. Use your recent 1.5 discovery report as context, but verify the latest code before making changes.

The creative decisions below supersede older proposals where they conflict.

Work on a reviewable implementation branch. Do not merge or deploy until the creator has reviewed and playtested the changes.

1. Market — Limited Quantities

Use the existing stage-01-market-scarcity work as the starting point, selectively integrating the approved behavior.

Approved:

* Each location has a finite, randomized inventory per product.
* Keep the Stage 01 quantity ranges as the initial tuning.
* Cheaper locations generally carry more stock.
* Supplies replenish naturally over successive mornings, subject to the existing stock caps.
* Relevant gossip events can affect supply.
* Show available quantities in the existing buying interface.
* Display a clear, simple sold-out state.
* A location does not magically replenish because the player walks away and returns.

Explicitly rejected for 1.5:

* Market saturation.
* Diminishing returns on large sales.
* Demand-memory or demand-decay mechanics.
* Zen-based trading bonuses or walking fatigue.

Players should still receive the normal applicable price for every item sold, including during spikes. Do not penalize stockpiling or selling a large batch at an advantageous price.

This is limited merchandise availability, not an arbitrary per-player purchase quota.

Preserve the approved once-per-location-per-day gossip behavior and the separation of gameplay and cosmetic randomness.

Balance

The previous simulations showed a substantial reduction in long-run earnings with limited inventory alone. Keep the proposed quantities initially and use playtesting to evaluate whether the economy feels naturally constrained rather than frustrating.

Run the existing simulations for the stock-only configuration and check whether rank thresholds need adjustment. Do not assume thresholds calibrated for the combined scarcity-and-saturation design remain appropriate.

Preserve the excitement of buying low, stockpiling, and selling during a favorable price spike.

Copy and UI

Use concise labels such as available quantity and “Sold out.” Do not introduce saturation warnings or additional market-management UI.

Update the handbook to describe the actual replenishment behavior, including exceptions caused by market events. Preserve existing corrected documentation and gossip wording during the branch integration.

Flag any market gossip that becomes factually inconsistent with visible inventory rather than silently introducing broad creative rewrites.

2. Dale-Fi — Radical Acceptance

Add one collectible track through the established Dale-Fi system.

Approved identity:

* Title: Radical Acceptance
* Artist: VANTAGE
* Year: 1985
* Format: 12-inch single
* Label: Horizon Beat Records
* Catalog: HB-008
* Genre: Synth-Pop

Card metadata:

12″ · Horizon Beat Records · 1985 · Synth-Pop

Companion-card review:

A gleaming instrumental built on insistent drum machines, sweeping synthesizers, and an almost heroic sense of emotional urgency. VANTAGE approaches self-acceptance with the intensity of someone attempting to prevent a nuclear launch.

Use the existing supplied audio and sleeve artwork. Scout previously inspected both. If those files are unavailable in the current working environment, identify the missing inputs rather than recreating them.

Prepare them consistently with existing Dale-Fi assets:

* Convert audio to the established AAC/M4A format.
* Match the existing track loudness, approximately 1 dB below the supplied master if measurements confirm Scout’s findings.
* Convert the square sleeve to the established optimized WebP format.
* Update asset registration, service-worker caching, track metadata, companion-card data, and relevant tests.

Discovery

Location: The Labyrinth.

On each run, choose randomly whether discovery happens on the fourth or fifth visit to the Labyrinth.

Use this approved discovery text:

“For no particular reason, you walk the labyrinth counterclockwise this time. Halfway through, you notice something tucked beneath a stone.”

Then reveal Radical Acceptance using the existing song-discovery presentation.

Important:

* Counterclockwise walking is narrative flavor, not a player-controlled mechanic.
* No progress counter.
* No advance hint or breadcrumb revealing the visit requirement.
* No explanation that walking counterclockwise caused the discovery.
* No duplicate discovery after collection.
* Preserve collection and save/resume behavior.
* Integrate with existing event handling so the chosen visit reliably grants the song.
* Maintain the gameplay/cosmetic randomness separation.

Use the title capitalization “Radical Acceptance” throughout.

Do not introduce new music-player features.

3. Field Journal — Meaningful Events

Preserve the existing journal UI and its general behavior. Improve what it records.

Core principle: Record meaningful happenings and their locations, not routine movement.

Remove routine location-arrival entries from the journal. Do not remove the existing location-arrival narration from gameplay.

Verify existing journal coverage first and avoid duplicating entries that already provide the necessary information.

Ensure the journal captures:

Cushions and decoys

* Where cushions were found.
* Where decoys were offered for purchase.
* Offers the player actually encountered, even if declined.
* Distinguish an offer from a completed purchase.
* Record meaningful outcomes when applicable.

Market events

* Actual price spikes and crashes that the player learns about.
* Product and location.
* Actual price at the time when available.
* Preserve useful existing gossip context without duplicating entries.
* Do not log ordinary background price fluctuations or unseen market information.

Saffron encounters

* Consequential confiscations.
* Successful escapes.
* Meaningful zen penalties or other significant outcomes.
* Avoid cluttering the journal with routine interactions that have no meaningful consequence.

Dale-Fi

* Record song discoveries with their discovery location and existing discovery text, not just the track title.

Snaps and endings

* Record significant snap consequences.
* Record the final checkout outcome, including whether Dale was paid.
* Ensure the end-screen journal review includes the actual ending.

Journal constraints

A longer journal is permissible if straightforward, but not required.

Preserve the current visual presentation. No new filters, tabs, sorting controls, or elaborate history system.

Prioritize accurate event capture, concise useful details, and correct chronology. Don’t invent new narration or jokes.

Do not rewrite existing event dialogue, create additional location descriptions, or change event probabilities as part of this task.

4. Guestbook — Clean Slate

The limited-stock economy changes scoring enough to justify starting fresh.

Reset the locally stored guestbook/high-score records once when existing players transition to 1.5.

No historical leaderboard, economy-era labels, score migration UI, or archived guestbook is needed.

Critical storage boundary: This reset applies to guestbook records only.

Do not clear or damage:

* Saved games.
* Dale-Fi collections.
* Settings.
* Any unrelated local storage.

Ensure the reset doesn’t repeat on every page load or erase newly earned 1.5 scores.

The creator is aware that this is local browser storage, not an existing cross-device leaderboard.

5. What’s New — Guide Saffron

Add the approved 1.5 note to the existing persistent What’s New area.

On the Nature of Abundance

An update from Guide Saffron — Version 1.5

Dear Guests,

We believe abundance is not measured by how much one possesses, but by how gracefully one responds when there is no more.

To support this understanding, certain goods will now be available in quantities more closely aligned with the natural rhythms of supply. Replenishment will occur in due course. We encourage patience, particularly among those who have recently discovered its market value.

Your field journal has also been refined to better honor meaningful experiences. Not every step requires documentation. Some moments, however, deserve to be remembered.

We have also lovingly released all previous guestbook records. This was not a loss of history, but a restoration of possibility. Those who achieved exceptional financial success are invited to experience the freedom of having no evidence of it.

Finally, the retreat continues to reveal itself in unexpected ways. Familiar paths may still hold unfamiliar gifts.

We thank you for your continued willingness to participate in a more intentional form of prosperity.

With gratitude and appropriate restraint,

Guide Saffron

6. Integration and Regression Protection

Scout identified that the Stage 01 branch predates multiple updates to main.

Specifically check:

* continueRun() save compatibility and all newer default state.
* Handbook merge conflicts and corrected text.
* sw.js cache version.
* Existing Kitchen Garden song-find randomness.
* Dale check-in randomness.
* Current 1.4 journal and checkout behavior.

Keep all unrelated 1.4 features intact.

Only integrate Stage 01 code needed for the stock-only design. Do not merge Stage 02 zen work.

Update docs/status.md, docs/decisions.md, and other directly relevant documentation to reflect approved decisions and eventual implementation status.

7. Acceptance Criteria

* [ ]	Finite inventory varies naturally by location and product.
* [ ]	Restocking works across mornings and save/resume.
* [ ]	Same-day market events work without contradictory stock behavior.
* [ ]	Large sales receive full applicable unit prices, without saturation.
* [ ]	Existing gameplay remains enjoyable in short and long retreat simulations.
* [ ]	Radical Acceptance is discovered on a randomized fourth or fifth Labyrinth visit and persists in the collection.
* [ ]	Song artwork, audio, metadata, and companion card work on mobile.
* [ ]	Journal records meaningful location-specific encounters, including declined decoy offers.
* [ ]	Spikes, crashes, significant outcomes, and endings are captured accurately.
* [ ]	Routine arrivals no longer clutter the journal.
* [ ]	Guestbook resets once without affecting any other stored game data.
* [ ]	What’s New displays Saffron’s approved note with the cross-project branding error corrected.
* [ ]	Existing tests pass; add or update focused tests for new behavior.
* [ ]	Mobile layout, muted audio, offline/PWA behavior, and service-worker updates are verified.

Explicitly Out of Scope

* Global leaderboard or backend service.
* Daily Challenge.
* Zen balancing.
* Market saturation.
* New encounter types.
* Event-frequency rebalancing.
* Wholesale copy rewrites.
* Journal redesign.
* Additional music-player upgrades.

Report Back

Provide a concise implementation summary, files changed, tests and simulation results, outstanding risks, and anything requiring creative approval.

Do not silently choose new gameplay rules or invent creative copy where the decisions above are insufficient.

Leave the implementation ready for creator review and human playtesting, not automatically deployed to production.
