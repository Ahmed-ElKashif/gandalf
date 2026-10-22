# The DESIGN.md format

The canonical contract, distilled from `design.md spec` (google-labs-code/design.md,
Apache-2.0). Every rule here is enforced by `scripts/validate.mjs`, and by the
real linter when the CLI is installed.

## The document

Two parts: optional YAML frontmatter, and a markdown body. The YAML holds the
**normative values**; the prose holds the **rationale and the guidance**.

```markdown
---
version: alpha
name: Daylight Prestige
description: One line about what this product is and who it serves.
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
rounded:
  base: 0.625rem
spacing:
  base: 4px
---

## Overview

One paragraph: what this product is, who it serves, and the feeling it should
evoke. Nothing about pages, components, or tokens.

## Colors

The palette and the role of each colour.

## Do's and Don'ts

- Do use the semantic tokens instead of raw hex values.
```

## Frontmatter schema

```yaml
version: <string>        # optional, current: "alpha"
name: <string>           # required
description: <string>    # optional
omitted: <string[] | OmittedSection[]>
colors:      { <token-name>: <Color> }
typography:  { <token-name>: <Typography> }
rounded:     { <scale-level>: <Dimension> }
spacing:     { <scale-level>: <Dimension | number> }
components:  { <component-name>: { <token-name>: <string | token reference> } }
```

Add a category **only** when a governing source already defines that named
system. A missing category is honest; an invented one is not.

`omitted` suppresses the linter's warnings for categories you deliberately left
out, and takes a reason:

```yaml
omitted:
  - spacing
  - section: rounded
    reason: "No rounded corners in the brand book"
```

### Colors

Any valid CSS colour: `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`, named colours,
`rgb()`/`rgba()`, `hsl()`/`hsla()`, `hwb()`, `oklch()`/`oklab()`/`lch()`/`lab()`,
`color-mix(in srgb, ...)`. `#RRGGBB` is the recommended default — it converts
cleanest to every target.

**`primary` must exist.** The linter warns without it: *"No 'primary' color
defined. The agent will auto-generate key colors, reducing your control over
your palette."* Name the palettes `primary`, `secondary`, `tertiary`, `neutral`
in that order, and give each a role in the prose.

### Typography

A mapping of **named scales**; each scale is a mapping of properties. Never a
scalar.

```yaml
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
```

Valid properties — and only these:

| Property | Type |
|---|---|
| `fontFamily` | string |
| `fontSize` | Dimension |
| `fontWeight` | number (`400`, `600` — bare or quoted) |
| `lineHeight` | Dimension or unitless number (a multiplier) |
| `letterSpacing` | Dimension |
| `fontFeature` | string |
| `fontVariation` | string |

A **Dimension** is a string with `px`, `em`, or `rem`. `clamp()` is not a
dimension — resolve it to a concrete value before it goes in the YAML.

### Rounded and spacing

Flat mappings of token name to value. Use `base` when the source defines one
group-level radius; otherwise keep the source's own names. Do not invent
`sm`/`md`/`lg` steps from utility classes.

### Token references

`{path.to.token}` — a reference must point at a primitive value
(`{colors.primary-60}`), not a group (`{colors}`). Inside `components`, a
reference to a composite is allowed (`{typography.label-md}`).

## Section order

Sections are optional, but the ones you include keep this order. All are `##`.

1. **Overview** (also "Brand & Style")
2. **Colors**
3. **Themes**
4. **Typography**
5. **Layout** (also "Layout & Spacing")
6. **Elevation & Depth** (also "Elevation")
7. **Shapes**
8. **Components**
9. **Do's and Don'ts**

Do not create a section just because the format has one. Do not reorder or
duplicate. An `## Unknown` heading is allowed only when supported guidance
cannot fit a standard section.

## What the markdown may and may not contain

**May**: rationale, the role of a colour, how to apply a rule, an explicit
prohibition, the fallback `## Themes` table.

**May not**: token inventories outside YAML, component configuration, source
syntax, documentation methodology, citations, audit notes, rejected
candidates, conflicts, unresolved questions, or any sentence that does not
change an implementation choice.

Include a Don't only when a governing source states the explicit prohibition.
Never invent one.

## Export targets

Pick the target from the stack, then make every populated category emit its
family:

| Target | When | Families |
|---|---|---|
| `css-tailwind` | Tailwind v4 | `--color-*`, `--font-*`, `--text-*`, `--radius-*`, `--spacing-*` |
| `json-tailwind` | Tailwind v3 | `theme.extend` in JSON |
| `dtcg` | everything else | W3C Design Tokens |

A populated category that emits **no** family is a schema failure, even when
the command exits 0. The gate in `scripts/validate.mjs` checks exactly this.

Token names must match `^[a-zA-Z0-9][a-zA-Z0-9-]*$`. Use flat names
(`background-primary`, `foreground-secondary`, `border-muted`) — never nested
keys (`background.primary`).

### The Tailwind v4 namespace trap

A typography scale named `display` exports **both** `--font-display` (the
family) and `--font-weight-display` (the weight). In Tailwind v4 both
generate the utility `font-display`, and **the family wins**. A page that
writes `font-display` gets the family and silently keeps the weight at 400 —
while the design system says 700. Nothing errors; the type just looks wrong.

Two ways out, and the page must pick one deliberately:

1. **Spell the weight out.** `font-bold` (700), `font-medium` (500),
   `font-normal` (400) are the standard utilities and carry the same numbers.
2. **Drop the family tokens.** When every scale shares one family, keep
   `--font-sans` and delete the four `--font-*` family tokens; then
   `font-display` unambiguously means the weight.

This is a consumer-side problem, not a document defect: the format is right,
the export is right, and the collision is in the CSS framework's namespaces.
Check the rendered weight — never assume it.

### The consumer-side CSS traps

Three build-time traps live with the builder, not the document — how a page
eats its own margins, how a grid track inflates to its widest child, and how a
gap overflows a phone. They are written down in full in
`skills/galadriel/references/build.md` (§ "The four build-time traps"); this
file keeps only the one that can change the document: the namespace trap above.

## The final no-op pass

Before saving, delete: any YAML token no governing source names; any page-local
behaviour presented as a product-wide rule; any implementation pattern that
conflicts with explicit guidance; any prohibition not explicitly stated; any
exact implementation value outside YAML (except the `## Themes` table); any
component configuration or methodology in the markdown; any sentence that does
not change the document. Then remove the vague — *"be thorough"*, *"keep it
polished"*, *"use good judgment"*.
