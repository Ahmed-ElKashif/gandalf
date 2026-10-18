---
name: council-of-elrond
description: >-
  Convene the council that forms your delegation fleet — gandalf-style casting:
  ask one grounding question, cast the eight roles (feature, ui, bugfix, devops,
  chores, complex, review-main, review-debate) onto the CLIs and models you
  actually have, write the delegate-fleet config, generate lane preambles, check
  the gear, and verify the cast. Use when the user asks to set up, cast, muster,
  or configure a delegation fleet, install the fleet on a new machine, or decide
  which model should handle which kind of work. Triggers: "set up the fleet",
  "cast the fellowship", "muster the lanes", "council of Elrond".
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
8. The eight roles are the standard cast. Fewer is fine when the user asks for
   less; never more without asking.
9. Never edit `AGENTS.md`, `CLAUDE.md`, or other user agent-instruction files.
10. Never dispatch coding work from this skill. Verification runs are read-only
    health checks only.

(`<skill-dir>` = this skill's folder — the one containing this `SKILL.md`.)

## Flow

`preflight → discover → load → posture → cast → approve & write → preambles → gear → verify & hand off`

### 0. Preflight

Node 18+. Confirm the engine is intact:

```bash
node "<skill-dir>/scripts/config.mjs" --help
```

### 1. Discover

```bash
node "<skill-dir>/scripts/discover.mjs"
```

Summarize: installed vs missing CLIs, auth (`true` / `false` / `null` = unknown),
and whether models were `reported` / `aliases` / `unsupported` / `failed`.

### 2. Load existing

```bash
node "<skill-dir>/scripts/config.mjs" load --cwd "$PWD"
```

- Nothing configured → proceed.
- A fleet exists → show the effective lanes (with their `source`), then ask:
  keep it, or re-cast? Never silently overwrite.

### 3. Posture — one question

Ask **one** question, then stop asking:

> How should I cast? **(1) Free-first** — the zero-budget fellowship: six free
> OpenCode models plus Antigravity for the dark roads. **(2) Your subscriptions** —
> tell me what you pay for and what to spare, and I'll cast against those.
> **(3) Local + mixed** — tell me your provider or GPU setup.

### 4. Cast

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

### 5. Approve & write

Scope question (rule 5), then explicit approval, then:

```bash
node "<skill-dir>/scripts/config.mjs" validate <file>
node "<skill-dir>/scripts/config.mjs" write --scope global|project [--cwd <dir>] <file>
node "<skill-dir>/scripts/config.mjs" load --cwd "$PWD"    # confirm
```

### 6. Preambles

Adapt `templates/preambles.example.md` to the actual cast: update each role's
example-cast parenthetical to the real member; keep the standing rules. Show the
result, then write it to the fleet's config directory:

- `$XDG_CONFIG_HOME/delegate-skills/preambles.md` when `XDG_CONFIG_HOME` is set,
  otherwise `~/.config/delegate-skills/preambles.md`.

If a preambles file already exists, show what changes before overwriting.
Note it is a family convention: relays do not read it automatically — the
orchestrator prepends the matching role block to every brief.

### 7. Gear

Check each role's skill packs against `references/gear.md`; report a short
checklist and offer install commands for what's missing. Two runtime
requirements worth stating plainly:

- Relays resolve `--lane` through the **`delegate-setup`** skill installed beside
  them — keep it installed (`npx skills add amElnagdy/delegate-skills -g -y`).
- The `review-main` / `review-debate` lanes need **`debate-review`**
  (`npx skills add amElnagdy/review-skills -g -y`).

### 8. Verify & hand off

- `config.mjs load` shows the cast (already done in step 5).
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
> **Council:** discover → "opencode and agy detected; opencode models reported."
> → posture 1 → propose `presets/free-first.json` verbatim (Basis: `preset`).
> → show table + JSON → approve → validate → `write --scope global` → load ok.
> → preambles adapted to the free-first members, shown, written.
> → gear: relays ok · review pair ok · ponytail ok — three UI packs missing,
> offered.
> → pulse: `review-main ok · review-debate ok`.
> → *"The fellowship is mustered. Load `$gandalf` for daily ops."*

## References

| File | Contents |
|---|---|
| `references/casting.md` | Role profiles, budget postures, casting + Basis rules |
| `references/gear.md` | Role → skill packs + install commands |
| `NOTICE.md` | MIT attribution for the vendored engine |
| `scripts/` | Vendored discovery/config/lane engine (delegate-setup v0.5.0) |
