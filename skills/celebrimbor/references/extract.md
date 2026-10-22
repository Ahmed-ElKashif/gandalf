# Extract — a design system from a codebase that already has one

The project has tokens, a theme, a CSS file, a Tailwind config — a visual
system in fact, and no document describing it. The job is to **read** it and
write down what it already decided.

**Never change the code.** Extract reads; it does not redesign. If the existing
system is bad, that is a finding to report, not a licence to fix it.

## The procedure

1. **Survey** — `node scripts/survey.mjs --root <dir>` lists the token sources
   it found. That is the shortlist.
2. **Trace the evidence** in this order:
   1. an existing `DESIGN.md` and any explicit repository guidance
   2. tokens, themes, CSS variables, global styles
   3. shared primitives and their variants
   4. representative routes and the components that render them
   5. surface-local implementations
3. **Decide what belongs** — promote a value to a token only when a governing
   source names it. A utility class, a repeated literal, or one component's
   value is not a token.
4. **Normalise** — map the source values onto the schema in
   `references/design-md-format.md`.
5. **Write**, then **validate**, then **report**.

## The evidence pipeline

Every candidate passes through the same record:

```
role → value → source → scope → recurrence → confidence
```

- **role** — what the value is for (`background`, `border-muted`, `text-caption`)
- **value** — the exact value, from the source, not from a screenshot
- **source** — the file and line it came from
- **scope** — is it one surface, or the product
- **recurrence** — how many places use it
- **confidence** — how sure you are

A source participates only when the product **imports, references, inherits, or
renders** it. Exclude proposals, migrations, examples, generated output, legacy
implementations, and similarly-named packages.

## The rules that decide it

**Frontmatter shape is a hard gate, not a style choice.**
- A token group is a **mapping** whose children are the schema's fields.
- Never a scalar typography entry (`sans: Geist`).
- Never source nesting copied verbatim (`font-family: { mono: ... }`).
- Never rounded keys copied from CSS variable names (`radius-sm`, `radius-md`).

**Resolve through the active theme.** A utility class only has a value after
the theme that defines it is resolved. Read the theme first.

**Name for the role, not the source.** Keep the semantic name the source uses;
do not invent a parallel vocabulary.

```yaml
typography:
  mono:
    fontFamily: Geist Mono      # right
typography:
  mono: Geist Mono              # wrong - a scalar scale
typography:
  font-family:
    mono: Geist Mono             # wrong - source nesting
```

**One group-level token normalises to `base`.** If the source defines only
`--radius`, write `rounded.base` — never `rounded.radius`, and never derived
`sm`/`md`/`lg` steps made from utility classes.

**Every prose rule needs support.** In repository mode a prose sentence is
admitted only when it is backed by explicit guidance, a named shared token or
variant, or a shared owner used by at least two audited surfaces. Otherwise it
is omitted.

## Choosing the export target

Read it off the stack, before writing any frontmatter:

| The project has | Target |
|---|---|
| Tailwind v4 | `css-tailwind` |
| Tailwind v3 | `json-tailwind` |
| anything else | `dtcg` |

Token names must be valid for the target.

## Updating an existing DESIGN.md

Keep the previous file, and diff it against the new one:

```bash
design.md diff <previous> DESIGN.md
```

Restore any accepted decision the new evidence removed, unless the operator or
the current governing evidence replaces it. A diff that deletes a decision
nobody asked to delete is a bug.

## From a URL instead of a repo

When the user points at a live site with no source, this is a reconstruction.
It is a different discipline and the evidence bar is higher.

- Render the page. Inspect computed styles and the loaded stylesheets at desktop
  and mobile widths. Screenshots may support interpretation but cannot establish
  exact values.
- Sample up to three same-origin pages that represent distinct templates.
- **Three proofs** before any claim:
  1. **Observation** — the value is visible or computed on the rendered page
  2. **Basis** — it is measured, or recurs across the sampled pages
  3. **Consequence** — it changes a concrete implementation choice
- A value is usable when the computed value and a loaded declaration agree, or
  when the same value recurs for the same role across the samples.
- The Overview may state only the site's observable purpose and presentation, and
  the document must be labelled a reconstruction.
- If rendered inspection is unavailable, ask for screenshots or source files.
  Do not build a DESIGN.md from copy, metadata, or HTML structure alone.

The `create-design-md` skill (ibelick/ui-skills, MIT) does this properly with
its URL mode. It is optional — this reference is the fallback.

## Report

Mode and audited product, the governing sources used, the conflicts and the
unsupported areas omitted, and the final lint and export results.
