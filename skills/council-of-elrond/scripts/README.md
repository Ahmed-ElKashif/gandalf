# Vendored engine

These four files are **unmodified copies** of delegate-setup's scripts
([`amElnagdy/delegate-skills`](https://github.com/amElnagdy/delegate-skills),
`skills/delegate-setup/scripts/`), vendored at **v0.5.0** so this skill is
self-contained. See `../NOTICE.md` for the license.

| File | Job |
|---|---|
| `config.mjs` | load / validate / write `delegate-fleet.v1` lane maps |
| `discover.mjs` | probe PATH for implementer CLIs (auth + models; `--usage` adds metadata-only session counts) |
| `implementers.mjs` | the canonical implementer/dial registry the others import |
| `lane.mjs` | resolve a lane to relay-native dials (used here for verification) |

## Patch verifier (ours, not vendored)

`patch-skills.mjs` is **our** script, not part of the vendored engine. It applies and
verifies the diffs in `../patches/` against the installed skills
(`~/.agents/skills` by default). `check` exits nonzero on a pending or drifted patch;
`apply` is idempotent. It needs `git` (`git apply`) and nothing else.

```bash
node scripts/patch-skills.mjs check
node scripts/patch-skills.mjs apply
node scripts/patch-skills.mjs check --json --skills-root /path/to/skills
```

See `../patches/README.md` for the patch set and the drift procedure.

## To refresh after an upstream release

1. Re-copy the four `.mjs` files — keep them **byte-identical** (no edits).
2. Update the version in `../NOTICE.md`.
3. Diff against the previous copy to see exactly what upstream changed.
4. Re-run `patch-skills.mjs check`: a moved upstream is `drift`, not a silent failure.
