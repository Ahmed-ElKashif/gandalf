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
| `core` | **yes** | relays + `delegate-setup`, review pair, guards, Ponytail, the orchestrator and judging loadouts, UI evidence (`palantír`), `agent-browser` |
| `ui` | **yes** | Emil's craft, taste-skill, ibelick UI kit, `frontend-design`, Vercel React |
| `stack` | no — on demand | Supabase, Prisma, MongoDB, NestJS, `wshobson/agents`, shadcn, LangChain, GSAP |
| `devops` | no — on demand | `ci-cd-and-automation`, `github-actions-templates`, `github-actions-hardening` |
| `optional` | **never automatically** | `security-review` — outside the loop by design; `ui-review-loop` — opt-in video rounds |

`defaultTiers` in `packs.json` decides the default. Install `stack` packs only
for repos that actually use the framework; install `ui` always (a fleet with no
craft packs produces UI nobody wants to look at).

## Order matters

**`amElnagdy/delegate-skills` installs first, always.** It ships the relays and
the `delegate-setup` engine every `--lane` dispatch resolves through — so the
user can choose their implementers before anything is cast. Then the rest, in
file order.

## Verified patches — after every install

Some upstream skills are correct in shape but wrong in a way this fleet cannot live
with. `patches/manifest.json` records those fixes as exact unified diffs, and arming
applies them **after** the installs, so a reinstall repairs itself instead of
silently dropping the fix:

```bash
node "<skill-dir>/scripts/patch-skills.mjs" check   # verify; exit 1 if pending or drifted
node "<skill-dir>/scripts/patch-skills.mjs" apply   # idempotent; safe to re-run
```

| State | Meaning |
|---|---|
| `applied` | the diff reverse-checks — the fix is present |
| `pending` | the diff applies cleanly — run `apply` |
| `skipped` | the skill is not installed and the patch is optional (`ui-review-loop`) |
| `missing` | a **required** skill is not installed — the arm is incomplete |
| `drift` | upstream changed the code the patch was written against — **stop** |

`drift` is the point of the mechanism: the verifier refuses to guess. Inspect the
diff, update `patches/<id>.patch` and the `upstreamCommit` in `manifest.json`, then
re-run. Never force a patch onto code it was not written for. Requires `git` on
PATH; `git apply` is the engine. `--dry-run` and `--json` exist for CI.

## Did it actually land?

The upstream installer sometimes prints "Failed to install N skills" even when
every skill is on disk (an upstream defect). Do not re-run the install on that
message — it clobbers the patches above. Confirm instead:

```bash
node skills/gandalf/scripts/verify-install.mjs
```

It walks the repo's `skills/` and compares each one against `~/.agents/skills/`
file-by-file (line endings normalised), reporting `installed` / `missing` /
`drift`. Re-run the install only when a skill is genuinely `missing`, then
`patch-skills.mjs apply`. `install-skills.ps1` runs this check itself.

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
| `ui` | Emil's craft + motion, taste-skill, ibelick UI kit, `frontend-design`; `celebrimbor` to forge/read `DESIGN.md` before dispatch; GSAP only when GSAP is in the deps |
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

`ui-review-loop` (`amelnagdy/ui-review-loop`, Apache-2.0) is also tier `optional`
now. It is the human-watches-video loop — **never** the `ui`/`qa` evidence path;
`palantír` is. Install it only when the user asks for recorded video rounds. When
it is present, the patch step keeps its version gate and its video honesty fixes.

Exact commands for every pack: `packs.json`. The full per-role narrative:
`references/loadouts.md` in the gandalf skill.
