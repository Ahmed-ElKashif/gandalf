# Casting — roles, postures, rules

Deep guide: the gandalf skill's `references/fleet.md` (same repo). This page is
what the council needs to cast well.

## The roles

| Role | Profile it needs | Walks when |
|---|---|---|
| `feature` | strongest all-round coder your budget allows | everyday product work |
| `ui` | good with visuals + long horizons (multimodal helps) | anything a human will look at |
| `bugfix` | reasoning-heavy; patient with root causes | something broke |
| `devops` | fast; deterministic edits | pipelines, workflows, hooks |
| `chores` | cheap; steady | bumps, renames, cleanups |
| `complex` | frontier reasoning — the premium seat | gnarly architecture, subtle concurrency, long marches |
| `qa` | text-only is fine; sceptical, patient, drives a browser | verifying a running UI — the behaviour done-gate for `ui` |
| `qa-look` | **vision-capable** — this is the vision seat | judging appearance against `DESIGN.md` |
| `plan-debate` | a strong, **different** reasoning model | the plan debate, before anything is dispatched |
| `review-main` | a second opinion; any budget | debate-review main pass |
| `review-debate` | a different, stronger challenger | debate-review challenger |

## The third judge — `plan-debate`

Seven roles **walk**, three **judge**, one **verifies**: `plan-debate`, `review-main` and
`review-debate` judge; `qa` verifies the running UI and gates `ui`; `qa-look` is the eye.
`plan-debate` is the optional third judge — the seat that attacks the *plan* before
a single hobbit is dispatched (gandalf skill, `references/plan-debate.md`).

- **Ask about it** in the posture step: *"Want a third judging seat to stress-test
  the plan before we dispatch?"* Then say plainly what happens if they decline —
  the `review-debate` seat carries both jobs, and the cast is still legal.
- Cast it onto the strongest model that is **not** the orchestrator's own. A plan
  debated against itself proves nothing. Two seats on the same model is a
  legitimate budget choice — but say so, so nobody mistakes it for a second opinion.
- It needs no code skills: the loadout is `domain-modeling` (invent the edge cases
  the plan forgot), `systematic-debugging`, `receiving-code-review`.

## How to cast a role

1. Match the profile to what each **installed** CLI can reach (use discovery
   output): opencode reaches any configured provider — including local models via
   Ollama / LM Studio; agy reaches the Antigravity model set; claude reaches
   Claude models; codex reaches OpenAI models; cursor reaches its own model list.
2. Write one line per role: `implementer` + `model` (+ a dial only where the
   implementer supports it).
3. Free-first posture: **use `presets/free-first.json` verbatim.** Subscription /
   local postures: every model id comes from the user's answer or discovery —
   never invented.

## The postures

### Free-first (the shipped preset)

| Role | Member | Why |
|---|---|---|
| `feature` | `opencode/deepseek-v4.1-flash-free` | strongest free agentic coder |
| `ui` | `opencode/glm-5.3-flash-free` (variant `high`) | long-horizon craft; chooses among the frontend skills |
| `bugfix` | `opencode/nemotron-3-ultra-free` | reasoning-heavy |
| `devops` | `opencode/nemotron-3.5-lightning-free` | small and fast |
| `chores` | `opencode/minimax-m3.1-flash-free` | cheapest seat |
| `complex` | `agy` — `claude-opus-4-6-thinking` | frontier, one deep pass |
| `qa` | `opencode/nemotron-3-ultra-free` | text-only gate — behaviour, assertions, verdict |
| `qa-look` | `opencode/nemotron-3.5-super-vl-free` | **the only free vision model** — the appearance pass is its irreplaceable job |
| `plan-debate` | `agy` — `claude-opus-4-6-thinking` | the plan's challenger (Radagast) |
| `review-main` | `opencode/longcat-2.5-preview-free` | probe-selected second opinion |
| `review-debate` | `agy` — `claude-opus-4-6-thinking` | the challenger |

**`qa-look` needs vision.** It is the one role where image input is not a nice-to-have:
the appearance pass cannot be done from a diff, a DOM tree, or a HAR. At cast time, check
which models actually accept images — do not infer it from a name — and say plainly which
seat got the only vision model. If the budget allows exactly one, it belongs to `qa-look`.

`qa` itself needs no vision: behaviour is asserted from structured evidence. That is what
makes the split free — the judge stops being its own witness, and the single vision seat
moves to the seat whose only job is looking.

### Subscriptions

Ask what they pay for and what to spare. Everyday roles go onto a Sonnet-class
model via `claude-delegate`; the frontier seat stays for `complex`. Exact model
ids come from the relay's own skill or discovery. Every dial labelled `your
answer`.

### Local + mixed

opencode lanes onto the local provider (`ollama/…`, `lmstudio/…` — per
discovery), one cloud seat kept for `complex`. Same method, different members.

## Basis and the addendum rule

Every lane carries a Basis: `preset` / `your answer` / `my opinion` /
`schema requirement`. In free-first mode the preset legitimately sets the dials.
In the other postures the user's answer gates the dials — opinions of your own
go in an addendum *after* the table ("Want my picks for effort levels? Say the
word."), never pre-filled into the JSON they are about to approve. An
unanswered question shrinks the map; it never licenses a substitution.

## Budget policy

Strength where the road is dark, cheap where it's flat. The `complex` seat and
one strong reviewer stay reserved; everything else is burnable. One deep pass on
a frontier model beats ten retries on a cheap one — and free models do real work
when they are cast for the right roles.
