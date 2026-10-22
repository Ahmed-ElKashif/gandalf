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
accessibility are exempt — never shortcut those three.

## 2. The guards — on the diff

In order, after the last edit:

1. **`clean-code-guard`** — every code change.
2. **`test-guard`** — if tests changed (and there should be a test when the
   ladder stops at "minimum that works + one test").
3. **`docs-guard`** — if docs changed, or the change altered documented
   behaviour.

Guards run automatically. Never ask permission to run a guard; never report
before running them.

## 3. The fallback checklist

When a guard is not installed, check the same things by hand and say so:

- dead code, unused exports, duplicated logic
- swallowed errors and empty catch blocks
- tests that assert nothing, or that pass for the wrong reason
- docs, comments and types that no longer match the code
- the ladder's answer: is the smallest change that works the one you made?

## 4. Evidence

Paste the real command and its real output — lint, typecheck, build, and the
guards. A claim without output is a rumour. If something failed and you fixed
it, paste both.

## 5. Report shape

Files changed · commands + output · the declared states · the tool file
provided · what you did **not** verify. Never commit: the orchestrator reviews
the diff and commits, and solo the operator does.
