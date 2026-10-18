# Gates — what must pass before anything lands

> "You shall not pass."

The implemented diff is a proposal, not a result. Gates are the price of passage:
deterministic checks where they exist, guard skills where judgment is required, and
a two-lane debate before PRs.

## The pipeline

1. **Project gates (deterministic)** — the repository's own truth: lint, tests,
   build, typecheck. The orchestrator re-runs them on the final tree; the
   implementer's run is a pre-check, not the proof.
2. **Guard skills (judgment)** — on the diff, by artifact:

   | Artifact | Guard |
   |---|---|
   | Production code | `clean-code-guard` |
   | Tests | `test-guard` |
   | Docs / README / changelog | `docs-guard` |
   | UI changes | `ui-review-loop` (recorded browser evidence) |
   | CI / workflows | `github-actions-hardening` |
   | Security-sensitive code | `security-review` |

3. **Land** — the orchestrator commits. Implementers never commit.
4. **PR rounds** — `debate-review` (main + debate lanes) → `babysit-pr` until the
   bot rounds are quiet. Exit 3 = duplicate head sha → rerun with `--force`.

## clean-code-guard / test-guard / docs-guard

- Run them in the orchestrator session on the changed files — they read the diff
  plus the connected code, not just the patch.
- Findings are ranked; each one is fixed or explicitly justified in the commit /
  PR text. Silently ignoring a finding defeats the gate.
- They cut both ways: `test-guard` exists to stop AI test bloat — new tests must
  test behavior the task cares about, not the implementation.

## ui-review-loop

- A UI change is not done until the loop shows it working: recorded video + DOM
  timeline + network evidence, reviewed on a local site.
- Backend: the agent-browser CLI (`npx agent-browser` auto-installs on first run);
  `ffmpeg` is required for recording.
- Prefer it over screenshots — and over ad-hoc browser pokes — for anything a human
  will look at.

## debate-review

- Two reviewer lanes by name: `review-main` (any budget) and `review-debate` (the
  stronger / different challenger). Both are read-only by construction (opencode
  `plan` agent / agy sandbox).
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
