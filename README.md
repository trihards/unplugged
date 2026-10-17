# unplugged

A wellness retreat gone offline. A Drug Wars-style trading game set at a silent digital-detox retreat in Big Sur: buy and sell the contraband the brochure bans, pay off Dale the shuttle driver before his meter eats you, and keep your zen when Guide Saffron comes to check in.

Play it at https://trihards.github.io/unplugged/

## Run it locally

It's a static site with no build step. Serve the folder with any static server:

```
python3 -m http.server 8000
```

then open http://localhost:8000. Opening `index.html` straight from disk mostly works, but browsers block the report card image and offline mode on file:// pages, so use a server.

## Offline

After the first visit the whole game, including the music, is cached by `sw.js`, so it plays with no signal. On a phone, Add to Home Screen gives it its own icon and opens it full screen.

The cache is versioned by the `VERSION` line at the top of `sw.js`. If you edit any file by hand, change that line too (any new value works), or returning players will keep getting the old cached copy.

## What's here

- `index.html`: the whole game (HTML, CSS and JavaScript in one file)
- `assets/img/`: art as WebP
- `assets/audio/`: songs as AAC (.m4a)
- `sw.js`, `manifest.webmanifest`, `icon-*.png`: offline support and home-screen install
- `favicon.svg`, `apple-touch-icon.png`, `og-image.jpg`: icons and the link preview image
- `tools/test/`: regression tests; `tools/sim/`: the balance simulator
- `docs/`: project status, decisions, deferred ideas and handoff briefs

Saves, settings and the guestbook live in the browser's local storage, so each browser starts fresh.

## Credits

After Drug Wars by John E. Dell (1984). Music by TORiTiA. Art by the author.
