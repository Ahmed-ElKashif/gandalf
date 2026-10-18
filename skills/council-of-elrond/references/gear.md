# Gear — what each role carries

Condensed from the gandalf skill's loadout table (full version:
`references/loadouts.md` in the gandalf skill). Check what is installed
(`npx skills ls -g`), then offer the commands for what is missing.

## Core — every fleet

| Pack | Command | Ships |
|---|---|---|
| Relays + runtime setup | `npx skills add amElnagdy/delegate-skills -g -y` | `opencode-delegate`, `agy-delegate`, `claude-delegate`, `codex-delegate`, `codex-background`, `cursor-delegate`, `warp-delegate`, `delegate-setup` |
| Review pair | `npx skills add amElnagdy/review-skills -g -y` | `debate-review`, `babysit-pr` |
| Guards | `npx skills add amElnagdy/guard-skills -g -y` | `clean-code-guard`, `test-guard`, `docs-guard` |
| Ponytail discipline | `npx skills add DietrichGebert/ponytail -g -y` | `ponytail`, `ponytail-review`, `ponytail-audit`, … |
| UI evidence | `npx skills add amelnagdy/ui-review-loop -g -y` | `ui-review-loop` |

Runtime note: relays resolve `--lane` through the **`delegate-setup`** skill
installed beside them, and the reviewer lanes need **`debate-review`** — both
arrive with the commands above.

## Per role

| Role | Packs to check for |
|---|---|
| `feature` | stack packs for the repos in use — `supabase/agent-skills`, `prisma/skills`, `mongodb/agent-skills`, the `wshobson/agents` subset, `shadcn-ui/ui`, `langchain-ai/langchain-skills`, `vercel-labs/agent-skills` |
| `ui` | `emilkowalski/skills`, `Leonxlnx/taste-skill`, `ibelick/ui-skills`, `anthropics/skills -s frontend-design`; the GSAP pack only when GSAP is already in the deps |
| `bugfix` | the `obra/superpowers` subset (`systematic-debugging`, `verification-before-completion`, …) and the `mattpocock/skills` subset |
| `devops` | `addyosmani/agent-skills -s ci-cd-and-automation`, `wshobson/agents -s github-actions-templates`, `github/awesome-copilot -s github-actions-hardening` |
| `chores` | no dedicated pack — borrows `setup-pre-commit`, `to-spec`, `improve-codebase-architecture` |
| `complex` | none — the model is the loadout |
| `review-main` / `review-debate` | `debate-review` + guards; `ui-review-loop` + `agent-browser` + `ffmpeg` for UI evidence |

Exact commands for every pack live in the gandalf skill's
`references/loadouts.md` — that file is the canonical list.
