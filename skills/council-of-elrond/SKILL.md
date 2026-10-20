---
name: council-of-elrond
description: >-
  Convene the council that forms your delegation fleet — gandalf-style casting:
  arm the machine from packs.json, ask one grounding question, cast the ten roles
  (feature, ui, bugfix, devops, chores, complex, qa, qa-look, plan-debate, review-main,
  review-debate) onto the CLIs and models you actually have, write the
  delegate-fleet config, generate lane preambles, and verify the cast. Use when the
  user asks to set up, cast, muster, or configure a delegation fleet, install the
  fleet on a new machine, or decide which model should handle which kind of work.
  Triggers: "set up the fleet", "cast the fellowship", "muster the lanes",
  "council of Elrond".
license: MIT
compatibility: >-
  Requires Node 18+. Ships its own copy of the discovery/validation engine
  (vendored from amElnagdy/delegate-skills, MIT) — nothing else is needed to
  cast. Relays resolve --lane through the delegate-setup skill at dispatch time.
metadata:
  version: 1.0.0
---

# Council of Elrond

> *"You have been chosen... to set out... on the quest of the Ring."*

You convene the council. Your job: **cast the fellowship** — turn the CLIs and
models actually installed on this machine into a working delegation fleet
(`delegate-fleet.v1` config), lane preambles, and a verified cast.

You author configuration. You never dispatch coding work.

- **This skill** casts the fleet (setup mode).
- **`gandalf`** (same repo) runs the fleet day to day.
- **`delegate-setup`** (amElnagdy/delegate-skills) is the neutral alternative with a
  deeper interview flow — point there for exotic per-CLI dials. This skill ships
  its own copy of the engine (`scripts/`), so casting needs nothing else installed.

One concept: **lanes**. A lane names an implementer and optional dials.

## Hard rules

1. Every lane **must** include `implementer` — a key from `scripts/implementers.mjs`.
2. Dials only where the implementer supports them: opencode uses `variant`, not
   `effort`, and opencode lanes require `model`; agy encodes effort in the model
   label. The registry (`scripts/implementers.mjs`) is authoritative.
3. Show the lane table **and** the full JSON before every write; re-show after
   every tweak.
4. Write **only** after explicit approval ("yes", "approve", "write it").
5. Ask scope unless already clear: **global** (all projects) vs **this repo only**.
   Never create a project file just because cwd is a git repo. No git repo →
   default global and say so.
6. Never invent model identifiers. Use what discovery reported, the shipped
   preset, or the user's own words.
7. Every lane carries a **Basis**: `preset` / `your answer` / `my opinion` /
   `schema requirement`. Beyond the preset, your own dial picks are offered as an
   addendum after the table — never pre-filled silently.
8. The eleven roles are the standard cast: eight that **walk** (`feature`, `ui`,
   `bugfix`, `devops`, `chores`, `complex`, `qa`, `qa-look`) and three that **judge**
   (`plan-debate`, `review-main`, `review-debate`). Fewer is fine when the user
   asks for less; never more without asking. `plan-debate` is the optional third
   judge — ask about it, and say plainly what falls back if they decline.
   `qa` is the UI **behaviour** gate and needs no vision; `qa-look` is the **eye**
   (the only vision seat) and its verdict cannot override `qa`. Splitting them stops
   the judge from being its own witness.
9. Never edit `AGENTS.md`, `CLAUDE.md`, or other user agent-instruction files.
10. Never dispatch coding work from this skill. Verification runs are read-only
    health checks only.
11. Arm from `packs.json` (shipped inside this skill) — the single source of truth
    for what to install and what to credit. Never hand-roll an install list. Show
    the delta table, take one approval, install in file order, `delegate-skills`
    first. Re-arms show only what changed.

(`<skill-dir>` = this skill's folder — the one containing this `SKILL.md`.)

## Flow

`preflight → arm → discover → load → posture → cast → approve & write → preambles → verify & hand off`

Arming runs **before** discovery on purpose: the cast can only be built from CLIs
and relays that are actually on the machine.

### 0. Preflight

Node 18+. Confirm the engine is intact:

```bash
node "<skill-dir>/scripts/config.mjs" --help
```

### 1. Arm

Read `packs.json` (in this skill's folder — `<skill-dir>/packs.json`) — the single
source of truth for what to install **and** what to credit. Show **one table** of the
delta: what is missing, its tier, its licence, and which roles it serves. Then take
**one** approval.

Install in file order through the skills CLI. `delegate-skills` **first, always**
— it ships the relays and the `delegate-setup` engine, so the user can choose
their implementers before you cast:

```bash
npx skills add amElnagdy/delegate-skills -g -y     # first, always
# …then the remaining core + ui entries, in packs.json order
```

Only `defaultTiers` (`core`, `ui`) install by default. `stack` and `devops` are
offered per repo. `optional` (`security-review`) is **never** installed
automatically — it lives outside the loop.

Two runtime requirements worth stating plainly, both satisfied by the core tier:

- Relays resolve `--lane` through the **`delegate-setup`** skill installed beside
  them — keep it installed.
- The `review-main` / `review-debate` lanes need **`debate-review`**.

Detail, tiers and the per-role mapping: `references/arming.md`.

### 2. Discover

```bash
node "<skill-dir>/scripts/discover.mjs"
```

Summarize: installed vs missing CLIs, auth (`true` / `false` / `null` = unknown),
and whether models were `reported` / `aliases` / `unsupported` / `failed`.

### 3. Load existing

```bash
node "<skill-dir>/scripts/config.mjs" load --cwd "$PWD"
```

- Nothing configured → proceed.
- A fleet exists → show the effective lanes (with their `source`), then ask:
  keep it, or re-cast? Never silently overwrite.

### 4. Posture — one question

Ask **one** question, then stop asking:

> How should I cast? **(1) Free-first** — the zero-budget fellowship: six free
> OpenCode models plus Antigravity for the dark roads. **(2) Your subscriptions** —
> tell me what you pay for and what to spare, and I'll cast against those.
> **(3) Local + mixed** — tell me your provider or GPU setup.

### 5. Cast

- **(1) Free-first** → `presets/free-first.json`, cast **verbatim**
  (Basis: `preset`).
- **(2) Subscriptions** → map profiles to the installed, authenticated CLIs the
  user named; every dial from their answer (Basis: `your answer`).
- **(3) Local + mixed** → opencode lanes onto the user's local provider;
  keep one cloud seat for `complex`. Model ids from discovery or the user —
  never invented.

Role profiles and per-posture casting details: `references/casting.md`.

Show the table:

| Lane | Implementer | Model | Variant / effort | Basis |
|---|---|---|---|---|

then the **full JSON**. Your own dial opinions travel only as an addendum after
the table — "Want my picks for effort levels? Say the word." — never pre-filled.

### 6. Approve & write

Scope question (rule 5), then explicit approval, then:

```bash
node "<skill-dir>/scripts/config.mjs" validate <file>
node "<skill-dir>/scripts/config.mjs" write --scope global|project [--cwd <dir>] <file>
node "<skill-dir>/scripts/config.mjs" load --cwd "$PWD"    # confirm
```

### 7. Preambles

Adapt `templates/preambles.example.md` to the actual cast: update each role's
example-cast parenthetical to the real member; keep the standing rules. Show the
result, then write it to the fleet's config directory:

- `$XDG_CONFIG_HOME/delegate-skills/preambles.md` when `XDG_CONFIG_HOME` is set,
  otherwise `~/.config/delegate-skills/preambles.md`.

If a preambles file already exists, show what changes before overwriting.
Note it is a family convention: relays do not read it automatically — the
orchestrator prepends the matching role block to every brief.

### 8. Verify & hand off

- `config.mjs load` shows the cast (already done in step 6).
- Resolve every lane with its own implementer:

```bash
node "<skill-dir>/scripts/lane.mjs" resolve --cwd "$PWD" --lane <name> --implementer <key>
```

- Reviewer lanes configured → run the health pulse:

```bash
node ~/.agents/skills/debate-review/scripts/review-pr.mjs --check
```

- Offer (do not run) one read-only smoke dispatch through a relay.
- Hand off: *"The fellowship is mustered. For daily operations, load the
  `gandalf` skill."*

## Worked example (posture 1 — free-first)

> **User:** set up my fleet, I'm broke.
>
> **Council:** arm → `packs.json` read; the delta is the UI tier plus Ponytail;
> one table shown, one approval, `delegate-skills` installed first.
> → discover → "opencode and agy detected; opencode models reported."
> → load → nothing configured. → posture 1 → propose `presets/free-first.json`
> verbatim (Basis: `preset`).
> → ask: cast a third judge for the plan debate? Yes → `plan-debate` onto agy Opus.
> → show table + JSON → approve → validate → `write --scope global` → load ok.
> → preambles adapted to the free-first members, shown, written.
> → pulse: `review-main ok · review-debate ok`.
> → *"The fellowship is mustered. Load `$gandalf` for daily ops."*

## References

| File | Contents |
|---|---|
| `packs.json` (this skill's folder) | The manifest — what to install and what to credit |
| `references/casting.md` | Role profiles, budget postures, casting + Basis rules |
| `references/arming.md` | Tiers, install order, per-role mapping |
| `NOTICE.md` | MIT attribution for the vendored engine |
| `scripts/` | Vendored discovery/config/lane engine (delegate-setup v0.5.0) |
