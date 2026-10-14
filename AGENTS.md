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
| Testing, regression, mobile/UI and diff review | `verifier` | `claude-sonnet-5-5` | high | no (scratch test scripts only) |
| Exploration and impact analysis | `scout` | `claude-haiku-5-5` | medium | no |

The lead's model and effort are pinned in `.claude/settings.json`. Each subagent's are pinned in the frontmatter of its file in `.claude/agents/`. Full model IDs are used on purpose: aliases such as `sonnet` resolve differently by release and provider.

## When the lead delegates

**`scout` (Haiku, read-only).** Send it when answering "where/how does X work" or "what would this change touch" would otherwise mean reading large stretches of `index.html`. Typical uses: tracing a mechanic, finding every place that reads a save field, listing the handbook text that describes a behavior. Don't send it for a single grep the lead can run itself.

**`builder` (Sonnet).** Send it once the plan is settled and the change is bounded: a bug fix, a CSS or layout adjustment, wiring approved copy or a new asset, a contained refactor, or a mechanical edit. Pass `effort: "high"` on the Agent call when the job crosses systems (for example, saves plus audio) or needs real debugging. Hand it the exact scope and any approved text word for word. Mechanical chores also go to the builder or the lead: the game is one file, and a second writing agent would only add edit conflicts.

**`verifier` (Sonnet, high).** Send it after any meaningful change, before committing or merging, for an independent headless-browser run and diff review. It also does standalone mobile or UI reviews. It reports; it does not fix.

**The lead keeps:** the plan, anything involving balance, audio-lifecycle design, save-format changes or creative interpretation, debugging that resists a first attempt, integrating results, and the final check that existing behavior is preserved.

## Delegation rules

1. The lead stays responsible for architecture, planning, integration and difficult calls.
2. Delegate only meaningful, bounded work that saves context, saves cost or improves quality.
3. Don't spawn a subagent for something the lead can finish faster itself.
4. Don't send several agents to explore the same files. Reuse what `scout` already found.
5. Run agents in parallel only when their tasks are genuinely independent (for example, `scout` mapping one system while `verifier` tests another).
6. Never let two agents edit overlapping files at once. In practice, at most one writer touches `index.html` at a time.
7. Ask for short, actionable reports. Each agent file defines its report format.
8. Use the cheapest model that can do the job well, not the cheapest one available.
9. Don't downgrade a hard task to save tokens. Raise effort, or keep the task with the lead.
10. The lead reviews all integrated work and confirms that existing behavior still holds before anything is committed.

## A typical substantial task

1. The lead reads the handoff and decides the plan; `scout` maps the touch points if the area is unfamiliar.
2. The lead implements the delicate parts itself and hands bounded pieces to `builder`, one writer at a time.
3. `verifier` runs the regression checks and reviews the diff.
4. The lead fixes or re-delegates what failed, re-verifies, then commits and reports, including what remains untested (real iPhone Safari, for anything touching audio).

## Maintaining this

Keep it to three agents unless a recurring job clearly doesn't fit any of them. When new model versions ship, update the IDs in `.claude/settings.json` and in each agent's frontmatter together, then check them against the installed Claude Code version.
