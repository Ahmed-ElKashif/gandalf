# Casting the fellowship — roles, members, dials

gandalf leads **eleven roles**: eight that **walk** (`feature`, `ui`, `bugfix`,
`devops`, `chores`, `complex`, `qa`, `qa-look`) and three that **judge**
(`plan-debate`, `review-main`, `review-debate`). `qa` is the UI behaviour gate;
`qa-look` is the eye. The roles are **fixed wire names** — `delegate-setup`
resolves lanes by them, and `debate-review` expects `review-main` and
`review-debate` by name. The members behind the roles are yours: any
delegation-capable CLI + model. Canonical map: `references/fellowship.md` and
`roles.json`.

`plan-debate` is cast by default when a suitable model is available. Whether it
is *used* on a given task is Gandalf's complexity call (rubric in
`references/plan-debate.md`), never a user question. If the seat is uncast, the
`review-debate` seat carries the work.

## The roles

| LOTR name | Wire name | Profile it needs | Walks when |
|---|---|---|---|
| **Aragorn** | `feature` | strongest all-round coder your budget allows | everyday product work on any of the stack packs |
| **Galadriel** | `ui` | good with visuals + long horizons (multimodal helps) | anything a human will look at |
| **Elrond** | `bugfix` | reasoning-heavy; patient with root causes | something broke |
| **Gimli** | `devops` | fast; deterministic edits | pipelines, workflows, hooks |
| **Samwise** | `chores` | cheap; steady | bumps, renames, cleanups |
| **Glorfindel** | `complex` | frontier reasoning — the premium seat | the Balrog: gnarly architecture, subtle concurrency, long marches |
| **Haldir** | `qa` | **text-only is fine**; patient, sceptical, drives a browser | verifying a running UI — the behaviour gate for `ui` |
| **Legolas** | `qa-look` | **vision-capable** — this is the vision seat | judging appearance against the design language |
| **Radagast** | `plan-debate` | a strong, *different* reasoning model | the plan's challenger — before anything is dispatched |
| **Faramir** | `review-main` | a second opinion; any budget | debate-review main pass |
| **Saruman** | `review-debate` | a different, stronger challenger | debate-review challenger |

Cast `plan-debate` onto the strongest model that is **not** the orchestrator's own:
a plan debated against itself proves nothing. Uncast, it falls back to the
`review-debate` seat.

### Why `qa` and `qa-look` are two seats

They were one, and that was a structural conflict of interest: the seat that **judged**
the UI was also the only seat that could **see** it. A witness that is also the judge
cannot be cross-examined — the green check that proves nothing.

So the work is split by standard, not by volume:

- **`qa`** gates **behaviour**. It runs `palantír`: the page's own WebMCP tools, the DOM
  timeline, and the network HAR, each asserted rather than eyeballed. Its verdict is
  **pass or bounce**, and a red round bounces to `ui`. It holds no opinion on looks.
- **`qa-look`** judges **appearance only** — does the rendered result match `DESIGN.md`.
  It is the **only** seat that needs vision. Its verdict is advisory and can never
  override `qa`: a beautiful broken page still fails.

Cast `qa-look` onto a model with **vision** — it is the only seat that requires it, and
the appearance pass is the one thing no structured stream can do. A text-only model runs
`qa` perfectly well, so if your budget allows one vision seat it goes to `qa-look`.

## How to cast a role

1. List your delegate-capable CLIs. `amElnagdy/delegate-skills` ships relays for
   **opencode, agy, Claude Code, Codex, Cursor, and Warp** — install the ones you
   have (`npx skills add amElnagdy/delegate-skills -g -y`).
2. Match profiles to what each CLI can reach: opencode reaches any configured
   provider (including **local models** via Ollama / LM Studio), agy reaches the
   Antigravity model set, claude reaches Claude models, codex reaches OpenAI
   models, and so on.
3. Write one line per role in the fleet config — `implementer` + `model` (+ dial).
4. Validate and write:

   ```bash
   node <delegate-setup>/scripts/config.mjs validate <file>
   node <delegate-setup>/scripts/config.mjs write --scope global <file>
   node <delegate-setup>/scripts/config.mjs load
   ```

Every relay follows the same contract — brief in, structured report + touched files
out, never commits — so the loop never changes when you re-cast a role.

## Example fleets

### free-first (example: no paid seats)

`presets/free-first.json` — free OpenCode models + Antigravity for the dark roads:

| Role | Member | Why |
|---|---|---|
| `feature` | `opencode/deepseek-v4.1-flash-free` | the strongest free agentic coder of its time (top usage share, ~90.6 Terminal-Bench / ~74.2 DeepSWE at build time) |
| `ui` | `opencode/glm-5.3-flash-free` (variant `high`) | long-horizon coherence and craft — it now chooses among the frontend skills rather than carrying the evidence burden |
| `bugfix` | `opencode/nemotron-3-ultra-free` | reasoning-heavy |
| `devops` | `opencode/nemotron-3.5-lightning-free` | small and fast |
| `chores` | `opencode/minimax-m3.1-flash-free` | cheapest seat, steady on mechanical edits |
| `complex` | `agy: claude-opus-4-6-thinking` | frontier reasoning, one deep pass |
| `qa` | `opencode/nemotron-3-ultra-free` | text-only gate — behaviour, evidence, verdict |
| `qa-look` | `opencode/nemotron-3.5-super-vl-free` | **the only free vision model** — and appearance is the one thing no other stream can judge |
| `plan-debate` | `agy: claude-opus-4-6-thinking` | the plan's challenger (Radagast) |
| `review-main` | `opencode/longcat-2.5-preview-free` | probe-selected: caught that the obvious fix for a planted defect was itself wrong |
| `review-debate` | `agy: claude-opus-4-6-thinking` | the challenger |

The honest trade of a free-only fleet: `complex`, `plan-debate` and `review-debate` all
ride agy Opus, so the two debate judges are the same model. The orchestrator is not a
lane — it is the session you are in.

Note the split costs **no extra vision model**: `qa` moved to a text-only seat it can run
perfectly well, and `qa-look` keeps the single vision seat. Same eleven seats, and the
judge is no longer the only witness.

### subscription

For a Claude (or similar) seat — cast the everyday roles onto a Sonnet-class model
via `claude-delegate`, keep Opus for `complex`:

```json
{ "feature": { "implementer": "claude", "model": "sonnet" },
  "ui":      { "implementer": "claude", "model": "sonnet" },
  "complex": { "implementer": "claude", "model": "opus" } }
```

(Exact model ids per the relay's own skill — flags and naming there are canonical.)

### local-first

For a GPU on the desk — point opencode at your local provider and cast the flat
roads locally, keeping one cloud seat for hard days:

```json
{ "feature": { "implementer": "opencode", "model": "ollama/qwen3-coder" },
  "chores":  { "implementer": "opencode", "model": "ollama/qwen3-coder" },
  "complex": { "implementer": "agy", "model": "claude-opus-4-6-thinking" } }
```

## Dials

- **opencode lanes** — `variant` where the model declares one (`low | high | max`).
  Leave it off where unsupported.
- **agy lanes** — no separate effort flag works for thinking models. The
  **model label is the effort**: `claude-opus-4-6-thinking`,
  `gemini-3.8-flash-high|medium|low`, `gpt-oss-120b-medium`. Passing `--effort` to a
  thinking model errors out — swap labels instead.
- **Other relays** — whatever their own skill documents. Explicit flags at dispatch
  time always beat lane config.

## Config anatomy

```json
{
  "version": "delegate-fleet.v1",
  "lanes": {
    "feature": { "implementer": "opencode", "model": "opencode/deepseek-v4.1-flash-free", "variant": "high" },
    "complex": { "implementer": "agy", "model": "claude-opus-4-6-thinking" }
  }
}
```

Per lane: `implementer`, `model`, and one dial — `variant` for opencode, the model
label for agy. Start from `templates/fleet.template.json`; `presets/free-first.json`
is one example, not a default.

The `implementer` field is also the **relay** that walks the lane: `fellowship.mjs`
reads this config and dispatches the lane through that CLI. A plan that names a
different relay is refused before anything runs — the relay would refuse it anyway at
dispatch time, after the lane had already burned a worktree and produced nothing.
`--allow-relay-mismatch` downgrades that refusal to a warning for the case where the
config is stale and the plan is right.

## Swapping a lane

1. Edit your working copy of the fleet JSON.
2. Validate, write, load (the three commands above); the last prints the effective
   lanes — confirm your change landed.
3. Ad-hoc single dispatches can override with `--model` / `--variant` without
   touching the config.

## Budget policy

- **Cast to budget.** Strength where the road is dark, cheap where it's flat. The
  free-first preset is one example (that's how gandalf was born); the method stays
  identical on a subscription or local fleet.
- **Premium, deliberately.** Keep the `complex` seat and the judging seats
  (`plan-debate`, `review-debate`) reserved. One deep pass on a frontier model beats
  ten retries on a cheap one.
- **Re-cast freely.** A one-line change moves a role; nothing else in the loop
  notices.
