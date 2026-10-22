---
status: accepted
date: 2026-10-22
---

# Stations, not seat skills — and the skill is the source of truth

The fleet has eleven roles but roughly five crafts. The lane jobs existed only
in a machine-local preambles file that nobody could install, version, or
discover, and a UI task was dispatched to the design-system station — which had
grown interface guidance in its body and built the entire page. So: the crafts
ship as standalone station skills (`galadriel` for the interface, `aragorn` for
server-side work, `legolas` for appearance, `haldir` wrapping `palantir`,
joining `celebrimbor` and `palantir`), the seats stay what they always were —
casting — and each station's lane block is the single source from which the
dispatched preambles are generated, so the prose can no longer live in three
places.

## Considered options

- **Eleven seat skills** — rejected. Six of them (`feature`, `bugfix`, `devops`,
  `chores`, `complex`, and a third review skill) would be casting restated in
  prose: a model plus a budget, not a method. Eleven descriptions in the skill
  list also collide.
- **Factory-only** — rejected. Nobody can adopt one useful piece, and the
  mis-routing that started this recurs, because the crafts keep no home.
- **`preambles.example.md` as the source** — rejected. It would be the third
  copy of the same text (preambles, `loadouts.md`, now skills); the repo already
  needs a checker to keep two byte-identical copies.

## Consequences

- Every station works alone: its own references are the floor, the packs it may
  load are the ceiling. The two verification stations are the exception —
  `haldir` hard-depends on `palantir` and `agent-browser`, `legolas` on an
  existing `DESIGN.md`, and that is correct; a verifier without its instrument
  is not a verifier.
- Guards (`clean-code-guard`, `test-guard`, `docs-guard`) and the Ponytail
  ladder travel inside the code-writing stations as a **preflight** — a floor,
  never the verdict. In the fleet the orchestrator re-runs them on the diff and
  owns the pass/bounce/escalate call; a station never certifies its own work,
  solo or not.
- **Aragorn is server-side only** — API, data model, auth, integrations,
  migrations. Any rendered surface is `galadriel`'s. The two-standard problem
  (two lanes writing UI, one without the design system) is the failure this
  forbids, so a Next.js full-stack repo is two lanes by construction, at the
  cost of a hand-off.
- `shadcn-ui` and the other UI skills move out of the feature lane's belt; the
  manifest stops claiming the pack serves a lane whose station never loads it.
- A `debate-review` GitHub bot is future work, not part of this: it is
  packaging over a stable CLI, a different surface with its own failure mode
  (noise budget), and it waits until the stations it would review are shipped.
