# The research dataset

`assets/taste/` is the material the composer deals from. It is a trimmed,
MIT-licensed subset of the taste library from `Leonxlnx/taste-skill` — a study
of 247 curated sites (One Page Love, Awwwards Sites of the Day). See
`NOTICE.md` for the attribution.

What was kept: every decision-bearing field — the ideas, the compositions, the
hex values, the type steps, the measured blueprints. What was dropped: the
provenance blobs (`seenIn`, `links`, the font `<link>` snippets) and the files a
design system never needs (`sites.json` — an index of studied sites;
`photos.json`, `heroes.json`, `motions.json` — image and motion references
that belong to a page, not to a token file).

## The files

### `directions.json` — 20 art directions

The concept layer. Each direction is an *idea engine* seen on the strongest
studied sites, with the geometry and the traps attached.

```json
{
  "id": "name-as-monument",
  "name": "The name as a monument",
  "sectors": ["agency", "studio-portfolio", "restaurant", ...],
  "tones": ["bold", "editorial", "luxury"],
  "idea": "The name is the headline. Set it so large that it becomes architecture...",
  "composition": "First screen: the wordmark spans 88-100% of the viewport width...",
  "typography": "One family. The display cut must survive enormous sizes...",
  "typeClasses": ["grotesk-tight", "condensed-heavy", "extended-heavy", "heavy-black", "serif-display"],
  "colour": "Two values carry the page (ground and ink)...",
  "paletteTags": ["light-neutral", "dark-neutral", "two-tone", "mono-accent"],
  "sectionTags": ["type-led", "quiet", "poster"],
  "imagery": "Few images, used as inserts in the typography...",
  "motion": "scaling-wordmark",
  "richness": "Scale. The size of the name against the smallness of everything else...",
  "pitfalls": ["A long name set small is just a logo...", ...],
  "allow": []
}
```

**Sectors** (21): `agency` `ai-product` `architecture` `consumer-app` `culture`
`dev-tool` `ecommerce` `education` `event` `fashion` `finance` `health`
`hospitality` `music` `nonprofit` `other` `personal-portfolio`
`physical-product` `real-estate` `restaurant` `saas` `studio-portfolio`.

**Tones** (7): `bold` `editorial` `luxury` `playful` `quiet` `technical` `warm`.

**Type classes** (10): `condensed-heavy` `extended-heavy` `geometric`
`grotesk-light` `grotesk-tight` `heavy-black` `rounded-friendly`
`serif-display` `serif-light-large` `serif-text` `slab`.

**Palette tags** (9): `dark-neutral` `earth` `flat-loud` `light-neutral`
`mono-accent` `pastel-fields` `photographic-neutral` `single-field` `two-tone`.

`pitfalls` are the most valuable field. They are the ways a direction fails
when it is half-understood — read them before you write the prose.

### `palettes.json` — 56 palettes

Real hex values, ready for the `colors:` frontmatter.

```json
{
  "id": "white-link-blue",
  "name": "Sheet and biro",
  "tags": ["light-neutral", "mono-accent"],
  "bg": "#ffffff",
  "surface": "#f4f4f4",
  "ink": "#111111",
  "muted": "#6b6b6b",
  "accent": "#1a4be0",
  "accentInk": "#ffffff",
  "fields": [{ "bg": "#111111", "ink": "#ffffff" }],
  "note": "White holds the whole page with black type, one grey for secondary lines..."
}
```

`bg` `surface` `ink` `muted` `accent` `accentInk` are **roles**, not token
names — rename them for the product. `fields` are the inverted colour sets: a
coloured ground with its own ink. They are how a page inverts.

### `type.json` — 44 type systems

```json
{
  "id": "switzer-semibold",
  "name": "Switzer",
  "class": "grotesk-tight",
  "display": { "family": "Switzer", "source": "fontshare", "weights": [600],
               "italic": false, "settings": "weight 600 · tracking -0.04em · leading 0.95 · sentence case" },
  "text": { "family": "Switzer", "source": "fontshare", "weights": [400, 500],
            "settings": "400 for body, 500 for emphasis · leading 1.5 · tracking -0.005em" },
  "standsInFor": ["Suisse Intl", "Neue Haas Grotesk"],
  "note": "One neo-grotesk doing everything: semibold headings pulled tight...",
  "scale": {
    "step-small": "clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem)",
    "step-body":  "clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)",
    "step-lead":  "clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem)",
    "step-head":  "clamp(2rem, 1.3rem + 3.2vw, 4rem)"
  }
}
```

**The `scale` values are `clamp()` — which is not a valid DESIGN.md dimension.**
The composer resolves them to concrete pixels at a 1440px reference viewport
(`resolveClamp()` in `scripts/compose.mjs`). Use the resolved values.

`settings` carries the tracking and leading in prose. Parse them into
`letterSpacing` and `lineHeight` — that is where the exact values live.

`fontFamily` in the DESIGN.md is the family name only. The font CDN link is the
application's business, not the design system's.

### `sections.json` — 185 section blueprints

Each is a page section with a measured blueprint and its responsive variant.

```json
{
  "id": "features-capabilities-at-poster-scale",
  "role": "features",
  "name": "Capabilities at poster scale",
  "shape": "list",
  "tags": ["type-led", "poster"],
  "directions": ["type-only-statement", "hero-object", "loud-flat-poster", ...],
  "blueprint": "No images. The heading, two to four words, is the first line of the list itself...",
  "mobile": "Names drop to 11vw and stay one per line..."
}
```

The `blueprint` prose contains the real numbers — the column split, the row
height, the radius, the gap, the font size. **These are the sentences an
implementer cannot guess**, and they go straight into `## Layout` and
`## Components`.

A blueprint that names a size maps it onto one of the five type steps. Do not
add a sixth.

### `app.json` — the app surface

```json
{
  "version": {},
  "about": {},
  "styles": [ ... 7 app styles: achromatic-ledger, pastel-consumer, framed-sheet, accent-ladder, data-terminal, editorial-greeting, true-black-flat ... ],
  "shells": [ ... 5 navigation shells ... ],
  "patterns": [ ... 25 screen patterns with a blueprint and a phone variant ... ],
  "kinds": { "analytics": { "note": "...", "styles": [...], "screens": [...] }, ... 13 kinds ... }
}
```

`kinds` maps a product kind to the styles that suit it and the screens it has.
`patterns` are the screen blueprints — a table with a filter bar, a settings
page in two columns, an inbox triage, a wallet balance screen. Their values
were measured on real product screens.

The app arm is what keeps an internal tool from looking like a marketing site.

## The house style

The dataset's own rules, and what the composer reads as the floor:

- Headlines two lines or fewer, at every width.
- No eyebrow labels, no monospace, no `01/02/03` numbering.
- No thin rules, no gradients, no shadows at rest.
- No cream-and-terracotta, no violet.
- Body text 16px or larger; nothing below 13px.
- One h1 on the first screen that says what the thing is.

**These are one direction's rules, not a universal law.** They are the taste
library's house style — sharp, opinionated, and right for a marketing surface.
A fintech dashboard or a clinical tool may have good reasons to break them, and
the operator's requirements outrank them. Use them as the default, not the law.

## Using the dataset directly

```bash
node scripts/compose.mjs --sector saas --tone technical --seed 42
node scripts/compose.mjs --app --kind analytics --seed 42
node scripts/compose.mjs --json          # the vocabulary
```

To read a file by hand, they are plain JSON — `jq` or a few lines of node will
do it.
