# Implementation handoff to Claude

Use only when the creator explicitly approves an idea for coding.

## Task title
[Short name]

## User value / why
[The actual behavior or player feeling we want]

## Current state
- Live: https://trihards.github.io/unplugged/
- Repo: https://github.com/trihards/unplugged
- Observed current behavior: [quote or screenshot/code reference]
- Creative design approved: [decision, not brainstorm]

## Desired behavior
[Specific changes and exact text or assets if approved]

## UX and art/audio considerations
[Mobile behavior; accessibility; sound interactions; sizes; new asset names]

## Acceptance criteria
- [ ] [Observable successful outcome]
- [ ] [Important error case / edge case]
- [ ] [No regression to existing gameplay / save state]
- [ ] [Works at phone sizes and with sound muted]

## Constraints and non-goals
- Preserve existing game mechanics, save compatibility and tone unless change is explicit.
- Favor smallest clean change; inspect the current code first. Claude may propose a better route if the initially suggested method is wasteful.
- Do not modify unrelated systems, invent new features, or silently rewrite creative copy.
- Check static-site deployment, service worker cache and the PWA offline experience where relevant.
- If changing any cached assets, update the service-worker version according to repo README.

## Verify
[Reproduction steps, devices, test checks, deployment check]

## Report back
What changed; files touched; tests run; unresolved questions; any differences from the agreed creative behavior.
