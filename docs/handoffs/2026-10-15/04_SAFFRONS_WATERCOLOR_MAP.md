# Creative + Claude handoff 04 — Journey map background (Saffron's retreat)

**Status (updated October 15, 2026):** The **visual direction and simplified six-location composition are approved**. A **preferred working image** is included in this package as `assets/map-background-candidate.png`. It is a strong candidate, **not yet a final in-game approval**. Claude may create a local/prototype integration to test the real UI over it, but must **show the phone-sized in-game preview and obtain approval before merging/deploying**. Do not regenerate art or make creative changes independently.

## Goal / player experience

Replace the current rather generic illustrated coastline in the **Journey** view with a charming, simple, unmistakably Big Sur retreat map. The fictional commissioning client is Guide Saffron: tasteful, sincere, serenely controlled. Her map is polished enough to have been professionally outsourced, but quietly warm and playful. It should look **native to unplugged's existing simplified flat-cartoon/painterly art direction**, not like a collectible print, tourist poster, or detailed theme-park illustration.

The map is *supporting scenery* for the actual playable map. Function, read-through, and phone legibility take precedence over detail.

## Approved visual direction — latest discussion supersedes earlier elaborate watercolor briefs

- **Simpler still** than the current preferred image: broad shapes, flat warm fills, light watercolor texture, restrained dark outlines, gentle muted palette (forest/sage, linen cream, soft ochre, coastal turquoise). Less detailed vegetation, rock clusters, ocean waves, and texture than previous studies. Don't complicate the scene in the name of "watercolor."
- **All six places must be visually legible**, as minimal landmarks, in roughly the existing map positions:
  - **Parking Lot** (~54% x, 8% y): a tiny turnout and Dale's van.
  - **Kitchen Garden** (~20%, 25%): a few vegetable beds.
  - **Meditation Hall** (~56%, 36%): a humble retreat building.
  - **Yurt Village** (~26%, 55%): two small yurts.
  - **The Labyrinth** (~80%, 58%): clear simple spiral.
  - **Hot Springs** (~56%, 86%): modest steaming pools at lower coastal edge.
- **One visibly connected network of walking paths** reaches each location, including the parking lot and hot springs. This does *not* mean a separate direct path for every origin/destination pair. No disconnected destination, orphan trail, or puzzling dead end.
- Pacific coastal cliff edge, redwoods/cypresses, understated Big Sur setting; not an island, dock, cave, market, tropical beach, or generic fantasy resort.
- **No image text at all**: no title, destination labels, caption, slogan, signpost words, price tags, ETA chips, UI icons, or close button. The live game supplies the text and controls.
- Leave visual breathing space **around and below each landmark** for interactive map nodes, location labels and ETAs. At small sizes, the labels should stand out, rather than compete with a forest, elaborate rocks, or architectural details.
- No visual gag barrage. The contrast between earnest serenity and the actual contraband business is the joke. Tiny Dale van is enough.

## Working art file and asset handling

- `assets/map-background-candidate.png` — **latest preferred visual candidate from our design iteration**. Use this exact file to create the initial live-overlay preview. The image shown by itself is not an acceptance test.
- It is a square 1254×1254 source; the game's map currently uses `aspect-ratio: 100 / 104`. **Do not casually use `background-size: cover` if it crops critical locations**. Either adapt the asset/composition for the actual map frame, or use a fitting method that preserves landmark-to-node alignment without distortion. The image must look right on narrow portrait phones.
- Claude may create an optimized WebP for the preview and propose small positioning/contrast adjustments. Do **not** broadly repaint the image or independently generate a different map.

## Current map behavior / source of truth

- Live: https://trihards.github.io/unplugged/
- Repo: https://github.com/trihards/unplugged
- `index.html` defines `.map` with `aspect-ratio: 100 / 104`, renders an underlying SVG landscape, and positions live `.node` interactive overlays from percentage `x` and `y` values in `PLACES`. `HOURS` defines travel times. Verify against the branch being worked on before editing.
- The current map tracks current position and journey eligibility, with travel-hour and estimated-arrival text. Keep all navigation data and interaction logic authoritative in code; **the new image is just a background layer**.
- If existing SVG paths/coastline would visibly conflict with the new art, remove or conceal only the obsolete decorative SVG portions; do not remove interactive nodes or game logic.

## Requested workflow

1. Add the supplied candidate as a **background-only preview**, with existing buttons, labels, travel times, current-place marking and disabled states overlaid.
2. Check it at **small phone widths (especially ~320 and 375 CSS px)** and at the desktop game's narrow central column. Confirm the six visual landmarks actually sit close to the live location markers; if not, identify the smallest layout/art adjustment.
3. Check light and dark modes. The illustration needn't be dark-repainted, but markers and text must have readable contrast in both. If a small backing treatment is needed for labels, it should be subtle and consistent with the game.
4. Share a screenshot of the actual in-game Journey screen with overlays at phone width. **Pause for owner sign-off before final integration/merge.** If the owner wants the art even quieter, make a targeted request for art adjustments rather than designing a replacement illustration autonomously.
5. Once approved, implement the lightest clean solution, optimize the deployed asset and include it in service-worker caching; bump `sw.js` VERSION when changing cached assets.

## Acceptance criteria

- [ ] All six places are recognizable and spatially aligned with their interactive location nodes.
- [ ] Path artwork is connected to every landmark and believable as a single retreat trail network.
- [ ] The image is noticeably simpler than previous detailed watercolor attempts, with adequate label negative space and no baked-in text.
- [ ] In-game markers, names, current-position state, travel time/ETA, disabled destinations, and accessible tap/focus behavior remain intact.
- [ ] Nothing important is cut off, oddly stretched or awkwardly hidden at ~320/375 px phone widths or on wider layouts.
- [ ] Readability survives both light and dark themes and while traveling to different locations.
- [ ] No regression in travel restrictions, navigation, trading, save compatibility, audio, or other screens.
- [ ] Final asset is reasonably sized/optimized and available offline after cache refresh; service worker version is updated.
- [ ] Creator has reviewed and approved an **actual labeled Journey screenshot** before merge/deploy.

## Non-goals / please don't add

No map title, quote, collectible poster treatment, extra information panels, extra destinations, new pathfinding or route math, zoom/pan, animated fog, new sound/music, redesigned navigation, new daily-challenge mechanics, or elaborate map controls. The walking paths are illustration, **not** a request to change the underlying `HOURS` table.

## Report back

State what changed, files/assets touched, screenshot preview(s), phone/light/dark checks and any outstanding adjustments; distinguish prototype integration from merged/deployed behavior. Do not claim live until actually merged and verified.
