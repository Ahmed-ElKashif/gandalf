# Normalize — a design system whose *structure* is wrong

The tokens are fine. The document is not: the frontmatter has the wrong shape,
the sections are out of order, there is a second token vocabulary hiding in the
markdown, or the file describes three products at once.

This is different from **Audit**. Audit compares a document to the code.
Normalize compares a document to **the format**.

## What is structurally wrong

| Symptom | Fix |
|---|---|
| `typography: sans: Geist` — a scalar scale | make it a mapping of properties |
| `rounded: { radius-sm: 4px }` — CSS variable names | `rounded.base`, or the source's own names |
| `font-family: { mono: ... }` — source nesting | `typography.mono.fontFamily` |
| Sections out of order | reorder to the canonical order |
| Tokens in the markdown | move the values into the frontmatter |
| A second token vocabulary | delete it; one schema, one document |
| Prose that restates the YAML | delete the sentence |
| A `## Unknown` section | fit the guidance into a standard section, or justify it |
| Missing `primary` colour | name one, or record the omission with `omitted:` |

## The procedure

1. **Validate first** — `node scripts/validate.mjs <path>/DESIGN.md` gives you
   the exact list. Do not eyeball it; the gate is mechanical.
2. **Fix the shape** — frontmatter mappings, canonical typography properties,
   flat token names matching `^[a-zA-Z0-9][a-zA-Z0-9-]*$`.
3. **Fix the order** — the canonical section order, no duplicates, no
   reordering.
4. **Strip the prose** — no token inventories, no component configuration, no
   methodology, no citations, no audit notes.
5. **Re-validate** until clean.
6. **Diff** against the previous file when the CLI is installed, and report
   every change.

## The rules the linter and the gate share

- A token group is a mapping whose children are the schema's fields.
- Typography scales are named, and each holds only `fontFamily`, `fontSize`,
  `fontWeight`, `lineHeight`, `letterSpacing`, `fontFeature`, `fontVariation`.
- `rounded` and `spacing` are flat mappings.
- `components` may reference canonical token paths but may not introduce a
  second token schema.
- A populated category must emit its export family.

## The `impeccable` skill (optional)

`pbakaus/impeccable` ships a `normalize` command for exactly this. It is
optional — this reference plus the gate is the fallback, and the gate is
stricter about shape than any taste about structure.

## Preserve what was decided

Normalizing is **not** redesigning. A token that is ugly but documented and
in use stays. A Do's and Don'ts that came from the product's own guidance
stays. You are fixing the shape of the document, not its opinions.

The one exception: a prohibition that no governing source states is invented
prose and must go, whatever it says.

## Report

What was structurally wrong, what changed, what was deliberately preserved, and
the gate result — before and after.
