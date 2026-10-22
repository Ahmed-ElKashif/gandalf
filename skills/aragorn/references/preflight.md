# Preflight — the floor before you report

You write code, so you carry the checks a reviewer would run. They are a
**floor**: they make your report honest. They are never the verdict — in the
fleet the orchestrator re-runs them on the diff and owns pass / bounce /
escalate; solo, the operator reads your evidence and decides. A station that
certifies its own work has stopped being a station.

## 1. The Ponytail ladder — on the solution

Stop at the first rung that holds:

needs to exist? → already in the codebase? → stdlib? → platform feature? →
installed dependency? → one line? → minimum that works + one small test.

Lazy about the *solution*, never about the reading. Validation, security and
data safety are exempt — never shortcut those three; a security fix is never
"too small to matter" and a destructive migration is never "too routine to
note".

## 2. The guards — on the diff

In order, after the last edit:

1. **`clean-code-guard`** — every code change.
2. **`test-guard`** — if tests changed (and a handler without a test is a
   rumour: status codes, permission denials and validation branches are the
   tests worth having).
3. **`docs-guard`** — if docs changed, or the change altered the API contract
   an existing doc documents.

Guards run automatically. Never ask permission to run a guard; never report
before running them.

## 3. The fallback checklist

When a guard is not installed, check the same things by hand and say so:

- dead code, unused exports, duplicated logic
- swallowed errors and empty catch blocks — a `500` the client cannot
  distinguish from a bug is often one of these
- tests that assert nothing, or that pass for the wrong reason
- routes that check auth inconsistently with their neighbours
- migrations that mix expand with contract, or drop without a `--DROP` file
- docs, comments and types that no longer match the routes

## 4. Evidence

Paste the real command and its real output: migration output, the HTTP calls
per behaviour, seeded row counts, test output, and the guards. A claim without
output is a rumour. If something failed and you fixed it, paste both.

## 5. Report shape

Files changed · commands + output · the seam list (what renders, left to
`galadriel`) · the API-state inventory · the contract file · what you did
**not** verify. Never commit: the orchestrator reviews the diff and commits,
and solo the operator does.
