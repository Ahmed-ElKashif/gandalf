# Verified patches

A reinstall of an upstream skill replaces its files. Arming installs upstream skills
from `packs.json`, so without this directory every local fix would be erased by the
next `npx skills add` — silently, and only for the person who needed the fix.

The rule is **no fork**. The dependency stays upstream; a patch is the smallest exact
diff that makes an installed copy correct. If upstream takes the fix, delete the entry.

## The set

| Id | Target | Tier | Fix |
|---|---|---|---|
| `agy-delegate-resolve-binary` | `delegate-skills` → `agy-delegate` | core | resolve `agy` outside the current process's PATH (the installer only writes the User PATH) |
| `agy-relay-effective-posture` | `delegate-skills` → `agy-delegate` | core | report the flags agy actually ran with, and stop claiming a sandbox that is not enforced on Windows |
| `debate-review-snapshot-cleanup` | `review-skills` → `debate-review` | core | retry a Windows `EPERM` on snapshot cleanup instead of masking the real error |
| `ui-review-loop-version-and-video` | `ui-review-loop` | optional | separate the version floor from the verified contract; skip a recorder that cannot finalize; resolve the native CLI on Windows |

`required` follows the pack's tier. A missing core skill is `missing` and exits
nonzero; a missing optional skill is `skipped` and does not.

## Commands

```bash
node skills/council-of-elrond/scripts/patch-skills.mjs check
node skills/council-of-elrond/scripts/patch-skills.mjs apply
```

- `check` changes nothing and exits `1` when a selected patch is `pending`, `missing`,
  or `drifted`.
- `apply` applies pending patches, leaves applied ones alone, and re-verifies each
  result. It is idempotent — arming runs it after every install.
- `--skills-root <dir>` points at a non-default install (default `~/.agents/skills`).
- `--only <id[,id]>` limits the run; `--scope <s[,s]>` defaults to `general`.
- `--json` for CI; `--dry-run` reports what `apply` would do; `--verbose` explains a
  drift with git's own message.

`git` must be on PATH: `git apply` is the engine. It works outside a git worktree,
which is exactly what an installed skills directory is. There is no network access.

## States

| State | Meaning | What to do |
|---|---|---|
| `applied` | the reverse diff checks — the fix is present | nothing |
| `pending` | the forward diff checks — the file is pristine | run `apply` |
| `skipped` | the skill is absent and the patch is optional | install the skill first if you want the loop |
| `missing` | a required skill is absent | finish arming |
| `drift` | neither direction checks — upstream changed the code around the patch | stop and update the patch |
| `broken` | the patch file is absent, `git apply` failed, or the result does not reverse-check | inspect the target; do not re-run blindly |

`drift` is the feature. The verifier refuses to guess at code the patch was not
written for. A forced patch is worse than a missing one.

## Updating a patch after drift

1. Read the target and the current upstream file. Decide whether the fix still makes
   sense, or whether upstream already fixed it.
2. If upstream fixed it: delete the manifest entry and the `.patch` file.
3. Otherwise re-create the diff against the **pristine** upstream file:

   ```bash
   git clone --depth 1 <upstream-repo> /tmp/upstream
   # produce the corrected file, then:
   cd /tmp && git diff --no-index --no-prefix -- a/<path> b/<path> > <id>.patch
   ```

   The patch paths must stay relative to the **installed skill root**
   (`scripts/relay.mjs`, not `skills/agy-delegate/scripts/relay.mjs`).
4. Update `upstreamCommit` and `upstreamDate` in `manifest.json`.
5. Test both directions before committing:

   ```bash
   git apply --check -p1 <patch>          # against pristine: must pass
   git apply --check -R -p1 <patch>       # against the installed copy: must pass
   ```

6. Add a temporary fake root containing pristine copies and run `check` → `apply` →
   `check` against it. It must go `pending` → `applied` → `applied`, and the patched
   files must pass `node --check`.

## Adding a patch

Copy the shape of an existing entry. Keep `scope: "general"` unless the fix is true
only of one machine — `scope` filters what arming applies, and machine-specific fixes
must not be pushed onto other users. Keep each `why` about the observed failure, not
the implementation.

## What is deliberately not patched

Two earlier local workarounds are **not** in this set:

- lowering `record start` to `--fps 5` — it did not restore finalization on 0.39.1 and
  it degrades video quality on machines where the recorder works;
- moving `network har start` after the page load — it was a workaround for the video
  encoder's pipe, and it is unnecessary once capture is skipped.

They were removed from the installed copy so it matches "pristine + this patch set".
If a future machine genuinely needs one, add it as `scope: "machine"`, not `general`.

## License

The patches modify MIT and Apache-2.0 upstream code. See `../NOTICE.md` for the
attribution and the license that applies to each target.
