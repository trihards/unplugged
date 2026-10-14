# unplugged

A static, single-file browser game: `index.html` holds all HTML, CSS and JavaScript, and there is no build step. Serve it with `python3 -m http.server 8000`. See `README.md` for layout and offline behavior.

## Working here

- Read `AGENTS.md` for roles, the model hierarchy, when to delegate to the `scout`, `builder` and `verifier` subagents, and how much verification a change needs.
- Regression tests: `node tools/test/run.mjs [suites…]` (see `tools/test/README.md`). They run in Chromium, desktop and mobile emulation, and do not verify iPhone Safari; audio and offline changes also need the README's manual iPhone checklist.
- The project owner decides product and creative questions; ChatGPT writes approved handoffs; Claude Code implements them. Don't widen scope, invent gameplay or reword approved text. If a handoff leaves a decision open, recommend instead of choosing.
- Preserve humor, randomness, balance, mobile usability (375 px first), audio behavior (iOS Safari is the hard case) and saved progress unless a change is explicitly authorized.
- Old saves must keep loading: give any new `S` field a default in `continueRun()`.
- Changing any cached file means bumping `VERSION` in `sw.js`, and new assets must be added to its lists.
- Songs must be AAC `.m4a`; iPhone Safari won't reliably play Opus.
