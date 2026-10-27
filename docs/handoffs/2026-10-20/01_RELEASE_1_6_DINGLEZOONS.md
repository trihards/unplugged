Unplugged 1.6 — Dinglezoons
Goal
Introduce Dinglezoons, a premium Dale-Fi music player upgrade sold exclusively by Dale.
The upgraded player should have a distinctive interface inspired by classic Winamp 2.x: tactile, compact, unapologetically retro, and a little ridiculous.
This is a focused music-player release, not a redesign of the game's audio system, economy, or collectible mechanics.
Release: 1.6
Starting point: `main`, with 1.5 shipped
Status: Approved creative direction; implementation pending
1. The product
Dinglezoons
The premier MP3 player of the Central Coast.
Dinglezoons is premium hardware for the existing Dale-Fi music collection. Dale-Fi remains the name of the music system; Dinglezoons is the upgraded player.
Purchase

* Available exclusively through Dale's existing commerce interface.
* Suggested price: $300, subject to checking the current economy and purchase conventions.
* One-time purchase using existing game currency.
* No rental, subscription, recurring charge, or new debt mechanics.
* Once purchased, the upgrade unlocks its premium player capabilities.
* Ownership should persist according to the game's existing save conventions.

Dale is a scruffy, competent capitalist who knows precisely what he's selling. His pitch should be casual and matter-of-fact.
Suggested Dale copy:
"Top of the line, man. You can skip stuff now. Even plays the same song over and over, if that's your thing."
Keep the buying experience compact and consistent with his existing interactions.
2. Visual direction — Classic Winamp meets Dale
The Dinglezoons interface should take direct inspiration from Winamp 2.x, particularly its classic compact player.
We're borrowing its personality and design language, not reproducing its interface pixel-for-pixel.
Visual ingredients

* Dark graphite or charcoal chassis.
* Metallic, slightly beveled controls that look satisfyingly tactile.
* Glowing green pixel-style lettering against a dark display.
* Tiny scrolling or truncated track-title display.
* A compact animated spectrum analyzer or similarly restrained music visualization.
* Small but recognizable transport controls.
* A deliberate early-2000s MP3-player aesthetic.
* Pixelated versions of collectible album artwork.

Think of an enthusiast's beloved desktop media player somehow compressed into a slightly dubious premium device sold from a van in Big Sur.
It should feel distinctly different from the original Dale-Fi player, immediately communicating that the player has been upgraded.
Mobile interpretation
Borrow Winamp's visual grammar, not its desktop ergonomics.

* Prioritize comfortable, accessible touch targets.
* Keep controls understandable without instruction.
* Avoid tiny desktop-style buttons that are difficult to use.
* Maintain readable text at 320px width.
* Respect the existing single-screen, phone-first game layout.
* Avoid excessive animation or effects competing with gameplay.
* Reuse the existing Dale-Fi player placement and interaction conventions wherever practical.

The goal is a charmingly overdesigned little music player, not an elaborate standalone music application.
Album artwork
Dinglezoons displays charmingly pixelated versions of the existing collectible album covers.

* Preserve original full-resolution artwork for companion cards.
* Pixelation should look intentional and retro.
* Artwork must remain recognizable at mobile sizes.
* Prefer rendering or reusing existing artwork rather than generating a second asset library.
* Claude may recommend the simplest technically appropriate approach.

Future skins — explicitly deferred
The default Dinglezoons appearance may eventually become one of several collectible, interchangeable skins inspired by classic Winamp customization culture.
Do not implement skins in 1.6.
No skin selector, unlock system, skin inventory, alternate themes, or speculative customization settings.
A naturally reusable styling approach is welcome if it doesn't increase current scope. Do not create a skinning architecture solely for hypothetical future features.
3. Premium player capabilities
Purchasing Dinglezoons unlocks three previously approved functions.
A. Skip tracks during automatic playback
Players can mark individual collected tracks to be skipped when the player advances automatically.

* Skipped tracks remain available for manual playback.
* Skip preferences can be changed or reversed.
* Avoid configurations that leave the automatic playlist unintentionally empty.
* Preserve existing playback order, advancement, and shuffle behavior wherever applicable.
* Clearly distinguish skipping a track in automatic playback from the ordinary Next button.

Do not confuse this feature with temporarily advancing past a song.
B. Repeat one track
Allow players to repeat the current song continuously.

* An obvious, compact repeat toggle.
* Clearly indicated active state.
* Repeat overrides automatic advancement.
* Manual track selection remains functional.
* Repeat can be turned off at any time.
* Follow existing playback and audio-interruption conventions.

C. Pixelated album-art display
Display the current track's collectible artwork in the upgraded player.
The display should complement the Winamp-inspired interface rather than dominate it.
The original full-resolution companion cards continue to work normally.
4. Music collection and future additions
Dinglezoons plays the existing Dale-Fi collection. Purchasing the upgrade does not change which songs the player has already discovered or collected.

* No existing tracks are removed or replaced.
* All collected tracks remain playable.
* Existing discovery mechanics continue unchanged.
* Existing companion cards and artwork remain intact.
* Premium controls work with the player's existing collected music.

New music is outside the scope of this initial handoff.
A separate music addition may be incorporated into 1.6 after creative review. Do not invent, generate, or select bonus tracks as part of implementing Dinglezoons.
5. Player UX and integration
The existing Dale-Fi experience should remain functional before purchasing Dinglezoons.
After purchase, Dinglezoons becomes the upgraded presentation of that same music collection.
Interaction principles

* One music collection, not two independent players.
* Clear and visually distinct upgraded state.
* Familiar controls remain recognizable.
* New capabilities appear in sensible positions.
* Premium controls should not clutter the standard player.
* Existing collectible companion cards remain accessible.
* Playback should not restart or interrupt unnecessarily when navigating the interface.
* Respect existing mute, audio-focus, and playback-lifecycle behavior.

Layout concept
Use classic Winamp as inspiration for a compact arrangement comprising:
Display area: track title, compact playback information, small music visualization, and pixelated album cover.
Transport area: existing playback controls, with the newly unlocked repeat function.
Collection area: existing song selection interface, with a simple way to exclude tracks from automatic playback.
This is conceptual guidance, not a mandatory component specification. Inspect the actual UI before deciding the implementation.
Do not add a large separate player screen unless the existing architecture makes it genuinely preferable.
6. What must not change
Preserve the following:

* Existing game economy and market scarcity.
* Dale's loans, repayment rules, and debt-based ending conditions.
* Existing Dale-Fi music collection.
* Previously collected songs and discovery status.
* Existing companion cards and their original artwork.
* Background/foreground playback conventions.
* Mute behavior.
* Existing save data and player preferences.
* Journal, guestbook, trading, navigation, and retreat events.
* Existing audio mixing and interruption behavior.

No unrelated gameplay rebalancing or refactoring.
This release should not add an equalizer, custom skins, new currencies, bonus music, separate music library, or unrelated premium-device functionality.
The small Winamp-inspired music visualization described in Section 2 is permitted, but should remain lightweight and decorative.
7. Release management
Follow the established Unplugged release conventions.

* Create a new `release-1.6` branch from `main`.
* Keep production unchanged while developing the preview.
* Replace the prior preview with the 1.6 preview when ready.
* Update Beta's Inspection Notes with a version-specific 1.6 checklist.
* Preserve the existing Beta preview-only behavior.
* Update `docs/status.md` and `docs/decisions.md` appropriately.
* Add a 1.6 What's New entry in Guide Saffron's voice.
* Follow existing offline-cache versioning conventions.
* Do not merge or deploy to production without approval.

Guide Saffron's What's New
Write a short release note in Saffron's established voice: impeccably serene, benevolent, and quietly authoritarian.
She should frame the arrival of premium recreational electronics as an opportunity for personal reflection rather than a product announcement.
Do not make her a cartoon villain, and don't over-explain the joke.
Testing
Include automated coverage for:

* Successful purchase.
* Insufficient funds.
* Repeat purchase prevention.
* Persistent ownership.
* Existing collection preservation.
* Automatic skip behavior.
* Manual playback of skipped tracks.
* All-tracks-skipped edge case.
* Repeat and manual-selection interactions.
* Existing mute and playback behavior.
* Save migration or compatibility where relevant.

Check 320px and 375px layouts. Include narrow-screen companion cards and upgraded player controls in the preview review.
Add manual iPhone checks for the new player, while retaining relevant unresolved checks carried forward from 1.5.
8. Acceptance criteria

1. Players can purchase Dinglezoons from Dale for a reasonable, clearly displayed one-time price.
2. Ownership persists without interfering with existing saves or collections.
3. The upgraded player is visually distinctive, recognizably Winamp-inspired, and comfortably usable on phones.
4. Players can exclude individual tracks from automatic playback without losing manual access.
5. Players can repeat a selected song reliably.
6. Pixelated album art displays without changing the original collectible artwork or companion cards.
7. Existing Dale-Fi songs and discovery mechanics remain intact.
8. Audio behavior remains stable across gameplay navigation, mute states, and playback interruptions.
9. Beta's 1.6 checklist and Saffron's release note are included.
10. No unrelated gameplay changes, bonus tracks, skin system, or new music architecture.

Implementation instructions for Claude
Inspect the current repository and existing Dale-Fi architecture before proposing or implementing changes.
Choose the smallest robust approach consistent with existing patterns. The descriptions above are product and creative requirements, not prescribed code structures.
First report any meaningful conflicts between the proposed interaction model and the current player.
Proceed with the approved scope where implementation is straightforward. Surface material design decisions rather than improvising major new behavior.
Provide a working preview and test results for review before requesting merge approval.
Do not ship 1.6 without explicit approval.
