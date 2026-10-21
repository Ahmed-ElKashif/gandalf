# Operations — dispatch recipes, flags, troubleshooting

The recipes below use the **opencode** and **agy** relays because those carry the
example `free-first` cast. Every relay in `amElnagdy/delegate-skills` (opencode,
agy, claude, codex, cursor, warp) follows the same contract — self-contained brief
in; structured report + touched files out; never commits — so the loop is identical
whichever relay a role is cast onto. Canonical flags for the other relays live in
their own skill docs.

Relays live at `~/.agents/skills/<relay>/scripts/relay.mjs`.

## Preambles — the role block travels with the brief

`fellowship.mjs` injects the matching role block automatically: it reads
`$GANDALF_PREAMBLES` / `--preambles <file>`, else
`$XDG_CONFIG_HOME/delegate-skills/preambles.md`, else
`~/.config/delegate-skills/preambles.md`; extracts the global block plus the lane
block (the `##` heading containing the wire name); and writes an effective brief
(`brief.effective.md`) that the relay receives. The hobbit therefore always carries
its loadout, even on a plain dispatch.

- Use `fellowship.mjs` for **every** dispatch — single lane or many — so the
  preamble is injected. `--lanes feature --brief ...` is the single-lane form.
- Disable with `--no-preambles` (raw brief only) when the brief already contains
  the role block.
- Bounces go through the relay `--session` path: the preamble is already in that
  session's context, so do not re-inject.
- If no preambles file exists, the script warns and dispatches raw briefs. That is
  a degraded run — generate the file from `templates/preambles.example.md` first.
- A lane block that is missing also warns; the global rules still travel, but the
  role loadout does not.

## Writing the brief

- Self-contained: task, constraints, acceptance criteria, gates to run, "do not
  commit".
- The injector adds the role block; do not add it by hand unless you are using
  `--no-preambles` with a brief that already carries it.
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
- `--read-only` = `--sandbox --dangerously-skip-permissions`. On agy 1.1.28 / macOS
  the sandbox confines the run: writes are overlaid and discarded, and paths
  outside the workspace fail with EPERM. **On agy 1.4.4 / Windows the sandbox is
  not enforced** — writes inside and outside the workspace persisted. So on
  Windows a read-only run is a *request*, not a guarantee: run it against a copy
  of the tree. `result.json` now carries `effectivePosture` (the flags agy
  actually ran with, the platform, and whether they were enforced) and
  `effectiveArgv` (the exact argv). Trust `touchedFiles`, not the transcript.
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
- No `plan-debate` seat cast? Run it on `--lane review-debate` and record the
  fallback in the landing report. Neither cast? Report the skipped gate; never
  simulate it.
- It is required for multi-file work, lane hand-offs, `complex` lanes, ambiguous
  requirements, and a lane that has already failed once — and the landing report
  records which of those it decided. The decision is Gandalf's, never a user question.

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

## Walking in parallel — `fellowship.mjs`

One lane at a time is safe but serial. Lanes are independent by construction —
different models, different loadouts, different files — so they can walk together.

```bash
node ~/.agents/skills/gandalf/scripts/fellowship.mjs --plan ./fellowship.json
```

Plan file:

```json
{
  "repo": "C:/path/to/repo",
  "base": "main",
  "timeout": "30m",
  "lanes": [
    { "lane": "feature", "brief": "C:/path/to/feature.txt" },
    { "lane": "ui",      "brief": "C:/path/to/ui.txt" },
    { "lane": "chores",  "brief": "C:/path/to/chores.txt", "relay": "opencode" }
  ]
}
```

Key flags:

- `--max <n>` (default **4**) bounds concurrency. **The default is a conservative judgment
  call, not a measured optimum.** Measured: five concurrent free-model calls, all correct,
  in 16s, zero rate limits — but those were one-line replies, not multi-minute lanes, and
  free tiers rate-limit per *account*, so the ceiling is not per-process. Four is the
  common simultaneous fleet (`feature`, `ui`, `bugfix`, `devops`). Raise it once your own
  runs are the evidence, not before.
- **One lane per relay at a time**, whatever `--max` says. Two opencode relays at once
  deadlock: the second waits on a server lock the first holds, and neither reports
  anything — the run stops silently, with no failure to read. Lanes on *different*
  relays are independent and still walk together, so a fleet of one opencode lane and
  one agy lane is not slowed down.
- `--dry-run` prints the resolved worktrees, commands, and `tail -f` lines without
  creating directories or writing briefs. Run it first.
- `--no-worktree` shares one tree for every lane. It prints a warning, because two lanes
  touching one file corrupt each other and serial dispatch is what hides that today.
- `--no-snapshot` runs read-only lanes in the repo instead of a throwaway copy. The
  relay's own verdict is then the only witness of a write (see "A read-only lane stays
  read-only"). `--keep-snapshots` keeps the copies for inspection.
- `--keep-worktrees` is the default for **successful** lanes — their worktree holds the
  diff until you merge it. A worktree is removed only when it is provably clean.

### The relay comes from the cast

A lane's relay is the implementer its fleet config binds it to
(`~/.config/delegate-skills/config.json`). `fellowship.mjs` reads the cast and walks
the lane through that relay; a plan does not get to choose. If a plan names a relay
that contradicts the cast — the cast binds it to a different implementer — the plan is
refused. The relay itself would refuse it at dispatch time ("fleet lane
`plan-debate` — agy (use agy-delegate); this relay is opencode"), which is late: the
lane has already started, burned a worktree, and produced no `result.json`.

`--allow-relay-mismatch` downgrades the refusal to a warning, for the case where the
config is stale and the plan is right.

### A read-only lane stays read-only

The dispatcher never passes `--dangerously-skip-permissions` to a read-only lane. The agy
relay rejects `--read-only` together with that flag as mutually exclusive, and
`--read-only` already composes `--sandbox --dangerously-skip-permissions` itself. A
writing agy lane still needs the flag: agy auto-denies writes outside the trusted
workspace, so the lane would stall on a permission prompt nobody can answer.

A read-only lane also never runs against your working tree. It runs against a
**snapshot** — a throwaway copy of the repo, carrying the same history and the same
uncommitted changes — and the copy is deleted when the lane ends. The lane can read
the tree as it is, and it cannot write to it even if it tries: a write inside the
snapshot is detected afterwards and the lane fails with
`status: "read-only-violation"`.

This matters because `--read-only` is a request, not a guarantee. The agy sandbox is
not enforced on Windows (measured on agy 1.4.4 — writes persisted inside and outside
the workspace), and a relay that does not detect its own violation would report
success while the tree changed.

- `--no-snapshot` runs read-only lanes in the repo itself. The only witness left is
  the relay's own `readOnlyViolation` verdict, so a write that the relay misses
  lands in your tree. Use it only when you trust the relay.
- `--keep-snapshots` keeps the copies on disk for inspection; by default they are
  deleted after the run.

### What isolation buys, and why it is the default

Measured on a real five-lane run: the lanes touched five *disjoint* file sets — and that
was only true because they ran **one at a time**, by hand. Parallel removes that accident
of scheduling. Every writing lane therefore gets its own `git worktree` forked from
`base`, and the orchestrator merges back in review order.

Read-only lanes (`plan-debate`, `review-main`, `review-debate`, `security-review`) get a
throwaway **snapshot** of the tree rather than a worktree: they must see the repo as it
is — including work in progress — but must not be able to change it. The snapshot is
deleted when the lane ends.

Worktrees live beside the repo (`.gandalf-worktrees-<repo>/`), never inside it, so one
lane's checkout never appears in another lane's `git status`.

### Watching a lane

The script prints, for every lane, both a live log and a resumable session:

```bash
tail -f "<runDir>/<lane>.log"                 # live, one Warp tab per lane
opencode --session ses_… --continue           # the full transcript, after it ends
```

The orchestrator's own tab stays clean: dispatch is one command, and each hobbit reports
into its own file. This is the visibility answer — a script cannot open Warp tabs
(`warp.exe` is the Oz CLI, with no window/tab flags), so the flow hands you the commands
and you open the tabs.

### Reading the outcome

`fellowship.mjs` exits **0** when every lane succeeded, **1** when any did not, **2** on a
bad plan. Trust the relay's `result.json` over the exit code, and never assume a
non-`completed` status means a model failure: no `result.json` means a bad invocation.

A lane name must be a real wire name **and** cast in your fleet config — the script
rejects anything else rather than let the relay silently fall back.

`read-only-violation` is a containment report, not a model failure: the lane wrote to
its snapshot, so it failed even though the model may have answered perfectly. Your
tree was never at risk — the copy was thrown away.

### The run manifest

`run.json` in the run directory records the run id, repo, base, preambles source,
and every lane's relay/model/worktree/brief/effective brief — and, for a read-only
lane, the snapshot directory it ran against. The landing report reads it; do not
reconstruct the run from memory.

## Reviewer health pulse

```bash
node ~/.agents/skills/debate-review/scripts/review-pr.mjs --check
```

Starts both reviewer lanes on a one-line read-only brief and prints `ok` / `FAIL`
per lane (measured: ~7s and ~8s on the example free-first cast). Run it after casting
reviewers, or whenever reviews feel off.
