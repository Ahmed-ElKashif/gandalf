# Arming — what each role carries

**Source of truth: `packs.json`, in this skill's folder.** Do not hand-maintain a
list here. Each entry carries `tier`, `roles`, `install`, `provides` and `why`;
the README's Credits section is generated from the same entries in the same
order. A pack cannot be installed unless it is credited, and cannot be credited
unless it is installed from that file.

Check what is already installed:

```bash
npx skills ls -g
```

Then arm the delta — never re-install what is present.

## The tiers

| Tier | Installed by default | Entries |
|---|---|---|
| `core` | **yes** | relays + `delegate-setup`, review pair, guards, Ponytail, the orchestrator and judging loadouts, UI evidence |
| `ui` | **yes** | Emil's craft, taste-skill, ibelick UI kit, `frontend-design`, Vercel React |
| `stack` | no — on demand | Supabase, Prisma, MongoDB, NestJS, `wshobson/agents`, shadcn, LangChain, GSAP |
| `devops` | no — on demand | `ci-cd-and-automation`, `github-actions-templates`, `github-actions-hardening` |
| `optional` | **never automatically** | `security-review` — outside the loop by design |

`defaultTiers` in `packs.json` decides the default. Install `stack` packs only
for repos that actually use the framework; install `ui` always (a fleet with no
craft packs produces UI nobody wants to look at).

## Order matters

**`amElnagdy/delegate-skills` installs first, always.** It ships the relays and
the `delegate-setup` engine every `--lane` dispatch resolves through — so the
user can choose their implementers before anything is cast. Then the rest, in
file order.

## Role → packs

Read this from `packs.json` (`roles` on each entry). Condensed:

| Role | Carries |
|---|---|
| `orchestrator` | guards · `writing-plans` · `grilling` · `to-tickets` · `code-review` |
| `plan-debate` | `domain-modeling` · `systematic-debugging` · `receiving-code-review` |
| `review-main` / `review-debate` | `debate-review` · `domain-modeling` · `systematic-debugging` · `receiving-code-review` |
| `qa` | **`palantir`** (ships with this repo) · `agent-browser` · `systematic-debugging` — the UI behaviour gate |
| `qa-look` | **`palantir`** (appearance pass) · `agent-browser` — the vision seat; judges against `DESIGN.md` |
| `feature` | stack packs for the repos in use + Ponytail |
| `ui` | Emil's craft + motion, taste-skill, ibelick UI kit, `frontend-design`; GSAP only when GSAP is in the deps |
| `bugfix` | `systematic-debugging` · `verification-before-completion` · `diagnosing-bugs` · `tdd` |
| `devops` | CI/CD packs + workflow hardening |
| `chores` | `setup-pre-commit` · `to-spec` · `improve-codebase-architecture` |
| `complex` | none — the model is the loadout |

## Two runtime requirements worth stating plainly

- Relays resolve `--lane` through the **`delegate-setup`** skill installed beside
  them. It arrives with the `delegate-skills` pack; keep it installed.
- The `review-main` / `review-debate` lanes need **`debate-review`**. It arrives
  with the `review-skills` pack.

## Outside the loop

`security-review` (`getsentry/skills`, Apache-2.0) is tier `optional` and is
**not** part of the gandalf flow — not a guard gate, not run on every diff. Point
the user at it when they ask for a security pass.

Exact commands for every pack: `packs.json`. The full per-role narrative:
`references/loadouts.md` in the gandalf skill.
