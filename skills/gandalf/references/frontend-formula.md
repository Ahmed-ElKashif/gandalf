# The frontend formula — moved

This file used to carry the `ui` role's formula: the design system first, the
per-surface recipes, the arbitrations, the done-gate. It was written for the
orchestrator to hand a lane. The crafts now travel with the lane itself.

**The formula is now the `galadriel` station** — read `skills/galadriel/`.

| It used to say | Where it lives now |
|---|---|
| Design system first; forge or audit with `celebrimbor` | `galadriel/SKILL.md` — the one rule |
| Per-surface recipes and arbitrations | `skills/galadriel/references/surface.md` |
| Real content in every slot — no wireframe | `skills/galadriel/references/content.md` |
| Declared states + the WebMCP tool file | `skills/galadriel/references/states.md` |
| The done-gate: `qa` verifies, `qa-look` judges | `skills/galadriel/references/handoff.md` |
| The build-time traps (Tailwind v4, grids, gaps) | `skills/galadriel/references/build.md` |

Nothing in the rules changed; only the address did. The lane block in
`galadriel/SKILL.md` (marker `gandalf:lane-block wire="ui"`) is the source the
preambles are generated from — this stub exists so the links above keep
resolving and the move stays visible.
