# Operations — dispatch recipes, flags, troubleshooting

The recipes below use the **opencode** and **agy** relays because those carry the
shipped `free-first` preset. Every relay in `amElnagdy/delegate-skills` (opencode,
agy, claude, codex, cursor, warp) follows the same contract — self-contained brief
in; structured report + touched files out; never commits — so the loop is identical
whichever relay a role is cast onto. Canonical flags for the other relays live in
their own skill docs.

Relays live at `~/.agents/skills/<relay>/scripts/relay.mjs`.

## Writing the brief

- Self-contained: task, constraints, acceptance criteria, gates to run, "do not
  commit".
- Prepend the role block from your preambles file
  (`~/.config/delegate-skills/preambles.md`).
- Demand evidence: "paste the exact commands and their real output."
- Secrets never travel inline — headless briefs can be visible in the process list.
  Reference env vars or credential-file paths instead.

## opencode relay

PowerShell:

```powershell
node "$env:USERPROFILE\.agents\skills\opencode-delegate\scripts\relay.mjs" `
  --brief "C:\path\to\brief.txt" `
  --cd "C:\path\to\repo" `
  --lane feature `
  --timeout 30m `
  --out-dir "C:\path\to\run-artifacts"
```

bash / macOS / Linux:

```bash
node ~/.agents/skills/opencode-delegate/scripts/relay.mjs \
  --brief ./brief.txt \
  --cd ./repo \
  --lane feature \
  --timeout 30m \
  --out-dir ./run-artifacts
```

Key flags:

- `--lane <name>` applies the fleet config's implementer + model + dial. A fresh run
  requires a lane or `--model`; resume inherits its session's model.
- `--model` / `--variant` override the lane for one dispatch. Explicit flags beat
  config; don't pass both a variant and a model that declares none.
- `--read-only` runs the `plan` agent — diagnosis and review, no edits.
- `--session ses_…` / `--resume-last` continue a session; send only the delta brief.
- `--out-dir` receives `result.json` + logs on every outcome. A non-zero exit with no
  `result.json` is a bad invocation, not a model failure.

## agy relay

```powershell
node "$env:USERPROFILE\.agents\skills\agy-delegate\scripts\relay.mjs" `
  --brief "C:\path\to\brief.txt" `
  --cd "C:\path\to\repo" `
  --lane complex `
  --dangerously-skip-permissions `
  --timeout 30m `
  --out-dir "C:\path\to\run-artifacts"
```

Key flags:

- `--lane complex` (or `plan-debate`, `review-debate`). The **model label is the
  effort** —
  `claude-opus-4-6-thinking`, `gemini-3.8-flash-high|medium|low`. `--effort` errors
  on thinking labels; swap the label instead.
- `--read-only` = `--sandbox --dangerously-skip-permissions`: the run is confined to
  the workspace and mutations are discarded — trust `touchedFiles`, not the
  transcript.
- Fresh runs are workspace-bound (`--add-dir <cd>` + `--new-project`); resume with
  `--session` / `--resume-last`.
- `--print-timeout` (default 30m) bounds a single model turn; relay `--timeout`
  bounds the run; `--stall-timeout` adds a no-output watchdog.

## Troubleshooting (measured)

- **agy: `write_file permission … auto-denied`** — headless agy auto-denies writes
  and commands outside trusted workspaces. Measured on agy 1.4.2: a
  `trustedWorkspaces` entry and scoped allow-rules do **not** flip this in headless
  mode; scoped `command(...)` grants match exact whole command lines only (unusable
  for coding runs). Working recipe: dispatch with `--dangerously-skip-permissions`
  for repos outside `C:\Users\<you>`. That is full access — treat the run
  accordingly and review the diff hard. Inside `C:\Users\<you>` plain runs work.
- **agy: `--effort is not supported for model …`** — drop the flag; the label
  already encodes effort.
- **debate-review exits 3** — duplicate head sha (that revision was already
  reviewed); rerun with `--force`.
- **A new skill isn't visible to the interactive orchestrator** — restart the
  session. Headless implementers pick new skills up on every run.
- **Relay usage errors exit 2 with no `result.json`** — fix the invocation.

## Plan debate — the read-only attack (Gate 1)

Radagast walks read-only: he must be able to read the repo the plan names, and must
not be able to change it. Protocol: `references/plan-debate.md`.

PowerShell:

```powershell
node "$env:USERPROFILE\.agents\skills\opencode-delegate\scripts\relay.mjs" `
  --brief "C:\path\to\plan.txt" `
  --cd "C:\path\to\repo" `
  --lane plan-debate `
  --read-only `
  --timeout 20m `
  --out-dir "C:\path\to\run-artifacts"
```

bash / macOS / Linux:

```bash
node ~/.agents/skills/opencode-delegate/scripts/relay.mjs \
  --brief ./plan.txt \
  --cd ./repo \
  --lane plan-debate \
  --read-only \
  --timeout 20m \
  --out-dir ./run-artifacts
```

- The brief **is** the plan (step 1 of the protocol). Fold the surviving objections
  into it and the same document becomes the dispatch brief.
- `--read-only` is not optional. A challenger that can edit the tree has stopped
  being a challenger.
- No `plan-debate` seat cast? Run it on `--lane review-debate` and say so in the
  brief. Neither cast? Report the skipped gate; never simulate it.
- It is only required for multi-file work, lane hand-offs, and `complex` lanes —
  and the orchestrator always tells the user which of those it decided.

## Bounce — sending findings back

A guard verdict of **bounce** re-dispatches to the implementer's own session carrying
only the findings (`references/gates.md`):

```bash
node ~/.agents/skills/opencode-delegate/scripts/relay.mjs \
  --brief ./findings.txt \
  --session ses_… \
  --cd ./repo \
  --out-dir ./run-artifacts
```

- `--session ses_…` (or `--resume-last`) keeps the context the implementer built.
  The delta brief is the guard output verbatim — not the original task again.
- One bounce per finding. A finding that survives a bounce is an **escalate** to the
  `complex` lane, not a third round.
- The re-run goes through the same gates. A bounce does not skip the pipeline.

## The health pulse

```bash
node ~/.agents/skills/debate-review/scripts/review-pr.mjs --check
```

Starts both reviewer lanes on a one-line read-only brief and prints `ok` / `FAIL`
per lane (measured: ~7s and ~8s on the free-first preset). Run it after casting
reviewers, or whenever reviews feel off.
