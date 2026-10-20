# Gates — what must pass before anything lands

> "You shall not pass."

The implemented diff is a proposal, not a result. Gates are the price of passage:
a plan debate before anyone walks, deterministic checks where they exist, guard
skills where judgment is required, and a two-lane debate before PRs. A gate that
fails sends the work **back** — it is not a wall, it is a door with a hinge.

## The pipeline

0. **Plan debate (judgment, upstream).** Before a single dispatch: the plan is
   attacked by the `plan-debate` seat. Required for multi-file work, lane
   hand-offs, and `complex` tasks; skippable for one-line chores, and always
   reported. Protocol: `references/plan-debate.md`.
1. **Project gates (deterministic)** — the repository's own truth: lint, tests,
   build, typecheck. The orchestrator re-runs them on the final tree; the
   implementer's run is a pre-check, not the proof.
2. **Guard skills (judgment)** — on the diff, by artifact:

   | Artifact | Guard |
   |---|---|
   | Production code | `clean-code-guard` |
   | Tests | `test-guard` |
   | Docs / README / changelog | `docs-guard` |
   | UI changes | the `qa` lane — a clean `palantir` round (the done-gate; see below) |
   | CI / workflows | `github-actions-hardening` |

3. **Land** — the orchestrator commits. Implementers never commit.
4. **PR rounds** — `debate-review` (main + debate lanes) → `babysit-pr` until the
   bot rounds are quiet. Exit 3 = duplicate head sha → rerun with `--force`.

## The three-way verdict

Every guard returns one of three answers. There is no fourth.

| Verdict | Means | What you do |
|---|---|---|
| **pass** | nothing found worth blocking on | land it |
| **bounce** | fixable findings, right lane, right approach | send the findings back to the same implementer session |
| **escalate** | the approach itself is wrong, or the same finding survived a bounce | move the task up: `feature`/`bugfix` → `complex` |

`escalate` is not a punishment and `bounce` is not a retry. A bounce means *the
work is right and the edges are wrong*. An escalation means *the plan was wrong* —
and a second bounce on the same finding is a plan failure wearing a diff.

## The send-back (bounce)

The orchestrator is the review authority. Findings do not become a new task for a
new lane; they go back to the implementer that did the work, in **its own session**,
so it keeps the context it built.

```bash
# same lane, same session — send ONLY the delta brief (the findings)
node "$env:USERPROFILE\.agents\skills\opencode-delegate\scripts\relay.mjs" `
  --brief "C:\path\to\findings.txt" `
  --session ses_... `
  --cd "C:\path\to\repo" `
  --out-dir "C:\path\to\run-artifacts"
```

Rules that keep it honest:

- **Send only the findings.** Not the original brief again — the session already
  has it, and re-sending invites a fresh set of changes. The delta brief is the
  guard's output, verbatim.
- **Cap it at one bounce per finding.** A finding that survives a bounce is
  `escalate`, not a third round. Grinding on one lane is how a small task eats a
  day.
- **Every finding is fixed or explicitly justified** in the commit / PR text.
  Silently ignoring one defeats the gate. A justified rejection is a valid answer;
  a missing one is not.
- The re-run goes through the **same gates again** — a bounce does not get to skip
  the pipeline it just failed.

## clean-code-guard / test-guard / docs-guard

- Run them in the orchestrator session on the changed files — they read the diff
  plus the connected code, not just the patch.
- Findings are ranked; fix or justify each one (above).
- They cut both ways: `test-guard` exists to stop AI test bloat — new tests must
  test behavior the task cares about, not the implementation.

## The standards channel — tell the reviewers what to hunt

`debate-review`'s challenger is **brief-blind**: it receives the diff range and the
findings list, not your intentions. That is a feature — it stops an author from
talking a reviewer out of a finding. The channel you *can* sharpen is the standards
it is handed: `{{STANDARDS}}` auto-includes `AGENTS.md`, `CONTRIBUTING.md`,
`CLAUDE.md`, and `CODING_STANDARDS.md`.

So if your repo has an `AGENTS.md`, offer to add a review section. Something like:

```markdown
## Review standards

Hunt for these failure modes; report each with file:line and a concrete fix:

1. **Scope creep** — changes unrelated to the task.
2. **Invented APIs** — functions, config keys, flags, or endpoints that do not
   exist in the repo or in the pinned dependency versions.
3. **Silent failure** — swallowed exceptions, empty catches, defaults that hide
   an error instead of surfacing it.
4. **Unverified claims** — "tests pass" with no command and no output.
5. **Blast radius** — a shared helper changed to serve one caller; behaviour
   changes reaching code the task never mentioned.
6. **Test bloat** — tests that assert the implementation instead of the behaviour.
7. **Shortcut discipline** — validation, security, and accessibility are never
   shortcut, whatever the ladder says.
8. **Leftovers** — debug logs, commented-out code, TODOs with no owner.
```

**Offer it; never write it yourself.** `AGENTS.md` and its siblings are the user's
agent-instruction files — put the snippet in front of them and let them paste it.

## Why `security-review` is not here

Security review is not a gate in this loop. It is a separate skill
(`getsentry/skills`, tier `optional`) that the user invokes when they want a
security pass. Adding it to the every-diff pipeline would make it a rubber stamp;
leaving it out keeps it meaningful. Point at it; do not run it by default.

## palantír — the UI gate (lane `qa`)

- A UI change is not done until `qa` has a **clean round**: the page's WebMCP tool calls,
  the DOM timeline, and the network HAR, each asserted rather than eyeballed.
- Run by the `qa` lane via the `palantir` skill (ships with this repo). Backend: the
  agent-browser CLI; **WebMCP support is on by default** for a locally launched Chrome.
- **Vision is one deliberate pass at the end**, on the states a human will judge — never
  the mechanism. Interaction is proven from structured evidence.
- Video is **optional** and is not the primary stream. If a round cites video, the file
  must be confirmed present — recording fails silently when ffmpeg lacks the codec.
- A red round is a **bounce to `ui`**, not a note on a finished job.
- `qa` never authors the WebMCP tool file it consumes; `ui` provides it, gated to
  test/dev. See the palantír skill, `references/webmcp.md`.
- `ui-review-loop` (`amelnagdy`, tier `core`) is kept for the case where a human will
  watch a video and comment. It is not this gate.

## debate-review

- Two reviewer lanes by name: `review-main` (any budget) and `review-debate` (the
  stronger / different challenger). Both are read-only by construction (opencode
  `plan` agent / agy sandbox).
- This is **Gate 3**, on a diff. The plan gate (Gate 1) is
  `references/plan-debate.md` — the challenger there is brief-aware by design.
- `--check` is the health pulse: a one-line read-only brief through both lanes,
  prints ok / FAIL each.
- Works on PRs and on local branches (`--local`) before a PR exists.

## babysit-pr

- The post-review loop: verify each bot finding, fix or reply, resolve threads,
  repeat until quiet.
- Needs `gh` authenticated (`gh auth login`, one-time interactive).

## Done criteria — evidence, not vibes

> "The wise speak only of what they know."

Every completion claim carries the exact command and its real output. "It should
work now" is not a gate result; `npm test` → `42 passed` is.
