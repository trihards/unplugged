Unplugged 1.6 — Dinglezoons Final Handoff

Context

The original Dinglezoons implementation has been completed and published to /preview/, with 109 automated tests passing.

This handoff updates that existing release with:

* Day 3 purchase availability.
* Two exclusive tracks from Gary’s Cream of the Crop ’98.
* You’re Square as a permanent Dale-Fi collectible earned through full debt repayment.
* Independent Music and Sounds mute controls.
* Finalized music-card descriptions and discovery hints.
* Updated tests, documentation, and preview notes.

Start from the existing release-1.6 work. Preserve its Winamp-inspired interface, AUTO behavior, repeat controls, mobile layout, and per-retreat ownership.

The creative decisions and music-card copy below are approved.

Do not merge into production without approval.

⸻

1. Dinglezoons — Day 3 availability

Dale begins selling Dinglezoons on Day 3 of each retreat.

* Price remains $300.
* Unavailable for purchase before Day 3.
* Available from Day 3 through the end of the retreat unless purchased.
* Ownership lasts for the current retreat only.
* Players purchase a new Dinglezoons each subsequent retreat.
* Reloading or continuing the current retreat preserves ownership.
* No additional quests, conditions, or currencies.

Keep the existing purchase mechanism and interface. This is intended to be a meaningful mid-retreat luxury purchase.

2. Cream of the Crop ’98 — exclusive preloaded tracks

Every Dinglezoons comes with two recordings from Gary’s legendary cassette.

Side A: What’s on Your Shoe
Side B: Clam’s End

Both songs are exclusive to Dinglezoons.

Collection behavior

* Both tracks become available immediately upon purchase.
* They appear in the upgraded player’s playlist alongside previously discovered Dale-Fi songs.
* They cannot be played or collected through the basic Dale-Fi.
* They are not permanent music discoveries.
* They become unavailable when the retreat ends and Dinglezoons ownership resets.
* They return automatically with another Dinglezoons purchase.
* They support ordinary manual playback, AUTO, Next/Previous, and repeat.
* They cannot be removed from the bundled library, but AUTO may be disabled for either track.
* Existing permanent Dale-Fi collection behavior must remain unchanged.

Use the supplied audio and existing Cream of the Crop ’98 cassette artwork. Confirm any missing assets before integration.

Final companion-card copy

What’s on Your Shoe
Cream of the Crop ’98 · Side A

Gary discovered this cassette beneath the passenger seat of Dale’s van in 1998 and immediately declared it the greatest recording ever to grace his ears. Dale has no recollection of how it got there.

Clam’s End
Cream of the Crop ’98 · Side B

Gary listened to the second side six times that evening, eventually announcing that he had experienced something beyond music. Dale asked for his tape back.

Discovery hints

What’s on Your Shoe

“Not sold separately. Dale might know?”

Clam’s End

“One of two exclusive bonus cuts.”

Display these using the existing Dale-Fi “Not Found Yet” hint conventions. Do not reveal the full card text until the tracks become available.

3. You’re Square — Dale’s payoff collectible

The existing full-length payoff song plays beyond its intended interaction. Replace that behavior with a permanent music reward.

When the player fully repays Dale, unlock You’re Square as an ordinary permanent Dale-Fi collectible.

Behavior

* Unlock only upon full repayment.
* The collectible persists across subsequent retreats.
* The full song does not automatically play during repayment.
* Once unlocked, it can be selected and played normally.
* It supports the existing Dale-Fi playback and Dinglezoons controls.
* A suitable short payoff confirmation sound may remain, provided it doesn’t trigger or continue the full song.
* Do not change Dale’s loan rules, repayment amounts, notifications, or debt-related ending conditions.

Final companion-card copy

You’re Square
Dale · Late 1970s California country rock

Recorded during Dale’s brief but deeply cherished studio years, this four-track demo remains his proudest musical accomplishment. He has kept the original master in his possession ever since and maintains that the fourth take was the one where everything came together.

Discovery hint

“Dale appreciates a settled tab.”

Artwork

The approved artwork is the isolated, transparent-background reel-to-reel tape illustration created collaboratively for You’re Square.

It depicts a worn late-1970s recording reel in its battered case, handwritten title, and Dale’s original studio notes, including “rough mix,” “take 4,” and “keep steel?”

Use the supplied finished artwork as-is.

Do not generate, redesign, or replace the artwork. Preserve its transparency and proportions.

Use the existing full-length audio asset if already present. Report any missing file dependencies.

4. Independent Music and Sounds settings

Add two independent audio controls.

Music governs:

* Dale-Fi and Dinglezoons songs.
* Character themes and background musical playback.
* Other sustained musical content.

Sounds governs:

* UI beeps.
* Gameplay notifications.
* Short effects and stings, including a brief payoff confirmation where applicable.

Required behavior

Support all four combinations:

* Music on, Sounds on.
* Music on, Sounds off.
* Music off, Sounds on.
* Music off, Sounds off.

Both settings persist across reloads and retreats.

Inspect the existing audio routing before implementation. Preserve audio interruptions, resume behavior, and track position wherever supported.

Ensure an existing muted preference is not accidentally reset to audible during migration.

Use simple, compact controls in the existing settings interface. No mixer, equalizer, or additional volume sliders.

5. Copy and presentation

Update Dale’s purchase offer to mention the two exclusive cassette recordings.

Suggested Dale line:

“Top of the line, man. Comes with two tracks from Gary’s ‘98 tape. Don’t ask me how he recorded ’em.”

Retain the already implemented Dinglezoons appearance and controls.

Update Guide Saffron’s 1.6 What’s New note to reflect the completed release, including the premium player and newly independent audio controls.

Keep her voice sincerely serene and quietly authoritarian. No lengthy explanation of game mechanics.

Share revised release-note and purchase copy for creative review before production.

6. Testing

Extend the existing automated coverage for:

* Day 3 purchase availability and earlier unavailability.
* Insufficient funds and duplicate purchases.
* Per-retreat ownership and reload persistence.
* Both Gary recordings unlocking with Dinglezoons.
* Exclusive tracks unavailable through standard Dale-Fi.
* Exclusive tracks disappearing from accessible playback after retreat reset.
* AUTO, Next/Previous, and repeat working with bundled tracks.
* Existing permanent music collection remaining intact.
* You’re Square unlocking upon full repayment.
* You’re Square persisting across retreats.
* No full-length payoff song triggering automatically or continuing beyond the interaction.
* All four Music/Sounds combinations.
* Mute preference persistence and compatibility with existing saves.
* Existing playback interruption and resume behavior.

Retain phone-width testing at 320px and 375px.

Update Beta’s 1.6 Inspection Notes to cover new functionality and carry forward relevant unresolved real-iPhone checks.

Update the handbook, docs/status.md, and docs/decisions.md.

Do not widen this release to address unrelated trading or flaky-test issues.

7. Acceptance criteria

1. Dinglezoons is purchasable from Dale starting Day 3 for $300.
2. Ownership resets with each new retreat.
3. Gary’s two exclusive songs are bundled with the player and unavailable through the basic Dale-Fi.
4. Both songs use the approved companion copy and hints.
5. Full repayment permanently unlocks You’re Square.
6. You’re Square uses the supplied reel-to-reel artwork and approved companion copy.
7. The full payoff song no longer interrupts or outlasts the repayment interaction.
8. Music and Sounds can be muted independently.
9. All existing Dinglezoons features and Dale-Fi discoveries remain functional.
10. Updated automated tests and preview inspection checks pass.

Implementation instructions

Inspect the current implementation and reuse established conventions.

Choose the smallest robust changes needed to satisfy these requirements.

Use the supplied artwork and audio; do not commission or generate creative replacements.

Surface missing assets or meaningful implementation conflicts rather than improvising new product behavior.

Update /preview/ for review when complete. Preserve production 1.5.

Do not merge or ship 1.6 without explicit approval.
