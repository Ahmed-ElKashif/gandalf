# Casting the fellowship — roles, members, dials

gandalf leads eight roles: six that walk (implementers) and two that judge
(reviewers). The roles are **fixed wire names** — `delegate-setup` resolves lanes by
them, and `debate-review` expects `review-main` and `review-debate` by name. The
members behind the roles are yours: any delegation-capable CLI + model.

## The roles

| Role | Profile it needs | Walks when |
|---|---|---|
| `feature` | strongest all-round coder your budget allows | everyday product work on any of the stack packs |
| `ui` | good with visuals + long horizons (multimodal helps) | anything a human will look at |
| `bugfix` | reasoning-heavy; patient with root causes | something broke |
| `devops` | fast; deterministic edits | pipelines, workflows, hooks |
| `chores` | cheap; steady | bumps, renames, cleanups |
| `complex` | frontier reasoning — the premium seat | the Balrog: gnarly architecture, subtle concurrency, long marches |
| `review-main` | a second opinion; any budget | debate-review main pass |
| `review-debate` | a different, stronger challenger | debate-review challenger |

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

### free-first (the shipped preset)

`presets/free-first.json` — five free OpenCode models + Antigravity for the dark roads:

| Role | Member | Why |
|---|---|---|
| `feature` | `opencode/deepseek-v4.1-flash-free` (variant `high`) | the strongest free agentic coder of its time (top usage share, ~90.6 Terminal-Bench / ~74.2 DeepSWE at build time) |
| `ui` | `opencode/glm-5.3-flash-free` (variant `high`) | multimodal input + long-horizon coherence — what UI work asks for |
| `bugfix` | `opencode/nemotron-3-ultra-free` | reasoning-heavy |
| `devops` | `opencode/nemotron-3.5-lightning-free` | small and fast |
| `chores` | `opencode/longcat-2.5-preview-free` | long-context mechanics, cheapest seat |
| `complex` | `agy: claude-opus-4-6-thinking` | frontier reasoning, one deep pass |
| `review-main` | `opencode/big-pickle` | free, opinionated debate partner |
| `review-debate` | `agy: claude-opus-4-6-thinking` | the challenger |

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
label for agy. Start from `presets/free-first.json` or `templates/fleet.template.json`.

## Swapping a lane

1. Edit your working copy of the fleet JSON.
2. Validate, write, load (the three commands above); the last prints the effective
   lanes — confirm your change landed.
3. Ad-hoc single dispatches can override with `--model` / `--variant` without
   touching the config.

## Budget policy

- **Cast to budget.** Strength where the road is dark, cheap where it's flat. The
  shipped preset happens to be free-first (that's how gandalf was born) — the
  method stays identical on a subscription or local fleet.
- **Premium, deliberately.** Keep the `complex` seat (and one strong reviewer)
  reserved. One deep pass on a frontier model beats ten retries on a cheap one.
- **Re-cast freely.** A one-line change moves a role; nothing else in the loop
  notices.
