# Regression tests

A small harness that loads the real game in headless Chromium and checks the behavior most likely to break: trading, Guide Saffron encounters, decoys, saves, audio state, phone layouts, core progression and the offline cache. It tests the game as it is; it doesn't define new rules.

## Running

From the repo root:

```
node tools/test/run.mjs                      # everything, about 80 seconds
node tools/test/run.mjs trading encounters   # just those suites
node tools/test/run.mjs static               # no browser, under a second
node tools/test/run.mjs --list               # every suite and test
node tools/test/run.mjs --root ../other-copy # test another checkout
```

The exit code is 0 when nothing failed. Each line reads `pass`, `FAIL`, `skip` (the check can't run here, for example no git history to compare against), `xfail` (a known issue, expected to fail) or `XPASS` (a known issue that now passes: remove its `expectFail` in `suites.mjs` so the test guards the fix).

Optional environment variables: `TEST_BASE` (branch the cache-version check compares against, default `origin/main`), `TEST_TIMEOUT` (seconds per test, default 60), `PLAYWRIGHT_MODULE` (path to a Playwright install).

## Requirements

Node 18 or later, plus Playwright with Chromium. Cloud sessions already have both. On a laptop: `npm i -D playwright && npx playwright install chromium`, run once anywhere Node can find it. Nothing else: no ffmpeg, no Python, no test framework. The harness serves the repo itself, and it writes no files.

## Suites

| Suite | Runs in | Covers |
| --- | --- | --- |
| `static` | no browser | scripts parse; every image and song exists; `sw.js` lists every asset and only real files; cache `VERSION` changed if cached files changed (skipped when the base branch isn't available) |
| `smoke` | desktop Chromium | boot; every retreat length starts correctly; walking spends hours and compounds Dale's debt; quiet hours and resting; checkout scoring; What's New and the version label (Options and in-game menu), with the newest note first; the PREVIEW badge and separate preview storage under `/preview/` (at 320 and 390 wide), and neither in the live game; handbook section marks; journey map taps, target size and labels; Dale-Fi companion cards, credits, every song-acquisition path (including the Kitchen Garden find, Radical Acceptance on the fourth or fifth Labyrinth visit with no hint of where, and a real walk to the Meditation Hall, first find and repeat); the header journal icon, upgrades and collection persistence |
| `trading` | desktop Chromium | buy limits (cash, space and stock), selling and cost basis, goods not traded here, price ranges, market supply (stock differs by spot, sold out, no same-day refill, overnight refill, a crash brings stock once per spot per day, a spike brings none, saved with the run), selling any quantity at the full price, circulation (what you let go of is for sale there again, location-specific, saved, never trimmed), sold out shown on Let go too and told apart from cash and space, Dale's van (pay, borrow cap, stash), cushion upgrade |
| `encounters` | desktop Chromium | Saffron can't be dismissed; failed and successful escapes; hand over; donate; empty cushion; snapping at zero zen; decoys (pulled people stay gone, fanny pack, endurance if present); decoy offer prices and cap; the journal records each round's goods and zen, and getaways |
| `debt` | desktop Chromium | any debt at checkout, even $1, is the Dale Fail at every length (wealthy, modest, broke, negative net worth); the original takeaways with no debt; could-pay and couldn't-pay copy; snapping unchanged; guestbook keeps real net worth; report card; balance reminders without announcing the ending; Dale's notes (balance, zen, journal, stop when paid, threshold); his morning check-ins (once a day while owed, varied lines, no zen, none when square, older saves); calm moments name no time of day; the airport line breaks between sentences; the complete journal after checkout, last 20 during play; what the journal records (no entry for a quiet walk, time and place on the first entry at each stop, gossip with the good and its price, offers shown whether taken or not, songs with how they were found, the ending and whether Dale was paid); new runs start clean |
| `saves` | desktop Chromium | reload and continue; Save and leave; older saves missing fields; corrupt save; new run replaces save; guestbook top ten; the one-time 1.5 guestbook reset (only the guestbook, and only once); 1.5 save fields get defaults; sound and volume settings |
| `audio` | desktop Chromium, songs stubbed | Dale-Fi play and track memory; mute and unmute; muted Saffron; muting mid-theme; event songs (Dale payoff, endings, Dale's unpaid-tab cue) never overlap the Dale-Fi; her theme replaces the Dale-Fi and it returns at full volume; deliberate pause survives; leaving the app; two iOS-rule emulations |
| `layout` | Chromium mobile emulation at 320×568, 375×667, 390×844 with touch; plus desktop | no sideways scrolling on every main screen; bottom buttons on screen and at least 40px; check-in buttons reachable and tappable; Dale's ending art fits; Review your journal reachable after checkout; header journal, Dale-Fi and menu icons 40px and on screen |
| `offline` | desktop Chromium, service worker on | installs, caches every listed file, reloads with no network |

## What this does and doesn't prove

There are three different levels of testing, and only the first two are automated:

1. **Desktop browser (automated).** Chromium at a desktop size. This verifies game logic, saves, and Chromium's audio behavior.
2. **Mobile emulation (automated).** Chromium at phone sizes with touch events. This catches layout overflow, buttons pushed off screen and taps that don't land. It is not Safari, and it doesn't reproduce iOS fonts, safe areas, the address bar, or WebKit rendering.
3. **A physical iPhone (manual).** The only way to verify iOS Safari audio and the home-screen app.

Songs are swapped for quiet generated WAV files, because Chromium can't decode the AAC the game uses. The iOS audio tests switch on approximations of iOS rules (only one player at a time, refused `play()`). They catch regressions in how the game *responds* to those situations; they do not prove the game works on an iPhone.

## Manual iPhone checklist

Use this when a change touches audio, the service worker or home-screen install, or layout near the screen edges. It takes about ten minutes in Safari, plus the home-screen app if the change touches offline behavior.

1. **First sound.** Fresh load, tap Begin, open the Dale-Fi, press play. Music starts on the first press, with the ringer switch both on and off.
2. **Saffron.** Carry goods until she appears. Her theme plays, the Dale-Fi drops out, then comes back quietly after the theme and at full volume when you carry on.
3. **Leaving mid check-in.** While her theme plays, switch to another app for 10 seconds, come back, finish the check-in. Music returns, at the latest after one more tap.
4. **Interruptions.** With music playing: lock the phone and unlock; pull down Control Center; trigger Siri or receive a call or alarm. After each, music resumes or resumes on the next tap. Nothing shows up on the lock screen.
5. **Pause and mute.** Pause the Dale-Fi, meet Saffron, carry on: it stays paused. Mute all sound from the menu, close and reopen the app: still muted.
6. **Volume.** The Dale-Fi + and − buttons change the volume (element volume is read-only on iOS, so this exercises the game's own gain).
7. **Home-screen app.** Add to Home Screen, open it, play a song, turn on Airplane Mode, force-quit and reopen. The game and the music still load.
8. **Edges.** On a phone with a notch or Dynamic Island, the header, the bottom buttons and the Saffron screen clear the safe areas, and nothing scrolls sideways.

Write down the iOS version and device with the result.
