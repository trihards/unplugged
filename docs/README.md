# Project docs

Where the project stands and why. The game itself is documented in the root `README.md`; how Claude Code works here is in `CLAUDE.md` and `AGENTS.md`.

- [`status.md`](status.md): what has shipped, what is in progress, what is queued, known issues, and the state of every branch.
- [`decisions.md`](decisions.md): decisions by topic, each labeled with its status.
- [`parking-lot.md`](parking-lot.md): ideas that are explicitly deferred. Nothing there is approved for implementation.
- [`handoffs/`](handoffs/): approved handoff briefs, kept verbatim as delivered. A brief records the direction at the time it was written; later decisions in `decisions.md` take precedence where they differ.

## Status labels

Every decision and plan item carries one of these, and nothing is upgraded without the project owner saying so:

| Label | Meaning |
| --- | --- |
| **Shipped** | Live on `main` and deployed. |
| **Approved** | The owner approved it; it may be implemented or released as described. |
| **Provisionally approved** | Approved to ship, with numbers to be recalibrated from real play. |
| **Proposed** | Claude Code's recommendation, built or drafted, awaiting the owner's decision. Not approved. |
| **Open question** | Needs a decision before work can continue. |
| **Deferred** | Explicitly parked. Not approved; see `parking-lot.md`. |

## Keeping this current

Update `status.md` and `decisions.md` in the same change as anything that ships, merges, or gets decided. Record the owner's decision as stated; when a decision is ambiguous, write it down as an open question rather than guessing.
