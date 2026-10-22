# The aids — what is inside, what is optional, what replaces it

Celebrimbor is **self-contained**. The research dataset, the composer, and an
offline gate ship inside the skill, so a forge never needs an install. The
things below make it better. Each one has a fallback that ships here, so none
of them is required.

## What ships inside

| Asset | What it is |
|---|---|
| `assets/taste/` | the trimmed research dataset — 20 directions, 56 palettes, 44 type systems, 185 section blueprints, 13 app kinds. MIT, attributed in `NOTICE.md` |
| `assets/starter-kit.json` | the floor — a warm-neutral palette, a five-step type scale, a spacing scale and a radius, already in valid frontmatter shape. Written for this skill |
| `scripts/compose.mjs` | the composer — deals a direction and resolves the palette, type and sections around it |
| `scripts/survey.mjs` | the survey — one root, one lookup, one bounded sweep |
| `scripts/validate.mjs` | the gate — the real linter when it is installed, the built-in structural checks when it is not |
| `scripts/doctor.mjs` | the first-use check |
| `deps.json` | the machine-readable dependency manifest the doctor reads |
| `references/` | this folder — one file per topic |

## The optional aids

| Aid | Unlocks | Install | Fallback |
|---|---|---|---|
| `@google/design.md` | the real lint/export gate, plus `spec` and `diff` | `npm i -g @google/design.md` | `scripts/validate.mjs` offline checks |
| `create-design-md` (ibelick/ui-skills, MIT) | the reference extraction pipeline and the URL-mode reconstruction method | `npx skills add ibelick/ui-skills --skill create-design-md` | `references/extract.md` carries the same pipeline |
| `impeccable` (pbakaus) | `normalize` for a system whose structure drifted | `npx skills add pbakaus/impeccable` | `references/normalize.md` plus the gate |
| `ui-ux-pro-max` (nextlevelbuilder) | industry reasoning for a greenfield palette and type | `npx skills add nextlevelbuilder/ui-ux-pro-max-skill` | `assets/starter-kit.json` and `references/generate.md` |
| `awesome-design-md` (VoltAgent) | a library of real brand `DESIGN.md` files for Adopt mode | `npx skills add VoltAgent/awesome-agent-skills` | `references/adopt.md` reconstructs from a URL |
| `stitch-skills` (google-labs-code) | Stitch output and `extract-design-md` | `npx skills add google-labs-code/stitch-skills` | `references/extract.md` |

### How they are detected and installed

`node scripts/doctor.mjs` walks `deps.json`, checks each one against the usual
skill stores (`~/.agents/skills`, `~/.claude/skills`) and the global npm bin,
and prints what is present and what is missing with the exact command for
each gap.

```bash
node scripts/doctor.mjs          # report only
node scripts/doctor.mjs --yes    # install what is missing
```

It never installs without `--yes`, and it never re-installs what is already
there.

## The gandalf fleet's own aids

These are already in the fleet and are worth using in a UI dispatch — but they
are the **UI lane's** craft, not the forge's job:

| Skill | Role |
|---|---|
| `design-taste-frontend` (Leonxlnx/taste-skill, MIT) | the full upstream library and its browser inspector. The vendored dataset here is the subset a DESIGN.md needs; the upstream skill also carries hero blueprints, photography and the page-level house rules |
| `frontend-design` | identity direction — distinctive, non-templated visual choices |
| `emil-design-eng` | the craft rules: spacing, hierarchy, polish |
| `baseline-ui` / `improve-ui` | cleanup passes on an app surface |
| `design-taste-frontend`'s `scripts/inspect.mjs` | the browser check — measure what was built against the house rules |

A forged DESIGN.md is the **input** to those skills, not a substitute for them.

## When an aid is missing

Do not stall. The fallbacks in the table are not placeholders — they are the
same method, written down here. The one thing the offline gate cannot do is
prove the exporter accepts the document; when that is the case, say so.

## What celebrimbor never uses

- **`ui-review-loop`** — the human-watches-video loop. `palantir` is the
  evidence path now.
- **A screenshot** as a source of exact values. Screenshots support
  interpretation; computed styles and loaded declarations establish values.
- **A second token schema.** One document, one vocabulary.
