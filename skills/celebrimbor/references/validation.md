# The gate — how a DESIGN.md is proved finished

A design system is done when it passes a gate, not when it looks right. This
is the gate, and the rules that keep it from becoming a hang.

## The three rules of validation

1. **Never bare `npx`.** `npx @google/design.md lint` prompts for install
   confirmation and blocks forever in a non-interactive shell. Always
   `npx --yes`. Better: install the package once and call the binary.
2. **Every command gets a hard timeout.** A timeout is a **result**, not a
   reason to try again.
3. **A failed or unavailable gate is reported once.** Never re-run it in the
   same task. Two attempts at a failing gate is a loop, not diligence.

## The real gate

```bash
design.md lint DESIGN.md
design.md export --format css-tailwind DESIGN.md
```

`lint` prints JSON:

```json
{
  "findings": [
    { "severity": "warning", "path": "colors", "rule": "missing-primary",
      "message": "No 'primary' color defined..." },
    { "severity": "info", "rule": "token-summary", "message": "Design system defines 2 colors, ..." }
  ],
  "summary": { "errors": 0, "warnings": 1, "infos": 1 }
}
```

- `summary.errors > 0` → the document **fails**.
- The exit code is 0 when clean and non-zero when there are errors.
- A warning is not a failure. Fix it when it points at a real defect; report it
  when it is a matter of taste.

`export` prints the token families. **Every populated frontmatter category must
emit its family.** A populated `colors:` with no `--color-*` in the export is a
schema failure *even when the export exits 0* — this is the failure mode the
gate exists to catch.

| Category | Family |
|---|---|
| `colors` | `--color-*` |
| `typography.<name>.fontFamily` | `--font-*` |
| `typography.<name>.fontSize` | `--text-*` |
| `rounded` | `--radius-*` |
| `spacing` | `--spacing-*` |

If `typography` is populated but the export has neither `--font-*` nor `--text-*`,
the document is invalid and must be rewritten before it is reported.

## The wrapper

```bash
node scripts/validate.mjs <path>/DESIGN.md [--format css-tailwind|json-tailwind|dtcg] [--json]
```

It resolves the binary in this order:

1. `<project>/node_modules/.bin/design.md`
2. `<home>/node_modules/.bin/design.md`
3. `npx --yes @google/design.md` — **with a timeout**

Then it runs lint, parses the JSON, fails on any error-severity finding, runs
the export for the target, and checks every populated category against its
family.

Exit codes: `0` pass, `1` fail, `2` the file is missing or unreadable.

## The offline fallback

When the CLI is not installed, the wrapper runs its **built-in structural
checks** instead:

- frontmatter present, delimited by `---`
- `name` present; `version` recommended
- `colors`, `typography`, `rounded`, `spacing`, `components` are mappings
- every token name matches `^[a-zA-Z0-9][a-zA-Z0-9-]*$`
- every typography scale is a mapping, holding only the canonical properties
- a `primary` colour exists (warning)
- the sections are in the canonical order, with an `## Overview` (warning)

**This is weaker evidence.** It proves the document's *shape*; it cannot prove
the exporter accepts it. Say so in the report:

> gate: offline structural checks — the `design.md` CLI is not installed, so the
> exporter was not exercised. Install it with `npm i -g @google/design.md` for
> the full gate.

Never present the offline result as the full gate.

## Installing the CLI

```bash
npm i -g @google/design.md
```

`node scripts/doctor.mjs` reports whether it is present. The package is
Apache-2.0, from google-labs-code/design.md.

## The other commands

```bash
design.md spec                       # the format specification
design.md diff <old> DESIGN.md       # what changed since the last version
```

`spec` is worth reading before writing a document with themes — it says whether
the installed version supports theme-aware token syntax. `diff` is the audit
mode's evidence.

## The report

State the gate, honestly:

- `gate: css-tailwind — 0 errors, 1 warning` (the real linter ran)
- `gate: offline structural checks — exporter not exercised` (the fallback ran)

Never say "validated" without saying which one ran.
