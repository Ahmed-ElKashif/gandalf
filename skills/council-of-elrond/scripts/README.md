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

## To refresh after an upstream release

1. Re-copy the four `.mjs` files — keep them **byte-identical** (no edits).
2. Update the version in `../NOTICE.md`.
3. Diff against the previous copy to see exactly what upstream changed.
