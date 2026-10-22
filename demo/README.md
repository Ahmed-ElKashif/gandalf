# The demo — Ridgeline

A design system and a page: **forged with `celebrimbor`, built with
`galadriel`** — both ship in this repo. It is here to show the stations working
end to end, and to give the `ui` lane something real to read.

```
demo/
├── DESIGN.md    the design system — the normative tokens and the guardrails
├── index.html   one page, built from that document and nothing else
└── assets/      three photographs of real server racks, with their credits
```

## How it was made

```bash
# 1. survey the target — one root, one lookup, and it stops there
node ../skills/celebrimbor/scripts/survey.mjs --root .
#   -> GENERATE: no DESIGN.md and nothing to extract from

# 2. compose a direction — a sector, a tone, a direction and a palette
node ../skills/celebrimbor/scripts/compose.mjs --sector dev-tool --tone technical \
  --direction product-performs --palette blue-black-cornflower --seed 3
#   -> "The product performs" + "Night and cornflower" + Albert Sans + six blueprints

# 3. find real pictures of the customer's world, with their credits
node <design-taste-frontend>/scripts/assets.mjs "server room racks" --source commons --license safe
node <design-taste-frontend>/scripts/assets.mjs --get <ref> --to assets

# 4. write DESIGN.md from the sheet

# 5. the gate — the real linter, not a look at it
node ../skills/celebrimbor/scripts/validate.mjs DESIGN.md --format css-tailwind
#   -> 0 errors, 0 warnings -> PASS
```

The page's `@theme` block is the **literal export** of the document:

```bash
design.md export --format css-tailwind DESIGN.md
```

Everything else — the colours, the type steps, the radius, the spacing — comes
from that export. The composition comes from the `## Layout` section.

## What the skill decided, and why

| Decision | Where it came from |
|---|---|
| The product performing, not a picture of it | the direction "The product performs" |
| Blue-black ground, slate panels, one cornflower accent | the "Night and cornflower" palette |
| Albert Sans, four sizes, 14–64px | the type system in the dataset |
| One radius, one accent, one family | the direction, and the design system's own rules |
| Fragments at true size, marked `data-ui` | the direction's pitfalls |

The direction is a **marketing/public** arm. The skill also has an **app** arm
(`compose.mjs --app --kind analytics`) for dashboards and admin surfaces.

## The page does something

The hero is the product, not a picture of it. **Deploy to production** runs a
real sequence — build, migrate, release, health — with the progress bar, the
per-step timings and the status line all moving, and the panel ending on
*"2f9c1e is live in production"*. The pinned panel changes its content when you
pick a different statement. Both are built in HTML, at true size, and both were
clicked and asserted.

## Verified, not assumed

Checked with the `palantir` skill against a live server, at 1440px and 390px:

- **no horizontal overflow** at either width, and no overlapping elements
- every rendered token equals the DESIGN.md value — colour, size, weight,
  tracking, leading, padding, radius
- the deploy sequence completes: four steps, 100% bar, the button re-enabled
- the pinned fragment swaps its content and its `aria-selected` state
- no gradients anywhere, and one accent surface at a time

Five defects were found this way and fixed:

1. **The display scale rendered at weight 400, not 600.** In Tailwind v4,
   `--font-display` and `--font-weight-display` both generate `font-display`,
   and the family wins — the weight silently falls back. Now written down in
   `skills/celebrimbor/references/design-md-format.md`.
2. **Every section lost its top margin.** A plain `.wrap { margin: 0 auto }`
   beat Tailwind's `mt-2xl`, because unlayered CSS beats layered CSS. Written
   down in `skills/galadriel/references/build.md`.
3. **The comparison table was misaligned** — a 12-column grid with four cells
   per row.
4. **The phone layout overflowed by 334px.** A 64px gap across 12 columns
   needs 704px of gap alone.
5. **A gradient overlay on the photo caption** — banned by the house rules the
   design system itself carries.

The first version of this page was a grid of grey boxes on a white page. It
passed the gate. The lesson is now two skills: **the gate proves the document**
(`celebrimbor's` job), **and the page needs its own craft** (`galadriel`'s).

## Open it

```bash
node ../skills/celebrimbor/scripts/doctor.mjs   # optional: the lint/export CLI
python -m http.server 8931 --directory .        # or any static server
```

Then open <http://127.0.0.1:8931/>.

The page loads Tailwind v4 and Albert Sans from CDNs, so it needs a network
connection. The photographs are local.

## Picture credits

Server racks by **NOIRLab / NSF / AURA / T. Slovinský**, CC BY 4.0, via
[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:NOIRLab_HQ_Server_Racks_(6V6A0402-CC).jpg).
The full credit list is in `assets/credits.json`.

---

## The second demo — the aswan acceptance test

`demo/aswan/` is the first end-to-end run of the loop on a real client-shaped
brief: **Al Madina Coal & Shawarma** (Aswan, Egypt), re-confirmed by the
operator this session. The loop is the product; this is the loop proven once:

```
celebrimbor (forge) -> galadriel (build) -> haldir (qa round) -> legolas (appearance)
```

ADR `docs/adr/0002-customer-demo-acceptance-test.md` is the decision log; the
brief's confirmed facts live in `demo/aswan/GLOSSARY.md`.

### What the page is, and is not

- An **acceptance test**, not the operator's website — a demo chip says exactly
  that, on screen, top-left.
- Everything on it is confirmed, credited, or openly pointed somewhere else.
  The menu stays with the operator's board (EGP prices; no invented items —
  only what the name itself guarantees: shawarma, charcoal-grilled); the
  address, phone and hours stay with the public listing.
- The Arabic name المدينة للفحم والشاورما is a **literal translation** of the
  confirmed Latin name — the operator's own signage always overrides it.
- The two dish photographs (foul medames, koshary) are credited **cultural
  likenesses**, declared as such in every caption — never "our kitchen".

### How it was made

| Station | What it did |
|---|---|
| `celebrimbor` | composed the direction (place carries it), sampled the palette from the operator's logo (`#B31A1C` red, `#F5B553` gold, `#F9F1E4` cream paper), overrode the dealt type with IBM Plex Sans Arabic 700 + Cairo, wrote `aswan/DESIGN.md` — gate PASSED |
| `galadriel` | built `index.html` from the literal token export; one gated WebMCP tool (`photos.list`, registers only on localhost + `?qa=1`); every photo slot, caption, credit line and the tool's own answer render from one `window.PAGE_PHOTOS` array |
| `haldir` | ran the palantir round: tool calls, the human path (`#board`, `#find`), honesty evals (no tel/mailto/maps links, no `EGP <digits>` anywhere, 7 images all alt'ed, 7 footer credits), and the `look` captures; opened `meta.json` before believing any of it |
| `legolas` | judged the states against `aswan/DESIGN.md` alone; settled its own eye-suspicions with structured reads (fonts, Range-rect alignment, measured contrast) |

Assets: the operator-provided logo (the repo copy is authoritative; the
original CDN link expires ~2026-10-27) and seven CC-licensed Wikimedia Commons
photographs — the full list with licences is `demo/aswan/assets/credits.json`
(8 entries).

### The verdict, and what it caught

Three rounds, all in `.agent-review/`:

- **Round 1** `20261022T050821Z-9f02d6` — 11 PASS / 3 FAIL. The three fails are
  operator-side PowerShell/message-quoting artifacts of the assertion needle
  (the corrected exact-bytes invocation PASSes); they stay in the package,
  disclosed, not hidden. Tool contract, human path and honesty all green.
- **Round 2** `20261022T052811Z-c5d595` — appearance captures + structure
  evals (no tool calls by design; the runner flags that honestly).
- **Round 3** `20261022T054109Z-1c37b3` — bounce resolution, 2/2 PASS.

legolas's findings, all fixed the same session:

1. **The muted token #8C7C6E failed its declared role** — 3.59:1 on cream at
   14px. Darkened to #7A6B5B (4.59 cream / 4.91 surface, measured); document
   updated with the measured numbers.
2. **The practical block was squeezed inside the 52ch wrap** (~15 characters
   per line). Widened to the slate's 46rem.
3. **The "portrait" photograph rendered square** (400x400). Now a true
   portrait (240x400), offset as documented.
4. **Bidi punctuation drifted in the slate lines** — a middot inside an RTL run
   floated beside the em-dash. Restructured.
5. **The slate's Arabic title sat flush right, its Latin label flush left**.
   The label is right-aligned now.
6. **The hero name's tail washed out over the sandbank**; the bottom scrim was
   strengthened (.78/.42) — the neutral scrim the document permits.
7. **The footer Arabic name wrapped mid-phrase**; it holds one line now.
8. **Document drift, clarified not hidden**: the mark's placement scope (it
   also appears beside its own credit in the footer), and the contrast notes
   corrected to measured values (cream-on-red is 6.1:1, not the estimated
   4.6:1; the dealt muted estimate 3.59 recorded above).

Cleared by structure, not by findings: the display face **is** IBM Plex Sans
Arabic (fonts.check true, Latin glyphs included — the eye suspected otherwise);
the hero's two title lines sit flush right (Range rects both at 1224px).

### Known gaps, stated not hidden

- **No narrow-viewport captures.** Every look was taken at 1280x720; the
  phone-width verdict has not been rendered yet. This was legolas's stated
  blind spot in the acceptance verdict.
- Hover/focus/pressed visuals and motion were not exercised; the focus outline
  colours are declared in CSS but were never captured under keyboard.
- The page loads Tailwind v4 and the two faces from CDNs (as Ridgeline does);
  the photographs and the logo are local.

### Open the aswan page

```bash
python -m http.server 4173 --directory demo/aswan   # or any static server
# open http://localhost:4173/?qa=1  — the qa flag is what registers photos.list
```
