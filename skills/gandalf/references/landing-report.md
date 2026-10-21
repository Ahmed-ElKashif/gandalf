# Landing report — the one checkpoint

> *"The wise speak only of what they know."*

This is the single place the user is re-engaged. Gandalf produces it after the
last gate runs, stops, and waits for an explicit yes before committing. Assemble it
from `run.json`, each lane's `result.json`, and your own gate output — not from
memory and not from the lane's final message.

## Template

```markdown
# Landing report — <task title>

## Run
- Manifest: `<runDir>/run.json`
- Lanes: <lane — relay/model — worktree>

## What changed
- <lane> — <one-line summary> (`<file1>`, `<file2>`, …)
- …

## Session 0 (intake)
- Fleet: <cast source — preset / global / project>
- Design language: <DESIGN.md path | forged by celebrimbor | none — qa-look skipped>
- Landing preference: commit / push / PR
- Complexity: <complex | not complex> — <one-line reason>
- Plan debate: held | skipped — <reason>

## Gate 1 — plan debate (Radagast)
- Verdict: plan holds | plan fails → re-planned | skipped
- Objections folded: <list>
- Objections rejected (with reasons): <list>

## Gate 2 — project gates + guards
- <lint/test/build command> → <real output>
- clean-code-guard: pass | bounce → fixed | escalate
- test-guard: pass | bounce → fixed | escalate | n/a
- docs-guard: pass | bounce → fixed | escalate | n/a
- github-actions-hardening: pass | bounce → fixed | escalate | n/a
- qa (palantír): clean round | red round → bounced to ui | n/a
- qa-look: advisory findings | clean | n/a

## Gate 3 — review debate
- review-main + review-debate: clean | findings (list) | not cast — skipped

## Diff (pre-commit)
- Working tree vs base: `git diff --stat <base>`: <paste>
- Per-lane worktrees (if not merged yet): `git -C <worktree> diff --stat <base>`: <summary>
- Files touched: <n> — <matches the debated plan? yes/no>
- Key hunks: <file:line — what and why>

## Open items / justified rejections
- <finding> — justified: <reason + file:line / test / standard>  (or "none")

## Proposed commit message
```
<type>(<scope>): <subject>

<body>
```

## Landing question
Commit / push / open PR? (per Session 0 scope)
```

## Rules

- Every claim carries the exact command and its real output. "Tests pass" is a
  claim; `npm test → 42 passed` is evidence.
- A gate that was skipped is named and reasoned, never silently omitted.
- Gate 3 is the **local** debate: it runs on the combined working tree (or each lane's
  worktree) before this report. The post-push PR round is the same protocol again, not
  a substitute.
- A finding that was fixed is shown as fixed (with the diff); a justified
  rejection is shown with its reason and a repo fact (file:line, test, or documented
  standard); an open item is shown as open.
- If the plan debate was skipped and any rubric trigger was present (multi-file,
  lane hand-off, `complex`, ambiguous requirements, or a prior lane failure), the
  report says the skip was wrong and that the debate ran before commit. The
  mechanical check is in `references/plan-debate.md`.
- Gandalf does not commit without an explicit yes. The commit is the
  orchestrator's act; the implementer never commits.
- If the user says no, Gandalf stops and leaves the tree as it is. He does not
  re-run gates unless asked.