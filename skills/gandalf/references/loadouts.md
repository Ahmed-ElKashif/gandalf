# Loadouts — the premium skill set per role

Every implementer walks with a belt of skills. Roles decide *who* walks; loadouts
decide *what they carry*. Install commands below are the verified sources (as
recorded in the skills lockfile) — all go through the skills CLI, so any
skill-aware agent on the machine picks them up.

Full batch in one go: `scripts/install-skills.ps1`. Or install role by role from
this file.

## Core — the machinery every fleet needs

| Pack | Command | Ships |
|---|---|---|
| Relays + setup | `npx skills add amElnagdy/delegate-skills -g -y` | `opencode-delegate`, `agy-delegate`, `claude-delegate`, `codex-delegate`, `codex-background`, `cursor-delegate`, `warp-delegate`, `delegate-setup` |
| Review pair | `npx skills add amElnagdy/review-skills -g -y` | `debate-review`, `babysit-pr` |
| Guards | `npx skills add amElnagdy/guard-skills -g -y` | `clean-code-guard`, `test-guard`, `docs-guard` |
| Ponytail | `npx skills add DietrichGebert/ponytail -g -y` | `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help` |
| UI evidence | `npx skills add amelnagdy/ui-review-loop -g -y` | `ui-review-loop` |
| Browser backend | `npx skills add vercel-labs/agent-browser -g -y` | `agent-browser` (used by ui-review-loop) |

**Not in Core:** `security-review` (`getsentry/skills`, Apache-2.0, tier `optional`)
is deliberately outside the loop — a separate skill the user invokes when they want a
security pass, not a guard gate. See `gates.md`.

`packs.json` (in the `council-of-elrond` skill) is the canonical list (tiers,
licences, install order, the README credits). This file is the per-role narrative.

## `orchestrator` — the guide

Not a lane; the seat you are sitting in. The loadout here is aimed at *you*, not at
a relay: they are the skills the orchestrator runs in its own session.

| Pack | Command | Ships |
|---|---|---|
| Plan discipline | `npx skills add obra/superpowers -g -y -s writing-plans executing-plans` | `writing-plans` shapes the brief the plan debate attacks; `executing-plans` for multi-step landings |
| Interrogation | `npx skills add mattpocock/skills -g -y -s grilling to-tickets code-review` | `grilling` empties the request of assumptions, `to-tickets` splits the plan, `code-review` is the diff pass |
| Guards | `npx skills add amElnagdy/guard-skills -g -y` | `clean-code-guard` / `test-guard` / `docs-guard` — they run *in the orchestrator session* |

`grilling` and `code-review` auto-trigger; `to-tickets` and the `*-guard` skills are
user-invoked and must be **named** in the flow to fire.

## `feature` — the all-rounder

Stack packs — install the ones your repos actually use:

| Stack | Command |
|---|---|
| Supabase / Postgres | `npx skills add supabase/agent-skills -g -y` |
| Prisma | `npx skills add prisma/skills -g -y` |
| MongoDB | `npx skills add mongodb/agent-skills -g -y` |
| NestJS | `npx skills add kadajett/agent-nestjs-skills -g -y` |
| Next.js · Tailwind · TypeScript · GH Actions templates | `npx skills add wshobson/agents -g -y -s nextjs-app-router-patterns tailwind-design-system typescript-advanced-types github-actions-templates` |
| shadcn | `npx skills add shadcn-ui/ui -g -y` |
| LangChain / LangGraph | `npx skills add langchain-ai/langchain-skills -g -y` |
| React perf + view transitions | `npx skills add vercel-labs/agent-skills -g -y` |

Plus the discipline pair (also `bugfix`): `systematic-debugging` and
`verification-before-completion` when things break mid-task.

## `ui` — the crafter

| Pack | Command | Highlights |
|---|---|---|
| Emil's craft + motion | `npx skills add emilkowalski/skills -g -y` | `emil-design-eng`, `animate` family, `mobile-native`, `review-animations`, `improve-animations`, `apple-design` |
| Taste pack (art direction) | `npx skills add Leonxlnx/taste-skill -g -y` | `design-taste-frontend` (+ v1 / v2-experimental), `minimalist-ui`, `high-end-visual-design`, `redesign-existing-projects`, `imagegen-*` |
| UI systems kit | `npx skills add ibelick/ui-skills -g -y` | `baseline-ui`, `improve-ui`, `create-design-md`, `fixing-accessibility`, `fixing-metadata`, `fixing-motion-performance`, `component-canvas`, `ui-skills-root` |
| Frontend-design (identity asks) | `npx skills add anthropics/skills -g -y -s frontend-design` | `frontend-design` |
| GSAP (only when GSAP is in the deps) | `npx skills add greensock/gsap-skills -g -y` | `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-react`, … |

## `bugfix` — the debugger

| Pack | Command | Ships |
|---|---|---|
| Superpowers subset | `npx skills add obra/superpowers -g -y -s systematic-debugging verification-before-completion writing-plans executing-plans receiving-code-review` | the TDD/debug/verify discipline |
| Matt's engineering kit | `npx skills add mattpocock/skills -g -y -s diagnosing-bugs tdd codebase-design domain-modeling to-spec improve-codebase-architecture setup-pre-commit writing-for-agents wizard grilling to-tickets code-review` | root-cause diagnosis, spec-first refactors, pre-commit setup |

## `devops` — the plumber

| Pack | Command | Ships |
|---|---|---|
| CI/CD habits | `npx skills add addyosmani/agent-skills -g -y -s ci-cd-and-automation` | pipeline patterns |
| GH Actions authoring | `npx skills add wshobson/agents -g -y -s github-actions-templates` | workflow templates |
| GH Actions hardening | `npx skills add github/awesome-copilot -g -y -s github-actions-hardening` | injection / privilege review — run on every workflow edit |

## `chores` — the mechanic

No dedicated pack: the mechanic borrows from the kit above —
`setup-pre-commit`, `to-spec`, `improve-codebase-architecture`, `writing-plans`,
`executing-plans` — and lives by the Ponytail ladder.

## `complex` — the Balrog-slayer

The model is the loadout. Its preamble (slow & thorough, plan written into the
run, verify between steps) is what shapes the pass; no skill packs required.

## `plan-debate` / `review-main` / `review-debate` — the judges

Three seats, one loadout. A judge needs to invent the case the author did not, find
the root cause in the diff, and take criticism without capitulating to it.

- `domain-modeling` — invent the edge-case scenarios the plan (or diff) forgot.
- `systematic-debugging` — the root-cause ladder; a judge who names a symptom is
  not a judge.
- `receiving-code-review` — how to hold a position under pushback and how to yield
  when the objection is right. The anti-sycophancy discipline; without it a
  challenger folds on the second reply.

Lane wiring:

- `plan-debate` — Gate 1, the plan's challenger, read-only. Protocol:
  `plan-debate.md`. Falls back to the `review-debate` seat when uncast.
- `review-main` / `review-debate` — Gate 3. `debate-review` owns both lanes
  (read-only by construction) — main pass + challenger. Health pulse:
  `node …/debate-review/scripts/review-pr.mjs --check`.
- `babysit-pr` runs the post-review rounds.
- The guards (`clean-code-guard` / `test-guard` / `docs-guard`) run in the
  orchestrator session on every diff — see `gates.md`.
- `ui-review-loop` + `agent-browser` + `ffmpeg` for any UI evidence.

## Notes

- Headless implementers pick up skills from the shared store **on every run**.
  An interactive orchestrator may need a session restart to see new ones.
- Quantity is not quality: the belt exists so each role loads *its* few skills —
  loading everything into one dispatch is its own failure mode.
- `-y` accepts prompts; the CLI symlinks into every detected agent (`--copy`
  forces real copies). Symlinks mean `skills update` re-links — preferred.
