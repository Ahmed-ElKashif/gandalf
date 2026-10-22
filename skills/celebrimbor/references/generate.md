# Generate — a greenfield design system

Nothing to extract, no brand to adopt: this is a new visual identity for a new
product. The job is to produce a **coherent** system, not a collection of good
parts.

## The two arms

| The product is | Arm | Composer call |
|---|---|---|
| A public surface — marketing site, landing page, portfolio, docs | **public** | `compose.mjs --sector <sector>` |
| An app surface — dashboard, admin, settings, inbox, analytics | **app** | `compose.mjs --app --kind <kind>` |

Pick by the product, not by the mood. A developer-tools *marketing site* is a
public surface; a marketing site with an admin behind it needs both arms, and
the app arm wins for the product surface.

Public sectors: `saas` `dev-tool` `ai-product` `consumer-app` `finance`
`agency` `studio-portfolio` `personal-portfolio` `ecommerce` `physical-product`
`fashion` `hospitality` `restaurant` `real-estate` `architecture` `event`
`health` `education` `nonprofit` `culture` `music` `other`.

App kinds: `finance` `wallet` `commerce` `analytics` `devtools` `builder`
`creator` `smb-admin` `workspace` `community` `support` `markets` `report`.

Tones (public arm): `bold` `editorial` `luxury` `playful` `quiet` `technical`
`warm`.

## The procedure

```bash
node scripts/compose.mjs --sector saas --tone technical --seed 42
node scripts/compose.mjs --app --kind analytics --seed 42
node scripts/compose.mjs --json          # the vocabulary, machine-readable
```

The composer deals one **direction** and resolves the palette, the type system
and the sections that go with it. `--seed` makes it reproducible: the same seed
deals the same direction, which is how you iterate without losing the thread.

## Turning the sheet into a DESIGN.md

The sheet is material, not a document. Map it across:

| The sheet | Becomes |
|---|---|
| Direction, idea, composition | `## Overview` — the product's purpose and the feeling it should evoke |
| Palette (`bg` `surface` `ink` `muted` `accent` `accentInk`) | `colors:` frontmatter, with `primary` named and the others given roles |
| Type (family, weights, tracking, leading, steps) | `typography:` frontmatter — one named scale per step |
| Section blueprints | `## Layout`, `## Components` — the geometry, the radii, the row heights |
| The house rules the direction implies | `## Do's and Don'ts` — only the explicit prohibitions |
| Fields (the inverted colour sets) | `## Themes`, when the spec supports theme-aware syntax; otherwise a `## Themes` table |

### The colours

The palette gives you `bg`, `surface`, `ink`, `muted`, `accent`, `accentInk`.
Those are **roles**, not names. Rename them to the token names the product
will actually use, and keep the values:

```yaml
colors:
  primary: "#1f4b3f"        # the accent, renamed to the role it plays
  background: "#f7f6f3"      # bg
  surface: "#ffffff"         # surface
  foreground: "#16150f"      # ink
  muted: "#6b6862"           # muted
  accent-foreground: "#ffffff"  # accentInk
```

Do not ship `bg` / `ink` as token names — they are placeholders from the
dataset, not a vocabulary. The finished system needs `background`,
`foreground`, `border`, `muted` — the names an implementer will reach for.

The `fields` are inverted pairs (a coloured ground with its own ink). They are
how a page inverts: a dark band, a filled card. Turn them into
`surface-inverted` / `foreground-inverted` when the product has one, and leave
them out when it does not.

### The type

The sheet gives one family for display and one for text, their weights, and
their tracking and leading. The scale is a set of `clamp()` steps — **the
composer already resolves them to concrete pixels**. Use those.

The five steps the dataset ships are `step-small`, `step-body`, `step-lead`,
`step-head` and one more. Name them for the product, not for the scale:

```yaml
typography:
  display:  { fontFamily: ..., fontSize: "44px", fontWeight: "600", lineHeight: "1.1", letterSpacing: "-0.02em" }
  heading:  { fontFamily: ..., fontSize: "28px", fontWeight: "600", lineHeight: "1.2" }
  body:     { fontFamily: ..., fontSize: "16px", fontWeight: "400", lineHeight: "1.6" }
  label:    { fontFamily: ..., fontSize: "14px", fontWeight: "500", lineHeight: "1.4" }
  caption:  { fontFamily: ..., fontSize: "13px", fontWeight: "400", lineHeight: "1.4" }
```

Map every size the section blueprints name onto one of these five. Do not add a
sixth because a blueprint asked for 32px.

### The prose

The `## Overview` states the product's purpose and the direction's character.
It does **not** summarise pages, components, or tokens.

The section blueprints carry the layout rules with their real numbers — the
column split, the row height, the radius, the gap. Put those numbers in
`## Layout` and `## Components`. They are the most valuable sentences in the
document, because they are the ones an implementer cannot guess.

### When there is no good direction

If the sector pool has nothing that fits, or the product is internal tooling
where the system should disappear rather than perform, use the floor:
`assets/starter-kit.json`. It carries a warm-neutral palette, a five-step type
scale, a spacing scale and a radius, already in valid frontmatter shape.

Say in the report that the house kit was used and why. It is a floor, not a
finished system — the operator should know.

## The deliverable is the document

Not the page. `celebrimbor` produces a validated `DESIGN.md` and stops. Building
the page that document describes — filling every tile, writing the fragments in
HTML at true size, choosing and crediting the photographs — is **not** this
skill's work. It is the `galadriel` station's job (the `ui` lane), and the
direction's own content rules are binding on *it*, not on this skill:

> *"Software is most convincing when it is doing its job in front of you. Put
> small, true, working fragments of the product on the page."*
>
> *"A fake interface made of grey bars and circles is the worst outcome."*
>
> *"It replaces the generic bento by having real content in every tile."*

Those rules, and the asset tool that finds the photographs and records their
credits, live in `skills/galadriel/references/content.md`. What remains here is
what a *design system* owns.

### A dark palette is a choice, not a default

A light-neutral palette with one blue accent produces grey boxes on a white
page. When the product is a tool, the dark palettes in the dataset
(`blue-black-cornflower`, `graphite-safety-orange`, `black-crimson`) carry a
page far better. Pin one with `--palette` rather than taking the first match.

### The colour rule is the accent's job, not the page's

A palette whose note says *"no section changes colour"* means the interest must
come from type, fragments and photographs — not from more surfaces.

### Pin the direction, do not take the first one

The composer matches a sector to a direction, and a direction to a palette.
That match is a starting point, not an answer. Two flags let you choose:

```bash
node scripts/compose.mjs --sector dev-tool --tone technical \
  --direction product-performs --palette blue-black-cornflower --seed 3
```

Deal a sheet, read its **idea**, **composition** and **pitfalls**, and judge
whether it fits the product before writing anything. If it does not, deal
another seed or pin another direction. The dataset has 20 directions and 56
palettes; a mediocre match is a choice you can improve on.


## The rules of a coherent system

- **One accent.** It marks the single most important thing on a screen.
- **One radius.** One value across the product unless a surface argues otherwise.
- **One type family per role.** Display and text, never four.
- **One spacing scale.** Every gap is a step on it.
- **Quantity is not quality.** One coherent system beats a collage of five.

## Validate

```bash
node scripts/validate.mjs <path>/DESIGN.md --format css-tailwind
```

Then report: the mode, the sector and tone, the direction dealt, the seed, the
palette and type chosen, the sections mapped, anything omitted, and the gate
result.
