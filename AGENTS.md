# Agents

How Claude Code works on **unplugged**: one lead agent who owns the work, and three small subagents it can hand bounded jobs to. This is a small browser game; most tasks need no subagent at all.

## Who decides what

- **The project owner** makes every product and creative decision.
- **ChatGPT** is the creative collaborator. It writes approved content, UX direction and implementation handoffs.
- **Claude Code** implements. A handoff is a spec to build, not permission to redesign systems, invent gameplay, rewrite dialogue or widen scope. When a handoff leaves a decision open, return a recommendation instead of silently choosing.

Unless a change is explicitly authorized, preserve the game's humor, randomness, balance, mobile usability, audio behavior and saved progress. Approved dialogue and copy go in verbatim.

## Model hierarchy

| Role | Agent | Model | Effort | Edits files |
| --- | --- | --- | --- | --- |
| Lead: planning, architecture, hard debugging, integration, final quality control | main session | `claude-opus-5-5` | high | yes |
| Focused implementation | `builder` | `claude-sonnet-5-5` | medium (high when needed, see below) | yes |
| Testing, regression, mobile/UI and diff review | `verifier` | `claude-sonnet-5-5` | high | no (temporary test scripts outside the repo only) |
| Exploration and impact analysis | `scout` | `claude-haiku-5-5` | medium | no |

The lead's model and effort are pinned in `.claude/settings.json`. Each subagent's are pinned in the frontmatter of its file in `.claude/agents/`. Full model IDs are used on purpose: aliases such as `sonnet` resolve differently by release and provider.

## When the lead delegates (and when it doesn't)

Delegation has to be useful, not ceremonial. Spawning an agent costs time and tokens, and every agent re-reads context. The default is that the lead just does the work; it delegates when that clearly saves context, saves cost or gets a better result.

**`scout` (Haiku, read-only).** Send it when answering "where/how does X work" or "what would this change touch" would otherwise mean reading large stretches of `index.html`: tracing a mechanic, finding every place that reads a save field, listing the handbook text that describes a behavior. Don't send it when the lead already knows where the change goes, or for a search the lead can run with one grep.

**`builder` (Sonnet).** Send it once the plan is settled and the change is bounded and substantial: a bug fix, a CSS or layout pass, wiring approved copy or a new asset into several places, a contained refactor. Pass `effort: "high"` on the Agent call when the job crosses systems (for example, saves plus audio) or needs real debugging. Hand it the exact scope, what `scout` already found, and any approved text word for word. Don't send it a trivial edit (a typo, one value, one line of copy, a `VERSION` bump): the lead makes those directly. The game is one file, so there is never more than one writer at a time.

**`verifier` (Sonnet, high, read-only).** Send it for independent verification at the level the lead chooses (below), and for standalone mobile or UI reviews. It finds defects, regressions, scope creep and changed copy, and reports them. It never fixes application code; the lead or `builder` fixes, then re-verifies. Don't send it for documentation-only changes or for a tiny change the lead can check with one focused test.

**The lead keeps:** the plan, anything involving balance, audio-lifecycle design, save-format changes or creative interpretation, debugging that resists a first attempt, integrating results, choosing the verification level, and the final review.

## Verification levels

The lead decides how much verification a change needs and stays accountable for reviewing the results. Test runs use the harness in `tools/test/` (see its README):

| Level | When | What runs |
| --- | --- | --- |
| **Focused** | Tiny, low-risk changes: copy, a value, a style tweak, docs | The lead checks the affected behavior directly, usually `node tools/test/run.mjs static` plus the one relevant suite. No `verifier`. Docs-only changes need nothing. |
| **Standard** | Moderate changes within one area | The relevant suites (for example `trading encounters`) plus a diff review, by the lead or `verifier`. |
| **Full** | High-risk or cross-system changes | The whole suite, `verifier`'s integration and diff review, and the manual iPhone checklist items that apply, handed to the owner. |

Always at least **Standard**, and usually **Full**, for changes to save data, trading or price calculations, encounter or decoy logic, the audio lifecycle, the service worker, or major UI behavior. A change that touches audio or the service worker also lists which manual iPhone checks remain, because automated runs use Chromium and do not verify iPhone Safari.

Three kinds of testing, never to be confused in a report:

- **Desktop browser:** automated, headless Chromium at a desktop size.
- **Mobile emulation:** automated, Chromium at phone sizes with touch events. It catches layout and tap problems, not Safari behavior.
- **Physical device:** manual, on an iPhone. It is the only way to verify iOS audio unlocking, interruptions, and the home-screen app.

## Delegation rules

1. The lead stays responsible for architecture, planning, integration and difficult calls.
2. Delegate only meaningful, bounded work that saves context, saves cost or improves quality. Prefer a few purposeful delegations over many small ones.
3. Don't spawn a subagent for something the lead can finish faster itself.
4. Don't explore the same files twice. Pass what `scout` found to `builder` and `verifier` instead of having them rediscover it.
5. Run agents in parallel only when their tasks are genuinely independent.
6. Never let two agents edit overlapping files at once. In practice, at most one writer touches `index.html` at a time.
7. Keep reports short and actionable. Each agent file defines its report format.
8. Use the cheapest model that can do the job well, not the cheapest one available.
9. Don't downgrade a hard task to save tokens. Raise effort, or keep the task with the lead.
10. The lead reviews all integrated work and confirms that existing behavior still holds before anything is committed.

## Examples

- **Fix a typo in Dale's dialogue** (approved): the lead edits it, runs `static`, done. No agents.
- **Restyle the van sheet for small phones:** the lead edits it, or hands it to `builder` if it is a multi-rule CSS pass, then runs `layout`. `verifier` only if the change spreads beyond the sheet.
- **A new commodity with save migration and journal changes:** `scout` maps the touch points if the lead doesn't already know them; the lead or `builder` implements, one writer; `verifier` runs the full suite and reviews the diff; the owner gets the relevant iPhone checks.

## Maintaining this

Keep it to three agents unless a recurring job clearly doesn't fit any of them. When new model versions ship, update the IDs in `.claude/settings.json` and in each agent's frontmatter together, then check them against the installed Claude Code version. When a behavior changes on purpose, update its test in the same change. When a known issue is fixed, remove its `expectFail`.
